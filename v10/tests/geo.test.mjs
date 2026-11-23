import test from 'node:test';
import assert from 'node:assert/strict';
import {GeoFrame,TerrainDEM,tileXY,pointInPolygon,polygonArea,isSicily,
  getBuildingHeight,getRoadWidth,propertyRows,validateGeo} from '../geo.js';
import {readFileSync} from 'node:fs';
import {SANTA,STOPS,inSantaTeresa,contextualSources,streetImageryUrl} from '../local-sources.js';
import {weatherLabel,weatherParams} from '../weather.js';
import {officialKnowledge} from '../knowledge.js';

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
  assert.match(index,/atlas\.js\?v=115/);
  assert.match(walk,/walk\.js\?v=115/);
  assert.match(index,/3D-Erkundung/);
  assert.match(index,/Ortsmodell/);
  assert.match(walk,/map-explore-link/);
  assert.match(explore,/explore\.js\?v=115/);
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

test('Santa Teresa data are verifiable and geographically scoped',()=>{
  assert.ok(inSantaTeresa(SANTA));
  assert.ok(STOPS.some(x=>x.name==='Lungomare Barracca'));
  assert.ok(STOPS.some(x=>x.name==='Via Savoca'));
  assert.ok(STOPS.every(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lon)));
  assert.ok(contextualSources({...SANTA,kind:'Ort'}).length>=3);
  assert.deepEqual(contextualSources({...SANTA,name:'Unknown house',kind:'Gebäude'}),[]);
  assert.deepEqual(contextualSources({name:'Furci Siculo',kind:'Ort',lat:37.954,lon:15.377}),[]);
});
test('No invented bus departure times, official transport record available',()=>{
  assert.ok(officialKnowledge({...SANTA,kind:'Ort'}).some(x=>x.id==='interbus-notice'));
  assert.ok(STOPS.every(x=>!('next_departure' in x)&&!('departure_time' in x)));
});
test('Weather queries use current model fields and real street images only by discovery',()=>{
  const p=weatherParams(SANTA.lat,SANTA.lon);
  assert.match(p.get('current'),/temperature_2m/);
  assert.match(p.get('hourly'),/precipitation_probability/);
  assert.equal(weatherLabel(61)[1],'Leichter Regen');
  const link=streetImageryUrl(SANTA.lat,SANTA.lon);
  assert.ok(link.includes('mapillary.com/app/'));
  assert.ok(link.includes('lat=37.94533'));
  assert.ok(!link.includes('image_key='));
});
test('All pages expose the right weather and Santa Teresa source controls',()=>{
  const a=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const b=readFileSync(new URL('../explore.html',import.meta.url),'utf8');
  const c=readFileSync(new URL('../walk.html',import.meta.url),'utf8');
  assert.ok(a.includes('id="weather-live"')&&a.includes('id="stops"'));
  assert.ok(a.includes('id="santateresa"'));
  assert.ok(b.includes('id="coastal-panel"')&&b.includes('id="weather-live"'));
  assert.ok(c.includes('id="santa-district"')&&c.includes('id="town-heritage-links"'));
});
