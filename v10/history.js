/* SICILIA 3D v10.8 – genuine Esri World Imagery Wayback release history.
   Release dates ARE NOT aerial image acquisition dates.
   Historical raster maps are not historical building models.
   All tiles and catalog records come from Esri's published Wayback archive.
*/
export const WAYBACK_CONFIGS=[
  'https://s3-us-west-2.amazonaws.com/config.maptiles.arcgis.com/waybackconfig.json',
  'https://config.maptiles.arcgis.com/waybackconfig.json'
];
export const WAYBACK_APP='https://livingatlas.arcgis.com/wayback/';
/* These three release identifiers are documented in public Esri/Wayback
   sources. This is an intentionally SMALL fallback, not an annual archive. */
export const VERIFIED_FALLBACK=Object.freeze([
  {itemTitle:'World Imagery (Wayback 2014-02-20)',releaseNum:10},
  {itemTitle:'World Imagery (Wayback 2019-05-15)',releaseNum:9598},
  {itemTitle:'World Imagery (Wayback 2023-12-07)',releaseNum:56102}
].map(item=>({
  ...item,
  itemURL:'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/'+item.releaseNum+'/{level}/{row}/{col}'
})));

const DATE=/((?:19|20)\d{2})-(\d{2})-(\d{2})/;
export function parseWaybackConfig(raw){
  let rows=[];
  const entries=Array.isArray(raw)?raw.map((x,i)=>[i,x]):Object.entries(raw||{});
  for(const [key,item] of entries){
    if(!item||typeof item!=='object')continue;
    const title=String(item.itemTitle||item.title||'');
    const date=String(item.releaseDateLabel||title.match(DATE)?.[0]||'');
    if(!DATE.test(date))continue;
    const number=Number(item.releaseNum||key);
    if(!Number.isInteger(number)||number<1)continue;
    let tile=String(item.itemURL||'');
    // Only accept the authentic Esri Wayback WMTS raster, not arbitrary URLs
    // that may be injected into the catalog.
    if(!/^https:\/\/(?:wayback(?:-[a-z])?\.)?maptiles\.arcgis\.com\//i.test(tile))continue;
    if(!tile.includes('/World_Imagery/')||!tile.includes('/MapServer/tile/'))continue;
    if(!tile.includes('{level}')||!tile.includes('{row}')||!tile.includes('{col}'))continue;
    tile=tile.replaceAll('{level}','{z}').replaceAll('{row}','{y}').replaceAll('{col}','{x}');
    rows.push({number,date,label:'Stand '+date,title,tile,
      metadataUrl:item.metadataLayerUrl||null});
  }
  rows=rows.filter(x=>Number(x.date.slice(0,4))>=2014)
    .sort((a,b)=>a.date.localeCompare(b.date)||a.number-b.number);
  const seen=new Set();
  return rows.filter(x=>{if(seen.has(x.number))return false;seen.add(x.number);return true;});
}
export function annualWaybackVersions(releases){
  const years=new Map();
  for(const row of releases)years.set(row.date.slice(0,4),row);
  return [...years.values()].sort((a,b)=>a.date.localeCompare(b.date));
}
export function releaseIndexForYear(annual,year){
  const result=annual.findIndex(x=>x.date.startsWith(String(year)));
  return result<0?0:result;
}
export function tileLayerConfig(item){
  return {type:'raster',tiles:[item.tile],tileSize:256,maxzoom:19,
    attribution:'Esri World Imagery Wayback · © Esri und Bilddatenanbieter'};
}
export async function loadWaybackCatalog(){
  let last;
  for(const url of WAYBACK_CONFIGS){
    const controller=new AbortController();
    const id=setTimeout(()=>controller.abort(),11000);
    try{
      const res=await fetch(url,{signal:controller.signal,mode:'cors',cache:'default'});
      if(!res.ok)throw Error('HTTP '+res.status);
      const versions=parseWaybackConfig(await res.json());
      if(versions.length<2)throw Error('Kein gültiger Esri-Wayback-Katalog');
      return versions;
    }catch(e){last=e;}
    finally{clearTimeout(id);}
  }
  const fallback=parseWaybackConfig(VERIFIED_FALLBACK);
  fallback.limited=true;
  fallback.reason='Vollständiger Esri-Katalog nicht erreichbar: '+String(last?.message||'unbekannt');
  return fallback;
}
export function createHistoricalExplorer(map,controls={}){
  const {onStatus=()=>{},onSelection=()=>{},onAvailable=()=>{},
    onActive=()=>{},onHistoryMode=()=>{}}=controls;
  let catalog=[],annual=[],active=false,started=false,playTimer=0,index=0;
  let sequence=0,blend=1,keepModern=false;
  const sourceId='sicilia-wayback-source',layerId='sicilia-wayback-imagery';
  function show(text){onStatus(text);}
  function stopPlayback(){
    if(playTimer){
      clearTimeout(playTimer);playTimer=0;
      onActive({active,playing:false});
    }
  }
  function ensureRaster(item){
    if(!map.isStyleLoaded?.())return false;
    // Remove only the historical imagery layer, never map terrain or buildings.
    try{
      if(map.getLayer(layerId))map.removeLayer(layerId);
      if(map.getSource(sourceId))map.removeSource(sourceId);
      map.addSource(sourceId,tileLayerConfig(item));
      const style=map.getStyle();
      // Historical raster is above modern satellite imagery and below
      // 3D buildings, labels, and historical infrastructure overlays.
      const before=map.getLayer('s10-shade')?'s10-shade':
        map.getLayer('s10-buildings')?'s10-buildings':
        style?.layers?.find(x=>x.type==='symbol')?.id;
      map.addLayer({id:layerId,type:'raster',source:sourceId,paint:{
        'raster-opacity':blend,'raster-fade-duration':250}},before);
      return true;
    }catch(e){show('Historische Kacheln konnten nicht aktiviert werden: '+e.message);return false;}
  }
  function choose(i){
    if(!annual.length)return;
    index=Math.max(0,Math.min(annual.length-1,Math.round(Number(i)||0)));
    const item=annual[index];
    if(active)ensureRaster(item);
    onSelection({index,total:annual.length,item});
    show('🕰️ Esri Wayback · Kartenstand '+item.date+
      ' · Bildaufnahme kann älter sein · historisches Luftbild, keine alten 3D-Häuser');
  }
  function setOpacity(v){
    blend=Math.max(0,Math.min(1,Number(v)));
    if(map.getLayer(layerId))map.setPaintProperty(layerId,'raster-opacity',blend);
  }
  function setModernBuildings(v){keepModern=Boolean(v);onHistoryMode({active,keepModern});}
  function play(ms=1600){
    stopPlayback();if(!active||!annual.length)return;
    function tick(){
      if(!active)return;
      if(index>=annual.length-1){stopPlayback();onStatus('Zeitraffer am jüngsten Kartenstand angekommen.');onActive({active,playing:false});return;}
      choose(index+1);
      playTimer=setTimeout(tick,ms);
    }
    if(index>=annual.length-1)choose(0);
    playTimer=setTimeout(tick,ms);
    onActive({active,playing:true});
  }
  async function activate(){
    if(active)return;
    if(!started){
      started=true;
      show('Esri-Wayback-Luftbildarchiv wird geladen …');
      try{
        catalog=await loadWaybackCatalog();
        annual=annualWaybackVersions(catalog);
        index=annual.length-1;
        onAvailable({annual,releases:catalog});
      }catch(e){
        started=false;show('Historische Bilder derzeit nicht erreichbar: '+e.message);
        throw e;
      }
    }
    active=true;
    choose(index);
    if(catalog.limited)show('Nur '+catalog.length+
      ' verifizierte Archiv-Kartenstände verfügbar (2014, 2019, 2023). Vollständiger Esri-Katalog im Browser nicht erreichbar.');
    onHistoryMode({active,keepModern});
    onActive({active,playing:false});
  }
  function deactivate(){
    active=false;stopPlayback();
    if(map.getLayer(layerId))map.removeLayer(layerId);
    if(map.getSource(sourceId))map.removeSource(sourceId);
    onHistoryMode({active,keepModern});
    onActive({active,playing:false});
    show('Zur heutigen Karte zurückgekehrt.');
  }
  function styleReloaded(){
    if(active&&annual.length)ensureRaster(annual[index]);
  }
  function destroy(){deactivate();}
  return {
    activate,deactivate,play,stopPlayback,choose,setOpacity,setModernBuildings,
    styleReloaded,destroy,
    get active(){return active;},
    get playing(){return Boolean(playTimer);},
    get annual(){return annual;},
    get releases(){return catalog;},
    get selected(){return annual[index]||null;}
  };
}
