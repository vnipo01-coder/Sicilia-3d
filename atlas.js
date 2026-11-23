/* SICILIA 3D v8.0 – Desktop GIS and precise object details
   Real DEM + OpenMapTiles vector features, OSM object links, Open-Meteo weather.
   Links to dedicated Three.js street walk and 3D flight visualizer.
*/
'use strict';
(()=> {
const $=id=>document.getElementById(id);
const PLACES=[
['🏘️','Casalvecchio Siculo',15.3222,37.9573,14.2],
['⛪','Piazza Chiesa',15.32230,37.95736,16.8],
['⛪','Chiesa di Sant’Onofrio',15.32220,37.95714,17.4],
['🏛️','Palermo',13.3615,38.1157,15.2],
['🏙️','Catania',15.0873,37.5028,15.4],
['🌋','Ätna',14.9934,37.751,11.5],
['🏺','Siracusa',15.293,37.063,15.3],
['⚓','Messina',15.554,38.1938,15.3],
['🌅','Taormina',15.288,37.852,15.3],
['🏖️','Cefalù',14.021,38.039,15.2],
['🏛️','Noto',15.070,36.891,15.2],
['🛬','Flughafen Catania',15.0664,37.4668,12.8],
['🏔️','Enna',14.278,37.566,14.5],
['🏘️','Ragusa',14.728,36.925,15.2],
['🌊','Trapani',12.535,38.0176,15.0]
];
const TERRA='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
const SAT='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
let map,mode='relief',terrainExag=1.0,shading=true,buildings=true,showPeaks=false,wheelTilts=false,selected=null,
  currentPane='',wikiNumber=0,weatherNumber=0,cloudOn=false,cloudData=null,cloudHour=0,cloudAt=0,
  mapLoaded=false;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=(value,d=1)=>Number.isFinite(Number(value))?Number(value).toFixed(d):'–';
const osmLink=(lng,lat)=>'https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lng+'#map=18/'+lat+'/'+lng;
const wikiSearch=q=>'https://de.wikipedia.org/w/index.php?search='+encodeURIComponent(q);
const mk=(tag,cls,txt)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(txt!=null)el.textContent=txt;return el;};
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function btn(text,callback,cls=''){
  const b=mk('button',cls,text);b.type='button';b.onclick=callback;return b;
}
function ext(text,url){
  const a=mk('a','',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
}
function box(h,txt=''){
  const card=mk('div','card'),title=mk('h3','',h);card.append(title);
  if(txt)card.append(mk('p','',txt));return card;
}
function row(host,key,value){
  const r=mk('div','row');
  r.append(mk('span','',key),mk('strong','',String(value)));host.append(r);
}
function openPane(name){
  currentPane=name;
  $('drawer').hidden=false;
  $('drawer-title').textContent=({
    discover:'🧭 Orte entdecken',
    layers:'🗺️ Kartendarstellung',
    knowledge:'📚 Wissensatlas',
    weather:'🌦️ Wetter & Wolken',
    flights:'✈️ Flüge über Sizilien'
  })[name]||'SICILIA 3D';
  $('drawer-content').replaceChildren();
  $('dock').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.pane===name));
  ({discover:drawDiscover,layers:drawLayers,knowledge:drawKnowledge,
    weather:drawWeather,flights:drawFlights})[name]?.();
  if(innerWidth<640)$('drawer').scrollTop=0;
}
function closeDrawer(){$('drawer').hidden=true;currentPane='';$('dock').querySelectorAll('button').forEach(b=>b.classList.remove('active'));}
$('drawer-close').onclick=closeDrawer;
$('dock').addEventListener('click',e=>{const b=e.target.closest('button[data-pane]');if(b){if(currentPane===b.dataset.pane&&!$('drawer').hidden)closeDrawer();else openPane(b.dataset.pane);}});
function viewPlace(p){
  const lng=p[2],lat=p[3],name=p[1];
  const local=name.includes('Casalvecchio')||name==='Piazza Chiesa';
  map.flyTo({center:[lng,lat],zoom:p[4],pitch:local?52:48,
    bearing:local?145:-15,duration:1400});
  select({name,kind:name==='Piazza Chiesa'?'Piazza':name.includes('Ätna')?'Vulkan':'Ort',
    lng,lat,props:{},source:'Geografisch lokalisierter Ort',wiki:name==='Piazza Chiesa'?'Casalvecchio Siculo':name});
}
async function search(query){
  const text=query.trim();if(!text)return;
  const match=PLACES.find(p=>p[1].toLocaleLowerCase('de').includes(text.toLocaleLowerCase('de')));
  if(match){viewPlace(match);return;}
  status('Suche nach '+text+' …');
  try{
    const url='https://photon.komoot.io/api/?'+new URLSearchParams({q:text+' Sicilia',limit:'1'});
    const r=await fetch(url);if(!r.ok)throw Error('Geocoder '+r.status);
    const f=(await r.json()).features?.[0];if(!f)throw Error('Kein Ort');
    const coords=f.geometry?.coordinates,p=f.properties||{};
    const lat=coords?.[1],lng=coords?.[0];
    if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<35.9||lat>39.3||lng<11.5||lng>16.5)
      throw Error('Nicht auf Sizilien');
    map.flyTo({center:[lng,lat],zoom:15.8,pitch:52,bearing:0,duration:1400});
    select({name:p.name||text,kind:p.type||'Ort',lng,lat,source:'OpenStreetMap / Photon',props:p});
    status('● Ort gefunden');
  }catch(error){status('Ort nicht gefunden: '+text,true);}
}
$('search-go').onclick=()=>search($('search').value);
$('search').addEventListener('keydown',e=>{if(e.key==='Enter')search(e.target.value);});
function drawDiscover(){
  const host=$('drawer-content');
  const search=mk('div','card');
  search.innerHTML='<h3>🔎 Ganz Sizilien durchsuchen</h3><p>Suche nach Dörfern, Strassen, Plätzen oder Sehenswürdigkeiten.</p>';
  const input=mk('input','','');input.id='mobile-search';input.placeholder='Zum Beispiel: Piazza Chiesa';
  input.style.cssText='width:100%;background:#0a2233;color:#fff;border:1px solid #8fd3d34a;padding:10px;border-radius:9px;margin:5px 0;';
  search.append(input,btn('Ort suchen',()=>search(input.value),'primary'));host.append(search);
  host.append(mk('p','note','Schnellauswahl – tippe einen Ort an, um mit der 3D-Kamera hinzufliegen.'));
  const grid=mk('div','gridlinks');
  PLACES.forEach(p=>grid.append(btn(p[0]+' '+p[1],()=>{viewPlace(p);openPane('knowledge');})));
  host.append(grid);
  const c=box('🚶 Casalvecchio auf Augenhöhe',
    'Erkunde die Piazza als eigenständige, begehbare 3D-Szene. Echte Grundrisse, sofern verfügbar; Fassaden und Dächer illustrativ.');
  c.append(ext('3D-Spaziergang öffnen ↗','./walk.html'));
  host.append(c);
}
function drawLayers(){
  const host=$('drawer-content');
  const card=box('Wähle eine Basiskarte');
  const buttons=mk('div','pillrow');
  for(const [value,text] of [['relief','🏔️ Relief'],['sat','🛰️ Satellit'],['map','🗺️ Strassen']]){
    const b=btn(text,()=>{mode=value;applyLayers();openPane('layers');},mode===value?'selected':'');
    buttons.append(b);
  }
  card.append(buttons);
  const slider=mk('input','input-range');slider.type='range';slider.min='.3';slider.max='2';slider.step='.1';slider.value=String(terrainExag);
  const label=mk('p','','Geländeüberhöhung: '+num(terrainExag)+'×');
  slider.oninput=()=>{terrainExag=Number(slider.value);label.textContent='Geländeüberhöhung: '+num(terrainExag)+'×';
    if(map.getSource('dem'))map.setTerrain({source:'dem',exaggeration:terrainExag});
  };
  card.append(label,slider);
  for(const [labelText,state,fn] of [
    ['3D-Gebäude anzeigen',buildings,()=>{buildings=!buildings;applyLayers();openPane('layers');}],
    ['Geländeschattierung',shading,()=>{shading=!shading;applyLayers();openPane('layers');}],
    ['Benannte Gipfel anzeigen',showPeaks,()=>{showPeaks=!showPeaks;applyLayers();openPane('layers');}]
  ]){
    const line=mk('div','row'),toggle=btn(state?'An':'Aus',fn);line.append(mk('span','',labelText),toggle);card.append(line);
  }
  host.append(card);
  host.append(box('Warum nicht jedes Haus fotorealistisch aussieht',
    '3D-Körper werden aus Gebäudegrundrissen und verfügbaren Höhen erzeugt. Fassadenfotos, historische Baujahre und Dachdetails sind nicht flächendeckend vorhanden.'));
  host.append(mk('p','note','Desktop: Mausrad = Zoom; Shift + Mausrad = Neigen; rechte Maustaste ziehen = Drehen/Neigen.'));
  host.append(btn(wheelTilts?'🖱️ Mausrad neigt die Karte (aktiv)':'🖱️ Mausrad zum Neigen verwenden',()=>{
    wheelTilts=!wheelTilts;openPane('layers');
  },wheelTilts?'primary':''));
  const ctl=box('🎛️ Kamerasteuerung','Neigung und Blickrichtung unabhängig vom Kartenzoom.');
  const pitch=mk('input','input-range');pitch.type='range';pitch.min=0;pitch.max=75;pitch.step=1;pitch.value=String(Math.round(map.getPitch()));
  const pitchText=mk('p','','Neigung: '+Math.round(map.getPitch())+'°');
  pitch.oninput=()=>{map.easeTo({pitch:Number(pitch.value),duration:0});pitchText.textContent='Neigung: '+pitch.value+'°';};
  ctl.append(pitchText,pitch,btn('🧭 Nach Norden',()=>map.easeTo({bearing:0,duration:450}),'primary'));host.append(ctl);
}
const IDs={sat:'atlas-sat',hill:'atlas-shade',color:'atlas-hypsometric',building:'atlas-buildings',places:'atlas-places',peaks:'atlas-peaks',pois:'atlas-pois',clouds:'atlas-clouds'};
function layer(id){return map?.getLayer(id);}
function toggle(id,on){if(layer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none');}
function addLayer(l,before){try{if(!layer(l.id))map.addLayer(l,before);}catch(error){console.warn('Map layer',l.id,error);}}
function prepareLayers(){
  if(!map.getSource('dem'))map.addSource('dem',{type:'raster-dem',tiles:[TERRA],tileSize:256,maxzoom:15,encoding:'terrarium',
    attribution:'DEM: Mapzen/AWS and source contributors'});
  if(!map.getSource('hill-dem'))map.addSource('hill-dem',{type:'raster-dem',tiles:[TERRA],tileSize:256,maxzoom:15,encoding:'terrarium'});
  if(!map.getSource('sat-src'))map.addSource('sat-src',{type:'raster',tiles:[SAT],tileSize:256,maxzoom:19,
    attribution:'Imagery: Esri, Vantor, Earthstar Geographics and the GIS User Community'});
  if(!map.getSource('cloud-src'))map.addSource('cloud-src',{type:'geojson',data:{type:'FeatureCollection',features:[]}});
  map.setTerrain({source:'dem',exaggeration:terrainExag});
  const layers=map.getStyle().layers||[];
  const label=layers.find(l=>l.type==='symbol'&&l.layout?.['text-field'])?.id;
  addLayer({id:IDs.sat,type:'raster',source:'sat-src',paint:{'raster-opacity':1,'raster-fade-duration':150}},label);
  const lines=layers.find(l=>l.type==='line')?.id||label;
  addLayer({id:IDs.color,type:'color-relief',source:'hill-dem',paint:{
    'color-relief-color':['interpolate',['linear'],['elevation'],
      -200,'#215976',0,'#72b4a1',100,'#b4cb91',350,'#92ad7c',
      700,'#cfbc81',1100,'#d9a983',1700,'#aa948a',2300,'#b8b3ac',
      3000,'#e3e3da',3500,'#faf9f0'],
    'color-relief-opacity':0.66
  }},lines);
  addLayer({id:IDs.hill,type:'hillshade',source:'hill-dem',paint:{
    'hillshade-exaggeration':.48,'hillshade-shadow-color':'#53655a',
    'hillshade-highlight-color':'#fff1d6','hillshade-accent-color':'#64785b'}},label);
  const source=Object.entries(map.getStyle().sources||{}).find(([k,v])=>v.type==='vector'&&/openmaptiles|planet|openfreemap/i.test(k+' '+(v.url||'')))
     ||Object.entries(map.getStyle().sources||{}).find(([,v])=>v.type==='vector');
  const v=source?.[0];
  if(v){
    addLayer({id:IDs.building,type:'fill-extrusion',source:v,'source-layer':'building',minzoom:14,
      paint:{
        'fill-extrusion-color':['interpolate',['linear'],['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],0],
          0,'#d4c0a5',20,'#b2b4ab',65,'#7d9d9d'],
        'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,15,
          ['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],
          ['*',['coalesce',['to-number',['get','building:levels']],3],3]]],
        'fill-extrusion-base':['coalesce',['to-number',['get','render_min_height']],0],
        'fill-extrusion-opacity':.94
      }},label);
    addLayer({id:IDs.peaks,type:'circle',source:v,'source-layer':'mountain_peak',minzoom:12.5,
      filter:['all',['has','name'],['>=',['to-number',['get','ele'],0],700]],
      paint:{'circle-radius':4.5,'circle-color':'#ebc895','circle-stroke-width':1.2,'circle-stroke-color':'#23495a'}},label);
    addLayer({id:IDs.places,type:'circle',source:v,'source-layer':'place',minzoom:7,
      paint:{'circle-radius':12,'circle-opacity':.006}},label);
    addLayer({id:IDs.pois,type:'circle',source:v,'source-layer':'poi',minzoom:13,
      paint:{'circle-radius':10,'circle-opacity':.006}},label);
  }
  addLayer({id:IDs.clouds,type:'circle',source:'cloud-src',maxzoom:12,
    paint:{'circle-color':'#f1f5f7','circle-blur':.9,
    'circle-radius':['interpolate',['linear'],['zoom'],6,38,8,70,10,110],
    'circle-opacity':['*',['/',['get','cover'],100],.44]}});
  applyLayers();
}
function applyLayers(){
  toggle(IDs.sat,mode==='sat');
  toggle(IDs.color,mode==='relief');
  toggle(IDs.hill,shading&&mode!=='map');
  toggle(IDs.building,buildings);
  toggle(IDs.peaks,showPeaks);toggle(IDs.places,true);toggle(IDs.pois,true);
  toggle(IDs.clouds,cloudOn);
  $('legend').hidden=mode==='map';
  $('legend').textContent=mode==='sat'?'🛰️ Esri & Partner · Luft-/Satellitenbilder':
    '🏔️ Mapzen/AWS · Höhen & Schummerung';
}
function handleClick(ev){
  const candidates=[IDs.building,IDs.peaks,IDs.places,IDs.pois].filter(layer);
  let found=[];
  if(candidates.length)try{found=map.queryRenderedFeatures(ev.point,{layers:candidates});}catch(e){}
  const order={[IDs.building]:0,[IDs.peaks]:1,[IDs.places]:2,[IDs.pois]:3};
  found.sort((a,b)=>(order[a.layer.id]??9)-(order[b.layer.id]??9));
  const f=found[0];
  if(f){
    const kinds={[IDs.building]:'Gebäude',[IDs.peaks]:'Berggipfel',[IDs.places]:'Ort',[IDs.pois]:'Sehenswürdigkeit'};
    const props=f.properties||{},coord=f.geometry?.type==='Point'?f.geometry.coordinates:[ev.lngLat.lng,ev.lngLat.lat];
    select({name:props.name||props.name_de||props.name_en||(f.layer.id===IDs.building?'Gebäude ohne Namen':'Unbenanntes Objekt'),
      lng:coord[0],lat:coord[1],kind:kinds[f.layer.id],props,source:'OpenStreetMap / OpenMapTiles'});
  }else{
    const features=map.queryRenderedFeatures(ev.point)||[];
    const f=features.find(x=>x.properties?.name && x.layer?.type==='symbol');
    if(f)select({name:f.properties.name,kind:'Ort / Kartenobjekt',lng:ev.lngLat.lng,lat:ev.lngLat.lat,
      props:f.properties,source:'OpenMapTiles'});
    else select({name:'Geografischer Punkt',kind:'Geländepunkt',lng:ev.lngLat.lng,lat:ev.lngLat.lat,props:{},source:'Digitales Gelände'});
  }
}
function select(obj){
  selected=obj;wikiNumber++;
  openPane('knowledge');
  if(map._popupAtlas)map._popupAtlas.remove();
  const popup=mk('div','');
  popup.append(mk('strong','',obj.name),mk('p','',obj.kind));
  const popupButton=btn('📖 Informationen',()=>openPane('knowledge'),'primary');
  popup.append(popupButton);
  map._popupAtlas=new maplibregl.Popup({maxWidth:'270px'}).setLngLat([obj.lng,obj.lat]).setDOMContent(popup).addTo(map);
}
function drawKnowledge(){
  const host=$('drawer-content');
  if(!selected){
    host.append(box('📍 Ort auswählen','Tippe auf eine Stadt, einen Gipfel oder ein Gebäude auf der Karte. Informationen und Quellen erscheinen hier.'));
    host.append(btn('Casalvecchio besuchen',()=>{viewPlace(PLACES[0]);},'primary'));return;
  }
  const obj=selected,props=obj.props||{};
  const c=box('📍 '+obj.name,obj.kind+' · '+obj.source);
  row(c,'Koordinaten',num(obj.lat,5)+'° N · '+num(obj.lng,5)+'° E');
  try{
    const elevation=map.queryTerrainElevation([obj.lng,obj.lat]);
    if(Number.isFinite(elevation))row(c,'Gelände laut DEM',num(elevation,0)+' m ü. M.');
  }catch(e){}
  const fields=[
    ['Gipfelhöhe (OSM)',props.ele?props.ele+' m':null],
    ['Gebäudehöhe',props.render_height||props.height? (props.render_height||props.height)+' m':null],
    ['Stockwerke',props['building:levels']],
    ['Strasse',props['addr:street']],
    ['Hausnummer',props['addr:housenumber']],
    ['Baujahr laut Quelle',props.start_date||props['building:year_built']],
    ['Architekt',props.architect],
    ['Architektur',props['building:architecture']]
  ];
  for(const [k,value] of fields)if(value!=null&&value!=='')row(c,k,value);
  if(obj.kind==='Gebäude'&&!props.start_date&&!props['building:year_built']){
    c.append(mk('p','note','Baujahr unbekannt. Eine präzise Schätzung wäre ohne historische Bauakten nicht seriös. 3D-Höhen können modellierte Annahmen sein.'));
  }
  const links=mk('div','');
  const walkUrl='./walk.html?'+new URLSearchParams({lat:String(obj.lat),lng:String(obj.lng),name:obj.name});
  links.append(ext('🚶 3D Walk an diesem Ort',walkUrl));
  links.append(ext('🗺️ OpenStreetMap',osmLink(obj.lng,obj.lat)),
    ext('📚 Wikipedia suchen',wikiSearch(obj.name)),
    ext('🔗 Wikidata suchen','https://www.wikidata.org/w/index.php?search='+encodeURIComponent(obj.name)),
    ext('🏛️ Italienische Kulturarchive','https://www.google.com/search?q='+encodeURIComponent('site:cultura.gov.it '+obj.name+' Sicilia')));
  if(Math.hypot(obj.lng-15.3223,obj.lat-37.95736)<.012){
    const local=box('🏛️ Casalvecchio – lokale Originalquellen',
      'Die Hauptkirche Sant’Onofrio ist dem Schutzpatron gewidmet; die Gemeinde dokumentiert die Verehrung bereits für das Jahr 1117. Gebäudeeigenschaften der umliegenden Häuser dürfen daraus nicht abgeleitet werden.');
    local.append(ext('Offizielle Gemeinde: Kirchen','https://comune.casalvecchiosiculo.me.it/tipi_luogo/chiesa/'),
      ext('Sant’Onofrio (ital. Wikipedia)','https://it.wikipedia.org/wiki/Chiesa_di_Sant%27Onofrio_%28Casalvecchio_Siculo%29'));
    host.append(local);
    links.append(ext('🏛️ Gemeinde Casalvecchio','https://comune.casalvecchiosiculo.me.it/'));
    links.append(ext('🚶 Vor Ort in 3D erkunden','./walk.html'));
  }
  if(obj.kind==='Gebäude' && props.wikidata && /^Q[0-9]+$/.test(props.wikidata))
    links.append(ext('🔗 Verknüpftes Wikidata-Objekt','https://www.wikidata.org/wiki/'+props.wikidata));
  c.append(links);host.append(c);
  const wiki=box('📖 Geschichte und Ortswissen','Suche nach einem passenden Artikel aus offenen Wissensquellen …');
  wiki.id='wiki-article';host.append(wiki);
  if(obj.kind==='Gebäude' && !props.wikipedia && !props.wikidata){
    wiki.replaceChildren(mk('h3','','📖 Gebäude-Geschichte nicht dokumentiert'),
      mk('p','','Für dieses Haus ist keine eindeutige Wikipedia-Verknüpfung in den verfügbaren Kartendaten vorhanden. Die Baugeschichte darf nicht aus einem bloss ähnlichen Namen abgeleitet werden. Nutze Bauakten, Denkmalinventare oder die weiterführenden Quellenlinks.'));
  }else{
    const specific=wikiNumber;loadWiki(obj,specific,wiki);
  }
  if(obj.kind==='Gebäude')loadOverpassBuilding(obj,host);
}
async function loadWiki(obj,key,card){
  const name=obj.name==='Piazza Chiesa'?'Casalvecchio Siculo':
    obj.name.includes('Sant’Onofrio')?"Chiesa di Sant'Onofrio (Casalvecchio Siculo)":obj.name;
  for(const lang of ['de','it']){
    try{
      const params=new URLSearchParams({action:'query',prop:'extracts|pageimages|info|coordinates',
        inprop:'url',exintro:'1',explaintext:'1',piprop:'thumbnail',pithumbsize:'320',
        redirects:'1',titles:name,format:'json',origin:'*'});
      const r=await fetch('https://'+lang+'.wikipedia.org/w/api.php?'+params);
      if(!r.ok)continue;
      const page=Object.values((await r.json()).query?.pages||{})[0];
      if(key!==wikiNumber||!page||page.missing!==undefined)continue;
      const point=page.coordinates?.[0];
      if(point && Number.isFinite(point.lat)&&Number.isFinite(point.lon)){
        const km=Math.hypot((point.lat-obj.lat)*111,(point.lon-obj.lng)*88);
        const radius=obj.kind==='Berggipfel'?3:obj.kind==='Gebäude'?0.35:15;
        if(km>radius){
          card.replaceChildren(mk('h3','','📚 Artikel nicht geografisch bestätigt'),
            mk('p','','Ein gleichnamiger Wikipedia-Artikel liegt rund '+num(km,1)+' km entfernt. Er wird daher nicht automatisch diesem Kartenobjekt zugeordnet.'));
          card.append(ext('Wikipedia-Suche prüfen ↗',wikiSearch(obj.name)));
          return;
        }
      }
      card.replaceChildren(mk('h3','','📚 '+page.title));
      if(page.thumbnail?.source){
        const image=mk('img');image.src=page.thumbnail.source;image.alt=page.title;
        image.loading='lazy';image.style.cssText='width:100%;max-height:170px;object-fit:cover;border-radius:8px;';
        card.append(image);
      }
      card.append(mk('p','',(page.extract||'').slice(0,680)||'Artikel vorhanden, keine Kurzfassung verfügbar.'));
      card.append(mk('small','',point?'Geografische Artikelkoordinaten geprüft.':'Zuordnung nur über Artikelname; nicht geografisch verifiziert.'));
      card.append(ext('Vollständigen Artikel öffnen ↗',page.fullurl||
        'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(page.title)));
      return;
    }catch(error){console.warn('Wikipedia:',error);}
  }
  if(key===wikiNumber)card.replaceChildren(mk('h3','','📚 Kein eindeutiger Wikipedia-Artikel'),
    mk('p','','Nutze die Quellenlinks oben. Nicht jedes Gebäude und jeder Ortsname besitzt einen eigenen Artikel.'));
}
async function loadOverpassBuilding(obj,host){
  const c=box('🏠 Weiterführende Gebäudedaten','Zusätzliche OSM-Attribute werden abgefragt …');
  host.append(c);
  const current=obj;
  const query='[out:json][timeout:12];way(around:20,'+obj.lat+','+obj.lng+')["building"];out tags center 8;';
  try{
    const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),9500);
    let r;try{r=await fetch('https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent(query),{signal:ac.signal});}
    finally{clearTimeout(timer);}
    if(!r.ok)throw Error('Overpass '+r.status);
    const items=(await r.json()).elements||[];
    if(selected!==current)return;
    const near=items.filter(x=>x.center).map(x=>({x,d:Math.hypot((x.center.lat-obj.lat)*111000,(x.center.lon-obj.lng)*88000)}))
      .sort((a,b)=>a.d-b.d)[0];
    c.replaceChildren(mk('h3','','🏠 Weitere Angaben'));
    if(!near||near.d>42){c.append(mk('p','','Keine passenden zusätzlichen Gebäudedaten im Nahbereich.'));return;}
    const t=near.x.tags||{};
    for(const [title,value] of [
      ['Baujahr / Zeitraum',t.start_date||t['building:year_built']],
      ['Architektur',t['building:architecture']],
      ['Material',t['building:material']],
      ['Dachform',t['roof:shape']],
      ['Stockwerke',t['building:levels']],
      ['Historische Nutzung',t.historic]
    ])if(value)row(c,title,value);
    c.append(mk('p','note','Nächstes OSM-Gebäude, Zuordnung über die Geometrie muss überprüft werden ('+num(near.d,0)+' m).'));
    c.append(ext('OSM-Originaleintrag ↗','https://www.openstreetmap.org/way/'+near.x.id));
  }catch(error){if(selected===current)c.replaceChildren(mk('h3','','Gebäudedaten'),mk('p','','Zusätzliche Gebäudedaten derzeit nicht erreichbar.'));}
}
function drawWeather(){
  const host=$('drawer-content');
  const obj=selected||{name:'Palermo',lat:38.1157,lng:13.3615};
  host.append(mk('p','note','Modellbasiertes Wetter für '+obj.name+'; kein Live-Thermometer an jedem Haus.'));
  const c=box('🌤️ Wetter an diesem Ort','Wetterdaten werden geladen …');
  c.id='weather-card';host.append(c);
  const controls=box('☁️ Wolken von oben',
    'Modellierte Bewölkung in grobem Raster. Die Darstellung ist keine aktuelle Satellitenaufnahme.');
  const toggle=mk('input');toggle.type='checkbox';toggle.checked=cloudOn;
  const label=mk('label','', ' Wolkenmodell anzeigen');label.prepend(toggle);controls.append(label);
  toggle.onchange=()=>{cloudOn=toggle.checked;if(cloudOn)loadClouds();drawClouds();};
  const r=mk('input','input-range');r.type='range';r.min=0;r.max=11;r.step=1;r.value=String(cloudHour);
  const t=mk('p','note','Prognose: +'+cloudHour+' Stunden');
  r.oninput=()=>{cloudHour=Number(r.value);t.textContent='Prognose: +'+cloudHour+' Stunden';drawClouds();};
  controls.append(t,r);
  host.append(controls);
  const key=++weatherNumber;
  fetchWeather(obj,key,c);
}
async function fetchWeather(obj,key,c){
  try{
    const params=new URLSearchParams({latitude:String(obj.lat),longitude:String(obj.lng),
      current:'temperature_2m,relative_humidity_2m,wind_speed_10m,cloud_cover,weather_code,precipitation',
      hourly:'temperature_2m,cloud_cover,precipitation_probability',
      forecast_hours:'12',timezone:'Europe/Rome'});
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params);
    if(!response.ok)throw Error('Weather '+response.status);
    const data=await response.json(),v=data.current||{};
    if(weatherNumber!==key||currentPane!=='weather')return;
    c.replaceChildren(mk('h3','','🌦️ '+obj.name));
    const temp=mk('div','headline',num(v.temperature_2m)+' °C · ☁ '+num(v.cloud_cover,0)+' %');c.append(temp);
    row(c,'Wind',num(v.wind_speed_10m)+' km/h');
    row(c,'Niederschlag',num(v.precipitation)+' mm');
    row(c,'Luftfeuchtigkeit',num(v.relative_humidity_2m,0)+' %');
    row(c,'Zeitstempel',v.time||'–');
    const f=mk('p','note');
    const hours=data.hourly;
    if(hours?.time?.length){
      f.textContent='Prognose in 6 Stunden: '+num(hours.temperature_2m?.[6])+
        ' °C, Niederschlagswahrscheinlichkeit '+num(hours.precipitation_probability?.[6],0)+' %.';
    }
    c.append(f);
  }catch(error){if(weatherNumber===key)c.replaceChildren(mk('h3','','Wetter nicht erreichbar'),mk('p','','Der Wetterdienst ist gerade nicht verfügbar.')); }
}
async function loadClouds(){
  if(!cloudOn)return;
  if(cloudData&&Date.now()-cloudAt<15*60*1000){drawClouds();return;}
  const pts=[];
  for(const lat of [36.9,37.35,37.8,38.2])for(const lng of [12.7,13.35,14,14.65,15.3])pts.push({lat,lng});
  try{
    const params=new URLSearchParams({latitude:pts.map(x=>x.lat).join(','),
      longitude:pts.map(x=>x.lng).join(','),hourly:'cloud_cover',forecast_hours:'12',timezone:'Europe/Rome'});
    const r=await fetch('https://api.open-meteo.com/v1/forecast?'+params);
    if(!r.ok)throw Error('Cloud '+r.status);
    const data=await r.json(),arr=Array.isArray(data)?data:[data];
    if(arr.length!==pts.length)throw Error('Incomplete cloud response');
    cloudData=arr.map((a,i)=>({p:pts[i],levels:a.hourly?.cloud_cover||[]}));
    cloudAt=Date.now();drawClouds();
  }catch(error){status('Wolkenmodell nicht verfügbar',true);}
}
function drawClouds(){
  const src=map?.getSource('cloud-src');if(!src)return;
  const features=cloudOn&&cloudData?cloudData.map(x=>({
    type:'Feature',geometry:{type:'Point',coordinates:[x.p.lng,x.p.lat]},
    properties:{cover:Number(x.levels[cloudHour]||0)}
  })):[];
  src.setData({type:'FeatureCollection',features});
  toggle(IDs.clouds,cloudOn);
}
function drawFlights(){
  const host=$('drawer-content');
  const c=box('✈️ 3D Catania Flight Explorer',
    'Sieh dir echte 3D-Flugzeugmodelle im räumlichen Flughafenmodell an. Demoflugbewegungen sind klar als Simulation gekennzeichnet.');
  c.append(ext('3D-Flughafen öffnen ↗','./airport.html'));
  const b=btn('✈️ Zur Flughafenkarte',()=>viewPlace(PLACES.find(p=>p[1]==='Flughafen Catania')),'primary');
  c.append(b);host.append(c);
  host.append(box('📡 Tatsächliche Flugzeugpositionen',
    'Browser können die öffentliche ADS-B-API häufig nicht direkt lesen (CORS). Die 3D-Flughafenseite hat einen separaten echten Abrufversuch und zeigt bei Fehlschlag ausdrücklich keine angeblichen Live-Flugzeuge.'));
  host.append(ext('Externes ADS-B-Flugradar ↗','https://globe.adsb.fi/'));
}
function initialize(){
  if(typeof window.maplibregl==='undefined'){status('3D-Kartenbibliothek nicht erreichbar',true);return;}
  map=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/bright',
    center:[14.05,37.55],zoom:7.3,pitch:36,bearing:0,antialias:true,maxPitch:78});
  map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');
  // The top-bar Walk link always starts a local 3D scene at the map centre.
  const updateWalkLink=()=>{
    const c=map.getCenter(),anchor=$('walk-launch');
    if(!anchor)return;
    anchor.href='./walk.html?'+new URLSearchParams({
      lat:c.lat.toFixed(6),lng:c.lng.toFixed(6),name:'Kartenausschnitt Sizilien'
    });
    anchor.title='3D-Spaziergang an '+c.lat.toFixed(5)+'° N / '+c.lng.toFixed(5)+'° E';
  };
  map.on('moveend',updateWalkLink);updateWalkLink();
  // Keep plain-wheel zoom. Shift+wheel changes pitch (desktop request).
  map.getCanvasContainer().addEventListener('wheel',e=>{
    if(!e.shiftKey && !wheelTilts)return;
    e.preventDefault();e.stopImmediatePropagation();
    const next=Math.min(75,Math.max(0,map.getPitch()+Math.sign(e.deltaY)*4));
    map.easeTo({pitch:next,duration:100});
  },{capture:true,passive:false});
  map.on('style.load',()=>{try{prepareLayers();status('● SICILIA 3D v8.0 · Kartenatlas');}catch(error){status('Einige Kartenebenen nicht verfügbar',true);console.warn(error);}});
  map.on('load',()=>{mapLoaded=true;status('● SICILIA 3D v8.0 · Online');});
  map.on('click',handleClick);
  map.on('error',error=>{console.warn('Externe Kartenquelle:',error.error?.message||error);});
  $('quick-casalvecchio').onclick=()=>viewPlace(PLACES[0]);
  $('quick-piazza').onclick=()=>viewPlace(PLACES[1]);
  openPane('discover');closeDrawer();
}
initialize();
})();
