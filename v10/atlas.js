import {isSicily,getBuildingHeight,propertyRows,getLocalOSM} from './geo.js?v=115';
import {SANTA,STOPS,LOCAL_REFERENCES,LINKS,inSantaTeresa,contextualSources,streetImageryUrl,stopDetails} from './local-sources.js?v=115';
import {getWeather,formatWeather,weatherLabel,weatherDescription} from './weather.js?v=115';
import {lookupWikipedia,lookupWikidata,officialKnowledge} from './knowledge.js?v=115';

/* SICILIA 3D v10.1 ATLAS PREVIEW – isolated from v9 main site.
   Grounded map source labels and source-aware object inspector. */
const $=id=>document.getElementById(id);
const PLACES=[
  {name:'Santa Teresa di Riva',lat:SANTA.lat,lon:SANTA.lon,zoom:16.1,icon:'🌊'},
  {name:'Casalvecchio Siculo',lat:37.95736,lon:15.32230,zoom:14.6,icon:'⛪'},
  {name:'Palermo',lat:38.1157,lon:13.3615,zoom:15.2,icon:'🏛️'},
  {name:'Catania',lat:37.5028,lon:15.0873,zoom:15.2,icon:'🏙️'},
  {name:'Messina',lat:38.1938,lon:15.554,zoom:15.1,icon:'⚓'},
  {name:'Taormina',lat:37.852,lon:15.288,zoom:15.1,icon:'🌅'},
  {name:'Ätna',lat:37.751,lon:14.9934,zoom:12.2,icon:'🌋'},
  {name:'Siracusa',lat:37.063,lon:15.293,zoom:15.2,icon:'🏺'},
  {name:'Ragusa',lat:36.925,lon:14.728,zoom:15.2,icon:'🏘️'},
  {name:'Noto',lat:36.891,lon:15.070,zoom:15.2,icon:'🏛️'},
  {name:'Agrigento',lat:37.3111,lon:13.5766,zoom:15,icon:'🏛️'},
  {name:'Trapani',lat:38.0176,lon:12.535,zoom:15,icon:'🌊'},
  {name:'Enna',lat:37.566,lon:14.278,zoom:14.7,icon:'⛰️'},
  {name:'Flughafen Catania',lat:37.4668,lon:15.0664,zoom:13.2,icon:'✈️'}
];
const src={
  dem:'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
  satellite:'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
};
const ids={sat:'s10-satellite',color:'s10-color',shade:'s10-shade',build:'s10-buildings',
  peaks:'s10-peaks',poi:'s10-poi',cloud:'s10-cloud',local:'s10-local-buildings'};
const state={mode:'relief',exaggeration:1,shade:true,buildings:true,peaks:false,
  selected:null,articleRequest:0,weatherRequest:0,loaded:false,wheelMode:'zoom',stops:true,
  localBusy:false,localAt:0,localPosition:null,localCount:0,vectorSource:null};
