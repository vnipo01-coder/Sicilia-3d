/* SICILIA 3D v5.0 – Casalvecchio Explorer (modular extension)
   Dependencies: app.js / window.SICILIA_API, MapLibre.
   Sources: OpenStreetMap/Overpass, Open-Meteo, ADSB.fi. No fake live data. */
'use strict';
(function(){
const app=window.SICILIA_API;
if(!app||!app.map){console.error('SICILIA v5: core not available');return;}
const map=app.map;
const $=id=>document.getElementById(id);
const CASE={name:'Casalvecchio Siculo',wiki:'Casalvecchio Siculo',icon:'🏘️',lng:15.3222,lat:37.9573,kind:'Bergdorf',zoom:14.2};
const PIAZZA={name:'Piazza Chiesa · Casalvecchio',wiki:'Casalvecchio Siculo',icon:'⛪',lng:15.32230,lat:37.95736,kind:'Piazza',zoom:17.3};
const AIRPORT={name:'Flughafen Catania',wiki:'Flughafen Catania',icon:'✈️',lng:15.0664,lat:37.4668,kind:'Flughafen',zoom:12.8};
const ext={cloudOn:false,cloudRecords:null,cloudFrame:0,cloudTime:0,planesOn:false,planeMarkers:[],flightBusy:false,buildingQuery:0,activePane:'map'};
for(const p of [CASE,PIAZZA,AIRPORT]){
  app.PLACES.push(p);
  const b=document.createElement('button');
  b.type='button';b.dataset.name=p.name;b.textContent=p.icon+' '+p.name;
  b.onclick=()=>jump(p);
  $('places').appendChild(b);
}
const style=document.createElement('style');
style.textContent=[
'.panel{max-height:54dvh!important;overflow-y:auto!important;padding:12px!important}',
'.panel-head h1{font-size:19px!important;margin-bottom:3px!important}',
'.sic-v5-tabs{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;position:sticky;top:-12px;background:#091d30;padding:8px 0;z-index:3}',
'.sic-v5-tabs button{font-size:11px;padding:9px 4px;border-radius:9px}',
'.sic-v5-tabs .chosen{background:#196774;border-color:#83dcdd}',
'.sic-v5-pane{display:none}.sic-v5-pane.chosen{display:block}',
'.sic-v5-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:9px 0}',
'.sic-v5-actions button{font-size:12px;padding:10px 5px}',
'.sic-v5-card{background:#102f42;border:1px solid #ffffff20;border-radius:10px;padding:11px;margin:10px 0}',
'.sic-v5-card strong{font-size:12px}.sic-v5-card p,.sic-v5-note{font-size:11px;line-height:1.5;color:#c1d9e4}',
'.sic-v5-card input[type=range]{width:100%;accent-color:#83e7dd}',
'.sic-v5-field{display:flex;justify-content:space-between;gap:8px;padding:5px 0;border-bottom:1px solid #ffffff15;font-size:11px}',
'.sic-v5-field span:last-child{text-align:right;font-weight:600}',
'.sic-v5-link{color:#b1f1ff;text-decoration:underline;font-size:11px;margin-right:8px;display:inline-block;margin-top:6px}',
'.sic-v5-item{padding:7px;border:1px solid #ffffff25;background:#122b40;border-radius:8px;margin:6px 0;font-size:11px}',
'.sic-v5-item button{font-size:11px}',
'.sic-v5-weather-spot{background:#17435be8;color:white;border:1px solid #c9f0ff;border-radius:14px;padding:5px 8px;font-size:10px}',
'.panel.minimized .sic-v5-tabs{display:none}',
'@media(min-width:800px){.panel{max-height:80dvh!important;width:440px}}',
'@media(max-width:700px){.panel{max-height:55dvh!important}.status{top:max(75px,env(safe-area-inset-top))}}'
].join('\n');
document.head.appendChild(style);
const atlas=$('sic-atlas'),original=[...atlas.children];
if(original.length<10){console.error('SICILIA v5: UI structure different');return;}
const panes={};
for(const x of ['map','info','weather','flights']){
  panes[x]=document.createElement('div');panes[x].id='v5-'+x;panes[x].className='sic-v5-pane';
}
original.slice(0,4).forEach(x=>panes.map.appendChild(x));
original.slice(4,8).forEach(x=>panes.info.appendChild(x));
original.slice(8,10).forEach(x=>panes.weather.appendChild(x));
atlas.replaceChildren(...Object.values(panes));
const tabs=document.createElement('nav');tabs.className='sic-v5-tabs';
tabs.innerHTML='<button data-view="map" class="chosen">🗺️ Karte</button><button data-view="info">📖 Wissen</button><button data-view="weather">☁️ Wetter</button><button data-view="flights">✈️ Flüge</button>';
document.querySelector('.panel').insertBefore(tabs,atlas);
tabs.addEventListener('click',e=>{
  const b=e.target.closest('button[data-view]');if(b)chooseTab(b.dataset.view);
});
function chooseTab(t){
  if(!panes[t])return;ext.activePane=t;
  for(const k in panes)panes[k].classList.toggle('chosen',k===t);
  tabs.querySelectorAll('button').forEach(b=>b.classList.toggle('chosen',b.dataset.view===t));
  document.querySelector('.panel').classList.remove('minimized');
  $('sic-min').textContent='▾';
  document.querySelector('.panel').scrollTop=0;
}
const camera=document.createElement('div');
camera.innerHTML='<div class="sic-heading">🏘️ CASALVECCHIO · ERKUNDEN</div>'+
  '<div class="sic-v5-actions"><button id="v5-hills">🏞️ Hügelpanorama</button>'+
  '<button id="v5-piazza">⛪ Piazza Chiesa</button>'+
  '<button id="v5-catania">✈️ Flughafen Catania</button>'+
  '<button id="v5-island">🌍 Ganz Sizilien</button></div>'+
  '<p class="sic-v5-note">Mit zwei Fingern neigen, ziehen zum Drehen. Die 3D-Gebäude sind vereinfachte Modelle aus Karteninformationen.</p>';
panes.map.prepend(camera);
function jump(p){
  app.focusPlace(p);
  if(p===CASE)map.flyTo({center:[15.32230,37.95736],zoom:13.7,pitch:76,bearing:145,duration:1400});
  if(p===PIAZZA)map.flyTo({center:[15.32230,37.95736],zoom:17.2,pitch:76,bearing:155,duration:1400});
  if(p===AIRPORT)map.flyTo({center:[15.0664,37.4668],zoom:12.7,pitch:68,bearing:-27,duration:1400});
  chooseTab('map');
  showKnowledge(p);
}
$('v5-hills').onclick=()=>jump(CASE);
$('v5-piazza').onclick=()=>jump(PIAZZA);
$('v5-catania').onclick=()=>{jump(AIRPORT);chooseTab('flights');};
$('v5-island').onclick=()=>{map.flyTo({center:[14.05,37.55],zoom:7.5,pitch:48,bearing:0,duration:1300});chooseTab('map');};
const infoHelp=document.createElement('div');infoHelp.className='sic-v5-card';
infoHelp.innerHTML='<strong>🏛️ Mehr als Wikipedia</strong><p>Historische Hinweise aus Wikipedia, Links zu Wikidata, Kulturarchiven, OpenStreetMap und öffentliche Gebäudeeinträge. Annahmen und unbekannte Angaben werden gekennzeichnet.</p>';
panes.info.appendChild(infoHelp);
const wx=document.createElement('div');wx.className='sic-v5-card';
wx.innerHTML='<strong>☁️ Bewölkung aus der Vogelperspektive</strong>'+
'<p>Eine grob räumliche Modellvisualisierung, KEINE Live-Satellitenbilder. In grossen Massstäben wird die Wolkendecke ausgeblendet.</p>'+
'<label><input type="checkbox" id="v5-cloud-on"> Wolkenmodell auf der Karte anzeigen</label>'+
'<div id="v5-cloud-summary" class="sic-v5-note">Noch nicht geladen.</div>'+
'<div id="v5-cloud-timeline" hidden><label>Wolkenprognose: +<span id="v5-cloud-h">0</span> h</label>'+
'<input type="range" id="v5-cloud-range" min="0" max="11" value="0" step="1"></div>';
panes.weather.prepend(wx);
$('v5-cloud-on').onchange=e=>{
  ext.cloudOn=e.target.checked;
  if(ext.cloudOn)fetchClouds();
  drawClouds();
};
$('v5-cloud-range').oninput=e=>{ext.cloudFrame=+e.target.value;$('v5-cloud-h').textContent=String(ext.cloudFrame);drawClouds();};
const flights=document.createElement('div');flights.className='sic-v5-card';
flights.innerHTML='<strong>✈️ Flugradar · Catania-Fontanarossa</strong>'+
'<p>Keine erfundenen Flugzeuge: Es werden nur empfangene ADS-B-Positionen gezeigt. Browser-Zugriff und Abdeckung sind nicht garantiert.</p>'+
'<div class="sic-v5-actions"><button id="v5-flights-on">Flugzeuge laden</button>'+
'<button id="v5-flights-center">Flughafen ansehen</button></div>'+
'<p id="v5-flights-status" class="sic-v5-note">Noch nicht aktiviert.</p>'+
'<div id="v5-flight-list"></div>'+
'<a class="sic-v5-link" href="https://globe.adsb.fi/" target="_blank" rel="noopener noreferrer">Externes Flugradar öffnen</a>'+
'<p class="sic-v5-note">Quelle: adsb.fi · nicht-kommerzielle Nutzung · Positionsalter und Flugweg können unvollständig sein. Kein Buchungsdienst.</p>';
panes.flights.appendChild(flights);
$('v5-flights-center').onclick=()=>{jump(AIRPORT);chooseTab('flights');};
$('v5-flights-on').onclick=()=>{
  ext.planesOn=!ext.planesOn;
  $('v5-flights-on').textContent=ext.planesOn?'Flugradar ausschalten':'Flugzeuge laden';
  if(ext.planesOn)fetchFlights();else{clearPlanes();$('v5-flight-list').textContent='';$('v5-flights-status').textContent='Flugradar aus.';}
};
function setupCloudSource(){
  try{
    if(!map.getSource('v5-clouds'))map.addSource('v5-clouds',{type:'geojson',
      data:{type:'FeatureCollection',features:[]}});
    if(!map.getLayer('v5-clouds'))map.addLayer({
      id:'v5-clouds',type:'circle',source:'v5-clouds',maxzoom:12,
      paint:{'circle-color':'#f3f5fa',
        'circle-radius':['interpolate',['linear'],['zoom'],6,30,8,65,10,115,11,135],
        'circle-blur':0.85,
        'circle-opacity':['*',['/',['get','cover'],100],0.42]}
    });
  }catch(e){console.warn('Cloud map layer',e);}
}
async function fetchClouds(){
  if(!ext.cloudOn)return;
  if(ext.cloudRecords && Date.now()-ext.cloudTime<20*60*1000){drawClouds();return;}
  $('v5-cloud-summary').textContent='Lade Wolkenmodell für Sizilien …';
  const pts=[];
  for(const lat of [36.9,37.35,37.8,38.16])
    for(const lng of [12.65,13.3,13.95,14.6,15.25])pts.push({lat,lng});
  try{
    const params=new URLSearchParams({
      latitude:pts.map(p=>p.lat).join(','),
      longitude:pts.map(p=>p.lng).join(','),
      hourly:'cloud_cover',forecast_hours:'12',timezone:'Europe/Rome'});
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params);
    if(!response.ok)throw Error('Weather model');
    const data=await response.json(),records=Array.isArray(data)?data:[data];
    if(records.length!==pts.length)throw Error('Incomplete cloud data');
    ext.cloudRecords=records.map((r,i)=>({coords:pts[i],cover:r.hourly?.cloud_cover||[]}));
    ext.cloudTime=Date.now();
    $('v5-cloud-timeline').hidden=false;
    drawClouds();
  }catch(e){$('v5-cloud-summary').textContent='Wolkenmodell derzeit nicht abrufbar.';console.warn(e);}
}
function drawClouds(){
  const src=map.getSource('v5-clouds');if(!src)return;
  const feats=ext.cloudOn&&ext.cloudRecords?ext.cloudRecords.map(x=>({
    type:'Feature',geometry:{type:'Point',coordinates:[x.coords.lng,x.coords.lat]},
    properties:{cover:x.cover[ext.cloudFrame]||0}
  })):[];
  src.setData({type:'FeatureCollection',features:feats});
  if(ext.cloudOn&&ext.cloudRecords){
    const values=ext.cloudRecords.map(x=>x.cover[ext.cloudFrame]).filter(Number.isFinite);
    const avg=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length):0;
    $('v5-cloud-summary').textContent='Flächenstichprobe ca. '+avg+' % Wolkenbedeckung · Open-Meteo · oberhalb Zoom 12 unsichtbar.';
  }
}
function clearPlanes(){ext.planeMarkers.forEach(m=>m.remove());ext.planeMarkers=[];}
async function fetchFlights(){
  if(!ext.planesOn||ext.flightBusy)return;
  ext.flightBusy=true;
  $('v5-flights-status').textContent='Suche gemeldete Flugzeuge um Catania …';
  try{
    const response=await fetch('https://opendata.adsb.fi/api/v3/lat/37.4668/lon/15.0664/dist/55',{cache:'no-store'});
    if(!response.ok)throw Error('ADS-B: '+response.status);
    const data=await response.json();
    if(!ext.planesOn)return;
    const aircraft=(data.ac||[]).filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon)&&!a.ground);
    clearPlanes();
    $('v5-flight-list').textContent='';
    for(const a of aircraft.slice(0,28)){
      const call=String(a.flight||a.r||a.hex||'Unbekannt').trim();
      const alt=Number.isFinite(+a.alt_baro)?Math.round(+a.alt_baro*0.3048)+' m':'–';
      const speed=Number.isFinite(a.gs)?Math.round(a.gs*1.852)+' km/h':'–';
      const seen=Number.isFinite(a.seen)?Math.round(a.seen)+' s':'–';
      const el=document.createElement('button');el.className='sic-v5-weather-spot';
      el.textContent='✈';el.title=call+' · '+alt;
      el.onclick=()=>{
        map.flyTo({center:[a.lon,a.lat],zoom:11,duration:650});
        const container=document.createElement('div');container.className='sic-popup';
        container.textContent='✈ '+call+' · Höhe '+alt+' · '+speed+' · Position '+seen+' alt';
        new maplibregl.Popup().setLngLat([a.lon,a.lat]).setDOMContent(container).addTo(map);
      };
      ext.planeMarkers.push(new maplibregl.Marker({element:el}).setLngLat([a.lon,a.lat]).addTo(map));
      const row=document.createElement('div');row.className='sic-v5-item';
      row.textContent='✈ '+call+' · '+alt+' · '+speed+' · Meldung '+seen+' alt';
      $('v5-flight-list').appendChild(row);
    }
    $('v5-flights-status').textContent=aircraft.length+' Luftfahrzeuge im Umkreis von 55 NM. Daten zuletzt abgerufen: '+new Date().toLocaleTimeString('de-CH')+'. Nicht alle sind An- oder Abflüge von Catania.';
  }catch(e){
    $('v5-flights-status').textContent='Live-Positionen im Browser nicht abrufbar (CORS/Rate-Limit/Dienst). Nutze den externen Flugradar-Link. Für eine zuverlässige Integration benötigen wir später einen Backend-Proxy.';
    console.warn('Aircraft provider',e);
  }finally{ext.flightBusy=false;}
}
function link(group,label,url){
  const a=document.createElement('a');a.className='sic-v5-link';a.href=url;a.target='_blank';
  a.rel='noopener noreferrer';a.textContent=label;group.appendChild(a);
}
function showKnowledge(obj){
  const box=$('sic-inspector');
  if(!box)return;
  const old=$('v5-more-info');if(old)old.remove();
  const c=document.createElement('section');c.id='v5-more-info';c.className='sic-v5-card';
  c.innerHTML='<strong>🔎 Weitere Quellen & Baugeschichte</strong>'+
    '<p>Dokumentierte Fakten und mögliche Vermutungen werden klar getrennt.</p>';
  const links=document.createElement('div');c.appendChild(links);
  link(links,'Wikidata','https://www.wikidata.org/w/index.php?search='+encodeURIComponent(obj.name));
  link(links,'Kulturarchiv Italien','https://www.google.com/search?q='+encodeURIComponent('site:beniculturali.it '+obj.name));
  link(links,'OpenStreetMap','https://www.openstreetmap.org/?mlat='+obj.lat+'&mlon='+obj.lng+'#map=18/'+obj.lat+'/'+obj.lng);
  link(links,'Street View prüfen','https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+obj.lat+','+obj.lng);
  if(obj.kind==='Piazza'||obj.kind==='Bergdorf'){
    const p=document.createElement('p');
    p.textContent='Casalvecchio liegt in den Peloritani-Bergen. Die Piazza Chiesa befindet sich im historischen Ortszentrum; für Einzelgebäude bitte die lokalen Kataster- und Denkmalquellen konsultieren.';
    c.appendChild(p);
  }
  box.appendChild(c);
  if(obj.kind==='Gebäude')loadBuildingDetails(obj,c);
}
async function loadBuildingDetails(obj,box){
  const serial=++ext.buildingQuery;
  const p=document.createElement('p');box.appendChild(p);
  const tags=obj.props||{};
  const year=tags.start_date||tags['building:year_built']||tags['year_of_construction'];
  if(year)p.textContent='Dokumentierte Bauzeit laut Kartenattribut: '+year+'.';
  else if(/stone|brick|masonry/.test(String(tags['building:material']||'')))
    p.textContent='⚠️ Sehr unsichere Typologie-Hypothese: Stein/Mauerwerk könnte auf einen älteren Baukörper hindeuten. Ein Baujahr kann daraus nicht zuverlässig abgeleitet werden.';
  else p.textContent='Baujahr unbekannt. Ohne gesicherte Bauakten und historische Karten wäre eine Jahreszahl erfunden.';
  const other=document.createElement('p');other.textContent='Prüfe zusätzliche öffentliche Gebäudeeinträge …';box.appendChild(other);
  try{
    const query='[out:json][timeout:12];way(around:20,'+obj.lat+','+obj.lng+')["building"];out tags center 8;';
    const ac=new AbortController(),to=setTimeout(()=>ac.abort(),10000);
    let res;try{res=await fetch('https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent(query),{signal:ac.signal});}finally{clearTimeout(to);}
    if(!res.ok)throw Error('OpenStreetMap API '+res.status);
    const data=await res.json();
    if(serial!==ext.buildingQuery)return;
    const candidates=(data.elements||[]).filter(e=>e.tags&&e.center);
    const n=candidates.map(e=>({e,d:Math.hypot((e.center.lat-obj.lat)*111000,(e.center.lon-obj.lng)*88000)})).sort((a,b)=>a.d-b.d)[0];
    if(!n||n.d>45){other.textContent='Keine zusätzlichen Gebäudetags im Nahbereich gefunden.';return;}
    other.textContent='Nächstgelegener OSM-Baueintrag (Zuordnung prüfen, '+Math.round(n.d)+' m zum Mittelpunkt):';
    const ts=n.e.tags;
    const props=[['Baujahr/Bauzeit',ts.start_date||ts['building:year_built']],['Material',ts['building:material']],
      ['Architektur',ts['building:architecture']],['Dachform',ts['roof:shape']],
      ['Architekt',ts.architect],['Geschosse',ts['building:levels']],
      ['Adresse',[ts['addr:street'],ts['addr:housenumber']].filter(Boolean).join(' ')]];
    for(const [k,v] of props)if(v){
      const row=document.createElement('div');row.className='sic-v5-field';
      const a=document.createElement('span'),b=document.createElement('span');
      a.textContent=k;b.textContent=v;row.append(a,b);box.appendChild(row);
    }
    link(box,'OSM-Gebäudequelle','https://www.openstreetmap.org/way/'+n.e.id);
  }catch(e){if(serial===ext.buildingQuery)other.textContent='Zusätzliche OpenStreetMap-Daten momentan nicht verfügbar.';}
}
map.on('style.load',()=>{setupCloudSource();drawClouds();});
map.on('click',()=>{
  // app.js handles the map feature selection first. Reuse its selected object.
  const obj=app.state.selected;
  if(obj&&Number.isFinite(obj.lng)&&Number.isFinite(obj.lat)){
    chooseTab('info');
    showKnowledge(obj);
  }
});
map.on('load',()=>{setupCloudSource();});
const originalFocus=app.focusPlace;
$('places').addEventListener('click',e=>{
  const btn=e.target.closest('button[data-name]');
  if(!btn)return;
  const p=app.PLACES.find(p=>p.name===btn.dataset.name);
  if(p&&p!==CASE&&p!==PIAZZA&&p!==AIRPORT)chooseTab('info');
});
setInterval(()=>{if(!document.hidden){if(ext.planesOn)fetchFlights();if(ext.cloudOn&&Date.now()-ext.cloudTime>20*60*1000)fetchClouds();}},60000);
chooseTab('map');
})();
