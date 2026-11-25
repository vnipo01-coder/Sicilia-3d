import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 TERRARIUM_URL,TERRARIUM_MAX_ZOOM,TERRAIN_GRID,
 mercatorTile,mercatorFraction,parentTile,terrariumAltitude,
 sampleTerrariumPixels,terrainGrid,tileUrl
} from "../terrain.js";

function px(m){
  const raw=m+32768;
  const r=Math.floor(raw/256),g=Math.floor(raw)%256;
  const b=Math.round((raw-Math.floor(raw))*256);
  return [r,g,b,255];
}
test("Real elevation encoding matches Mapzen Terrarium formula",()=>{
  assert.equal(terrariumAltitude(128,0,0),0);
  assert.equal(terrariumAltitude(128,100,0),100);
  assert.equal(terrariumAltitude(127,156,0),-100);
  assert.equal(terrariumAltitude(129,44,128),300.5);
});
test("WebMercator coordinates agree with public XYZ format",()=>{
  assert.deepEqual(mercatorTile(0,0,1),{x:1,y:1,z:1});
  const p=mercatorTile(37.94533,15.36830,12);
  assert.ok(p.x>2000&&p.x<2400);
  assert.ok(p.y>1400&&p.y<1750);
  const f=mercatorFraction(37.94533,15.36830,12);
  assert.equal(f.x,p.x);assert.equal(f.y,p.y);
  assert.ok(f.u>=0&&f.u<1&&f.v>=0&&f.v<1);
  assert.throws(()=>mercatorTile(0,0,50));
});
test("Higher-detail requested tiles resample a capped source without wrong position",()=>{
  assert.deepEqual(parentTile(5,4,3,2),
    {x:2,y:2,z:2,u0:.5,v0:0,scale:2});
  const low=parentTile(4,3,2,2);
  assert.equal(low.scale,1);
  assert.equal(low.u0,0);
  assert.equal(low.v0,0);
  assert.equal(TERRARIUM_MAX_ZOOM,14);
  assert.equal(TERRAIN_GRID,33);
});
test("Bilinear heightmap sampling preserves all real elevations",()=>{
  const data=new Uint8ClampedArray([
    ...px(100),...px(200),
    ...px(300),...px(400)
  ]);
  assert.equal(sampleTerrariumPixels(data,2,2,0,0),100);
  assert.equal(sampleTerrariumPixels(data,2,2,1,0),200);
  assert.equal(sampleTerrariumPixels(data,2,2,0,1),300);
  assert.equal(sampleTerrariumPixels(data,2,2,1,1),400);
  assert.equal(sampleTerrariumPixels(data,2,2,.5,.5),250);
  const grid=terrainGrid({data,width:2,height:2},{x:2,y:2,z:2},3);
  assert.equal(grid.length,9);
  assert.equal(grid[0],100);
  assert.equal(grid[4],250);
  assert.equal(grid[8],400);
});
test("True terrain tiles use HTTPS public AWS tiles, not invented contours",()=>{
  assert.match(TERRARIUM_URL,/s3.amazonaws.com\/elevation-tiles-prod\/terrarium/);
  assert.equal(tileUrl(2,3,4),TERRARIUM_URL+"4/2/3.png");
});
test("Cesium pilot correctly distinguishes real terrain, 3D tiles and ellipsoid mode",()=>{
  const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.match(app,/prepareTerrarium\(Cesium/);
  assert.match(app,/state.viewer.terrainProvider=result.provider/);
  assert.match(app,/new Cesium.EllipsoidTerrainProvider\(\)/);
  assert.match(app,/terrainMode="terrarium"/);
  assert.match(app,/terrainBuild/);
  assert.match(html,/id="terrain-free"/);
  assert.match(html,/id="terrain-state"/);
  assert.match(html,/\.\/app\.js\?v=2/);
  assert.match(app,/\.\/terrain\.js\?v=2/);
});