const create=(tag,cls,text)=>{
  const el=document.createElement(tag);if(cls)el.className=cls;
  if(text!==undefined)el.textContent=String(text);return el;
};
const link=(label,url)=>{
  const a=create('a','',label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
};
function setStatus(msg){$('state').textContent=msg;}
function row(box,key,value){
  const el=create('div','row');
  el.append(create('span','',key),create('strong','',value));box.append(el);
}
function centerPlace(p){
  const pitch=p.zoom>13?57:45;
  map.flyTo({center:[p.lon,p.lat],zoom:p.zoom,pitch,bearing:-28,duration:1400});
  select({name:p.name,kind:'Ort',lat:p.lat,lon:p.lon,props:{},source:'Geografische Ortsauswahl'});
}
const fallbackStyle={
  version:8,name:'SICILIA 3D – Satellit bei Kartendienst-Ausfall',
  sources:{
    'safe-imagery':{type:'raster',tiles:[src.satellite],tileSize:256,maxzoom:19,
      attribution:'Imagery: Esri, Vantor, Earthstar Geographics, GIS User Community'},
    's10-osm-independent':{type:'vector',url:'https://tiles.openfreemap.org/planet',
      attribution:'© OpenStreetMap-Mitwirkende, OpenMapTiles / OpenFreeMap'}
  },
  layers:[{id:'safe-imagery-layer',type:'raster',source:'safe-imagery'}]
};
let styleReady=false;
const map=new maplibregl.Map({
  container:'map',style:'https://tiles.openfreemap.org/styles/bright',
  center:[14.15,37.55],zoom:7.45,pitch:32,bearing:-6,
  maxPitch:80,antialias:true
});
// If OpenFreeMap cannot deliver a style at all, the atlas remains usable
// with an independent raster satellite base map.
let fallbackUsed=false;
function showSatelliteFallback(){
  if(fallbackUsed)return;
  fallbackUsed=true;
  setStatus('Kartenserver nicht erreichbar · Satellitenkarte wird als Ersatz geladen …');
  try{map.setStyle(fallbackStyle);}catch(error){
    console.warn('Satellite fallback failed',error);
    $('error').hidden=false;
  }
}
setTimeout(()=>{
  if(!styleReady)showSatelliteFallback();
},10500);
// Do NOT use map.loaded() as a timeout trigger: DEM/imagery may still be loading
// although the vector base map and all building layers are healthy. Resetting
// the style here previously deleted the 3D building layer!
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');
function addSource(id,source){if(!map.getSource(id))map.addSource(id,source);}
function addLayer(obj,before){
  if(map.getLayer(obj.id))return;
  try{map.addLayer(obj,before);}catch(error){console.warn('V10 layer',obj.id,error);}
}
function visible(id,on){
  if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');
}
function prepareStyle(){
  addSource('s10-dem',{type:'raster-dem',tiles:[src.dem],tileSize:256,encoding:'terrarium',maxzoom:15,
    attribution:'Elevation: Mapzen/AWS contributors'});
  addSource('s10-shade-dem',{type:'raster-dem',tiles:[src.dem],tileSize:256,encoding:'terrarium',maxzoom:15});
  addSource('s10-aerial',{type:'raster',tiles:[src.satellite],tileSize:256,maxzoom:19,
    attribution:'Imagery: Esri, Vantor, Earthstar Geographics, GIS User Community'});
  try{map.setTerrain({source:'s10-dem',exaggeration:state.exaggeration});}
  catch(error){console.warn('Terrain not ready:',error);}

  const layers=map.getStyle().layers||[];
  const labels=layers.find(l=>l.type==='symbol'&&l.layout?.['text-field'])?.id;
  addLayer({id:ids.color,type:'color-relief',source:'s10-shade-dem',
    paint:{'color-relief-color':['interpolate',['linear'],['elevation'],
      -120,'#207392',0,'#95c3a8',120,'#b2c99c',350,'#90af83',
      750,'#c4ba87',1300,'#cda889',2100,'#a99b90',2800,'#d1cac0',
      3500,'#f5f1e8'],'color-relief-opacity':.63}},labels);
  addLayer({id:ids.sat,type:'raster',source:'s10-aerial',
    paint:{'raster-opacity':1,'raster-fade-duration':150}},labels);
  addLayer({id:ids.shade,type:'hillshade',source:'s10-shade-dem',
    paint:{'hillshade-exaggeration':.36,'hillshade-shadow-color':'#50695e',
      'hillshade-highlight-color':'#f9e8c8','hillshade-accent-color':'#7a8975'}},labels);
  // MapLibre's official 3D buildings example uses an independent OpenFreeMap
  // vector source. Do not assume a raster/satellite style has one.
  const builtIn=Object.entries(map.getStyle().sources||{}).find(
    ([,v])=>v.type==='vector' && /openmaptiles|openfreemap|planet/i.test(v.url||'')
  )||Object.entries(map.getStyle().sources||{}).find(([,v])=>v.type==='vector');
  let source=builtIn?.[0];
  if(!source){
    source='s10-osm-independent';
    addSource(source,{type:'vector',url:'https://tiles.openfreemap.org/planet',
      attribution:'© OpenStreetMap-Mitwirkende / OpenFreeMap'});
  }
  state.vectorSource=source;
  if(source){
    const actualHeight=['to-number',['get','render_height'],0];
    const osmHeight=['to-number',['get','height'],0];
    const guessed=['case',
      ['>',actualHeight,2],actualHeight,
      ['>',osmHeight,2],osmHeight,
      ['>', ['to-number',['get','building:levels'],0],0],
       ['*',['to-number',['get','building:levels'],0],3.1],
      9.5];
    addLayer({id:ids.build,type:'fill-extrusion',source,'source-layer':'building',
      minzoom:13.4,filter:['!=',['get','hide_3d'],true],
      paint:{
        'fill-extrusion-color':['interpolate',['linear'],guessed,
          0,'#e5ceae',12,'#ceb9a1',34,'#aeb6ae',85,'#7696a4'],
        'fill-extrusion-height':['interpolate',['linear'],['zoom'],
          13.4,0,14.1,['*',guessed,0.7],15,guessed],
        'fill-extrusion-base':['coalesce',['to-number',['get','render_min_height']],0],
        'fill-extrusion-opacity':0.95
      }},labels);
    addLayer({id:ids.peaks,type:'circle',source,'source-layer':'mountain_peak',minzoom:12.4,
      filter:['all',['has','name'],['>=',['to-number',['get','ele'],0],700]],
      paint:{'circle-radius':4.5,'circle-color':'#eecfa5','circle-opacity':.82,
        'circle-stroke-width':1.2,'circle-stroke-color':'#294457'}},labels);
    addLayer({id:ids.poi,type:'circle',source,'source-layer':'poi',minzoom:13.4,
      paint:{'circle-radius':10,'circle-opacity':.007}},labels);
  }
  // Independent, source-backed OSM outline fallback for missing or outdated
  // vector tiles at village zoom. Never fabricate buildings when absent.
  addSource('s10-local-src',{type:'geojson',data:{
    type:'FeatureCollection',features:[]}});
  addLayer({id:ids.local,type:'fill-extrusion',source:'s10-local-src',minzoom:14,
    paint:{
      'fill-extrusion-color':['case',['get','estimated'],'#bdab95','#a9c4c4'],
      'fill-extrusion-base':0,
      'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,15,
        ['to-number',['get','height_m'],9]],
      'fill-extrusion-opacity':0.93
    }},labels);
  updateLayers();
}
function updateLayers(){
  visible(ids.sat,state.mode==='sat');
  visible(ids.color,state.mode==='relief');
  visible(ids.shade,state.shade&&state.mode!=='map');
  visible(ids.build,state.buildings);
  visible(ids.local,state.buildings);
  visible(ids.peaks,state.peaks);
  visible(ids.poi,true);
}
// If the vector tiles do not show buildings locally, recover source-backed
// building outlines from OpenStreetMap. Public Overpass is rate limited; only
// sample when the camera has stopped and the area actually lacks extrusions.
let osmRefreshTimer=null,osmFetchSequence=0;
function queueLocalBuildings(){
  if(osmRefreshTimer)clearTimeout(osmRefreshTimer);
  if(map.getZoom()<14.15||!state.buildings||!map.getSource('s10-local-src')){
    if(map.getSource('s10-local-src'))map.getSource('s10-local-src').setData({
      type:'FeatureCollection',features:[]});
    return;
  }
  osmRefreshTimer=setTimeout(()=>loadLocalBuildings(),1800);
}
async function loadLocalBuildings(){
  if(state.localBusy||!state.buildings||!map.getSource('s10-local-src'))return;
  const zoom=map.getZoom(),c=map.getCenter();
  if(zoom<14.15||!isSicily(c.lat,c.lng))return;
  // Tiles might simply be late; don't overload Overpass if there are
  // already visible extrusions in the current viewport.
  try{
    const current=map.queryRenderedFeatures({layers:[ids.build]});
    if(current.length>=3){
      map.getSource('s10-local-src').setData({type:'FeatureCollection',features:[]});
      $('source-info').textContent='3D-Gebäude aus OpenFreeMap-Vektorkacheln; fehlende Höhen sind Modellwerte.';
      return;
    }
  }catch(error){/* Source may not be ready; try cached OSM outlines */}
  if(Date.now()-state.localAt<50000)return;
  if(state.localPosition){
    const d=Math.hypot((state.localPosition.lat-c.lat)*111000,
      (state.localPosition.lng-c.lng)*88000);
    if(d<250&&state.localCount)return;
  }
  state.localBusy=true;state.localAt=Date.now();
  state.localPosition={lat:c.lat,lng:c.lng};
  const call=++osmFetchSequence;
  $('source-info').textContent='Prüfe fehlende Gebäudegrundrisse in OpenStreetMap …';
  try{
    const result=await getLocalOSM(c.lat,c.lng,450);
    if(call!==osmFetchSequence)return;
    const features=[];
    for(const e of result.elements||[]){
      if(e.type!=='way'||!e.tags?.building||!Array.isArray(e.geometry)||e.geometry.length<4)continue;
      const coords=e.geometry.map(p=>[p.lon,p.lat]);
      if(coords.some(p=>!Number.isFinite(p[0])||!Number.isFinite(p[1])))continue;
      const first=coords[0],last=coords.at(-1);
      if(Math.hypot(first[0]-last[0],first[1]-last[1])>0.00001)coords.push([...first]);
      if(coords.length<4)continue;
      const h=getBuildingHeight(e.tags);
      const tags={...e.tags,name:e.tags.name||'Gebäude',height_m:h.metres,
        estimated:h.estimated,osm_id:e.id,osm_source:'OpenStreetMap'};
      features.push({type:'Feature',id:e.id,geometry:{type:'Polygon',coordinates:[coords]},
        properties:tags});
      if(features.length>=330)break;
    }
    const src=map.getSource('s10-local-src');
    if(src&&map.getZoom()>=14.15)src.setData({type:'FeatureCollection',features});
    state.localCount=features.length;
    $('source-info').textContent=features.length?
      'Zusätzlich '+features.length+' OSM-Gebäude geladen; Höhen teilweise geschätzt · '+new Date(result.queriedAt).toLocaleString('de-CH'):
      'Für diesen Ausschnitt wurden keine weiteren OSM-Gebäude gefunden.';
  }catch(error){
    $('source-info').textContent='Zusätzliche OSM-Gebäudedaten nicht erreichbar. Vektor-Gebäude bleiben eingeschaltet.';
    console.warn('Local building service unavailable',error);
  }finally{
    state.localBusy=false;
  }
}

