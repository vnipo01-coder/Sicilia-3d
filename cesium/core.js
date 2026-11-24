/* SICILIA 3D · Cesium pilot | Pure geometry & evidence rules.
   OSM polygon footprint + documented/estimated height is NOT photogrammetry.
*/
export const PILOT = Object.freeze({
  name:"Santa Teresa di Riva", lat:37.94533,lon:15.36830,radius:750,
  north:37.9533,south:37.9375,east:15.3825,west:15.3530
});
export const PLACES = Object.freeze([
  {id:"municipio",name:"Municipio · Ortszentrum",lat:37.94533,lon:15.36830,height:700,heading:300,pitch:-42},
  {id:"lungomare",name:"Lungomare · Uferzone",lat:37.939354,lon:15.362817,height:340,heading:35,pitch:-31},
  {id:"savoca",name:"Via Savoca · Strassenraum",lat:37.941755,lon:15.359660,height:285,heading:155,pitch:-33},
  {id:"overview",name:"Küste und Hinterland",lat:37.9480,lon:15.3610,height:2900,heading:12,pitch:-55}
]);
export const SOURCE_LINKS = Object.freeze({
  osm:"https://www.openstreetmap.org/",
  comune:"https://www.comune.santateresadiriva.me.it/",
  culture:"https://www.comune.santateresadiriva.me.it/it/topics/turismo",
  wikidata:"https://www.wikidata.org/",
  mapillary:"https://www.mapillary.com/app/",
  lidar1:"https://www.dati.gov.it/node/view-dataset/dataset?id=ffad6512-1854-4e4d-bfec-bd867d8b18dc",
  lidar2:"https://www.dati.gov.it/node/view-dataset/dataset?id=92dda1ec-a252-466d-9f1e-4bb6c0fff2ef"
});
export const BUILDING_COLORS = Object.freeze([
  "#e6b88d","#d7a0a1","#e0c49c","#a6c3c2","#c9adca","#d1ba89",
  "#8fb6b5","#dca384","#aebbb0"
]);
const HEIGHT_PATTERN=/^\s*(-?\d+(?:[.,]\d+)?)\s*(?:m|metres|meters)?\s*$/i;
export function parseMetres(value){
  if(typeof value==="number")return Number.isFinite(value)&&value>0&&value<250?value:null;
  const match=HEIGHT_PATTERN.exec(String(value??""));
  if(!match)return null;
  const n=Number(match[1].replace(",","."));
  return Number.isFinite(n)&&n>0&&n<250?n:null;
}
export function buildingHeight(tags={}){
  const direct=parseMetres(tags.height);
  if(direct!==null)return {metres:direct,estimated:false,basis:"OSM height"};
  const levels=Number(String(tags["building:levels"]??"").replace(",","."));
  if(Number.isFinite(levels)&&levels>0&&levels<65)
    return {metres:Math.min(levels*3.1,200),estimated:true,basis:"Geschosszahl × 3,1 m"};
  return {metres:9.5,estimated:true,basis:"Modellannahme 9,5 m"};
}
export function polygonAreaMetres(points){
  if(points.length<3)return 0;
  const midLat=points.reduce((s,p)=>s+p.lat,0)/points.length;
  const kx=111320*Math.cos(midLat*Math.PI/180),ky=111320;
  let a=0;
  for(let i=0;i<points.length;i++){
    const p=points[i],q=points[(i+1)%points.length];
    a+=(p.lon*kx)*(q.lat*ky)-(q.lon*kx)*(p.lat*ky);
  }
  return Math.abs(a)/2;
}
export function normalizeRing(geometry){
  if(!Array.isArray(geometry))return null;
  const points=[];
  for(const p of geometry){
    if(!Number.isFinite(p?.lat)||!Number.isFinite(p?.lon))continue;
    if(p.lat<35.2||p.lat>39.2||p.lon<11.3||p.lon>16.6)return null;
    if(points.length===0||Math.abs(points.at(-1).lat-p.lat)>1e-8||
       Math.abs(points.at(-1).lon-p.lon)>1e-8)
      points.push({lat:p.lat,lon:p.lon});
  }
  if(points.length>=4&&Math.abs(points[0].lat-points.at(-1).lat)<1e-8&&
     Math.abs(points[0].lon-points.at(-1).lon)<1e-8)points.pop();
  return points.length>=3&&polygonAreaMetres(points)>4?points:null;
}
export function hashId(value){
  let h=2166136261;
  for(const code of String(value)){
    h^=code.charCodeAt(0);h=Math.imul(h,16777619);
  }
  return h>>>0;
}
export function buildingColor(id,tags={}){
  const color=String(tags["building:colour"]||"").trim().toLowerCase();
  if(/^#[0-9a-f]{6}$/.test(color))return {hex:color,documented:true};
  const type=String(tags.building||"").toLowerCase();
  if(["church","cathedral","chapel"].includes(type))return {hex:"#d8c588",documented:false};
  if(["industrial","warehouse"].includes(type))return {hex:"#95a8be",documented:false};
  if(["school","university","civic","public"].includes(type))return {hex:"#90bcb4",documented:false};
  return {hex:BUILDING_COLORS[hashId(id)%BUILDING_COLORS.length],documented:false};
}
export function isInsidePilot(lat,lon){
  return Number.isFinite(lat)&&Number.isFinite(lon)&&
    lat>=PILOT.south&&lat<=PILOT.north&&lon>=PILOT.west&&lon<=PILOT.east;
}
export function parseOsmElements(json,{limit=900}={}){
  const results={buildings:[],roads:[],trees:[],stops:[],invalid:0};
  const elements=Array.isArray(json?.elements)?json.elements:[];
  for(const el of elements){
    const tags=el?.tags||{},id=String(el.type||"")+"/"+String(el.id||"");
    if(el.type==="way"&&tags.building){
      const ring=normalizeRing(el.geometry);
      if(!ring){results.invalid++;continue;}
      if(results.buildings.length>=limit)continue;
      const h=buildingHeight(tags),color=buildingColor(id,tags);
      results.buildings.push({id,ring,tags,height:h,color,area:polygonAreaMetres(ring)});
    }else if(el.type==="way"&&tags.highway&&Array.isArray(el.geometry)){
      if(results.roads.length>=350)continue;
      const points=el.geometry.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon))
        .map(p=>({lat:p.lat,lon:p.lon}));
      if(points.length>1)results.roads.push({id,points,type:tags.highway,name:tags.name||""});
    }else if(el.type==="node"&&tags.highway==="bus_stop"){
      if(isInsidePilot(el.lat,el.lon)&&results.stops.length<30)
        results.stops.push({id,lat:el.lat,lon:el.lon,name:tags.name||"Bushaltestelle",tags});
    }else if(el.type==="node"&&tags.natural==="tree"){
      if(isInsidePilot(el.lat,el.lon)&&results.trees.length<80)
        results.trees.push({id,lat:el.lat,lon:el.lon,tags});
    }
  }
  return results;
}
export function overpassQuery({lat=PILOT.lat,lon=PILOT.lon,radius=PILOT.radius}={}){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||radius<100||radius>1200)
    throw Error("Ungültiger Pilotdatenbereich");
  const around="(around:"+Math.round(radius)+","+lat.toFixed(5)+","+lon.toFixed(5)+")";
  return '[out:json][timeout:24];('+
    'way'+around+'["building"];'+
    'way'+around+'["highway"~"^(residential|tertiary|secondary|footway|pedestrian|service|living_street|path)$"];'+
    'node'+around+'["highway"="bus_stop"];'+
    'node'+around+'["natural"="tree"];'+
    ');out geom;';
}
export const OVERPASS_ENDPOINTS=Object.freeze([
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter"
]);
export async function fetchPilotOsm({signal,endpoint=OVERPASS_ENDPOINTS}={}){
  const q=overpassQuery();
  let failure;
  for(const url of endpoint){
    const control=new AbortController(),timer=setTimeout(()=>control.abort(),18000);
    const onCancel=()=>control.abort();
    signal?.addEventListener("abort",onCancel,{once:true});
    try{
      const response=await fetch(url,{
        method:"POST",headers:{"content-type":"application/x-www-form-urlencoded;charset=UTF-8"},
        body:"data="+encodeURIComponent(q),signal:control.signal
      });
      if(!response.ok)throw Error("Overpass HTTP "+response.status);
      const data=parseOsmElements(await response.json());
      if(!data.buildings.length&&!data.roads.length)throw Error("OSM liefert keine lokalen Geodaten");
      return {...data,source:url,fetchedAt:new Date().toISOString()};
    }catch(e){failure=e;if(signal?.aborted)throw e;}
    finally{clearTimeout(timer);signal?.removeEventListener("abort",onCancel);}
  }
  throw new Error("OSM-Datenserver nicht erreichbar: "+String(failure?.message||"unbekannt"));
}
