import {readLocation,isSicily,getBuildingHeight} from './geo.js?v=115';
import {SANTA,STOPS,LOCAL_REFERENCES,LINKS,inSantaTeresa,streetImageryUrl,stopDetails} from './local-sources.js?v=115';
import {getWeather,weatherDescription,formatWeather} from './weather.js?v=115';
const $=id=>document.getElementById(id);
const loc=readLocation();
const params=new URLSearchParams(location.search);
if(!loc.custom){loc.lat=SANTA.lat;loc.lon=SANTA.lon;loc.name=SANTA.name;}
let lon=loc.lon,lat=loc.lat,heading=Number(params.get('bearing'))||0;
let speed=6,pitch=76,zoom=18.1,wheelTilt=false,buildingsOn=true;
const keys=new Set(),maplibre=window.maplibregl;
if(!maplibre){
  $('status').textContent='Kartenbibliothek nicht erreichbar. Öffne den Atlas und versuche es erneut.';
  throw Error('MapLibre script missing');
}
const demoStyle={
  version:8,sources:{
    imagery:{type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize:256,maxzoom:19,attribution:'Esri und Datenpartner'},
    osmtiles:{type:'vector',url:'https://tiles.openfreemap.org/planet',
      attribution:'© OpenStreetMap-Mitwirkende / OpenFreeMap'}
  },
  layers:[{id:'satellite-base',type:'raster',source:'imagery'}]
};
const map=new maplibre.Map({
  container:'map',style:'https://tiles.openfreemap.org/styles/bright',
  center:[lon,lat],zoom,pitch,bearing:heading,maxPitch:85,antialias:true
});
map.addControl(new maplibre.NavigationControl({visualizePitch:true}),'bottom-right');
let loaded=false,backupUsed=false;
const setStatus=t=>$('status').textContent=t;
setTimeout(()=>{
  if(loaded)return;
  backupUsed=true;setStatus('Vektorkarte antwortet nicht. Zeige Satellit und versuche weiterhin 3D-Gebäude …');
  map.setStyle(demoStyle);
},13000);
function addLayers(){
  const sources=Object.entries(map.getStyle().sources||{});
  const existing=sources.find(([,v])=>v.type==='vector');
  let source=existing?.[0];
  if(!source){
    source='explore-osm-3d';
    map.addSource(source,{type:'vector',url:'https://tiles.openfreemap.org/planet',
      attribution:'© OpenStreetMap-Mitwirkende / OpenFreeMap'});
  }
  const buildingHeight=['case',
    ['>', ['to-number',['get','render_height'],0],2],['to-number',['get','render_height'],0],
    ['>', ['to-number',['get','height'],0],2],['to-number',['get','height'],0],
    10];
  const label=map.getStyle().layers.find(l=>l.type==='symbol'&&l.layout?.['text-field'])?.id;
  if(!map.getLayer('explore-3d-buildings')){
    map.addLayer({id:'explore-3d-buildings',type:'fill-extrusion',source,'source-layer':'building',minzoom:13.8,
      paint:{
        'fill-extrusion-color':['interpolate',['linear'],buildingHeight,
          0,'#e6d0b4',15,'#c7b49d',45,'#8eaaa8',95,'#7196ab'],
        'fill-extrusion-height':['interpolate',['linear'],['zoom'],13.8,0,15,buildingHeight],
        'fill-extrusion-base':['to-number',['get','render_min_height'],0],
        'fill-extrusion-opacity':0.96
      }},label);
  }
  if(!map.getSource('explore-dem'))map.addSource('explore-dem',{
    type:'raster-dem',tiles:['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
    tileSize:256,maxzoom:15,encoding:'terrarium'
  });
  try{map.setTerrain({source:'explore-dem',exaggeration:1});}
  catch(error){console.warn('Terrain unavailable',error);}
  map.setLayoutProperty('explore-3d-buildings','visibility',buildingsOn?'visible':'none');
  setStatus(backupUsed?'Satellitenansicht und Vektor-3D geladen':'3D-Gebäude und topografisches Gelände aktiviert');
}
map.on('style.load',()=>{
  loaded=true;
  try{addLayers();}catch(error){
    setStatus('Basiskarte sichtbar · Gebäude teilweise eingeschränkt');
    console.warn('3D layers',error);
  }
});
map.on('error',e=>{
  console.warn('3D source',e.error?.message||e);
  if(!loaded)setStatus('Basiskarte verzögert · Satelliten-Ersatz wird geprüft');
});
$('place').textContent=loc.name+' · 3D-Küstenansicht · v10.5';
function updateWalkLink(){
  const p=new URLSearchParams({lat:lat.toFixed(6),lng:lon.toFixed(6),name:loc.name});
  $('real-walk').href='./walk.html?'+p;
}
function updateCoords(){
  $('coord').textContent='📍 '+lat.toFixed(5)+'° N · '+lon.toFixed(5)+'° E · '+Math.round(map.getBearing())+'° · '+map.getPitch().toFixed(0)+'°';
  updateWalkLink();
}
updateWalkLink();
$('speed').oninput=v=>{speed=Number(v.target.value);$('speed-value').textContent=speed+' m/s';};
$('reset').onclick=()=>{heading=0;pitch=76;map.easeTo({bearing:0,pitch:76,zoom:18.1,duration:400});};
$('overview').onclick=()=>{
  heading=map.getBearing();map.easeTo({center:[lon,lat],zoom:15.2,pitch:57,duration:650});
};
$('satellite').onclick=()=>{
  const current=map.getStyle().sources||{};
  // Preserve 3D buildings by adding imagery to the current style,
  // rather than replacing the entire style with a raster-only map.
  if(!map.getSource('explore-satellite'))map.addSource('explore-satellite',{
    type:'raster',tiles:['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    tileSize:256,maxzoom:19});
  if(!map.getLayer('explore-satellite-layer')){
    const before=map.getLayer('explore-3d-buildings')?'explore-3d-buildings':undefined;
    map.addLayer({id:'explore-satellite-layer',type:'raster',source:'explore-satellite',
      paint:{'raster-opacity':1}},before);
  }else{
    const showing=map.getLayoutProperty('explore-satellite-layer','visibility')!=='none';
    map.setLayoutProperty('explore-satellite-layer','visibility',showing?'none':'visible');
  }
  const visible=map.getLayoutProperty('explore-satellite-layer','visibility')!=='none';
  $('satellite').textContent=visible?'🛰️ Satellit aus':'🛰️ Satellit ein';
};
$('buildings').onclick=()=>{
  buildingsOn=!buildingsOn;
  if(map.getLayer('explore-3d-buildings'))
    map.setLayoutProperty('explore-3d-buildings','visibility',buildingsOn?'visible':'none');
  $('buildings').textContent=buildingsOn?'🏠 Gebäude an':'🏠 Gebäude aus';
  $('buildings').classList.toggle('selected',buildingsOn);
};
$('tilt').onclick=()=>{
  wheelTilt=!wheelTilt;
  $('tilt').textContent=wheelTilt?'🖱️ Rad: Neigen':'🖱️ Rad: Zoom';
};
$('mouse').onclick=async()=>{
  const canvas=map.getCanvas();
  if(document.pointerLockElement===canvas){document.exitPointerLock();return;}
  try{await canvas.requestPointerLock();}
  catch(error){setStatus('Maussteuerung nicht verfügbar. Drehe die Ansicht mit rechter Maustaste.');}
};
document.addEventListener('pointerlockchange',()=>{
  $('mouse').textContent=document.pointerLockElement===map.getCanvas()?
    '✕ Maus freigeben (Esc)':'🖱️ Maus übernehmen';
});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==map.getCanvas())return;
  heading+=e.movementX*.11;
  pitch=Math.max(20,Math.min(85,pitch+e.movementY*.07));
  map.jumpTo({bearing:heading,pitch});
});
map.getCanvasContainer().addEventListener('wheel',e=>{
  if(Boolean(e.shiftKey)===wheelTilt)return;
  e.preventDefault();e.stopImmediatePropagation();
  pitch=Math.max(20,Math.min(85,map.getPitch()+Math.sign(e.deltaY)*3.5));
  map.easeTo({pitch,duration:90});
},{capture:true,passive:false});
const keymap={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',
  a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',
  q:'rotateLeft',e:'rotateRight',Shift:'sprint'};
document.addEventListener('keydown',e=>{
  const key=keymap[e.key];
  if(key&&!(e.target instanceof Element && e.target.closest('input,textarea'))){
    e.preventDefault();keys.add(key);
  }
});
document.addEventListener('keyup',e=>{const k=keymap[e.key];if(k)keys.delete(k);});
window.addEventListener('blur',()=>keys.clear());
let last=0,lastMove=0,previous=0;
function animate(t){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,(t-last)/1000||0);last=t;
  if(!dt)return;
  const f=Number(keys.has('forward'))-Number(keys.has('back'));
  const right=Number(keys.has('right'))-Number(keys.has('left'));
  const angle=(heading*Math.PI)/180;
  if(keys.has('rotateLeft'))heading-=dt*55;
  if(keys.has('rotateRight'))heading+=dt*55;
  if(f||right){
    const step=speed*(keys.has('sprint')?2:1)*dt/Math.max(1,Math.hypot(f,right));
    const east=(Math.sin(angle)*f+Math.cos(angle)*right)*step;
    const north=(Math.cos(angle)*f-Math.sin(angle)*right)*step;
    lon+=east/(111320*Math.cos(lat*Math.PI/180));
    lat+=north/111320;
    if(!isSicily(lat,lon)){
      lon=Math.max(11.35,Math.min(16.5,lon));
      lat=Math.max(35.7,Math.min(39.25,lat));
    }
  }
  if((f||right||keys.has('rotateLeft')||keys.has('rotateRight'))&&t-lastMove>35){
    lastMove=t;map.jumpTo({center:[lon,lat],bearing:heading,pitch});
  }
  if(t-previous>400){previous=t;updateCoords();}
}
requestAnimationFrame(animate);
$('close').onclick=()=>$('detail').classList.remove('open');
map.on('click',e=>{
  const v=map.getLayer('explore-3d-buildings')?
    map.queryRenderedFeatures(e.point,{layers:['explore-3d-buildings']}):[];
  const feat=v[0];if(!feat)return;
  const p=feat.properties||{},box=$('detail-body');
  box.replaceChildren();
  $('detail-title').textContent='🏛️ '+(p.name||'Gebäude');
  const display=(key,val)=>{
    const row=document.createElement('p'),strong=document.createElement('strong');
    strong.textContent=key+': ';row.append(strong,document.createTextNode(String(val)));box.append(row);
  };
  display('Kartendaten','OpenStreetMap/OpenFreeMap');
  display('Höhe',p.render_height||p.height||'nicht gemessen; Modellhöhe');
  if(p['building:levels'])display('Stockwerke',p['building:levels']);
  display('Baujahr',p.start_date||'nicht dokumentiert');
  const a=document.createElement('a');
  a.href='https://de.wikipedia.org/w/index.php?search='+encodeURIComponent(p.name||loc.name);
  a.target='_blank';a.rel='noopener noreferrer';a.textContent='Wikipedia-Suche ↗';box.append(a);
  $('detail').classList.add('open');
});
map.on('moveend',()=>{
  if(!keys.size){
    const c=map.getCenter();lon=c.lng;lat=c.lat;
    heading=map.getBearing();pitch=map.getPitch();zoom=map.getZoom();
    updateWalkLink();
  }
});
const panel=$('panel-hide');panel.onclick=()=>{
  const nav=panel.closest('nav'),isSmall=nav.dataset.small==='1';
  nav.dataset.small=isSmall?'0':'1';
  for(const child of nav.children){
    if(child===panel.parentElement||child.tagName==='H2')continue;
    child.hidden=!isSmall;
  }
  panel.textContent=isSmall?'− Menü verkleinern':'+ Menü öffnen';
};

