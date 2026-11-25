/* SICILIA Cesium Lab 0.2 – real, token-free elevation via public AWS/Mapzen
 * Terrarium 256px PNGs. Source DEM ≠ original survey of every building.
 * Direct client downloads depend on third-party CORS, rate limits and uptime.
 *
 * Uses Cesium.CustomHeightmapTerrainProvider with WebMercatorTilingScheme
 * so tile xyz agrees with Terrarium XYZ. DEM acquisition is preflight-checked.
 */
export const TERRARIUM_URL=
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
export const TERRARIUM_MAX_ZOOM=14;
export const TERRAIN_GRID=33;
const WEBMERCATOR_MAX=85.0511287798;
export function clamp(value,min,max){
  return Math.min(max,Math.max(min,Number(value)||0));
}
export function mercatorTile(lat,lon,z){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||
      !Number.isInteger(z)||z<0||z>20)throw Error('Ungültige DEM-Koordinaten');
  const latitude=clamp(lat,-WEBMERCATOR_MAX,WEBMERCATOR_MAX)*Math.PI/180;
  const n=2**z;
  const x=clamp(Math.floor((lon+180)/360*n),0,n-1);
  const y=clamp(Math.floor((1-Math.log(Math.tan(latitude)+1/Math.cos(latitude))/Math.PI)/2*n),0,n-1);
  return {x,y,z};
}
export function mercatorFraction(lat,lon,z){
  if(!Number.isFinite(lat)||!Number.isFinite(lon)||
      !Number.isInteger(z)||z<0||z>20)throw Error('Ungültiger Höhenpunkt');
  const latitude=clamp(lat,-WEBMERCATOR_MAX,WEBMERCATOR_MAX)*Math.PI/180;
  const n=2**z;
  const u=((lon+180)/360*n);
  const v=((1-Math.log(Math.tan(latitude)+1/Math.cos(latitude))/Math.PI)/2*n);
  return {x:Math.floor(u),y:Math.floor(v),u:u-Math.floor(u),v:v-Math.floor(v),z};
}
export function parentTile(x,y,z,cap=TERRARIUM_MAX_ZOOM){
  if(!Number.isInteger(x)||!Number.isInteger(y)||!Number.isInteger(z)||
    z<0||x<0||y<0)throw Error('Ungültige Tile-ID');
  const sourceZ=Math.min(z,cap),diff=z-sourceZ,scale=2**diff;
  const tileX=Math.floor(x/scale),tileY=Math.floor(y/scale);
  return {x:tileX,y:tileY,z:sourceZ,
    u0:(x-tileX*scale)/scale,v0:(y-tileY*scale)/scale,scale};
}
export function terrariumAltitude(r,g,b){
  return (r*256+g+b/256)-32768;
}
export function sampleTerrariumPixels(bytes,width,height,u,v){
  // Interpolate four original image pixels; preserves real encoded elevations.
  const px=clamp(u,0,1)*(width-1),py=clamp(v,0,1)*(height-1);
  const x0=Math.floor(px),y0=Math.floor(py);
  const x1=Math.min(width-1,x0+1),y1=Math.min(height-1,y0+1);
  const tx=px-x0,ty=py-y0;
  const z=(x,y)=>{
    const k=(y*width+x)*4;
    return terrariumAltitude(bytes[k],bytes[k+1],bytes[k+2]);
  };
  const a=z(x0,y0)*(1-tx)+z(x1,y0)*tx;
  const b=z(x0,y1)*(1-tx)+z(x1,y1)*tx;
  return a*(1-ty)+b*ty;
}
export function terrainGrid(image,{x,y,z},size=TERRAIN_GRID){
  const t=parentTile(x,y,z),result=new Float32Array(size*size);
  for(let j=0;j<size;j++){
    for(let i=0;i<size;i++){
      const u=t.u0+(i/(size-1))/t.scale;
      const v=t.v0+(j/(size-1))/t.scale;
      result[j*size+i]=sampleTerrariumPixels(
        image.data,image.width,image.height,u,v);
    }
  }
  return result;
}
export function tileUrl(x,y,z){
  return TERRARIUM_URL+z+'/'+x+'/'+y+'.png';
}
export async function loadTerrainPixels(x,y,z,{timeoutMs=11000}={}){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(tileUrl(x,y,z),{
      signal:controller.signal,mode:'cors',cache:'default'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const blob=await response.blob();
    const bitmap=await createImageBitmap(blob);
    const canvas=document.createElement('canvas');
    canvas.width=bitmap.width;canvas.height=bitmap.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('Canvas 2D nicht verfügbar');
    ctx.drawImage(bitmap,0,0);
    bitmap.close?.();
    const data=ctx.getImageData(0,0,canvas.width,canvas.height).data;
    if(data.length!==canvas.width*canvas.height*4)
      throw Error('DEM-Daten unvollständig');
    return {data,width:canvas.width,height:canvas.height};
  }finally{clearTimeout(timer);}
}
/* Explicit successful tile preflight, then limited in-memory cache. */
export async function prepareTerrarium(Cesium,{
  lat,lon,
  onStatus=()=>{}
}={}){
  if(typeof Cesium?.CustomHeightmapTerrainProvider!=='function')
    throw Error('Cesium CustomHeightmapTerrainProvider fehlt');
  if(typeof Cesium?.WebMercatorTilingScheme!=='function')
    throw Error('Cesium WebMercatorTilingScheme fehlt');
  const preflight=mercatorTile(lat,lon,12);
  onStatus('Geländemodell: prüfe echte Höhenkachel bei Santa Teresa …');
  const first=await loadTerrainPixels(preflight.x,preflight.y,preflight.z);
  const centre=mercatorFraction(lat,lon,12);
  const rawHeight=sampleTerrariumPixels(first.data,first.width,first.height,centre.u,centre.v);
  if(!Number.isFinite(rawHeight)||rawHeight< -500||rawHeight>4500)
    throw Error('Unplausible Geländehöhen aus AWS Terrarium');
  const cache=new Map();
  const cachePut=(key,promise)=>{
    if(cache.size>=110)cache.delete(cache.keys().next().value);
    cache.set(key,promise);
    return promise;
  };
  cachePut(preflight.z+'/'+preflight.x+'/'+preflight.y,Promise.resolve(first));
  let failures=0;
  const terrain=new Cesium.CustomHeightmapTerrainProvider({
    width:TERRAIN_GRID,height:TERRAIN_GRID,
    tilingScheme:new Cesium.WebMercatorTilingScheme(),
    credit:'Terrain: AWS/Mapzen Terrain Tiles (Terrarium) · Open Elevation Data',
    callback:async(x,y,level)=>{
      const t=parentTile(x,y,level);
      const key=t.z+'/'+t.x+'/'+t.y;
      let data=cache.get(key);
      if(!data)data=cachePut(key,loadTerrainPixels(t.x,t.y,t.z));
      try{
        const image=await data;
        return terrainGrid(image,{x,y,z:level});
      }catch(error){
        cache.delete(key);
        failures++;
        if(failures<=3)onStatus('Gelände: einzelne Kacheln nicht erreichbar. Parent-Ebene oder flacher Ersatz möglich. '+error.message);
        // Prevent constant provider retries, keep camera usable. A flat
        // fallback is explicitly reported and is not passed off as real DEM.
        return new Float32Array(TERRAIN_GRID*TERRAIN_GRID);
      }
    }
  });
  onStatus('Höhenkachel erfolgreich dekodiert; reale Reliefdaten werden geladen.');
  return {provider:terrain,preflightHeightMetres:rawHeight,
    get failureCount(){return failures;}};
}