map.on('style.load',()=>{
  styleReady=true;
  try{
    prepareStyle();
    queueLocalBuildings();
    setStatus('● SICILIA 3D · Karte + 3D-Gebäude geladen');
  }catch(error){
    console.warn('3D-Layer eingeschränkt:',error);
    // A healthy 2D map must remain accessible when DEM/3D layers fail.
    setStatus('● Basiskarte geladen · 3D-Gelände teilweise eingeschränkt');
  }
});
map.on('load',()=>{
  state.loaded=true;
  setStatus(fallbackUsed?
    '● Satelliten-Ersatzkarte geladen · 3D-Gebäude beim Hineinzoomen':
    '● Sizilien geladen · 3D-Gebäude ab Zoomstufe 14');
});
map.on('error',e=>{
  console.warn('Externe Kartenkachel:',e.error?.message||e);
  if(!styleReady)setStatus('Kartenquelle lädt noch · Satelliten-Ersatzkarte wird bei Bedarf aktiviert');
});
function flyingWalkHref(){
  const c=state.selected||
    (map.getZoom()<11.5?PLACES.find(p=>p.name==='Santa Teresa di Riva'):
      {lat:map.getCenter().lat,lon:map.getCenter().lng,name:'Kartenausschnitt Sizilien'});
  const params=new URLSearchParams({
    lat:c.lat.toFixed(6),lng:c.lon.toFixed(6),name:c.name});
  $('walking').href='./explore.html?'+params;
  $('detail-walk').href='./walk.html?'+params;
}
map.on('moveend',()=>{
  if(!state.selected)flyingWalkHref();
  queueLocalBuildings();
});
map.on('dragstart',()=>{
  // Deliberately moving the map changes the target of "Walk here".
  state.selected=null;
  flyingWalkHref();
});
$('walking').addEventListener('click',flyingWalkHref);
$('santateresa').onclick=()=>centerPlace(PLACES.find(p=>p.name==='Santa Teresa di Riva'));
$('casal').onclick=()=>centerPlace(PLACES.find(p=>p.name==='Casalvecchio Siculo'));
$('overview').onclick=()=>{
  state.selected=null;map.flyTo({center:[14.1,37.55],zoom:7.7,pitch:40,bearing:0,duration:1300});
  $('inspector').hidden=true;flyingWalkHref();
};
$('tools-toggle').onclick=()=>{
  $('tools-body').hidden=!$('tools-body').hidden;
  $('tools-toggle').textContent=$('tools-body').hidden?'+':'−';
};
$('exaggeration').oninput=e=>{
  state.exaggeration=Number(e.target.value);
  $('exaggeration-label').textContent=state.exaggeration.toFixed(1).replace('.',',')+'×';
  if(map.getSource('s10-dem'))map.setTerrain({source:'s10-dem',exaggeration:state.exaggeration});
};
$('buildings').onchange=e=>{state.buildings=e.target.checked;updateLayers();};
$('peaks').onchange=e=>{state.peaks=e.target.checked;updateLayers();};
$('shade').onchange=e=>{state.shade=e.target.checked;updateLayers();};
$('stops').onchange=e=>{state.stops=e.target.checked;updateStopMarkers();};
$('refresh-osm').onclick=()=>{
  state.localAt=0;state.localCount=0;
  const src=map.getSource('s10-local-src');
  if(src)src.setData({type:'FeatureCollection',features:[]});
  if(map.getZoom()<14.15){
    setStatus('Zoome auf einen Ort (mindestens Stufe 14), um dessen Gebäude nachzuladen.');
    return;
  }
  loadLocalBuildings();
};
$('modes').onclick=e=>{
  const button=e.target.closest('button[data-mode]');if(!button)return;
  state.mode=button.dataset.mode;
  for(const b of $('modes').querySelectorAll('button'))
    b.classList.toggle('selected',b.dataset.mode===state.mode);
  updateLayers();
};
const cameraActions={
  'tilt-up':()=>map.easeTo({pitch:Math.min(78,map.getPitch()+12),duration:220}),
  'tilt-down':()=>map.easeTo({pitch:Math.max(0,map.getPitch()-12),duration:220}),
  'turn-left':()=>map.easeTo({bearing:map.getBearing()-25,duration:230}),
  'turn-right':()=>map.easeTo({bearing:map.getBearing()+25,duration:230}),
  'camera-reset':()=>map.easeTo({pitch:48,bearing:0,duration:400})
};
for(const [key,fn] of Object.entries(cameraActions))$(key).onclick=fn;
$('wheel-mode').onclick=()=>{
  state.wheelMode=state.wheelMode==='zoom'?'pitch':'zoom';
  $('wheel-mode').textContent=state.wheelMode==='zoom'?'🖱️ Mausrad: Zoom':'🖱️ Mausrad: Neigen';
  $('wheel-mode').title=state.wheelMode==='zoom'?
    'Normal zoomen, Shift + Rad neigen':'Normal neigen, Shift + Rad zoomen';
};
map.getCanvasContainer().addEventListener('wheel',e=>{
  // The default scroll behavior is zoom. Switching makes the same wheel
  // control pitch; holding Shift temporarily inverts that preference.
  const tilt=(state.wheelMode==='pitch')!==Boolean(e.shiftKey);
  if(!tilt)return;
  e.preventDefault();e.stopImmediatePropagation();
  map.easeTo({pitch:Math.min(78,Math.max(0,
    map.getPitch()+Math.sign(e.deltaY)*4)),duration:110});
},{capture:true,passive:false});
try{map.dragRotate.enable();map.touchZoomRotate.enableRotation();}catch(error){};
async function searchPlace(){
  const query=$('search').value.trim();if(!query)return;
  const local=PLACES.find(p=>p.name.toLowerCase().includes(query.toLowerCase()));
  if(local){centerPlace(local);return;}
  setStatus('Suche nach '+query+' …');
  try{
    const p=new URLSearchParams({q:query+' Sicilia',limit:'4'});
    const r=await fetch('https://photon.komoot.io/api/?'+p);
    if(!r.ok)throw Error('Suche offline');
    const features=(await r.json()).features||[];
    const f=features.find(x=>isSicily(x.geometry.coordinates[1],x.geometry.coordinates[0]));
    if(!f)throw Error('Kein sizilianischer Ort gefunden');
    const [lon,lat]=f.geometry.coordinates;
    map.flyTo({center:[lon,lat],zoom:15.1,pitch:52,bearing:-12,duration:1400});
    select({name:f.properties?.name||query,kind:f.properties?.type||'Ort',lat,lon,
      props:f.properties||{},source:'OpenStreetMap / Photon'});
    setStatus('● '+(f.properties?.name||query)+' gefunden');
  }catch(err){setStatus('Ortssuche: '+err.message);}
}
$('quickplaces').onclick=e=>{
  const button=e.target.closest('button[data-place]');
  if(!button)return;
  const place=PLACES.find(p=>p.name===button.dataset.place);
  if(place)centerPlace(place);
};
$('search-go').onclick=searchPlace;
$('search').addEventListener('keydown',e=>{if(e.key==='Enter')searchPlace();});
function handleClick(e){
  const validLayers=[ids.local,ids.build,ids.peaks,ids.poi].filter(id=>map.getLayer(id));
  let features=[];
  try{if(validLayers.length)features=map.queryRenderedFeatures(e.point,{layers:validLayers});}
  catch(err){}
  features.sort((a,b)=>{
    const rank={[ids.local]:0,[ids.build]:1,[ids.peaks]:2,[ids.poi]:3};
    return(rank[a.layer.id]??9)-(rank[b.layer.id]??9);
  });
  let f=features[0];
  if(!f){
    const fallback=map.queryRenderedFeatures(e.point)||[];
    f=fallback.find(x=>x.properties?.name&&x.layer?.type==='symbol');
  }
  if(!f){
    select({name:'Geländepunkt',kind:'Geländepunkt',lat:e.lngLat.lat,lon:e.lngLat.lng,
      props:{},source:'Digitale Karte'});return;
  }
  const p=f.properties||{};
  const location=f.geometry?.type==='Point'?{lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]}:
    {lon:e.lngLat.lng,lat:e.lngLat.lat};
  const kind=(f.layer.id===ids.build||f.layer.id===ids.local)?'Gebäude':f.layer.id===ids.peaks?'Berggipfel':
    f.layer.id===ids.poi?'Sehenswürdigkeit':'Ort';
  select({name:p.name||p.name_de||p.name_en||
    (kind==='Gebäude'?'Gebäude ohne Namen':'Unbenanntes Kartenobjekt'),
    kind,...location,props:p,source:'OpenStreetMap / OpenMapTiles'});
}
map.on('click',handleClick);
function select(obj){
  state.selected=obj;state.articleRequest++;state.weatherRequest++;
  $('inspector').hidden=false;$('object-title').textContent=obj.name;
  $('object-source').textContent=obj.kind+' · '+obj.source;
  const box=$('object-properties');box.replaceChildren();
  row(box,'Koordinaten',obj.lat.toFixed(5)+'° N / '+obj.lon.toFixed(5)+'° E');
  try{
    const h=map.queryTerrainElevation([obj.lon,obj.lat]);
    if(Number.isFinite(h))row(box,'Gelände (DEM, näherungsweise)',
      (h/state.exaggeration).toFixed(0)+' m ü. M.');
  }catch(e){}
  for(const [label,value] of propertyRows(obj.props||{}))row(box,label,value);
  if(obj.kind==='Gebäude'){
    const h=getBuildingHeight(obj.props||{});
    row(box,'3D-Modellhöhe',h.metres.toFixed(1)+' m · '+h.source);
    if(!obj.props?.start_date&&!obj.props?.['building:year_built'])
      row(box,'Baujahr','unbekannt · keine Rekonstruktion als Fakt');
  }
  const links=$('object-links');links.replaceChildren();
  const visit='./walk.html?'+new URLSearchParams({
    lat:obj.lat.toFixed(6),lng:obj.lon.toFixed(6),name:obj.name});
  const walkingLink=create('a','','🎮 Hier 3D-Karte erkunden');
  walkingLink.href='./explore.html?'+new URLSearchParams({
    lat:obj.lat.toFixed(6),lng:obj.lon.toFixed(6),name:obj.name});
  links.append(walkingLink);
  const detailed=create('a','','🚶 Begehbares Ortsmodell');
  detailed.href=visit;links.append(detailed);
  links.append(link('🗺️ OpenStreetMap',
    'https://www.openstreetmap.org/?mlat='+obj.lat+'&mlon='+obj.lon+'#map=18/'+obj.lat+'/'+obj.lon));
  links.append(link('📚 Wikipedia-Suche',
    'https://de.wikipedia.org/w/index.php?search='+encodeURIComponent(obj.name)));
  if(obj.props?.wikidata&&/^Q\d+$/.test(obj.props.wikidata))
    links.append(link('🔗 Wikidata','https://www.wikidata.org/wiki/'+obj.props.wikidata));
  if(obj.props?.wikipedia){
    const articleId=String(obj.props.wikipedia),parts=articleId.split(':');
    const language=/^[a-z]{2,3}$/.test(parts[0])?parts.shift():'it';
    links.append(link('📖 Direkt verknüpfter Wikipedia-Artikel',
      'https://'+language+'.wikipedia.org/wiki/'+encodeURIComponent(parts.join(':'))));
  }
  if(Math.hypot(obj.lat-37.95736,obj.lon-15.3223)<.014)
    links.append(link('⛪ Gemeinde – Kirchen',
      'https://comune.casalvecchiosiculo.me.it/tipi_luogo/chiesa/'));
  $('detail-walk').href=visit;
  $('walking').href=walkingLink.href;
  const related=$('related');related.replaceChildren(
    create('strong','','📚 Quellen für '+obj.name));
  related.append(create('p','',
    obj.kind==='Gebäude'?
      'Gebäudespezifische Angaben stammen aus OSM. Eine Ortschronik ist kein Beweis für das Baujahr dieses Hauses.':
      'Für Orte und Sehenswürdigkeiten kannst du die verfügbaren Geschichts- und Kulturdatenbanken durchsuchen.'));
  related.append(
    link('Wikipedia (de)','https://de.wikipedia.org/w/index.php?search='+encodeURIComponent(obj.name)),
    link('Wikipedia (it)','https://it.wikipedia.org/w/index.php?search='+encodeURIComponent(obj.name)),
    link('Wikidata','https://www.wikidata.org/w/index.php?search='+encodeURIComponent(obj.name)),
    link('OpenStreetMap','https://www.openstreetmap.org/?mlat='+obj.lat+'&mlon='+obj.lon+'#map=18/'+obj.lat+'/'+obj.lon)
  );
  if(obj.kind==='Gebäude'&&obj.props?.osm_id){
    related.append(link('OSM-Gebäude '+obj.props.osm_id,
      'https://www.openstreetmap.org/way/'+obj.props.osm_id));
  }
  showTransport(obj);
  showStreetImagery(obj);
  loadArticle(obj,state.articleRequest);
  loadWeather(obj,state.weatherRequest);
}
$('inspector-close').onclick=()=>$('inspector').hidden=true;
function appendKnowledgeCard(root,data,isOfficial=false){
  const card=create('div','official-fact');
  card.append(create('strong','',data.title));
  card.append(create('p','',data.facts||data.text||'Keine Kurzbeschreibung.'));
  card.append(create('small','source-label',
    (isOfficial?'Amtliche/Betreiberquelle: ':'Offene Wissensquelle: ')+
    (data.attribution||'Herkunft dokumentiert')));
  card.append(link('Originalquelle ↗',data.url));
  root.append(card);
}
async function loadArticle(obj,key){
  const target=$('article');
  target.replaceChildren(create('strong','','📚 Wissen aus mehreren Quellen'));
  const official=officialKnowledge(obj);
  if(official.length){
    target.append(create('p','','Lokale Originalquellen mit belegten Kurzangaben:'));
    for(const source of official)appendKnowledgeCard(target,source,true);
  }else if(obj.kind==='Gebäude'){
    target.append(create('p','','Für dieses Gebäude ist keine verifizierte Bauchronik hinterlegt. OSM-Gebäudeattribute werden separat angezeigt.'));
  }else{
    target.append(create('p','','Noch keine amtliche Ortsbeschreibung hinterlegt. Ich prüfe Wikipedia und Wikidata als weitere Quellen …'));
  }
  if(obj.kind==='Bushaltestelle')return;
  if(obj.kind==='Gebäude'&&!obj.props?.wikidata&&!obj.props?.wikipedia)return;
  const wiki=await lookupWikipedia(obj);
  if(key!==state.articleRequest)return;
  if(wiki){appendKnowledgeCard(target,wiki);return;}
  const wd=await lookupWikidata(obj);
  if(key!==state.articleRequest)return;
  if(wd){appendKnowledgeCard(target,wd);return;}
  if(!official.length)
    target.append(create('p','','Kein eindeutig zugeordnetes historisches Dokument gefunden. Unter «Weitere Quellen» kannst du zusätzliche Archive und Karten öffnen.'));
}
let currentWeatherObj={name:SANTA.name,kind:'Ort',lat:SANTA.lat,lon:SANTA.lon};
async function loadWeather(obj,key,force=false){
  currentWeatherObj=obj;
  const card=$('weather');
  card.replaceChildren(create('strong','','🌦️ Wetter · '+obj.name),
    create('p','','Lade aktuelle Wettermodellwerte …'));
  $('weather-summary').textContent='🌦️ '+obj.name+': Wetter laden …';
  try{
    const raw=await getWeather(obj.lat,obj.lon,{fresh:force});
    if(key!==state.weatherRequest)return;
    const v=formatWeather(raw);
    card.replaceChildren(create('strong','','🌦️ Aktuelles Wetter · '+obj.name),
      create('div','weather-main',v.emoji+' '+v.temp+' · '+v.label));
    const grid=create('div','weather-grid');
    for(const pair of [
      ['Gefühlt',v.feels],['Wolken',v.clouds],['Wind',v.wind],
      ['Luftfeuchte',v.humidity],['Niederschlag',v.precipitation]])
      grid.append(create('span','',pair[0]+': '+pair[1]));
    card.append(grid);
    if(raw.forecast.length){
      card.append(create('strong','','Nächste 6 Stunden'));
      const strip=create('div','hour-strip');
      for(const h of raw.forecast){
        const el=create('div','');
        el.append(create('small','',h.time.slice(-5)));
        const t=Number.isFinite(h.temperature)?Math.round(h.temperature)+'°':'–';
        el.append(create('div','',weatherLabel(h.weather)[0]+' '+t));
        el.append(create('small','','Regen '+(h.chance??'–')+' %'));
        strip.append(el);
      }
      card.append(strip);
    }
    card.append(create('p','weather-freshness',
      'Modellzeit: '+v.time+' (Italien) · Abfrage '+new Date(raw.fetched).toLocaleTimeString('de-CH')+
      (raw.stale?' · ältere Cachewerte':'')+
      '. Open-Meteo: modellierte aktuelle Bedingungen, keine Live-Messung an diesem Gebäude.'));
    card.append(link('Wetterquelle / Datenmodell','https://open-meteo.com/en/docs'));
    $('weather-summary').textContent='🌦️ '+obj.name+': '+weatherDescription(raw)+
      (raw.stale?' · älterer Stand':'');
  }catch(error){
    if(key!==state.weatherRequest)return;
    card.replaceChildren(create('strong','','🌦️ Wetter derzeit nicht verfügbar'),
      create('p','','Der Wetterdienst liefert derzeit keine bestätigten aktuellen Werte.'));
    card.append(link('Wetterdienst öffnen','https://open-meteo.com/en/docs'));
    $('weather-summary').textContent='🌦️ Wetterdaten fehlen · ↻ erneut abfragen';
  }
}
$('weather-update').onclick=()=>{
  state.weatherRequest++;
  loadWeather(currentWeatherObj,state.weatherRequest,true);
};
map.on('load',()=>{
  if(!state.selected){
    state.weatherRequest++;
    loadWeather(currentWeatherObj,state.weatherRequest);
  }
});
setInterval(()=>{
  if(document.hidden)return;
  state.weatherRequest++;
  loadWeather(currentWeatherObj,state.weatherRequest,true);
},6*60*1000);

