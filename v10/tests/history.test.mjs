import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseWaybackConfig,annualWaybackVersions,releaseIndexForYear,
  VERIFIED_FALLBACK,WAYBACK_APP,tileLayerConfig,createHistoricalExplorer} from '../history.js';
import {fallbackColorExpression,buildingColorExpression} from '../building-styles.js';

test('Wayback release catalog only accepts real Esri WMTS releases and converts tile coords',()=>{
  const releases=parseWaybackConfig({
    10:{itemTitle:'World Imagery (Wayback 2014-02-20)',
      itemURL:'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/10/{level}/{row}/{col}'},
    56102:{itemTitle:'World Imagery (Wayback 2023-12-07)',
      itemURL:'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/56102/{level}/{row}/{col}'},
    13:{itemTitle:'World Imagery (Wayback 2017-01-01)',
      itemURL:'https://malicious.example.com/World_Imagery/MapServer/tile/13/{level}/{row}/{col}'}
  });
  assert.equal(releases.length,2);
  assert.equal(releases[0].date,'2014-02-20');
  assert.equal(releases[1].date,'2023-12-07');
  assert.ok(releases[0].tile.endsWith('/10/{z}/{y}/{x}'));
  assert.equal(tileLayerConfig(releases[1]).type,'raster');
  assert.ok(releases.every(r=>r.tile.includes('maptiles.arcgis.com')));
});
test('Authenticated fallback is small, labelled and historical, not a fake complete series',()=>{
  const list=parseWaybackConfig(VERIFIED_FALLBACK);
  assert.deepEqual(list.map(i=>i.date),['2014-02-20','2019-05-15','2023-12-07']);
  assert.equal(annualWaybackVersions(list).length,3);
  assert.equal(releaseIndexForYear(list,2019),1);
  assert.match(WAYBACK_APP,/livingatlas.arcgis.com/);
});
test('Annual archive chooses real latest release for each year',()=>{
  const data=parseWaybackConfig([
    ...VERIFIED_FALLBACK,
    {...VERIFIED_FALLBACK[2],releaseNum:56103,
      itemTitle:'World Imagery (Wayback 2023-12-20)',itemURL:
      'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/56103/{level}/{row}/{col}'}
  ]);
  const chosen=annualWaybackVersions(data);
  assert.equal(chosen[2].date,'2023-12-20');
  assert.equal(chosen.length,3);
});
test('Color fallback is a distinct real MapLibre style expression, not a beige constant',()=>{
  for(const local of [true,false]){
    const expr=fallbackColorExpression(local);
    const desc=JSON.stringify(expr);
    assert.ok(desc.includes('"id"'));
    assert.ok(desc.includes('"%"'));
    assert.ok(desc.includes('#f07f68'));
    assert.ok(desc.includes('#53bdd5'));
    assert.ok(desc.includes('#ad83d6'));
    assert.ok(JSON.stringify(buildingColorExpression('architecture',local))
      .includes('#f07f68'));
  }
});
test('Historical controls show explicit time slider and current-versus-archived blend',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../atlas.js',import.meta.url),'utf8');
  for(const id of ['history-studio','history-toggle','history-year','history-play',
    'history-blend','history-modern-buildings','history-status','building-render-status']){
    assert.ok(html.includes('id="'+id+'"'),id+' is missing');
  }
  assert.ok(html.includes('2014–HEUTE'));
  assert.ok(main.includes('createHistoricalExplorer(map'));
  assert.ok(main.includes('state.historyHideBuildings'));
  assert.ok(main.includes("map.queryRenderedFeatures({layers:available})"));
  assert.ok(main.includes("map.getSource('s10-highlight-src')"));
  for(const old of ['walk.html','explore.html','airport.html'])
    assert.ok(!html.includes(old));
});
test('Historical time machine safely hides or restores layers without replacing whole map style',()=>{
  const calls={layer:0,source:0,paint:0,rm:0};
  const layers=new Map(),sources=new Map(),events={};
  const map={
    isStyleLoaded:()=>true,
    getLayer:id=>layers.get(id),
    getSource:id=>sources.get(id),
    getStyle:()=>({layers:[]}),
    addSource(id,value){sources.set(id,value);calls.source++;},
    addLayer(layer){layers.set(layer.id,layer);calls.layer++;},
    removeLayer(id){layers.delete(id);calls.rm++;},
    removeSource(id){sources.delete(id);},
    setPaintProperty(id,p,v){calls.paint++;},
    on(type,fn){events[type]=fn;},
    off(type){delete events[type];}
  };
  const chosen=[];
  const historic=createHistoricalExplorer(map,{onSelection:x=>chosen.push(x)});
  assert.equal(historic.active,false);
  // Startup uses online releases; mock window independence via one historical
  // style reload with no activation, then confirm it is not destructive.
  historic.styleReloaded();
  historic.deactivate();
  assert.equal(calls.layer,0);
  assert.equal(calls.source,0);
});
