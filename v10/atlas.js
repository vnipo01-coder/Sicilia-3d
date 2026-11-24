import {isSicily,getBuildingHeight,propertyRows,getLocalOSM} from './geo.js?v=121';
import {SANTA,STOPS,LOCAL_REFERENCES,LINKS,inSantaTeresa,contextualSources,streetImageryUrl,stopDetails} from './local-sources.js?v=121';
import {getWeather,formatWeather,weatherLabel,weatherDescription} from './weather.js?v=121';
import {lookupWikipedia,lookupWikidata,officialKnowledge} from './knowledge.js?v=121';
import {CITY_PAGES,cityByName,cityForObject,isCityObject,cityInformation} from './city-pages.js?v=121';

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
const startWholeIsland=new URLSearchParams(location.search).get('island')==='1';
const map=new maplibregl.Map({
  container:'map',style:'https://tiles.openfreemap.org/styles/bright',
  center:startWholeIsland?[14.15,37.55]:[SANTA.lon,SANTA.lat],
  zoom:startWholeIsland?7.45:15.5,pitch:startWholeIsland?32:61,
  bearing:startWholeIsland?-6:-22,
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
map.on('moveend',()=>{
  queueLocalBuildings();
});
// All selected places use the same 3D GIS map. There is no separate
// low-quality 3D Walk / Coastal / Flight route in this release.
$('city-overview').onclick=()=>{
  const obj=state.selected;
  const city=cityForObject(obj)||cityByName('Santa Teresa di Riva');
  if(city)openCityProfile(city);
};
$('santateresa').onclick=()=>centerPlace(PLACES.find(p=>p.name==='Santa Teresa di Riva'));
$('casal').onclick=()=>centerPlace(PLACES.find(p=>p.name==='Casalvecchio Siculo'));
$('overview').onclick=()=>{
  state.selected=null;map.flyTo({center:[14.1,37.55],zoom:7.7,pitch:40,bearing:0,duration:1300});
  $('inspector').hidden=true;
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
  'camera-reset':()=>map.easeTo({pitch:48,bearing:0,duration:400}),
  'street-perspective':()=>map.easeTo({
    pitch:78,zoom:Math.max(map.getZoom(),17.2),
    bearing:map.getBearing(),duration:600
  })
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
function setInfoTab(tab){
  const allowed=['overview','knowledge','sources','local'];
  const active=allowed.includes(tab)?tab:'overview';
  for(const b of $('info-tabs').querySelectorAll('[data-info-tab]')){
    const selected=b.dataset.infoTab===active;
    b.classList.toggle('is-active',selected);
    b.setAttribute('aria-selected',String(selected));
  }
  for(const pane of $('inspector').querySelectorAll('[data-info-pane]'))
    pane.hidden=pane.dataset.infoPane!==active;
}
$('info-tabs').addEventListener('click',event=>{
  const button=event.target.closest('[data-info-tab]');
  if(button)setInfoTab(button.dataset.infoTab);
});
function openCityProfile(city){
  map.flyTo({center:[city.lon,city.lat],zoom:15.4,pitch:58,
    bearing:map.getBearing(),duration:850});
  select({name:city.name,kind:'Ort',lat:city.lat,lon:city.lon,
    props:{},source:'Geprüftes Stadtprofil'});
}
function updateCityNavigation(obj){
  const root=$('city-navigation');root.replaceChildren();
  const city=cityForObject(obj);
  if(!city){
    root.append(create('span','source-provider','Kein verifiziertes Stadtprofil für diese Position.'));
    return;
  }
  if(!isCityObject(obj,city)){
    const button=create('button','','← Stadtprofil '+city.name);
    button.type='button';button.addEventListener('click',()=>openCityProfile(city));
    root.append(button);
  }
  root.append(link('📘 Wikipedia: '+city.name,city.wikipedia));
  if(city.official){
    const official=link('🏛️ Offizielle Stadtseite',city.official);
    official.classList.add('home-link');root.append(official);
  }
}

function select(obj){
  state.selected=obj;state.articleRequest++;state.weatherRequest++;
  $('inspector').hidden=false;$('object-title').textContent=obj.name;
  setInfoTab('overview');
  updateCityNavigation(obj);
  const hint=$('overview-intro');
  hint.textContent=obj.kind==='Gebäude'?
    'Gebäudegrundriss und verfügbare Merkmale aus OpenStreetMap. 3D-Höhen ohne Messwert sind gekennzeichnete Modellannahmen.':
    obj.kind==='Bushaltestelle'?
    'Haltestellenstandort und Betreiberinformationen. Für Abfahrten den aktuellen Fahrplan prüfen.':
    obj.kind==='Geländepunkt'?
    'Gewählte Kartenposition. Hier sind Koordinaten und gegebenenfalls Geländehöhen verfügbar.':
    'Überblick über den ausgewählten Ort mit verfügbaren Geodaten, Originalquellen, Geschichte und Wetter.';
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
  const city=cityForObject(obj);
  if(city&&!isCityObject(obj,city)){
    const cityLink=create('button','','📖 Stadtprofil '+city.name);
    cityLink.type='button';cityLink.className='knowledge-city-button';
    cityLink.addEventListener('click',()=>openCityProfile(city));
    links.append(cityLink);
  }
  if(city?.official)links.append(link('🏛️ Gemeindewebsite',city.official));
  if(city?.wikipedia)links.append(link('📘 Stadtartikel',city.wikipedia));
  const related=$('related');
  related.replaceChildren(create('strong','','Originalquellen und weiterführende Links'));
  related.append(create('p','source-provider',
    obj.kind==='Gebäude'?
    'Gebäudedaten und Ortsgeschichte werden nicht vermischt. Die folgenden Links geben die jeweilige Herkunft an.':
    'Direkte Stadtartikel und offizielle Websites, soweit zuverlässig bekannt. Weitere Datenquellen sind separat gekennzeichnet.'));
  const grid=create('div','source-links-grid');
  if(city){
    for(const info of cityInformation(city))
      grid.append(link(info.label+' ↗',info.url));
  }else{
    grid.append(link('Wikipedia: Suchergebnisse ↗',
      'https://it.wikipedia.org/w/index.php?search='+encodeURIComponent(obj.name)));
  }
  grid.append(link('OpenStreetMap ↗',
    'https://www.openstreetmap.org/?mlat='+obj.lat+'&mlon='+obj.lon+'#map=18/'+obj.lat+'/'+obj.lon));
  if(obj.props?.wikidata&&/^Q\d+$/.test(obj.props.wikidata))
    grid.append(link('Wikidata: Objekt ↗','https://www.wikidata.org/wiki/'+obj.props.wikidata));
  const rawWiki=String(obj.props?.wikipedia||'');
  if(/^[a-z]{2,3}:.+/.test(rawWiki)){
    const colon=rawWiki.indexOf(':'),language=rawWiki.slice(0,colon);
    const title=rawWiki.slice(colon+1);
    grid.append(link('Wikipedia: Objektartikel ↗',
      'https://'+language+'.wikipedia.org/wiki/'+encodeURIComponent(title)));
  }
  if(obj.kind==='Gebäude'&&obj.props?.osm_id)
    grid.append(link('Originales OSM-Gebäude ↗',
      'https://www.openstreetmap.org/way/'+obj.props.osm_id));
  if(Math.hypot(obj.lat-37.95736,obj.lon-15.3223)<.014)
    grid.append(link('Casalvecchio: Kirchen ↗',
      'https://comune.casalvecchiosiculo.me.it/tipi_luogo/chiesa/'));
  related.append(grid);
  showTransport(obj);
  showStreetImagery(obj);
  loadArticle(obj,state.articleRequest);
  loadWeather(obj,state.weatherRequest);
}
$('inspector-close').onclick=()=>$('inspector').hidden=true;
function appendKnowledgeCard(root,data,isOfficial=false,expanded=false){
  const panel=create('details','source-entry');
  panel.open=expanded;
  const heading=create('summary','',data.title);
  panel.append(heading);
  const body=create('div','source-entry-body');
  const description=String(data.facts||data.text||'Keine Kurzbeschreibung vorhanden.');
  body.append(create('p','',description));
  const sourceName=data.attribution||'Datenquelle angegeben';
  body.append(create('small','',
    (isOfficial?'Originalveröffentlichung: ':'Wissensdatenbank: ')+sourceName));
  if(data.url)body.append(link('Artikel vollständig öffnen ↗',data.url));
  panel.append(body);root.append(panel);
}
function articleCityLinks(root,city){
  if(!city)return;
  const wrap=create('div','source-links-grid');
  wrap.append(link('📘 Wikipedia – Stadtartikel',city.wikipedia));
  if(city.official)wrap.append(link('🏛️ Offizielle Stadtwebsite',city.official));
  if(city.wikipediaDe)wrap.append(link('📚 Wikipedia – Deutsch',city.wikipediaDe));
  root.append(wrap);
}
async function loadArticle(obj,key){
  const root=$('article');
  root.replaceChildren(create('strong','','Geschichte, Architektur und Stadtwissen'));
  const city=cityForObject(obj);
  const official=officialKnowledge(obj).filter(ref=>ref.type==='amtlich');
  const isBuilding=obj.kind==='Gebäude';
  if(city){
    const intro=isCityObject(obj,city)?
      'Stadtprofil '+city.name+': Hier findest du offizielle Veröffentlichungen, weitere Wissensdatenbanken und den vollständigen Wikipedia-Stadtartikel.':
      'Dieses Objekt liegt im Umfeld von '+city.name+
      '. Die Stadtgeschichte wird nicht automatisch als Baugeschichte des ausgewählten Gebäudes ausgegeben.';
    root.append(create('p','knowledge-summary',intro));
    articleCityLinks(root,city);
    if(!isCityObject(obj,city)){
      const go=create('button','knowledge-city-button','← Zur Stadtübersicht '+city.name);
      go.type='button';go.addEventListener('click',()=>openCityProfile(city));
      root.append(go);
    }
  }
  if(official.length){
    const bar=create('div','source-section-title');
    bar.append(create('span','','🏛️ Amtliche Orts- und Kulturquellen'),
      create('span','source-count',official.length+' Dokumente'));
    root.append(bar);
    for(const [i,source] of official.entries())
      appendKnowledgeCard(root,source,true,i===0);
  }else if(isBuilding){
    root.append(create('p','knowledge-summary',
      'Für dieses Gebäude ist keine verifizierte Bauchronik hinterlegt. Grundriss, Höhe und OSM-Attribute findest du unter «Überblick». Ein fehlendes Baujahr wird nicht geschätzt.'));
  }else{
    root.append(create('p','knowledge-summary',
      'Keine örtliche Originalbeschreibung direkt hinterlegt. Die offenen Wissensquellen werden zusätzlich geprüft; nicht belegte historische Angaben bleiben leer.'));
  }
  if(obj.kind==='Bushaltestelle')return;
  if(isBuilding&&!obj.props?.wikidata&&!obj.props?.wikipedia)return;
  const bar=create('div','source-section-title');
  bar.append(create('span','','📖 Weitere Wissensquellen'),
    create('span','source-count','Wikipedia · Wikidata'));
  root.append(bar);
  const loading=create('p','source-provider','Prüfe ergänzende Artikel und deren Objektzuordnung …');
  root.append(loading);
  const results=await Promise.allSettled([lookupWikipedia(obj),lookupWikidata(obj)]);
  if(key!==state.articleRequest)return;
  loading.remove();
  let count=0;
  for(const result of results){
    if(result.status==='fulfilled'&&result.value){
      appendKnowledgeCard(root,result.value,false,count===0&&!official.length);
      count++;
    }
  }
  if(!count)
    root.append(create('p','source-provider',
      'Kein eindeutig zugeordnetes zusätzliches Dokument abrufbar. Die direkten Stadtlinks oben bleiben verfügbar.'));
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
// Weather loads independently of the map engine so a map-source failure cannot hide it.
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

// Keep the 3D map as the only first-party immersive surface.
// Start with the entire island in view, instead of a very close-up
// potentially not-yet-rendered village view.
setStatus(startWholeIsland?'Lade Sizilien – Inselatlas …':'Lade Santa Teresa di Riva – Küste und 3D-Gebäude …');
state.weatherRequest++;
loadWeather(currentWeatherObj,state.weatherRequest);