// Two verifiable bus stops from the Buscenter feed and a clearly approximate
// Interbus notice location. Mapillary imagery is discovered, never faked.
const santaMarkers=[];
function makeStopMarkers(){
  if(santaMarkers.length)return;
  for(const stop of STOPS){
    const el=create('button','santa-stop-marker','🚌');
    el.type='button';
    el.title=stop.name+(stop.approximate?' · Position ungefähr':' · Kartenkoordinate');
    el.setAttribute('aria-label','Bushaltestelle '+stop.name);
    el.addEventListener('click',e=>{
      e.stopPropagation();
      select({name:stop.name,kind:'Bushaltestelle',lat:stop.lat,lon:stop.lon,
        props:{},source:stop.origin,stop});
    });
    const marker=new maplibregl.Marker({element:el,anchor:'bottom'})
      .setLngLat([stop.lon,stop.lat]).addTo(map);
    santaMarkers.push(marker);
  }
  updateStopMarkers();
}
function updateStopMarkers(){
  const c=map.getCenter(),near=inSantaTeresa({lat:c.lat,lon:c.lng},8500);
  for(const marker of santaMarkers)
    marker.getElement().style.display=(state.stops&&near&&map.getZoom()>12.5)?'grid':'none';
}
map.on('load',()=>{makeStopMarkers();updateStopMarkers();});
map.on('moveend',updateStopMarkers);
function showTransport(obj){
  const target=$('transport');
  target.replaceChildren(create('strong','','🚌 Bus & Bahn'));
  if(obj.stop){
    const stop=obj.stop;
    const header=create('div','stop-notice');
    header.append(create('strong','',stop.name));
    for(const p of stopDetails(stop))
      header.append(create('p','',p.label+': '+p.value));
    target.append(header);
    target.append(
      link('Betreiber – Fahrpläne',LINKS.transport),
      link('Aktuelle Haltestellen-Mitteilung',LINKS.transportNotice),
      link('Haltestellenverzeichnis',stop.url));
    target.append(create('p','','Hinweis: Es liegen keine verifizierten minutengenauen Live-Abfahrten vor. Zeiten können sich ändern.'));
    return;
  }
  if(inSantaTeresa(obj)){
    target.append(create('p','',
      'Santa Teresa di Riva: Bei Interbus gilt eine Haltestellenmitteilung vom 25. Juni 2026. Bitte vor der Fahrt den aktuellen Fahrplan und mögliche weitere Änderungen prüfen.'));
    target.append(link('Interbus – Mitteilung',LINKS.transportNotice),
      link('Interbus – Betreiber',LINKS.transport),
      link('Trenitalia – Regionalfahrpläne',LINKS.trains));
    target.append(create('p','','Bushaltestellen auf der Karte mit 🚌 auswählen. Die Markierung beim Municipio ist eine ungefähre Lage, keine vermessene Mastposition.'));
  }else{
    target.append(create('p','','Haltestelleninformationen: weitere Orte werden über örtliche und OSM-Quellen ergänzt. Noch keine allgemeine Echtzeit-Schnittstelle angeschlossen.'));
    target.append(link('Fahrpläne – Trenitalia',LINKS.trains),
      link('Bus – Interbus',LINKS.transport));
  }
}
function showStreetImagery(obj){
  const target=$('street-imagery');
  target.replaceChildren(create('strong','','📷 Strassenansichten'));
  target.append(create('p','','Mapillary bietet echte, von Menschen aufgenommene Strassenfotos. Der Link öffnet die Aufnahmeübersicht an den gewählten Koordinaten. Aufnahmen sind weder live noch überall vorhanden.'));
  target.append(link('📷 Vorhandene Aufnahmen prüfen',streetImageryUrl(obj.lat,obj.lon)));
}

flyingWalkHref();
// A full-island overview otherwise starts EXPLORE in empty countryside.
// The first quick-entry intentionally defaults to the Casalvecchio pilot.
$('walking').title='Bei Inselübersicht zuerst Casalvecchio; nach Ortsauswahl der gewählte Ort';
$('detail-walk').title='Detaillierter 3D Walk mit tatsächlichen OSM-Gebäuden soweit vorhanden';
// Start with the entire island in view, instead of a very close-up
// potentially not-yet-rendered village view.
setStatus('Lade Sizilien · 2D-Basiskarte zuerst, 3D-Daten danach …');
