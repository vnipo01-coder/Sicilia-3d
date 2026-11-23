import test from 'node:test';
import assert from 'node:assert/strict';
import {GeoFrame,TerrainDEM,tileXY,pointInPolygon,polygonArea,isSicily,
  getBuildingHeight,getRoadWidth,propertyRows,validateGeo} from '../geo.js';
import {readFileSync} from 'node:fs';

test('Coordinate projections roundtrip at Casalvecchio',()=>{
  const f=new GeoFrame(37.95736,15.32230),p=f.local(15.325,37.958),g=f.geo(p.x,p.z);
  assert.ok(Math.abs(g.lat-37.958)<1e-9);
  assert.ok(Math.abs(g.lon-15.325)<1e-9);
  assert.ok(p.x>0&&p.z<0);assert.ok(validateGeo());
});
test('Reject invalid or remote Sicily coordinates',()=>{
  assert.equal(isSicily(37.95736,15.3223),true);
  assert.equal(isSicily(47.38,8.54),false);
  assert.equal(isSicily(NaN,15),false);
});
test('Terrarium source imagery decode at 500m above sea level',()=>{
  const frame=new GeoFrame(37.95736,15.32230),sampler=new TerrainDEM(frame,14);
  const t=tileXY(frame.lat,frame.lon,14),tx=Math.floor(t.x),ty=Math.floor(t.y);
  const bytes=new Uint8ClampedArray(256*256*4);
  for(let i=0;i<bytes.length;i+=4){
    bytes[i]=129;bytes[i+1]=244;bytes[i+2]=0;bytes[i+3]=255;
  }
  sampler.tiles.set(tx+'/'+ty,bytes);
  assert.equal(sampler.absolute(frame.lat,frame.lon),500);
  sampler.center=500;
  assert.ok(Math.abs(sampler.height(0,0))<1e-8);
});
test('No invented altitude if DEM tile absent',()=>{
  const frame=new GeoFrame(37.95736,15.32230),sampler=new TerrainDEM(frame,14);
  assert.equal(sampler.absolute(frame.lat,frame.lon),null);
  assert.equal(sampler.height(0,0),null);
});
test('3D floor height classification tracks uncertainty',()=>{
  assert.deepEqual(getBuildingHeight({height:'17.2'}),{
    metres:17.2,source:'OSM: height',estimated:false
  });
  const guessed=getBuildingHeight({'building:levels':'4'});
  assert.ok(guessed.estimated);assert.equal(guessed.metres,12.4);
  assert.ok(getBuildingHeight({}).estimated);
});
test('Polygon point and footprint handling',()=>{
  const p=[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}];
  assert.equal(polygonArea(p),16);
  assert.equal(pointInPolygon(0,0,p),true);
  assert.equal(pointInPolygon(4,4,p),false);
});
test('Road widths and empty building properties',()=>{
  assert.equal(getRoadWidth({highway:'footway'}),1.7);
  assert.equal(getRoadWidth({width:'4.5'}),4.5);
  assert.equal(propertyRows({}).length,0);
});
test('Preview links and recovery paths are present',()=>{
  const index=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const walk=readFileSync(new URL('../walk.html',import.meta.url),'utf8');
  const explore=readFileSync(new URL('../explore.html',import.meta.url),'utf8');
  assert.match(index,/atlas\.js\?v=110/);
  assert.match(walk,/walk\.js\?v=109/);
  assert.match(index,/3D-Erkundung/);
  assert.match(index,/Ortsmodell/);
  assert.match(walk,/map-explore-link/);
  assert.match(explore,/explore\.js\?v=108/);
});
test('3D buildings survive raster fallback and have an independent vector source',()=>{
  const code=readFileSync(new URL('../atlas.js',import.meta.url),'utf8');
  assert.match(code,/s10-osm-independent/);
  assert.match(code,/https:\/\/tiles\.openfreemap\.org\/planet/);
  assert.match(code,/s10-local-buildings/);
  assert.doesNotMatch(code,/!map\.loaded\(\)\s*&&\s*!fallbackUsed/);
});
test('Windows in source data never become invented construction years',()=>{
  const info=propertyRows({building:'yes',name:'Casa Rossi'});
  assert.equal(info.some(([label])=>label==='Bauzeit'),false);
});
