import {isSicily,getBuildingHeight,propertyRows} from './geo.js?v=102';

/* SICILIA 3D v10.1 ATLAS PREVIEW – isolated from v9 main site.
   Grounded map source labels and source-aware object inspector. */
const $=id=>document.getElementById(id);
const PLACES=[
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
  peaks:'s10-peaks',poi:'s10-poi',cloud:'s10-cloud'};
const state={mode:'relief',exaggeration:1,shade:true,buildings:true,peaks:false,
  selected:null,articleRequest:0,weatherRequest:0,loaded:false};
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
const map=new maplibregl.Map({
  container:'map',style:'https://tiles.openfreemap.org/styles/bright',
  center:[15.19,37.94],zoom:11.2,pitch:48,bearing:-15,
  maxPitch:80,antialias:true
});
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
  map.setTerrain({source:'s10-dem',exaggeration:state.exaggeration});
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
  const vectors=Object.entries(map.getStyle().sources||{}).find(([k,v])=>v.type==='vector'&&
    /planet|openfreemap|openmaptiles/i.test(k+' '+(v.url||'')))||
    Object.entries(map.getStyle().sources||{}).find(([,v])=>v.type==='vector');
  const source=vectors?.[0];
  if(source){
    addLayer({id:ids.build,type:'fill-extrusion',source,'source-layer':'building',minzoom:14,
      paint:{'fill-extrusion-color':['interpolate',['linear'],
        ['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],0],
        0,'#cbb89d',25,'#b8b3a7',80,'#7695a2'],
        'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,15,
          ['coalesce',['to-number',['get','render_height']],
            ['to-number',['get','height']],['*',['coalesce',['to-number',['get','building:levels']],3],3]]],
        'fill-extrusion-base':['coalesce',['to-number',['get','render_min_height']],0],
        'fill-extrusion-opacity':.86}},labels);
    addLayer({id:ids.peaks,type:'circle',source,'source-layer':'mountain_peak',minzoom:12.4,
      filter:['all',['has','name'],['>=',['to-number',['get','ele'],0],700]],
      paint:{'circle-radius':4.5,'circle-color':'#eecfa5','circle-opacity':.82,
        'circle-stroke-width':1.2,'circle-stroke-color':'#294457'}},labels);
    addLayer({id:ids.poi,type:'circle',source,'source-layer':'poi',minzoom:13.4,
      paint:{'circle-radius':10,'circle-opacity':.007}},labels);
  }
  updateLayers();
}
function updateLayers(){
  visible(ids.sat,state.mode==='sat');
  visible(ids.color,state.mode==='relief');
  visible(ids.shade,state.shade&&state.mode!=='map');
  visible(ids.build,state.buildings);
  visible(ids.peaks,state.peaks);
  visible(ids.poi,true);
}
map.on('style.load',()=>{
  try{prepareStyle();setStatus('● SICILIA 3D v10.1 · Gelände + Kartenansicht');}
  catch(e){console.warn('3D-Layer',e);setStatus('Karte teilweise geladen · Relief nicht verfügbar');}
});
map.on('load',()=>{
  state.loaded=true;setStatus('● V10.1 · Kartenatlas geladen');
});
map.on('error',e=>{console.warn('Externe Kartenkachel:',e.error?.message||e);});
function flyingWalkHref(){
  const c=state.selected||{lat:map.getCenter().lat,lon:map.getCenter().lng,name:'Kartenausschnitt Sizilien'};
  $('walking').href='./walk.html?'+new URLSearchParams({
    lat:c.lat.toFixed(6),lng:c.lon.toFixed(6),name:c.name});
}
map.on('moveend',()=>{
  if(!state.selected)flyingWalkHref();
});
$('walking').addEventListener('click',flyingWalkHref);
$('casal').onclick=()=>centerPlace(PLACES[0]);
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
map.getCanvasContainer().addEventListener('wheel',e=>{
  if(!e.shiftKey)return;
  e.preventDefault();e.stopImmediatePropagation();
  map.easeTo({pitch:Math.min(78,Math.max(0,map.getPitch()+Math.sign(e.deltaY)*3)),duration:90});
},{capture:true,passive:false});
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
$('search-go').onclick=searchPlace;
$('search').addEventListener('keydown',e=>{if(e.key==='Enter')searchPlace();});
function handleClick(e){
  const validLayers=[ids.build,ids.peaks,ids.poi].filter(id=>map.getLayer(id));
  let features=[];
  try{if(validLayers.length)features=map.queryRenderedFeatures(e.point,{layers:validLayers});}
  catch(err){}
  features.sort((a,b)=>{
    const rank={[ids.build]:0,[ids.peaks]:1,[ids.poi]:2};
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
  const kind=f.layer.id===ids.build?'Gebäude':f.layer.id===ids.peaks?'Berggipfel':
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
  const walkingLink=create('a','','🚶 3D Walk hier');
  walkingLink.href=visit;links.append(walkingLink);
  links.append(link('🗺️ OpenStreetMap',
    'https://www.openstreetmap.org/?mlat='+obj.lat+'&mlon='+obj.lon+'#map=18/'+obj.lat+'/'+obj.lon));
  links.append(link('📚 Wikipedia-Suche',
    'https://de.wikipedia.org/w/index.php?search='+encodeURIComponent(obj.name)));
  if(obj.props?.wikidata&&/^Q\d+$/.test(obj.props.wikidata))
    links.append(link('🔗 Wikidata','https://www.wikidata.org/wiki/'+obj.props.wikidata));
  if(Math.hypot(obj.lat-37.95736,obj.lon-15.3223)<.014)
    links.append(link('⛪ Gemeinde – Kirchen',
      'https://comune.casalvecchiosiculo.me.it/tipi_luogo/chiesa/'));
  $('walking').href=visit;
  loadArticle(obj,state.articleRequest);
  loadWeather(obj,state.weatherRequest);
}
$('inspector-close').onclick=()=>$('inspector').hidden=true;
async function loadArticle(obj,key){
  const article=$('article');article.replaceChildren(create('strong','','📖 Geschichte & Wissen'));
  if(obj.kind==='Gebäude'&&!obj.props?.wikidata){
    article.append(create('p','','Für dieses Gebäude ist kein eindeutig zugeordneter historischer Artikel erfasst. Prüfe die OSM- und Archivquellen.'));return;
  }
  article.append(create('p','','Prüfe passende Artikel …'));
  const title=obj.name==='Ätna'?'Ätna':obj.name;
  for(const lang of ['de','it']){
    try{
      const p=new URLSearchParams({action:'query',prop:'extracts|info|coordinates',inprop:'url',
        titles:title,exintro:'1',explaintext:'1',redirects:'1',format:'json',origin:'*'});
      const r=await fetch('https://'+lang+'.wikipedia.org/w/api.php?'+p);
      if(!r.ok)continue;
      const page=Object.values((await r.json()).query?.pages||{})[0];
      if(key!==state.articleRequest)return;
      if(!page||page.missing!==undefined)continue;
      const geo=page.coordinates?.[0];
      if(geo){
        const dist=Math.hypot((geo.lat-obj.lat)*111,(geo.lon-obj.lon)*88);
        const threshold=obj.kind==='Gebäude'?.35:14;
        if(dist>threshold){
          article.replaceChildren(create('strong','','📖 Artikel nicht örtlich bestätigt'),
            create('p','','Ein gleichnamiger Artikel liegt rund '+dist.toFixed(1)+' km entfernt und wird deshalb nicht automatisch zugeordnet.'));
          return;
        }
      }
      article.replaceChildren(create('strong','','📖 '+page.title),
        create('p','',(page.extract||'Keine Vorschau').slice(0,630)),
        create('small','','Wikipedia '+lang.toUpperCase()+
          (geo?' · Artikelkoordinate geprüft':' · Identität nicht geografisch geprüft')));
      article.append(link('Vollständigen Artikel ↗',page.fullurl||
        'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(page.title)));
      return;
    }catch(e){console.warn('Wikipedia nicht erreichbar:',e);}
  }
  if(key===state.articleRequest)
    article.replaceChildren(create('strong','','📖 Kein bestätigter Artikel'),
      create('p','','Es ist keine eindeutig verknüpfte historische Beschreibung verfügbar.'));
}
async function loadWeather(obj,key){
  const box=$('weather');box.replaceChildren(create('strong','','🌦️ Wetter · '+obj.name),
    create('p','','Aktuelle Modellwerte werden geladen …'));
  try{
    const p=new URLSearchParams({latitude:String(obj.lat),longitude:String(obj.lon),
      current:'temperature_2m,cloud_cover,wind_speed_10m,precipitation',timezone:'Europe/Rome'});
    const r=await fetch('https://api.open-meteo.com/v1/forecast?'+p);
    if(!r.ok)throw Error('Open-Meteo');
    const v=(await r.json()).current;
    if(key!==state.weatherRequest)return;
    box.replaceChildren(create('strong','','🌦️ Wetter · Open-Meteo'),
      create('p','',v.temperature_2m+' °C · Bewölkung '+v.cloud_cover+
        ' % · Wind '+v.wind_speed_10m+' km/h · Niederschlag '+v.precipitation+' mm'),
      create('p','',v.time+' (Ortszeit Italien) · Modellwert, keine Live-Messung am Gebäude'));
  }catch(e){
    if(key===state.weatherRequest)box.replaceChildren(create('strong','','🌦️ Wetter'),
      create('p','','Der Wetterdienst ist momentan nicht erreichbar.'));
  }
}
flyingWalkHref();
centerPlace(PLACES[0]);
