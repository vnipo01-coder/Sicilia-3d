/* Optional, repeatable graphical browser smoke test.
 * Run only after installing Playwright. OSM is a deterministic mock here;
 * this does NOT validate real geodata coverage or image availability. */
import {strict as assert} from "node:assert";
import {mkdir} from "node:fs/promises";
import {chromium} from "playwright";
import {deflateSync} from "node:zlib";

const url=process.env.SICILIA_TEST_URL||"http://127.0.0.1:4173/cesium/";
const screenshotDir=process.env.SICILIA_SCREENSHOTS||"./screenshots";
const fixture={elements:[
 {type:"way",id:910001,tags:{building:"residential",height:"12.5",name:"Fixture A"},
  geometry:[
   {lat:37.94532,lon:15.36834},{lat:37.94532,lon:15.36850},
   {lat:37.94545,lon:15.36850},{lat:37.94545,lon:15.36834},
   {lat:37.94532,lon:15.36834}]},
 {type:"way",id:910002,tags:{building:"yes","building:levels":"2",name:"Fixture B"},
  geometry:[
   {lat:37.94549,lon:15.36851},{lat:37.94549,lon:15.36865},
   {lat:37.94561,lon:15.36865},{lat:37.94561,lon:15.36851},
   {lat:37.94549,lon:15.36851}]},
 {type:"way",id:920002,tags:{highway:"residential",name:"Fixture road"},
  geometry:[{lat:37.94531,lon:15.36835},{lat:37.94551,lon:15.3686}]}
]};
// Supply a valid synthetic Terrarium DEM tile to test real Cesium terrain
// engine integration deterministically, not an actual measured elevation.
function crc32(buf){
  let crc=0xffffffff;
  for(const b of buf){
    crc^=b;
    for(let j=0;j<8;j++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);
  }
  return (crc^0xffffffff)>>>0;
}
function pngChunk(type,data){
  const label=Buffer.from(type,'ascii'),size=Buffer.alloc(4);
  size.writeUInt32BE(data.length);
  const checksum=Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([label,data])));
  return Buffer.concat([size,label,data,checksum]);
}
function flatDemoHeightPng(){
  const width=256,height=256,rgba=Buffer.alloc(height*(1+width*4));
  for(let y=0;y<height;y++){
    const row=y*(1+width*4);rgba[row]=0;
    for(let x=0;x<width;x++){
      const offset=row+1+x*4;
      rgba[offset]=128;rgba[offset+1]=75;rgba[offset+2]=0;rgba[offset+3]=255;
    }
  }
  const ihdr=Buffer.alloc(13);
  ihdr.writeUInt32BE(width,0);ihdr.writeUInt32BE(height,4);
  ihdr[8]=8;ihdr[9]=6;ihdr[10]=0;ihdr[11]=0;ihdr[12]=0;
  return Buffer.concat([
    Buffer.from('89504e470d0a1a0a','hex'),
    pngChunk('IHDR',ihdr),
    pngChunk('IDAT',deflateSync(rgba)),
    pngChunk('IEND',Buffer.alloc(0))
  ]);
}
const mockTerrain=flatDemoHeightPng();
const browser=await chromium.launch({headless:true,args:["--enable-webgl","--use-gl=angle","--use-angle=swiftshader"]});
const page=await browser.newPage({viewport:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
await page.route("**/api/interpreter",route=>
  route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(fixture)}));
await page.route("**/elevation-tiles-prod/terrarium/**",route=>
  route.fulfill({status:200,body:mockTerrain,
    headers:{"content-type":"image/png","access-control-allow-origin":"*"}}));
try{
 await page.goto(url,{waitUntil:"domcontentloaded",timeout:45000});
 await page.locator("#cesiumContainer canvas").first().waitFor({state:"visible",timeout:60000});
 await page.waitForFunction(
  ()=>document.querySelector("#building-count")?.textContent==="2",
  null,{timeout:60000});
 assert.equal(await page.locator("#building-count").textContent(),"2");
 assert.equal(await page.locator("#road-count").textContent(),"1");
 assert.equal(await page.locator("#measured-count").textContent(),"1");
 await page.waitForFunction(
   ()=>document.querySelector("#terrain-state")?.textContent?.includes("Reales Relief"),
   null,{timeout:25000});
 assert.ok((await page.locator("#terrain-free").textContent())?.includes("deaktivieren"));
 await page.locator('[data-place="lungomare"]').click();
 assert.ok(await page.locator('[data-place="lungomare"]').getAttribute("class")?.includes("selected"));
 await page.locator("#quality-open").click();
 assert.ok(await page.locator("#quality-dialog").evaluate(el=>el.open));
 await page.locator(".dialog-close").click();
 await mkdir(screenshotDir,{recursive:true});
 await page.screenshot({path:screenshotDir+"/cesium-pilot-desktop.png",fullPage:true});
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:screenshotDir+"/cesium-pilot-mobile.png",fullPage:true});
 assert.ok(!errors.some(x=>/ReferenceError|SyntaxError/.test(x)),
   "Critical JS errors: "+errors.join(" | "));
 console.log("PASS: Cesium WebGL canvas, 2 OSM building fixtures, 1 road, 1 documented height, mocked real-terrain decoding, cameras and dialog.");
 console.log("Note: Actual satellite imagery, real Overpass availability and 3D ion data are not verified by this mock.");
}finally{await browser.close();}
