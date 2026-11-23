/* SICILIA 3D v10.1 | shared geospatial functions.
   Terrain is source-backed; never silently manufacture altitudes. */
export const SICILY = Object.freeze({minLat:35.7,maxLat:39.25,minLon:11.35,maxLon:16.5});
export const METRES_PER_DEGREE=111320;
export const TERRARIUM_URL='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
export const statusText=(value)=>value===null||value===undefined?'nicht verfügbar':String(value);
export function isSicily(lat,lon){
  return Number.isFinite(lat)&&Number.isFinite(lon)&&lat>=SICILY.minLat&&
    lat<=SICILY.maxLat&&lon>=SICILY.minLon&&lon<=SICILY.maxLon;
}
export function readLocation(search=location.search){
  const p=new URLSearchParams(search);
  const lat=Number(p.get('lat')),lon=Number(p.get('lng'));
  const valid=p.has('lat')&&p.has('lng')&&isSicily(lat,lon);
  return {lat:valid?lat:37.95736,lon:valid?lon:15.32230,
    name:(p.get('name')||'Casalvecchio Siculo').slice(0,75),custom:valid};
}
export class GeoFrame{
  constructor(lat,lon){
    this.lat=lat;this.lon=lon;
    this.mLon=METRES_PER_DEGREE*Math.cos(lat*Math.PI/180);
  }
  local(lon,lat){return{x:(lon-this.lon)*this.mLon,z:-(lat-this.lat)*METRES_PER_DEGREE};}
  geo(x,z){return{lon:this.lon+x/this.mLon,lat:this.lat-z/METRES_PER_DEGREE};}
}
export function tileXY(lat,lon,z){
  const n=2**z,phi=Math.min(85,Math.max(-85,lat))*Math.PI/180;
  return{x:(lon+180)/360*n,y:(1-Math.log(Math.tan(phi)+1/Math.cos(phi))/Math.PI)*n/2};
}
function decode(imageData,i){return imageData[i]*256+imageData[i+1]+imageData[i+2]/256-32768;}
function timeoutFetch(url,timeout=8500,options={}){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeout);
  return fetch(url,{...options,signal:ac.signal}).finally(()=>clearTimeout(timer));
}
export class TerrainDEM{
  constructor(frame,zoom=14){this.frame=frame;this.zoom=zoom;this.tiles=new Map();
    this.center=null;this.loaded=0;this.attempted=0;}
  async load(radius=480){
    const corners=[[-radius,-radius],[-radius,radius],[radius,-radius],[radius,radius]];
    const cells=corners.map(([x,z])=>{
      const p=this.frame.geo(x,z);return tileXY(p.lat,p.lon,this.zoom);
    });
    const x0=Math.floor(Math.min(...cells.map(p=>p.x)));
    const x1=Math.floor(Math.max(...cells.map(p=>p.x)));
    const y0=Math.floor(Math.min(...cells.map(p=>p.y)));
    const y1=Math.floor(Math.max(...cells.map(p=>p.y)));
    const all=[];this.attempted=0;this.loaded=0;
    for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){
      if(all.length>=16)break;
      all.push([x,y]);this.attempted++;
    }
    await Promise.allSettled(all.map(async([x,y])=>{
      try{
        const url=TERRARIUM_URL+this.zoom+'/'+x+'/'+y+'.png';
        const r=await timeoutFetch(url,9000,{mode:'cors'});
        if(!r.ok)throw Error('DEM HTTP '+r.status);
        const blob=await r.blob();
        const bmp=await createImageBitmap(blob);
        const cv=document.createElement('canvas');cv.width=256;cv.height=256;
        const ctx=cv.getContext('2d',{willReadFrequently:true});
        ctx.drawImage(bmp,0,0,256,256);bmp.close();
        this.tiles.set(x+'/'+y,ctx.getImageData(0,0,256,256).data);this.loaded++;
      }catch(err){console.warn('SICILIA DEM',x,y,String(err));}
    }));
    this.center=this.absolute(this.frame.lat,this.frame.lon);
    return{loaded:this.loaded,attempted:this.attempted,center:this.center,valid:this.center!==null};
  }
  getPixel(tx,ty,px,py){
    const img=this.tiles.get(tx+'/'+ty);
    if(!img)return null;
    const x=Math.max(0,Math.min(255,px)),y=Math.max(0,Math.min(255,py));
    const i=(y*256+x)*4,val=decode(img,i);
    return Number.isFinite(val)&&val>-500&&val<4600?val:null;
  }
  absolute(lat,lon){
    const p=tileXY(lat,lon,this.zoom),tx=Math.floor(p.x),ty=Math.floor(p.y);
    const fx=(p.x-tx)*256,fy=(p.y-ty)*256,ix=Math.floor(fx),iy=Math.floor(fy);
    const u=fx-ix,v=fy-iy;
    const get=(dx,dy)=>{
      const xx=ix+dx,yy=iy+dy,ox=xx<0?-1:xx>255?1:0,oy=yy<0?-1:yy>255?1:0;
      return this.getPixel(tx+ox,ty+oy,(xx+256)%256,(yy+256)%256);
    };
    const a=get(0,0),b=get(1,0),c=get(0,1),d=get(1,1);
    if([a,b,c,d].every(x=>x!==null))
      return (1-v)*((1-u)*a+u*b)+v*((1-u)*c+u*d);
    return a??b??c??d??null;
  }
  height(x,z){
    if(this.center===null)return null;
    const p=this.frame.geo(x,z),h=this.absolute(p.lat,p.lon);
    return h===null?null:h-this.center;
  }
}
export function polygonArea(points){
  if(points.length<3)return 0;
  let sum=0;
  for(let i=0;i<points.length;i++){
    const a=points[i],b=points[(i+1)%points.length];
    sum+=a.x*b.z-b.x*a.z;
  }
  return Math.abs(sum/2);
}
export function pointInPolygon(x,z,points){
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++){
    const a=points[i],b=points[j];
    if((a.z>z)!==(b.z>z)&&x<(b.x-a.x)*(z-a.z)/(b.z-a.z)+a.x)inside=!inside;
  }
  return inside;
}
export function getRoadWidth(tags={}){
  const type=tags.highway;
  const specified=Number.parseFloat(tags.width);
  if(Number.isFinite(specified)&&specified>=1&&specified<=30)return specified;
  return ({primary:9,secondary:7,tertiary:6,residential:4.3,
    living_street:3.4,pedestrian:3.5,footway:1.7,path:1.5,steps:1.6,
    service:3.5,track:2.5})[type]??3;
}
export function getBuildingHeight(tags={}){
  const explicit=Number.parseFloat(tags.height);
  if(Number.isFinite(explicit)&&explicit>=2&&explicit<=100)
    return{metres:explicit,source:'OSM: height',estimated:false};
  const levels=Number.parseFloat(tags['building:levels']);
  if(Number.isFinite(levels)&&levels>=1&&levels<=25)
    return{metres:levels*3.1,source:'OSM-Geschosse × 3,1 m',estimated:true};
  const isChurch=tags.building==='church'||tags.building==='cathedral'||
    tags.amenity==='place_of_worship';
  return{metres:isChurch?11:7.3,source:isChurch?'Typologie-Schätzung':'Standard-Modellhöhe',estimated:true};
}
export function propertyRows(tags={}){
  const fields=[['Name',tags.name],['Gebäudetyp',tags.building],
    ['Strasse',tags['addr:street']],['Hausnummer',tags['addr:housenumber']],
    ['Stockwerke',tags['building:levels']],['Höhe',tags.height],
    ['Bauzeit',tags.start_date||tags['building:year_built']],
    ['Dach',tags['roof:shape']],['Fassadenfarbe',tags['building:colour']],['Dachfarbe',tags['roof:colour']],['Material',tags['building:material']],
    ['Architekt',tags.architect],['Wikidata',tags.wikidata]];
  return fields.filter(([,v])=>v!==undefined&&v!==null&&String(v).trim()!=='');
}
export async function getLocalOSM(lat,lon,radius=360){
  // One browser cache per source location helps respect public Overpass limits.
  // A production deployment will require a server-side cached OSM extract.
  const cacheKey='sicilia-v10-osm-v2:'+lat.toFixed(4)+':'+lon.toFixed(4)+':'+radius;
  try{
    const raw=localStorage.getItem(cacheKey);
    if(raw){
      const cached=JSON.parse(raw);
      if(Date.now()-cached.timestamp<24*60*60*1000&&Array.isArray(cached.elements)){
        return{elements:cached.elements,endpoint:'Lokaler Browser-Cache (OSM)',
          queriedAt:new Date(cached.timestamp).toISOString()};
      }
    }
  }catch(error){/* localStorage may be blocked; continue without caching */}
  const q='[out:json][timeout:12];(way(around:'+radius+','+lat+','+lon+
    ')["building"];way(around:'+radius+','+lat+','+lon+')["highway"];' +
    'way(around:'+radius+','+lat+','+lon+')["amenity"="place_of_worship"];' +
    'node(around:'+radius+','+lat+','+lon+')["highway"="street_lamp"];' +
    'node(around:'+radius+','+lat+','+lon+')["highway"="bus_stop"];' +
    ');out geom;';
  const errors=[];
  for(const endpoint of ['https://overpass.private.coffee/api/interpreter',
                         'https://overpass-api.de/api/interpreter']){
    try{
      const r=await timeoutFetch(endpoint+'?data='+encodeURIComponent(q),13500,{
        headers:{'Accept':'application/json'}});
      if(!r.ok)throw Error('HTTP '+r.status);
      const data=await r.json();
      if(!Array.isArray(data.elements))throw Error('ungültige Daten');
      const timestamp=Date.now();
      try{
        const serialized=JSON.stringify({timestamp,elements:data.elements});
        if(serialized.length<1500000)localStorage.setItem(cacheKey,serialized);
      }catch(error){/* Ignore quota or storage restrictions */}
      return{elements:data.elements,endpoint,queriedAt:new Date(timestamp).toISOString()};
    }catch(err){errors.push(String(err));}
  }
  throw new Error('OSM-Server derzeit nicht erreichbar: '+errors.join('; ').slice(0,180));
}
export function validateGeo(){
  const frame=new GeoFrame(37.95736,15.3223),p=frame.geo(140,-65),
    back=frame.local(p.lon,p.lat);
  if(Math.abs(back.x-140)>0.001||Math.abs(back.z+65)>0.001)throw Error('GeoFrame roundtrip');
  if(getBuildingHeight({height:'11.5'}).metres!==11.5)throw Error('Building height');
  if(!pointInPolygon(0,0,[{x:-1,z:-1},{x:1,z:-1},{x:1,z:1},{x:-1,z:1}]))
    throw Error('point-in-polygon');
  return true;
}
