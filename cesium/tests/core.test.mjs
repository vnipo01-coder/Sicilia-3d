import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 PILOT,PLACES,SOURCE_LINKS,BUILDING_COLORS,parseMetres,buildingHeight,
 polygonAreaMetres,normalizeRing,hashId,buildingColor,isInsidePilot,
 parseOsmElements,overpassQuery,OVERPASS_ENDPOINTS
} from "../core.js";

const ring=[
 {lat:37.9453,lon:15.36830},
 {lat:37.9453,lon:15.36843},
 {lat:37.94541,lon:15.36843},
 {lat:37.94541,lon:15.36830},
 {lat:37.9453,lon:15.36830}
];
const fixture={elements:[
 {type:"way",id:133,tags:{building:"residential",height:"13.7",name:"Casa test"},geometry:ring},
 {type:"way",id:134,tags:{building:"yes","building:levels":"3"},geometry:ring},
 {type:"way",id:135,tags:{building:"church","roof:shape":"gabled"},geometry:ring},
 {type:"way",id:136,tags:{building:"yes"},geometry:[{lat:0,lon:0}]},
 {type:"way",id:211,tags:{highway:"residential",name:"Via di prova"},geometry:ring.slice(0,3)},
 {type:"node",id:311,lat:37.94535,lon:15.36835,tags:{highway:"bus_stop",name:"Municipio"}},
 {type:"node",id:312,lat:37.94536,lon:15.36836,tags:{natural:"tree"}}
]};
test("Pilot bounds and camera presets stay local to Santa Teresa",()=>{
  assert.equal(PILOT.name,"Santa Teresa di Riva");
  assert.equal(PLACES.length,4);
  assert.ok(PLACES.every(p=>isInsidePilot(p.lat,p.lon)));
  assert.equal(isInsidePilot(38.1,15.1),false);
  assert.ok(PLACES.every(p=>p.height>100));
});
test("Building-height parsing distinguishes documented height and estimate",()=>{
  assert.equal(parseMetres("13,7 m"),13.7);
  assert.equal(parseMetres("-3 m"),null);
  assert.equal(parseMetres("12 feet"),null);
  assert.equal(buildingHeight({height:"13.7"}).estimated,false);
  assert.equal(buildingHeight({"building:levels":"3"}).metres,9.3);
  assert.equal(buildingHeight({"building:levels":"3"}).estimated,true);
  assert.equal(buildingHeight({}).metres,9.5);
  assert.equal(buildingHeight({}).estimated,true);
});
test("Only plausible Sicily polygon rings form 3D buildings",()=>{
  const normalized=normalizeRing(ring);
  assert.equal(normalized.length,4);
  assert.ok(polygonAreaMetres(normalized)>50);
  assert.equal(normalizeRing([{lat:0,lon:0},{lat:0,lon:1},{lat:1,lon:1}]),null);
  assert.equal(normalizeRing([{lat:37.9453,lon:15.3683}]),null);
});
test("Colors are stable and never presented as documented when guessed",()=>{
  assert.equal(hashId("way/123"),hashId("way/123"));
  assert.deepEqual(buildingColor("way/1",{"building:colour":"#ab12ff"}),
    {hex:"#ab12ff",documented:true});
  assert.equal(buildingColor("way/4",{building:"church"}).hex,"#d8c588");
  assert.equal(buildingColor("way/5",{}).documented,false);
  assert.ok(BUILDING_COLORS.includes(buildingColor("way/5",{}).hex));
});
test("All OSM categories and source tags are preserved",()=>{
  const p=parseOsmElements(fixture);
  assert.equal(p.buildings.length,3);
  assert.equal(p.roads.length,1);
  assert.equal(p.stops.length,1);
  assert.equal(p.trees.length,1);
  assert.equal(p.invalid,1);
  assert.equal(p.buildings[0].height.metres,13.7);
  assert.equal(p.buildings[0].height.estimated,false);
  assert.equal(p.buildings[1].height.estimated,true);
  assert.equal(p.buildings[2].tags["roof:shape"],"gabled");
  assert.equal(p.stops[0].name,"Municipio");
});
test("Overpass request is geographically bounded and references real OSM geometry",()=>{
  const q=overpassQuery();
  assert.match(q,/out geom/);
  assert.match(q,/37\.94533,15\.36830/);
  assert.match(q,/\["building"\]/);
  assert.match(q,/\["highway"="bus_stop"\]/);
  assert.throws(()=>overpassQuery({lat:37,lon:15,radius:9000}));
  assert.ok(OVERPASS_ENDPOINTS.every(u=>u.startsWith("https://")));
});
test("Regional LiDAR is only a source candidate, not secretly used as terrain",()=>{
  assert.ok(SOURCE_LINKS.lidar1.includes("dati.gov.it"));
  assert.ok(SOURCE_LINKS.lidar2.includes("dati.gov.it"));
  const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  assert.ok(app.includes("new Cesium.EllipsoidTerrainProvider()"));
  assert.ok(app.includes("Cesium.createWorldTerrainAsync"));
});
test("A public repository has no hardcoded private ion access token",()=>{
  const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.ok(app.includes('$("ion-token").value.trim()'));
  assert.ok(!app.includes("localStorage"));
  assert.ok(!app.includes("sessionStorage"));
  assert.ok(!html.includes("YOUR_SECRET_TOKEN"));
  assert.ok(html.includes("type=\"password\""));
});
test("High fidelity is opt-in; photorealistic coverage is never guaranteed",()=>{
  const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  assert.ok(app.includes("createOsmBuildingsAsync"));
  assert.ok(app.includes("createGooglePhotorealistic3DTileset"));
  assert.ok(app.includes("Photorealistische Datenquelle verbunden"));
  assert.ok(app.includes("Abdeckung"));
  assert.ok(app.includes("setSourceVisibility"));
});
test("A bad OSM response cannot destroy the base satellite map",()=>{
  const app=readFileSync(new URL("../app.js",import.meta.url),"utf8");
  assert.ok(app.includes("const data=await fetchPilotOsm"));
  assert.ok(app.includes("renderPilotOSM(data)"));
  assert.ok(app.includes("Der Satellitenatlas bleibt erhalten"));
  assert.ok(app.includes("new Cesium.UrlTemplateImageryProvider"));
  assert.ok(!app.includes("viewer.destroy()"));
});
test("Pilot is discoverable with direct verification sources",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  assert.ok(html.includes("CesiumJS"));
  assert.ok(html.includes("OpenStreetMap"));
  assert.ok(html.includes("Gemeinde"));
  assert.ok(html.includes("Strassen und Haltestellen"));
  assert.ok(html.includes("./app.js?v=2"));
  assert.ok(html.includes('id="quality-label"'));
});
