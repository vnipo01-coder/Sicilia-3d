import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {GeoFrame,TerrainDEM,tileXY,isSicily,pointInPolygon,
  polygonArea,getBuildingHeight,validateGeo} from '../geo.js';
import {SANTA,STOPS,contextualSources,streetImageryUrl} from '../local-sources.js';
import {cityByName,cityForObject,cityInformation,isCityObject} from '../city-pages.js';
import {weatherParams,weatherLabel} from '../weather.js';
import {officialKnowledge} from '../knowledge.js';

test('WGS84 projection roundtrips within a millimetre at Santa Teresa',()=>{
  const frame=new GeoFrame(SANTA.lat,SANTA.lon);
  const xy=frame.local(SANTA.lon+0.001,SANTA.lat+0.001);
  const geo=frame.geo(xy.x,xy.z);
  assert.ok(Math.abs(geo.lon-SANTA.lon-0.001)<1e-8);
  assert.ok(Math.abs(geo.lat-SANTA.lat-0.001)<1e-8);
  assert.ok(isSicily(SANTA.lat,SANTA.lon));
  assert.ok(validateGeo());
});
test('Missing terrain is missing, not fictitiously filled',()=>{
  const sampler=new TerrainDEM(new GeoFrame(SANTA.lat,SANTA.lon),14);
  assert.equal(sampler.absolute(SANTA.lat,SANTA.lon),null);
  assert.equal(sampler.height(0,0),null);
});
test('Terrain image decoding preserves exactly 500m',()=>{
  const frame=new GeoFrame(SANTA.lat,SANTA.lon),sampler=new TerrainDEM(frame,14);
  const t=tileXY(frame.lat,frame.lon,14);
  const img=new Uint8ClampedArray(256*256*4);
  for(let i=0;i<img.length;i+=4){img[i]=129;img[i+1]=244;img[i+2]=0;img[i+3]=255;}
  sampler.tiles.set(Math.floor(t.x)+'/'+Math.floor(t.y),img);
  assert.equal(sampler.absolute(frame.lat,frame.lon),500);
});
test('Buildings are explicitly estimated unless height is recorded',()=>{
  assert.equal(getBuildingHeight({height:'13'}).estimated,false);
  assert.equal(getBuildingHeight({'building:levels':'3'}).estimated,true);
  assert.equal(getBuildingHeight({}).estimated,true);
});
test('Polygon geometry selection is stable',()=>{
  const p=[{x:-2,z:-2},{x:2,z:-2},{x:2,z:2},{x:-2,z:2}];
  assert.equal(polygonArea(p),16);
  assert.equal(pointInPolygon(0,0,p),true);
  assert.equal(pointInPolygon(5,5,p),false);
});
test('Verified city homepages and direct Wikipedia articles exist',()=>{
  const santa=cityByName('Santa Teresa di Riva');
  assert.equal(santa.official,'https://www.comune.santateresadiriva.me.it/');
  assert.equal(santa.wikipedia,'https://it.wikipedia.org/wiki/Santa_Teresa_di_Riva');
  assert.ok(cityInformation(santa).some(x=>x.label.includes('Stadtartikel')));
  assert.ok(cityInformation(santa).some(x=>x.label.includes('Gemeindewebsite')));
  assert.ok(cityByName('Palermo').official.includes('comune.palermo.it'));
});
test('A mapped landmark links to its nearest city, not every city in Sicily',()=>{
  const santa=cityForObject({kind:'Sehenswürdigkeit',lat:SANTA.lat+.001,lon:SANTA.lon+.001});
  assert.equal(santa.name,'Santa Teresa di Riva');
  assert.ok(isCityObject({name:SANTA.name,kind:'Ort'},santa));
  assert.equal(cityForObject({kind:'Geländepunkt',lat:35.8,lon:13.2}),null);
  assert.equal(cityForObject({kind:'Ort',name:'Furci Siculo',lat:37.954,lon:15.377}),null);
});
test('A random home does not inherit town history or invented construction dates',()=>{
  assert.deepEqual(contextualSources({...SANTA,kind:'Gebäude',name:'Unbekanntes Haus'}),[]);
  assert.deepEqual(officialKnowledge({...SANTA,kind:'Gebäude',name:'Haus 1'}),[]);
  assert.ok(contextualSources({...SANTA,kind:'Ort'}).length>=4);
});
test('Santa Teresa bus data and source links do not invent next departures',()=>{
  assert.ok(STOPS.length>=2);
  assert.ok(STOPS.every(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lon)));
  assert.ok(STOPS.every(s=>!('next_departure' in s)));
});
test('Weather remains model-based, with real current fields and no invented clear sky',()=>{
  const p=weatherParams(SANTA.lat,SANTA.lon);
  assert.ok(p.get('current').includes('temperature_2m'));
  assert.ok(p.get('current').includes('cloud_cover'));
  assert.ok(p.get('hourly').includes('precipitation_probability'));
  assert.equal(weatherLabel(null)[1],'Wetterwert fehlt');
});
test('Real street photography is discovery only, not an invented photo',()=>{
  const uri=streetImageryUrl(SANTA.lat,SANTA.lon);
  assert.match(uri,/mapillary\.com\/app/);
  assert.match(uri,/lat=37\.94533/);
  assert.ok(!uri.includes('image_key='));
});
test('Single-application knowledge shell has readable four tabs',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../atlas.js',import.meta.url),'utf8');
  for(const tab of ['overview','knowledge','sources','local']){
    assert.ok(html.includes('data-info-tab="'+tab+'"'));
    assert.ok(html.includes('data-info-pane="'+tab+'"'));
  }
  assert.match(html,/id="city-navigation"/);
  assert.match(html,/id="weather-summary"/);
  assert.match(js,/cityForObject/);
  assert.match(js,/openCityProfile/);
  assert.match(js,/street-perspective/);
});
test('The published app has no broken links to removed mini apps',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const js=readFileSync(new URL('../atlas.js',import.meta.url),'utf8');
  for(const route of ['walk.html','explore.html','airport.html']){
    assert.ok(!html.includes(route),'old mini-app route '+route);
    assert.ok(!js.includes("'./"+route),'old JS mini-app route '+route);
  }
  assert.match(html,/atlas\.js\?v=120/);
  assert.match(html,/atlas\.css\?v=120/);
});
