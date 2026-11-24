import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {architectureProfilesFor,architectureProperties,MATERIAL_NOTE} from '../architecture.js';
import {buildingColorExpression,BUILDING_THEMES,BUILDING_LEGENDS,
  heightExpression,colorNote} from '../building-styles.js';
import {cloudDrift,cloudOpacity} from '../clouds.js';
import {FLIGHT_STOPS,tourDurationMs,makeFlightTour} from '../flight-tour.js';
import {SANTA} from '../local-sources.js';
import {cityByName} from '../city-pages.js';
import {weatherParams} from '../weather.js';

test('3D building themes are stable named categorical map expressions',()=>{
  assert.deepEqual(BUILDING_THEMES.map(t=>t.id),['architecture','height','stone']);
  for(const theme of BUILDING_THEMES){
    const vector=buildingColorExpression(theme.id,false);
    const local=buildingColorExpression(theme.id,true);
    assert.ok(Array.isArray(vector));
    assert.ok(Array.isArray(local));
    assert.ok(BUILDING_LEGENDS[theme.id].length>=3);
    assert.ok(colorNote(theme.id).length>35);
  }
  assert.equal(heightExpression(true)[0],'to-number');
  assert.equal(heightExpression(false)[0],'case');
});
test('Source-backed architectural scholarship is tied to cities and landmarks',()=>{
  const town={name:SANTA.name,kind:'Ort',lat:SANTA.lat,lon:SANTA.lon};
  const region=architectureProfilesFor(town);
  assert.ok(region.some(x=>x.id==='santa-urban'));
  assert.ok(region[0].paragraphs.every(p=>p.length>80));
  const church=architectureProfilesFor({name:'Chiesa del Sacro Cuore di Gesù',
    kind:'Gebäude',lat:SANTA.lat,lon:SANTA.lon});
  assert.ok(church.some(x=>x.id==='santa-sacro'));
  assert.ok(church[0].sources[0].url.includes('comune.santateresadiriva'));
  assert.equal(architectureProfilesFor({name:'Unnamed home',kind:'Gebäude',
    lat:SANTA.lat,lon:SANTA.lon}).length,0);
});
test('Architecture readings extend to certified UNESCO cities but not random buildings',()=>{
  const palermo=cityByName('Palermo');
  const docs=architectureProfilesFor({name:'Palermo',kind:'Ort',
    lat:palermo.lat,lon:palermo.lon});
  assert.ok(docs.some(x=>x.id==='palermo-norman'));
  const noto=cityByName('Noto');
  assert.ok(architectureProfilesFor({name:'Noto',kind:'Ort',lat:noto.lat,lon:noto.lon})
    .some(p=>p.id==='baroque-noto'));
  assert.match(MATERIAL_NOTE,/keine historischen Befunde/);
  for(const [place,id] of [['Siracusa','siracusa-strata'],['Taormina','taormina-teatro'],['Agrigento','agrigento-valle']]){
    const c=cityByName(place);
    const docs=architectureProfilesFor({name:place,kind:'Ort',lat:c.lat,lon:c.lon});
    assert.ok(docs.some(p=>p.id===id),place+' architectural source dossier');
    assert.ok(docs.some(p=>p.sources.some(x=>x.url.startsWith('https://'))));
  }
});
test('Real building metadata is distinguished from missing roof dimensions',()=>{
  const props=architectureProperties({
    'building:material':'stone','roof:shape':'gabled','building:levels':'3'
  });
  assert.ok(props.some(p=>p.label==='Fassadenmaterial'&&p.source==='OpenStreetMap'));
  assert.ok(!props.some(p=>p.label==='Dachhöhe'));
  assert.ok(architectureProperties({}).length===0);
});
test('Wind drift follows meteorological FROM-to-TO conversion',()=>{
  const west=cloudDrift(270,24,0);
  assert.ok(west.x>0);
  const north=cloudDrift(0,24,0);
  assert.ok(north.y>0);
  assert.equal(cloudOpacity(0),0);
  assert.ok(cloudOpacity(85)>.2);
  assert.ok(cloudOpacity(85,.5)<cloudOpacity(85,1));
});
test('Guided tour contains all major coasts and summit viewpoints',()=>{
  assert.equal(FLIGHT_STOPS.length,11);
  assert.ok(FLIGHT_STOPS.some(s=>s.name.includes('Ätna')));
  assert.ok(FLIGHT_STOPS.some(s=>s.name.includes('Palermo')));
  assert.ok(FLIGHT_STOPS.some(s=>s.name.includes('Siracusa')));
  assert.equal(tourDurationMs(1),8000);
  assert.equal(tourDurationMs(2),4000);
});
test('Camera tour can start and cancel safely without real flight telemetry',()=>{
  let moves=0,stops=0;
  const canvas={addEventListener(){},removeEventListener(){}};
  const map={on(){},off(){},getCanvas(){return canvas;},
    flyTo(p){moves++;assert.ok(p.center.length===2);},
    stop(){stops++;}
  };
  const tour=makeFlightTour(map);
  tour.start(1.5);
  assert.equal(tour.active,true);
  assert.equal(moves,1);
  tour.stop();
  assert.equal(tour.active,false);
  assert.equal(stops,1);
  tour.destroy();
});
test('Real Open-Meteo model supplies wind direction, no invented telemetry',()=>{
  const params=weatherParams(SANTA.lat,SANTA.lon);
  assert.match(params.get('current'),/wind_direction_10m/);
  assert.match(params.get('current'),/cloud_cover/);
});
test('Visual controls are integrated with existing reliable atlas only',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const atlas=readFileSync(new URL('../atlas.js',import.meta.url),'utf8');
  for(const id of ['weather-clouds','sky-studio','cloud-toggle','tour-toggle',
    'building-theme','building-legend','cloud-opacity','tour-speed','demo-clouds']){
    assert.ok(html.includes('id="'+id+'"'),id+' missing');
  }
  assert.match(atlas,/clouds\.setWeather\(raw\.current\)/);
  assert.match(atlas,/makeFlightTour/);
  assert.match(atlas,/buildingColorExpression/);
  assert.match(atlas,/architectureProfilesFor/);
  for(const old of ['airport.html','explore.html','walk.html'])
    assert.ok(!html.includes(old),'retired mini app must stay removed');
});
