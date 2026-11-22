/* SICILIA 3D — v1.0. No API key required. */
'use strict';
const PLACES=[
 {name:'Palermo',emoji:'🏛️',lng:13.3615,lat:38.1157,zoom:16.4,description:'Hauptstadt Siziliens: historische Märkte, Paläste und normannisch-arabische Architektur.'},
 {name:'Catania',emoji:'🏙️',lng:15.0873,lat:37.5028,zoom:16.2,description:'Barockstadt am Fuss des Ätna mit lebendigem Stadtzentrum.'},
 {name:'Messina',emoji:'⚓',lng:15.554,lat:38.1938,zoom:16.1,description:'Hafenstadt an der Meerenge zwischen Sizilien und Kalabrien.'},
 {name:'Siracusa',emoji:'🏺',lng:15.293,lat:37.063,zoom:16.2,description:'Antike Stadt mit der historischen Insel Ortigia.'},
 {name:'Trapani',emoji:'🌊',lng:12.535,lat:38.0176,zoom:16,description:'Westliche Küstenstadt mit Hafen und nahe gelegenen Salinen.'},
 {name:'Agrigento',emoji:'🏛️',lng:13.5766,lat:37.3111,zoom:15.8,description:'Berühmt für das antike Tal der Tempel.'},
 {name:'Ragusa',emoji:'🏘️',lng:14.728,lat:36.925,zoom:16,description:'Barockarchitektur und das historische Viertel Ragusa Ibla.'},
 {name:'Taormina',emoji:'🌅',lng:15.288,lat:37.852,zoom:16,description:'Küstenstadt mit antikem Theater und Blick auf den Ätna.'},
 {name:'Ätna',emoji:'🌋',lng:14.9934,lat:37.751,zoom:11.7,description:'Aktiver Vulkan. Diese Kartenbasis zeigt noch kein hochauflösendes 3D-Gelände.'}
];
const $=id=>document.getElementById(id);
let map,extrusionId='sicilia-3d-buildings',showBuildings=true,perspective=true,loaded=false;
function setStatus(s){$('status').textContent=s}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showPlace(p){$('placeTitle').textContent=p.name;$('details').textContent=p.description;document.querySelectorAll('.places button').forEach(b=>b.classList.toggle('active',b.dataset.place===p.name));if(map)map.flyTo({center:[p.lng,p.lat],zoom:p.zoom,pitch:perspective?65:0,bearing:perspective?-20:0,duration:1600});}
function addBuildings(){
 const style=map.getStyle();
 // OpenFreeMap Liberty is based on OpenMapTiles; building features are in its vector source.
 const candidate=Object.entries(style.sources||{}).find(([key,value])=>value.type==='vector'&&(/openmaptiles|planet|openfreemap/i.test(key+' '+(value.url||'')))) || Object.entries(style.sources||{}).find(([key,value])=>value.type==='vector');
 if(!candidate){setStatus('Karte geladen · 3D-Quelle fehlt');return;}
 const sourceName=candidate[0];
 const label=style.layers.find(l=>l.type==='symbol'&&l.layout&&l.layout['text-field']);
 try{
 map.addLayer({id:extrusionId,type:'fill-extrusion',source:sourceName,'source-layer':'building',minzoom:14,paint:{
 'fill-extrusion-color':['interpolate',['linear'],['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],0],0,'#c7b9a4',25,'#9aacae',70,'#6c8da3'],
 'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,15,['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],['*',['coalesce',['to-number',['get','building:levels']],3],3]]],
 'fill-extrusion-base':['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0],
 'fill-extrusion-opacity':.86
 }},label?.id);
 map.on('click',extrusionId,e=>{const p=e.features?.[0]?.properties||{};const name=escapeHTML(p.name||'Gebäude');const rawHeight=p.render_height??p.height;const height=rawHeight!=null?`${escapeHTML(rawHeight)} m (Datensatz)`:'nicht verfügbar (3D-Darstellung ggf. geschätzt)';$('placeTitle').textContent=name;$('details').innerHTML=`<strong>Gebäudehöhe:</strong> ${height}<br><strong>Stockwerke:</strong> ${escapeHTML(p['building:levels']??'unbekannt')}<br><span style="opacity:.7">Datenstand und Vollständigkeit hängen von der Kartenquelle ab.</span>`;});
 map.on('mouseenter',extrusionId,()=>map.getCanvas().style.cursor='pointer');map.on('mouseleave',extrusionId,()=>map.getCanvas().style.cursor='');
 setStatus('● Karte + 3D geladen');
 }catch(err){console.warn('3D-Layer nicht verfügbar',err);setStatus('● Karte geladen · 3D eingeschränkt');}
}
function init(){
 if(typeof maplibregl==='undefined'){showError();return;}
 map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[13.3615,38.1157],zoom:16.4,pitch:65,bearing:-20,antialias:true,maxPitch:85});
 map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');
 map.on('load',()=>{loaded=true;$('error').hidden=true;setStatus('● Karte geladen');addBuildings();});
 map.on('error',e=>console.warn('MapLibre:',e.error?.message||e));
 setTimeout(()=>{if(!loaded)showError()},15000);
}
function showError(){$('error').hidden=false;setStatus('Keine Kartenverbindung')}
PLACES.forEach(p=>{const b=document.createElement('button');b.type='button';b.dataset.place=p.name;b.textContent=`${p.emoji} ${p.name}`;b.addEventListener('click',()=>showPlace(p));$('places').appendChild(b)});
$('overview').onclick=()=>{if(map)map.flyTo({center:[14.05,37.55],zoom:7.6,pitch:25,bearing:0,duration:1600});$('placeTitle').textContent='Sizilien';$('details').textContent='Inselübersicht: Wähle eine Stadt, um zu den 3D-Gebäuden zu fliegen.'};
$('buildings').onclick=()=>{showBuildings=!showBuildings;$('buildings').classList.toggle('active',showBuildings);$('buildings').setAttribute('aria-pressed',String(showBuildings));if(map?.getLayer(extrusionId))map.setLayoutProperty(extrusionId,'visibility',showBuildings?'visible':'none')};
$('perspective').onclick=()=>{perspective=!perspective;$('perspective').classList.toggle('active',perspective);$('perspective').setAttribute('aria-pressed',String(perspective));if(map)map.easeTo({pitch:perspective?65:0,bearing:perspective?-20:0,duration:900})};
$('retry').onclick=()=>location.reload();
showPlace(PLACES[0]);init();
