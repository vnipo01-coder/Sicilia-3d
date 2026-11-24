/* SICILIA 3D v10.7 – transparent thematic 3D building colors.
 * Categories are CARTOGRAPHIC colors, not claims about actual facade paint.
 * Exact heights are taken from feature tags when available; otherwise default
 * heights are visualization assumptions. */
export const BUILDING_THEMES=Object.freeze([
  {id:'architecture',label:'🏛️ Architektur',description:'Bekannte Funktion farblich codieren, fehlende Nutzungen dekorativ variieren'},
  {id:'height',label:'🌈 Gebäudehöhe',description:'Höhenklassen als Farblegende'},
  {id:'stone',label:'🪨 Naturstein',description:'Ruhige mediterrane Materialpalette'}
]);
const prop=(name)=>['get',name];
const toNum=(name)=>['to-number',prop(name),0];
export function heightExpression(local=false){
  if(local)return ['to-number',prop('height_m'),9.5];
  return ['case',
    ['>',toNum('render_height'),2],toNum('render_height'),
    ['>',toNum('height'),2],toNum('height'),
    ['>',toNum('building:levels'),0],['*',toNum('building:levels'),3.1],
    9.5];
}
/* A missing building tag used to make whole villages nearly beige. Use a
 * deterministic CARTOGRAPHIC fallback by actual feature ID, never as facade
 * measurement. At minimum the fallback is an obvious coral color. */
export function fallbackColorExpression(local=false){
  const id=['to-number',['coalesce',
    ['id'],['get','osm_id'],0],0];
  const color=['match',['%',id,7],
    0,'#f07f68',1,'#53bdd5',2,'#e9b74f',3,'#ad83d6',
    4,'#69c591',5,'#df84ae',6,'#83a9ee','#f07f68'];
  const knownHeight=heightExpression(local);
  return ['case',
    ['>',knownHeight,24],['interpolate',['linear'],knownHeight,
      24,'#a08bd5',45,'#648ad4',90,'#4e70a8'],
    color];
}
export function architectureColorExpression(local=false){
  const height=heightExpression(local);
  const type=['downcase',['to-string',['coalesce',prop('building'),prop('type'),'yes']]];
  const color=['match',type,
    'church','#ead486','cathedral','#f8d390','chapel','#e3bd84',
    'school','#7cbac8','university','#64acc4','college','#78aec6',
    'hospital','#96bfd7','civic','#80c0ad','public','#86c9b2',
    'industrial','#779dbd','warehouse','#749fbb',
    'commercial','#edaa83','retail','#ea9a79','supermarket','#e59672',
    'hotel','#df9baf','office','#cf9bad',
    'apartments','#d8898c','residential','#eab49d','house','#eac09d',
    'detached','#e4bd9b','farm','#bda96e','garage','#abb6ad',
    fallbackColorExpression(local)
  ];
  if(!local)return color;
  const material=['downcase',['to-string',['coalesce',prop('building:material'),'']]];
  const materialColor=['match',material,
    'stone','#c6b69b','sandstone','#d6be94','brick','#bd806f',
    'concrete','#b4bac0','plaster','#e4cdb7','wood','#ba9c7d',
    color];
  return ['case',
    ['boolean',prop('estimated'),false],color,
    materialColor];
}
export function heightColorExpression(local=false){
  return ['interpolate',['linear'],heightExpression(local),
    0,'#e7d5b5',7,'#a7d5bc',14,'#6abfbb',25,'#4b9ac4',
    45,'#8479c8',80,'#ce82ba',130,'#f0a262'];
}
export function naturalColorExpression(local=false){
  const height=heightExpression(local);
  return ['interpolate',['linear'],height,0,'#d4bd9a',
    12,'#c7a985',26,'#b09e8b',50,'#9e9c9b',100,'#80989d'];
}
export function buildingColorExpression(theme='architecture',local=false){
  if(theme==='height')return heightColorExpression(local);
  if(theme==='stone')return naturalColorExpression(local);
  return architectureColorExpression(local);
}
export const BUILDING_LEGENDS={
 architecture:[
  ['#ead486','Kirchen & Kapellen'],['#d8898c','Wohn- und Mehrfamilienhäuser'],
  ['#edaa83','Handel & Gewerbe'],['#7cbac8','Bildung & öffentliche Bauten'],
  ['#779dbd','Industrie & Lager'],['#f07f68','Nicht zugeordnet: illustrative Farbvariation']],
 height:[
  ['#a7d5bc','Niedrige Baukörper'],['#6abfbb','Mittlere Höhen'],
  ['#4b9ac4','Höhere Gebäude'],['#8479c8','Sehr hohe Gebäude']],
 stone:[
  ['#d4bd9a','Niedrige mediterrane Töne'],['#b09e8b','Mittlere Bauhöhe'],
  ['#80989d','Hohe Baukörper']]
};
export function colorNote(theme='architecture'){
  return theme==='height'
    ?'Farben zeigen relative Gebäudehöhen; fehlende Höhenangaben bleiben kartografische Schätzwerte.'
    :theme==='stone'
    ?'Ästhetische Materialpalette; keine Aussage über tatsächlich verwendeten Stein oder Fassadenfarbe.'
    :'Gebäudenutzung aus Kartentags, soweit bekannt. Bei unvollständigen Tags erzeugen Gebäude-IDs rein dekorative Farbunterschiede – keine tatsächliche Funktion oder Fassadenfarbe.';
}
