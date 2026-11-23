/* SICILIA 3D v3.2 – erweiterte topografische Karte und Datenstudio */
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
function addBuildings(){if(map.getLayer(extrusionId))return;
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
 
map.on('load', () => {
  loaded = true;
  $('error').hidden = true;
  setStatus('● Karte geladen');
  addBuildings();

  try {
    map.addSource('sicilia-terrain', {
      type: 'raster-dem',
      tiles: [
        'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
      ],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 15,
      attribution: 'Elevation data: Mapzen/AWS and source contributors'
    });

    
map.setTerrain({
  source: 'sicilia-terrain',
  exaggeration: 1.5
});

// Interaktive Höhensteuerung für SICILIA 3D
const terrainControl = document.createElement('div');

terrainControl.style.cssText = `
  position: fixed;
  bottom: 20px;
  left: 15px;
  z-index: 1000;
  background: rgba(12, 30, 45, 0.94);
  color: white;
  padding: 15px;
  border-radius: 12px;
  font-family: Arial, sans-serif;
  box-shadow: 0 4px 20px #0005;
`;

terrainControl.innerHTML = `
  <label for="etnaHeight">
    🌋 3D-Geländehöhe:
    <strong id="etnaValue">1.5×</strong>
  </label>
  <div style="margin-top:10px">
    <input
      id="etnaHeight"
      type="range"
      min="0"
      max="3"
      step="0.1"
      value="1.5"
      style="width:180px"
    >
  </div>
`;

document.body.appendChild(terrainControl);

document.getElementById('etnaHeight')
  .addEventListener('input', (event) => {
    const height = Number(event.target.value);

    document.getElementById('etnaValue')
      .textContent = height.toFixed(1) + '×';

    map.setTerrain({
      source: 'sicilia-terrain',
      exaggeration: height
    });
  });

    setStatus('● Karte + 3D-Gelände aktiviert');
  } catch (error) {
    console.warn('Gelände konnte nicht aktiviert werden:', error);
    setStatus('● Karte geladen · Gelände nicht verfügbar');
  }
});
  
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


/* SICILIA 3D v3.2 – Kartenstudio mit topografischer Schattierung,
   Farbstilen, aktuellen Wetterdaten und Wikipedia */
(function(){
  const THEMES={
    klassisch:'https://tiles.openfreemap.org/styles/liberty',
    natur:'https://tiles.openfreemap.org/styles/bright',
    hell:'https://tiles.openfreemap.org/styles/positron'
  };
  const DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  let shadeEnabled=true, weatherId=0, wikiId=0;
  const css=document.createElement('style');
  css.textContent='.panel{max-height:56dvh;overflow-y:auto;overscroll-behavior:contain}.sic-studio{margin-top:12px;border-top:1px solid #ffffff30;padding-top:10px}.sic-studio summary{cursor:pointer;font-weight:700;font-size:13px;color:#aef5de;padding:8px 0}.sic-actions{display:flex;gap:6px;flex-wrap:wrap;margin:9px 0}.sic-actions button{font-size:12px;min-width:77px;flex:1;padding:8px 6px}.sic-box{font-size:12px;line-height:1.5;background:#183d50;border-radius:9px;padding:9px;margin:7px 0;overflow-wrap:anywhere}.sic-box a{color:#a6edfc}.sic-studio label{font-size:12px;display:block;margin:8px 0}@media(min-width:800px){.panel{max-height:78dvh}}';
  document.head.appendChild(css);
  const node=document.createElement('details');
  node.className='sic-studio';
  node.innerHTML='<summary>🎨 SICILIA 3D v3.2 · Kartenstudio</summary>'
    +'<div class="sic-actions" id="sic-themes"><button data-theme="klassisch" class="active">🏛️ Klassisch</button><button data-theme="natur">🌿 Natur</button><button data-theme="hell">☀️ Hell</button></div>'
    +'<label><input type="checkbox" id="sic-shading" checked> 🏔️ Geländeschattierung</label>'
    +'<div class="sic-box" id="sic-weather">🌦️ Aktuelles Wetter wird geladen …</div>'
    +'<div class="sic-box" id="sic-wiki">📚 Wikipedia-Informationen werden geladen …</div>'
    +'<div class="sic-actions"><button type="button" id="sic-nearby">📍 Wikipedia in der Nähe</button></div>'
    +'<small>© OpenStreetMap · OpenFreeMap · Mapzen/AWS · Open-Meteo · Wikipedia. Daten können unvollständig sein.</small>';
  document.querySelector('.panel').appendChild(node);
  function addShadeAndTerrain(){
    try{
      if(!map.getSource('sicilia-terrain'))map.addSource('sicilia-terrain',{
        type:'raster-dem',tiles:[DEM],tileSize:256,encoding:'terrarium',maxzoom:15,
        attribution:'Elevation data: Mapzen/AWS contributors'
      });
      if(!map.getSource('sicilia-hill-dem'))map.addSource('sicilia-hill-dem',{
        type:'raster-dem',tiles:[DEM],tileSize:256,encoding:'terrarium',maxzoom:15
      });
      if(!map.getLayer('sicilia-shade')){
        const label=map.getStyle().layers.find(l=>l.type==='symbol');
        map.addLayer({id:'sicilia-shade',type:'hillshade',source:'sicilia-hill-dem',
          layout:{visibility:shadeEnabled?'visible':'none'},
          paint:{'hillshade-exaggeration':0.43,
            'hillshade-shadow-color':'#43584c','hillshade-highlight-color':'#faf0cf',
            'hillshade-accent-color':'#74816f'}
        },label?.id);
      }
      const height=Number(document.getElementById('etnaHeight')?.value||1.5);
      map.setTerrain({source:'sicilia-terrain',exaggeration:height});
    }catch(error){console.warn('Topografie:',error);}
  }
  map.on('load',()=>{
    addShadeAndTerrain();
    // Wird erst nach dem ersten Laden registriert, damit der bestehende
    // funktionsfähige Gelände-Initialisierer nicht doppelt ausgeführt wird.
    map.on('style.load',()=>{
      addBuildings();
      addShadeAndTerrain();
      setStatus('● SICILIA 3D v3.2 · 3D-Relief');
    });
  });
  document.querySelectorAll('#sic-themes button').forEach(button=>{
    button.onclick=()=>{
      document.querySelectorAll('#sic-themes button').forEach(b=>b.classList.toggle('active',b===button));
      setStatus('Kartenfarben werden geladen …');
      try{map.setTerrain(null);map.setStyle(THEMES[button.dataset.theme],{diff:false});}
      catch(error){console.warn('Kartenstil:',error);setStatus('Kartenstil nicht verfügbar');}
    };
  });
  document.getElementById('sic-shading').onchange=e=>{
    shadeEnabled=e.target.checked;
    if(map.getLayer('sicilia-shade'))map.setLayoutProperty('sicilia-shade','visibility',shadeEnabled?'visible':'none');
  };
  async function weather(p){
    const box=document.getElementById('sic-weather'),key=++weatherId;
    box.textContent='🌦️ Wetter für '+p.name+' wird geladen …';
    try{
      const url='https://api.open-meteo.com/v1/forecast?latitude='+p.lat+'&longitude='+p.lng+'&current=temperature_2m,wind_speed_10m,precipitation&timezone=Europe%2FRome';
      const response=await fetch(url);
      if(!response.ok)throw Error('Wetter-API');
      const json=await response.json();
      if(key!==weatherId)return;
      const v=json.current;
      box.textContent='🌦️ '+p.name+': '+v.temperature_2m+' °C · Wind '+v.wind_speed_10m+' km/h · Niederschlag '+v.precipitation+' mm · '+v.time+' (Italien) · Open-Meteo';
    }catch(error){if(key===weatherId)box.textContent='Wetter momentan nicht verfügbar.';}
  }
  async function wiki(p){
    const box=document.getElementById('sic-wiki'),key=++wikiId;
    const name=p.name==='Siracusa'?'Syrakus':p.name;
    box.textContent='📚 Wikipedia zu '+p.name+' wird geladen …';
    try{
      const params=new URLSearchParams({action:'query',prop:'extracts',exintro:'1',explaintext:'1',redirects:'1',titles:name,format:'json',origin:'*'});
      const response=await fetch('https://de.wikipedia.org/w/api.php?'+params);
      if(!response.ok)throw Error('Wikipedia-API');
      const json=await response.json();
      if(key!==wikiId)return;
      const page=Object.values(json.query?.pages||{})[0];
      box.textContent=(page?.extract||'').slice(0,370)||'Keine Artikelvorschau vorhanden.';
    }catch(error){if(key===wikiId)box.textContent='Wikipedia-Vorschau derzeit nicht abrufbar.';}
    if(key===wikiId){
      const a=document.createElement('a');
      a.href='https://de.wikipedia.org/wiki/'+encodeURIComponent(name.replaceAll(' ','_'));
      a.target='_blank';a.rel='noopener noreferrer';a.textContent=' · Artikel öffnen';box.appendChild(a);
    }
  }
  document.getElementById('sic-nearby').onclick=async()=>{
    const box=document.getElementById('sic-wiki'),key=++wikiId,c=map.getCenter();
    box.textContent='📍 Suche Wikipedia-Artikel in der Nähe …';
    try{
      const params=new URLSearchParams({action:'query',list:'geosearch',gscoord:c.lat+'|'+c.lng,gsradius:'10000',gslimit:'8',format:'json',origin:'*'});
      const response=await fetch('https://de.wikipedia.org/w/api.php?'+params);
      if(!response.ok)throw Error('Wikipedia-API');
      const json=await response.json();
      if(key!==wikiId)return;
      const pages=json.query?.geosearch||[];
      box.textContent=pages.length?'📚 Artikel in der Nähe: ':'Keine verorteten Artikel gefunden.';
      pages.forEach(page=>{
        const a=document.createElement('a');
        a.href='https://de.wikipedia.org/wiki/'+encodeURIComponent(page.title.replaceAll(' ','_'));
        a.target='_blank';a.rel='noopener noreferrer';a.textContent=page.title+' · ';box.appendChild(a);
      });
    }catch(error){if(key===wikiId)box.textContent='Wikipedia-Geosuche momentan nicht erreichbar.';}
  };
  const previousShowPlace=showPlace;
  showPlace=function(p){previousShowPlace(p);weather(p);wiki(p);};
  weather(PLACES[0]);wiki(PLACES[0]);
})();
