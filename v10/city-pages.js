/* SICILIA 3D v10.6 — direct city homepages, not search-result URLs.
   Only link official municipality domains confirmed for named cities. */
export const CITY_PAGES=Object.freeze([
  {name:'Santa Teresa di Riva',lat:37.94533,lon:15.36830,radius:2400,
    wikipedia:'https://it.wikipedia.org/wiki/Santa_Teresa_di_Riva',
    wikipediaDe:'https://de.wikipedia.org/wiki/Santa_Teresa_di_Riva',
    official:'https://www.comune.santateresadiriva.me.it/',
    wikidata:'https://www.wikidata.org/wiki/Q498938'},
  {name:'Palermo',lat:38.1157,lon:13.3615,radius:7000,
    wikipedia:'https://it.wikipedia.org/wiki/Palermo',
    official:'https://www.comune.palermo.it/'},
  {name:'Catania',lat:37.5028,lon:15.0873,radius:5500,
    wikipedia:'https://it.wikipedia.org/wiki/Catania',
    official:'https://www.comune.catania.it/'},
  {name:'Taormina',lat:37.852,lon:15.288,radius:2100,
    wikipedia:'https://it.wikipedia.org/wiki/Taormina',
    official:'https://www.comune.taormina.me.it/'},
  {name:'Casalvecchio Siculo',lat:37.95736,lon:15.32230,radius:1100,
    wikipedia:'https://it.wikipedia.org/wiki/Casalvecchio_Siculo',
    official:'https://comune.casalvecchiosiculo.me.it/'},
  {name:'Messina',lat:38.1938,lon:15.554,radius:5200,
    wikipedia:'https://it.wikipedia.org/wiki/Messina'},
  {name:'Siracusa',lat:37.063,lon:15.293,radius:4500,
    wikipedia:'https://it.wikipedia.org/wiki/Siracusa'},
  {name:'Ragusa',lat:36.925,lon:14.728,radius:3600,
    wikipedia:'https://it.wikipedia.org/wiki/Ragusa'},
  {name:'Noto',lat:36.891,lon:15.070,radius:2300,
    wikipedia:'https://it.wikipedia.org/wiki/Noto_(Italia)'},
  {name:'Agrigento',lat:37.3111,lon:13.5766,radius:3500,
    wikipedia:'https://it.wikipedia.org/wiki/Agrigento'},
  {name:'Trapani',lat:38.0176,lon:12.535,radius:3500,
    wikipedia:'https://it.wikipedia.org/wiki/Trapani'},
  {name:'Enna',lat:37.566,lon:14.278,radius:3000,
    wikipedia:'https://it.wikipedia.org/wiki/Enna'}
]);
function metres(lat1,lon1,lat2,lon2){
  const toRad=Math.PI/180,dLat=(lat2-lat1)*toRad,dLon=(lon2-lon1)*toRad;
  const x=Math.sin(dLat/2)**2+
    Math.cos(lat1*toRad)*Math.cos(lat2*toRad)*Math.sin(dLon/2)**2;
  return 12742000*Math.asin(Math.min(1,Math.sqrt(x)));
}
export function cityByName(name){
  const text=String(name||'').toLocaleLowerCase('it').trim();
  return CITY_PAGES.find(c=>c.name.toLocaleLowerCase('it')===text)||null;
}
export function cityForObject(obj){
  if(!obj||!Number.isFinite(obj.lat)||!Number.isFinite(obj.lon))return null;
  const direct=obj.kind==='Ort'?cityByName(obj.name):null;
  if(direct&&metres(direct.lat,direct.lon,obj.lat,obj.lon)<=Math.max(direct.radius,1800))
    return direct;
  const matches=CITY_PAGES.map(c=>({...c,distance:metres(c.lat,c.lon,obj.lat,obj.lon)}))
    .filter(c=>c.distance<=c.radius);
  matches.sort((a,b)=>a.distance-b.distance);
  return matches[0]||null;
}
export function isCityObject(obj,city){
  return Boolean(city&&cityByName(obj?.name)?.name===city.name&&obj?.kind==='Ort');
}
export function cityInformation(city){
  if(!city)return [];
  return [
    {label:'Wikipedia – Stadtartikel',url:city.wikipedia},
    ...(city.wikipediaDe?[{label:'Wikipedia – Deutsch',url:city.wikipediaDe}]:[]),
    ...(city.official?[{label:'Offizielle Stadt-/Gemeindewebsite',url:city.official}]:[]),
    ...(city.wikidata?[{label:'Wikidata',url:city.wikidata}]:[])
  ];
}