const coastalDocs=$('coastal-documents');
function sourceLink(label,url){
  const a=document.createElement('a');a.textContent=label;a.href=url;
  a.target='_blank';a.rel='noopener noreferrer';return a;
}
function renderLocalPanel(){
  coastalDocs.replaceChildren();
  const nearby=inSantaTeresa({lat,lon},5500);
  for(const btn of document.querySelectorAll('.coastal-links button'))
    btn.disabled=!nearby;
  if(!nearby){
    $('coastal-summary').textContent='Der aktuelle Ausschnitt liegt ausserhalb von Santa Teresa. Für diesen Ort werden vorhandene Kartendaten angezeigt.';
    coastalDocs.append(sourceLink('📷 Mapillary-Aufnahmen prüfen',streetImageryUrl(lat,lon)));
    return;
  }
  $('coastal-summary').textContent=
    'Santa Teresa di Riva: amtliche Kulturquellen, überprüfbare Haltestellen und aktuelle Wettermodellwerte. Die Häuser sind OSM-3D-Modelle, keine exakten Fassadenrekonstruktionen.';
  for(const info of LOCAL_REFERENCES.slice(0,4))
    coastalDocs.append(sourceLink('🏛️ '+info.title,info.url));
  coastalDocs.append(sourceLink('🚌 Interbus-Haltestellenänderung',LINKS.transportNotice));
  coastalDocs.append(sourceLink('🚌 Fahrplanauskunft Interbus',LINKS.transport));
  coastalDocs.append(sourceLink('🚆 Trenitalia',LINKS.trains));
  coastalDocs.append(sourceLink('📷 Strassenbilder bei Mapillary prüfen',streetImageryUrl(lat,lon)));
}
const busMarkers=[];
function showStop(stop){
  $('detail-title').textContent='🚌 '+stop.name;
  const box=$('detail-body');box.replaceChildren();
  for(const item of stopDetails(stop)){
    const p=document.createElement('p'),strong=document.createElement('strong');
    strong.textContent=item.label+': ';
    p.append(strong,document.createTextNode(item.value));box.append(p);
  }
  box.append(sourceLink('Offizielle Interbus-Mitteilung ↗',LINKS.transportNotice));
  box.append(sourceLink('Fahrplan beim Betreiber prüfen ↗',LINKS.transport));
  box.append(sourceLink('Haltestellen-Datenquelle ↗',stop.url));
  $('detail').classList.add('open');
}
function initStops(){
  for(const stop of STOPS){
    const el=document.createElement('button');el.className='coastal-marker';
    el.textContent='🚌';el.title=stop.name;
    el.setAttribute('aria-label','Bushaltestelle '+stop.name);
    el.onclick=e=>{e.stopPropagation();showStop(stop);};
    const marker=new maplibre.Marker({element:el,anchor:'bottom'}).
      setLngLat([stop.lon,stop.lat]).addTo(map);
    busMarkers.push(marker);
  }
  refreshStops();
}
function refreshStops(){
  const show=inSantaTeresa({lat,lon},8000)&&map.getZoom()>=12;
  busMarkers.forEach(m=>m.getElement().style.display=show?'block':'none');
}
function flyToPlace(p,zoomLevel=18.4){
  lon=p.lon;lat=p.lat;heading=0;pitch=78;
  map.flyTo({center:[lon,lat],zoom:zoomLevel,pitch,bearing:heading,duration:950});
  updateCoords();renderLocalPanel();refreshStops();
}
$('goto-municipio').onclick=()=>flyToPlace(SANTA);
$('goto-lungomare').onclick=()=>flyToPlace({
  lat:37.9393543554652,lon:15.3628167268097},18.2);
$('goto-busstop').onclick=()=>{
  const stop=STOPS[0];flyToPlace(stop,18.4);showStop(stop);
};
let weatherLast=null,weatherBusy=false;
async function refreshWeather(){
  if(weatherBusy)return;weatherBusy=true;
  $('weather-live').textContent='🌦️ Lade aktuelle Modellwerte …';
  try{
    const data=await getWeather(lat,lon,{fresh:true});
    weatherLast=data;
    const fmt=formatWeather(data);
    $('weather-live').textContent=weatherDescription(data)+' · Stand '+fmt.time+
      (data.stale?' · zwischengespeichert':'')+' · Open-Meteo-Modell';
  }catch(error){
    $('weather-live').textContent='🌦️ Wetter nicht verfügbar – erneute Abfrage später';
  }finally{weatherBusy=false;}
}
map.on('load',()=>{initStops();renderLocalPanel();refreshWeather();});
map.on('moveend',()=>{renderLocalPanel();refreshStops();});
setInterval(()=>{
  if(!document.hidden)refreshWeather();
},6*60*1000);

updateCoords();
