/* SICILIA 3D v4.0 – Interactive Sicily Geo Atlas
 * Real terrain, hypsometry, satellite basemap, places, peaks, buildings,
 * Wikipedia and weather. Static GitHub Pages app: no secret API keys.
 * © OpenStreetMap contributors; elevation Mapzen/AWS, imagery Esri/partners.
 */
'use strict';
(() => {
  const $ = id => document.getElementById(id);
  const PLACES = [
    {name:'Palermo',icon:'🏛️',lng:13.3615,lat:38.1157,zoom:15.8,kind:'Stadt'},
    {name:'Catania',icon:'🏙️',lng:15.0873,lat:37.5028,zoom:15.8,kind:'Stadt'},
    {name:'Messina',icon:'⚓',lng:15.554,lat:38.1938,zoom:15.5,kind:'Stadt'},
    {name:'Siracusa',wiki:'Syrakus',icon:'🏺',lng:15.293,lat:37.063,zoom:15.6,kind:'Stadt'},
    {name:'Trapani',icon:'🌊',lng:12.535,lat:38.0176,zoom:15.4,kind:'Stadt'},
    {name:'Agrigento',icon:'🏛️',lng:13.5766,lat:37.3111,zoom:15.3,kind:'Stadt'},
    {name:'Ragusa',icon:'🏘️',lng:14.728,lat:36.925,zoom:15.7,kind:'Stadt'},
    {name:'Taormina',icon:'🌅',lng:15.288,lat:37.852,zoom:15.3,kind:'Stadt'},
    {name:'Cefalù',icon:'🏖️',lng:14.021,lat:38.039,zoom:15.5,kind:'Küstenstadt'},
    {name:'Noto',icon:'🏛️',lng:15.070,lat:36.891,zoom:15.5,kind:'Stadt'},
    {name:'Enna',icon:'⛰️',lng:14.278,lat:37.566,zoom:14.7,kind:'Stadt'},
    {name:'Erice',icon:'🏘️',lng:12.588,lat:38.037,zoom:15.0,kind:'Bergort'},
    {name:'Ätna',wiki:'Ätna',icon:'🌋',lng:14.9934,lat:37.751,zoom:11.8,kind:'Vulkan'}
  ];
  const OMF = 'https://tiles.openfreemap.org/styles/bright';
  const DEM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png';
  const SATELLITE = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  const LAYER = { buildings:'sic-buildings', peaks:'sic-peaks', places:'sic-places', pois:'sic-pois',
    satellite:'sic-imagery', topo:'sic-colors', water:'sic-water', shade:'sic-hillshade' };
  const S = { map:null, place:PLACES[0], mode:'relief', height:1.5, buildings:true,
    peaks:true, shade:true, perspective:true, selected:null, popup:null, weather:null,
    weatherKey:0, wikiKey:0, weatherPins:[], pinData:null, pins:true, networkErrors:0 };
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
  const number = (n,d=1) => Number.isFinite(+n) ? Number(n).toFixed(d) : '–';
  const ellipsis = (v,n=520) => (v || '').length>n ? v.slice(0,n).trim()+'…' : (v || '');
  const wikiSearch = q => 'https://de.wikipedia.org/w/index.php?search='+encodeURIComponent(q);
  const osmURL = (lon,lat) => 'https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lon+'#map=17/'+lat+'/'+lon;
  const setStatus = v => {if($('status'))$('status').textContent=v;};
  const visible = id => !!(S.map && S.map.getLayer(id));

  function injectInterface() {
    const css=document.createElement('style');
    css.textContent = [
      '.app{min-height:0!important}',
      '.panel{max-height:64dvh;overflow-y:auto;overscroll-behavior:contain;box-shadow:0 18px 60px #0009!important;scrollbar-width:thin}',
      '.panel .credits{display:none}',
      '.panel.minimized{max-height:unset;overflow:visible}',
      '.panel.minimized .places,.panel.minimized .toggles,.panel.minimized #details,.panel.minimized #sic-atlas{display:none}',
      '#sic-min{margin-left:6px;font-size:14px}',
      '#sic-atlas{border-top:1px solid #ffffff25;padding-top:10px;margin-top:11px}',
      '.sic-heading{font-weight:750;font-size:12px;color:#a9ebec;letter-spacing:.04em;margin:9px 0 6px}',
      '.sic-switches{display:flex;gap:5px;flex-wrap:wrap}',
      '.sic-switches button{flex:1;min-width:79px;font-size:12px;padding:8px 6px}',
      '.sic-switches button.on{border-color:#8ae8cf;color:white;background:#155b66}',
      '.sic-row{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:11px}',
      '.sic-row label{font-size:12px}.sic-row input[type=range]{width:52%;accent-color:#55d6cc}',
      '.sic-small{font-size:11px;line-height:1.45;color:#b8cbd8}',
      '.sic-section{border-radius:11px;padding:10px;margin-top:10px;background:#102f42;border:1px solid #ffffff22}',
      '.sic-section h3{font-size:14px;margin:0 0 8px;color:#e9f7ff}',
      '.sic-section p{font-size:12px;line-height:1.55;margin:7px 0}',
      '.sic-info-row{display:flex;gap:8px;justify-content:space-between;font-size:11px;border-bottom:1px solid #ffffff14;padding:5px 0}',
      '.sic-info-row strong{text-align:right;font-weight:600}',
      '.sic-links{display:flex;gap:6px;flex-wrap:wrap;margin-top:9px}',
      '.sic-links a{font-size:11px;text-decoration:none;color:#c5f7ff;background:#1b5363;border:1px solid #397888;padding:7px 9px;border-radius:7px}',
      '.sic-info-image{width:100%;max-height:155px;object-fit:cover;border-radius:8px;margin-top:7px}',
      '.sic-wx-now{font-size:18px;font-weight:700;margin:4px 0}',
      '.sic-wx-meta{font-size:11px;opacity:.8}',
      '.sic-forecast{width:100%;accent-color:#63deba}',
      '.sic-search{display:flex;gap:6px;margin-top:7px}',
      '.sic-search input{min-width:0;flex:1;border-radius:8px;border:1px solid #3c6877;padding:9px;background:#082538;color:#fff;font:inherit;font-size:12px}',
      '.sic-search button{font-size:12px}',
      '.sic-popup{font-family:system-ui;color:#152d3d;max-width:270px;font-size:12px;line-height:1.5}',
      '.sic-popup h3{margin:0 0 5px;font-size:15px}.sic-popup button{background:#12617b;color:#fff;padding:6px;border-radius:7px;border:0;margin-top:7px}',
      '.sic-wx-pin{background:#0a3444e8;color:white;border:1px solid #b3f2f0a0;border-radius:18px;padding:4px 7px;white-space:nowrap;font-size:10px;font-weight:700;box-shadow:0 3px 9px #0005;cursor:pointer}',
      '.maplibregl-popup-content{border-radius:11px!important}',
      '.maplibregl-ctrl-bottom-right{bottom:14px!important}',
      '@media(max-width:740px){.panel{max-width:none;width:auto;left:10px;right:10px;bottom:max(10px,env(safe-area-inset-bottom));padding:11px}.maplibregl-ctrl-bottom-right{display:none}}',
      '@media(min-width:800px){.panel{width:420px;max-height:82dvh;left:20px;right:auto}}'
    ].join('\n');
    document.head.appendChild(css);
    const panel=document.querySelector('.panel'), head=panel.querySelector('.panel-head');
    const toggle=document.createElement('button');
    toggle.id='sic-min';toggle.textContent='▾';toggle.setAttribute('aria-label','Bedienfeld einklappen');
    head.appendChild(toggle);
    toggle.onclick=()=>{panel.classList.toggle('minimized');toggle.textContent=panel.classList.contains('minimized')?'▴':'▾';};
    const ui=document.createElement('div');ui.id='sic-atlas';
    ui.innerHTML =
      '<div class="sic-heading">🗺️ KARTENANSICHT · SICILIA 3D v4.0</div>'+
      '<div class="sic-switches" id="sic-modes"><button data-mode="relief" class="on">🏔️ Relief</button><button data-mode="map">🗺️ Karte</button><button data-mode="sat">🛰️ Satellit</button></div>'+
      '<div class="sic-row"><label for="sic-height">Höhenüberhöhung <strong id="sic-hval">1.5×</strong></label><input id="sic-height" type="range" min="0.2" max="3" step="0.1" value="1.5"></div>'+
      '<div class="sic-row"><label><input id="sic-shade-toggle" type="checkbox" checked> Geländeschattierung</label><label><input id="sic-peaks-toggle" type="checkbox" checked> Orte & Gipfel</label></div>'+
      '<div class="sic-heading">🔎 ORTE UND OBJEKTE ERKUNDEN</div>'+
      '<div class="sic-small">Tippe auf eine Stadt, ein Dorf, einen Gipfel oder ein Gebäude. Bei unbekannten Punkten werden Koordinaten und Gelände angezeigt.</div>'+
      '<div class="sic-search"><input id="sic-search-input" placeholder="Ort suchen, z. B. Cefalù" aria-label="Ort suchen"><button id="sic-search-go">Suchen</button></div>'+
      '<section id="sic-inspector" class="sic-section" aria-live="polite"><h3>📍 Willkommen in Sizilien</h3><p>Wähle einen Ort oder berühre die Karte für Informationen.</p></section>'+
      '<section id="sic-weather" class="sic-section"><h3>🌦️ Wetter · aktuelle Modellwerte</h3><div id="sic-wx" class="sic-small">Wetter wird geladen …</div>'+
      '<div id="sic-forecast-container" hidden><div class="sic-row"><label>Prognose +<strong id="sic-fhour">0</strong> h</label><span id="sic-ftime" class="sic-small"></span></div>'+
      '<input id="sic-forecast" class="sic-forecast" type="range" min="0" max="23" value="0" step="1"><div id="sic-forecast-text" class="sic-small"></div></div>'+
      '<div class="sic-row"><label><input id="sic-pins-toggle" type="checkbox" checked> Wetterpunkte auf Karte</label><button id="sic-wx-refresh" style="font-size:11px">Aktualisieren</button></div>'+
      '<p class="sic-small">Open-Meteo: modellbasierte, zeitgestempelte Werte, keine Live-Messung an jedem Ort.</p></section>'+
      '<div class="sic-small" style="margin-top:8px">Daten: © OpenStreetMap, OpenFreeMap, Mapzen/AWS, Esri und Bildanbieter (Satellit), Open-Meteo, Wikipedia. Verfügbarkeit und Genauigkeit je nach Ort.</div>';
    panel.appendChild(ui);

    $('sic-modes').addEventListener('click',event=>{
      const b=event.target.closest('button[data-mode]');
      if(b) setMode(b.dataset.mode);
    });
    $('sic-height').addEventListener('input',event=>{
      S.height=Number(event.target.value);
      $('sic-hval').textContent=number(S.height,1)+'×';
      if(S.map && S.map.getSource('sic-terrain')){
        S.map.setTerrain({source:'sic-terrain',exaggeration:S.height});
      }
    });
    $('sic-shade-toggle').onchange=event=>{S.shade=event.target.checked;applyModes();};
    $('sic-peaks-toggle').onchange=event=>{S.peaks=event.target.checked;applyModes();};
    $('sic-pins-toggle').onchange=event=>{S.pins=event.target.checked;drawWeatherPins();};
    $('sic-wx-refresh').onclick=()=>{weatherFor(S.selected||pickPlace(S.place),true);loadPinWeather(true);};
    $('sic-forecast').oninput=drawForecast;
    $('sic-search-go').onclick=searchPlace;
    $('sic-search-input').addEventListener('keydown',event=>{if(event.key==='Enter')searchPlace();});
    const existingCredits=panel.querySelector('.credits');
    if(existingCredits)existingCredits.textContent='© OpenStreetMap, OpenFreeMap, AWS/Mapzen, Esri, Open-Meteo, Wikipedia.';
  }

  function pickPlace(p) {
    return {name:p.name,kind:p.kind,icon:p.icon,lng:p.lng,lat:p.lat,
      props:{},wiki:p.wiki||p.name,source:'Ausgewählter Ort'};
  }
  function searchPlace() {
    const query=$('sic-search-input').value.trim().toLocaleLowerCase('de');
    if(!query)return;
    const p=PLACES.find(x=>x.name.toLocaleLowerCase('de').includes(query));
    if(p){focusPlace(p);return;}
    openDetails({name:$('sic-search-input').value.trim(),kind:'Suche',icon:'🔎',
      lng:S.map.getCenter().lng,lat:S.map.getCenter().lat,props:{},
      searchOnly:true,source:'Wikipedia-Suche'});
  }
  function setMode(mode) {
    if(!['relief','map','sat'].includes(mode))return;
    S.mode=mode;
    $('sic-modes').querySelectorAll('button').forEach(b=>b.classList.toggle('on',b.dataset.mode===mode));
    applyModes();
    setStatus(mode==='sat'?'● Satellitenbild · Esri':mode==='relief'?'● Farbiges 3D-Relief':'● Strassenkarte');
  }
  function applyModes() {
    if(!S.map)return;
    const visibility=(id,show)=>{if(visible(id))S.map.setLayoutProperty(id,'visibility',show?'visible':'none');};
    visibility(LAYER.satellite,S.mode==='sat');
    visibility(LAYER.topo,S.mode==='relief');
    visibility(LAYER.water,S.mode==='relief');
    visibility(LAYER.shade,S.shade&&S.mode!=='map');
    visibility(LAYER.peaks,S.peaks);
    visibility(LAYER.places,S.peaks);
    visibility(LAYER.pois,S.peaks);
    visibility(LAYER.buildings,S.buildings);
  }
  function vectorSource() {
    const st=S.map.getStyle();
    return Object.entries(st.sources||{}).find(([key,val])=>
      val.type==='vector' && /openmaptiles|openfreemap|planet/i.test(key+' '+(val.url||'')))
      ||Object.entries(st.sources||{}).find(([,val])=>val.type==='vector');
  }
  function addLayerSafe(layer,before) {
    try {if(!visible(layer.id))S.map.addLayer(layer,before);}catch(error){console.warn('Layer '+layer.id,error);}
  }
  function prepareMap() {
    try {
      if(!S.map.getSource('sic-terrain'))S.map.addSource('sic-terrain',{
        type:'raster-dem',tiles:[DEM],tileSize:256,encoding:'terrarium',maxzoom:15,
        attribution:'Höhendaten: Mapzen/AWS und Datenlieferanten'
      });
      if(!S.map.getSource('sic-effects'))S.map.addSource('sic-effects',{
        type:'raster-dem',tiles:[DEM],tileSize:256,encoding:'terrarium',maxzoom:15
      });
      if(!S.map.getSource('sic-satellite'))S.map.addSource('sic-satellite',{
        type:'raster',tiles:[SATELLITE],tileSize:256,maxzoom:19,
        attribution:'Satellitenbilder: Esri, Vantor, Earthstar Geographics und GIS User Community'
      });
      S.map.setTerrain({source:'sic-terrain',exaggeration:S.height});
      const style=S.map.getStyle();
      const labels=style.layers.find(l=>l.type==='symbol'&&l.layout?.['text-field'])?.id;
      const src=vectorSource()?.[0];
      addLayerSafe({id:LAYER.topo,type:'color-relief',source:'sic-effects',
        paint:{'color-relief-color':['interpolate',['linear'],['elevation'],
          -200,'#0c5573',-1,'#65b5ad',0,'#9ec991',150,'#79a877',
          450,'#bac18a',850,'#d4be8d',1400,'#c2a07e',2100,'#a38c80',
          2800,'#d0c7b8',3500,'#f1eddf'],'color-relief-opacity':0.68}
      },labels);
      if(src) addLayerSafe({id:LAYER.water,type:'fill',source:src,'source-layer':'water',
        paint:{'fill-color':'#166b95','fill-opacity':0.96}},labels);
      addLayerSafe({id:LAYER.satellite,type:'raster',source:'sic-satellite',
        paint:{'raster-opacity':1,'raster-fade-duration':250}},labels);
      addLayerSafe({id:LAYER.shade,type:'hillshade',source:'sic-effects',
        paint:{'hillshade-exaggeration':0.46,
          'hillshade-shadow-color':'#384d49','hillshade-highlight-color':'#fdf1d6',
          'hillshade-accent-color':'#7a776b'}},labels);
      if(src) {
        addLayerSafe({id:LAYER.buildings,type:'fill-extrusion',source:src,'source-layer':'building',
          minzoom:14,paint:{
            'fill-extrusion-color':['interpolate',['linear'],['coalesce',['to-number',['get','render_height']],['to-number',['get','height']],0],0,'#d0bca1',18,'#b8ac99',55,'#8198a2',110,'#58879e'],
            'fill-extrusion-height':['interpolate',['linear'],['zoom'],14,0,15,
              ['coalesce',['to-number',['get','render_height']],
                ['to-number',['get','height']],['*',['coalesce',['to-number',['get','building:levels']],3],3]]],
            'fill-extrusion-base':['coalesce',['to-number',['get','render_min_height']],['to-number',['get','min_height']],0],
            'fill-extrusion-opacity':0.89
          }},labels);
        addLayerSafe({id:LAYER.places,type:'circle',source:src,'source-layer':'place',
          minzoom:6,filter:['in',['get','class'],['literal',['city','town','village','hamlet','suburb','quarter','neighbourhood','isolated_dwelling']]],
          paint:{'circle-radius':['interpolate',['linear'],['zoom'],6,9,13,14],
            'circle-color':'#fff','circle-opacity':0.012,
            'circle-stroke-width':0}},labels);
        addLayerSafe({id:LAYER.peaks,type:'circle',source:src,'source-layer':'mountain_peak',
          minzoom:8,paint:{'circle-radius':5,'circle-color':'#ffd492',
            'circle-stroke-width':1.5,'circle-stroke-color':'#3d3430',
            'circle-opacity':0.91}},labels);
        addLayerSafe({id:LAYER.pois,type:'circle',source:src,'source-layer':'poi',minzoom:13,
          filter:['in',['get','class'],['literal',['attraction','museum','castle','monument','historic','place_of_worship','tourism']]],
          paint:{'circle-radius':8,'circle-opacity':0.012}},labels);
      }
      applyModes();
    } catch(error) {
      console.warn('SICILIA 3D Kartenebenen:',error);
      setStatus('Karte geladen · einzelne Ebenen fehlen');
    }
  }
  function mapClick(event) {
    let items=[];
    try {
      const ids=[LAYER.buildings,LAYER.peaks,LAYER.places,LAYER.pois].filter(visible);
      items=S.map.queryRenderedFeatures(event.point,{layers:ids})||[];
    } catch(error) {console.warn(error);}
    const order={[LAYER.buildings]:0,[LAYER.peaks]:1,[LAYER.places]:2,[LAYER.pois]:3};
    items.sort((a,b)=>(order[a.layer.id]??9)-(order[b.layer.id]??9));
    const f=items[0];
    if(f) {
      const kind=f.layer.id===LAYER.buildings?'Gebäude':
        f.layer.id===LAYER.peaks?'Berggipfel':
        f.layer.id===LAYER.places?'Ort':'Sehenswürdigkeit';
      const p=f.properties||{},lngLat=f.geometry?.type==='Point'?
        {lng:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]}:event.lngLat;
      openDetails({name:p.name||p.name_de||p.name_en||(kind==='Gebäude'?'Unbenanntes Gebäude':'Unbenannter Ort'),
        icon:kind==='Gebäude'?'🏠':kind==='Berggipfel'?'⛰️':kind==='Ort'?'📍':'🏛️',
        kind,lng:lngLat.lng,lat:lngLat.lat,props:p,source:'OpenStreetMap / OpenMapTiles',
        articleEligible:!!(p.name||p.name_de||p.name_en)});
      return;
    }
    // On satellite maps, labels and OSM features may be sparse. Never invent a building.
    const others=S.map.queryRenderedFeatures(event.point)||[];
    const named=others.find(x=>x.properties?.name &&
      ['symbol','circle'].includes(x.layer?.type) &&
      ['place','mountain_peak','poi'].includes(x.sourceLayer));
    if(named) {
      const p=named.properties;
      openDetails({name:p.name,icon:'📍',kind:named.sourceLayer==='mountain_peak'?'Berggipfel':'Ort',
        lng:event.lngLat.lng,lat:event.lngLat.lat,props:p,
        source:'OpenStreetMap / OpenMapTiles',articleEligible:true});
    } else {
      openDetails({name:'Punkt auf der Karte',icon:'📌',kind:'Geländepunkt',
        lng:event.lngLat.lng,lat:event.lngLat.lat,props:{},
        source:'Digitales Höhenmodell',articleEligible:false});
    }
  }
  function getHeight(lng,lat){
    try{
      const val=S.map.queryTerrainElevation([lng,lat]);
      return Number.isFinite(val)?val/Math.max(S.height,0.2):null;
    }catch(error){return null;}
  }
  function openDetails(obj) {
    S.selected=obj;S.wikiKey++;
    const box=$('sic-inspector');box.textContent='';
    const h=document.createElement('h3');
    h.textContent=obj.icon+' '+obj.name;box.appendChild(h);
    const p=document.createElement('p');
    p.textContent=obj.kind+' · '+obj.source;box.appendChild(p);
    const props=obj.props||{};
    const rows=[];
    const add=(label,value,suffix='')=>{
      if(value!==undefined&&value!==null&&String(value).trim()!=='')rows.push([label,String(value)+suffix]);
    };
    add('Breitengrad',number(obj.lat,5)+'° N');
    add('Längengrad',number(obj.lng,5)+'° E');
    if(obj.kind==='Berggipfel')add('Gipfelhöhe (OSM)',props.ele,' m');
    else if(obj.kind==='Gebäude') {
      add('Höhe (Kartenmodell)',props.render_height??props.height,' m');
      add('Stockwerke',props['building:levels']);
      add('Gebäudetyp',props.building);
      add('Strasse',props['addr:street']);
      add('Hausnummer',props['addr:housenumber']);
      add('Baubeginn / Jahr',props.start_date);
      add('Architekt',props.architect);
      add('Architekturstil',props['building:architecture']);
    }
    const terrain=getHeight(obj.lng,obj.lat);
    if(terrain!==null) add('Gelände laut Höhenmodell (ca.)',Math.round(terrain),' m');
    rows.forEach(([key,value])=>{
      const row=document.createElement('div');row.className='sic-info-row';
      const label=document.createElement('span');label.textContent=key;
      const data=document.createElement('strong');data.textContent=value;
      row.append(label,data);box.appendChild(row);
    });
    const article=document.createElement('div');article.id='sic-article';
    article.className='sic-small';article.style.marginTop='8px';
    article.textContent=obj.articleEligible||obj.kind==='Ort'?
      '📚 Suche nach historischen und architektonischen Informationen …':
      'Für diesen Punkt sind keine spezifischen historischen Informationen hinterlegt.';
    box.appendChild(article);
    const links=document.createElement('div');links.className='sic-links';
    function link(title,href){
      const a=document.createElement('a');a.href=href;a.target='_blank';a.rel='noopener noreferrer';
      a.textContent=title;links.appendChild(a);return a;
    }
    link('🗺️ OpenStreetMap',osmURL(obj.lng,obj.lat));
    if(obj.articleEligible||obj.kind==='Ort'||obj.kind==='Suche')
      link('🔎 Wikipedia-Suche',wikiSearch(obj.wiki||obj.name));
    box.appendChild(links);

    if(S.popup)S.popup.remove();
    const node=document.createElement('div');node.className='sic-popup';
    const title=document.createElement('h3');title.textContent=obj.icon+' '+obj.name;node.appendChild(title);
    const summary=document.createElement('div');summary.textContent=obj.kind+
      (obj.kind==='Berggipfel'&&props.ele?' · '+props.ele+' m':'');
    node.appendChild(summary);
    const btn=document.createElement('button');btn.textContent='📖 Details & Geschichte';
    btn.onclick=()=>{
      document.querySelector('.panel').classList.remove('minimized');
      $('sic-min').textContent='▾';
      box.scrollIntoView({block:'nearest',behavior:'smooth'});
    };
    node.appendChild(btn);
    S.popup=new maplibregl.Popup({maxWidth:'285px',closeOnClick:false})
      .setLngLat([obj.lng,obj.lat]).setDOMContent(node).addTo(S.map);

    if(!obj.searchOnly) weatherFor(obj);
    if(obj.articleEligible||obj.kind==='Ort'||obj.kind==='Suche')
      wikiFor(obj,article,links);
  }
  async function wikiExact(name,lang) {
    const params=new URLSearchParams({action:'query',prop:'extracts|pageimages|info',
      inprop:'url',exintro:'1',explaintext:'1',piprop:'thumbnail',pithumbsize:'340',
      redirects:'1',titles:name,format:'json',origin:'*'});
    const response=await fetch('https://'+lang+'.wikipedia.org/w/api.php?'+params);
    if(!response.ok)throw Error('Wikipedia '+response.status);
    const json=await response.json();
    const page=Object.values(json.query?.pages||{})[0];
    return page && !Object.prototype.hasOwnProperty.call(page,'missing') ? page : null;
  }
  async function wikiFor(obj,article,links) {
    const current=++S.wikiKey;
    let query=obj.wiki||obj.name;
    let result=null,lang='de';
    for(const target of ['de','it']){
      try{
        result=await wikiExact(query,target);
        if(result){lang=target;break;}
      }catch(error){console.warn('Wikipedia:',error);}
    }
    if(current!==S.wikiKey)return;
    if(!result){
      article.textContent='Kein eindeutig zugeordneter Wikipedia-Artikel gefunden. Nutze die Wikipedia-Suche. Historische Gebäudedaten sind nicht für alle Objekte verfügbar.';
      return;
    }
    article.textContent=ellipsis(result.extract||'Artikel vorhanden; keine Kurzfassung verfügbar.',660);
    if(result.thumbnail?.source){
      const img=document.createElement('img');img.className='sic-info-image';
      img.src=result.thumbnail.source;img.alt='Wikipedia: '+obj.name;
      img.loading='lazy';article.prepend(img);
    }
    const a=document.createElement('a');a.href=result.fullurl||
      'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(result.title.replaceAll(' ','_'));
    a.target='_blank';a.rel='noopener noreferrer';a.textContent='📖 Artikel ('+lang.toUpperCase()+')';
    links.prepend(a);
    // Wikipedia title matches can be ambiguous: keep the actual article title visible.
    if(result.title.toLowerCase()!==query.toLowerCase()){
      const note=document.createElement('div');note.className='sic-small';
      note.textContent='Wikipedia-Thema: '+result.title;article.appendChild(note);
    }
  }
  function focusPlace(p) {
    S.place=p;
    $('places').querySelectorAll('button').forEach(b=>b.classList.toggle('active',b.dataset.name===p.name));
    $('placeTitle').textContent=p.name;
    $('details').textContent='Ortsübersicht · tippe auf Gebäude, Dörfer oder Gipfel für mehr Informationen.';
    S.map.flyTo({center:[p.lng,p.lat],zoom:p.zoom,
      pitch:S.perspective?64:0,bearing:S.perspective?-18:0,duration:1450});
    openDetails({...pickPlace(p),articleEligible:true});
  }
  async function weatherFor(obj,force=false) {
    if(!obj)return;
    const key=++S.weatherKey,area={lat:obj.lat,lng:obj.lng};
    const box=$('sic-wx');box.textContent='🌦️ Lade Wetter für '+obj.name+' …';
    $('sic-forecast-container').hidden=true;
    const cacheKey=number(area.lat,2)+'|'+number(area.lng,2);
    try {
      let json=S.weather && S.weather.key===cacheKey &&
        !force && Date.now()-S.weather.at<10*60*1000 ? S.weather.data : null;
      if(!json) {
        const params=new URLSearchParams({latitude:String(area.lat),longitude:String(area.lng),
          current:'temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code',
          hourly:'temperature_2m,precipitation_probability,precipitation,weather_code',
          forecast_hours:'24',timezone:'Europe/Rome'});
        const r=await fetch('https://api.open-meteo.com/v1/forecast?'+params);
        if(!r.ok)throw Error('Open-Meteo '+r.status);
        json=await r.json();S.weather={key:cacheKey,at:Date.now(),data:json};
      }
      if(key!==S.weatherKey)return;
      const now=json.current||{},code=now.weather_code;
      const description=weatherLabel(code);
      box.textContent='';
      const header=document.createElement('div');header.className='sic-wx-now';
      header.textContent=weatherIcon(code)+' '+number(now.temperature_2m)+' °C · '+description;box.appendChild(header);
      const meta=document.createElement('div');meta.className='sic-wx-meta';
      meta.textContent='📍 '+obj.name+' · '+(now.time||'Zeit unbekannt')+' (Italien) · Wind '+
        number(now.wind_speed_10m)+' km/h · Feuchte '+number(now.relative_humidity_2m,0)+
        '% · Niederschlag '+number(now.precipitation)+' mm';
      box.appendChild(meta);
      S.forecast=json.hourly;
      $('sic-forecast').max=String(Math.max(0,(json.hourly?.time||[]).length-1));
      $('sic-forecast').value='0';
      $('sic-forecast-container').hidden=!json.hourly?.time?.length;
      drawForecast();
    } catch(error) {
      if(key===S.weatherKey)box.textContent='Wetterdaten sind momentan nicht verfügbar ('+obj.name+').';
    }
  }
  function weatherIcon(code){
    const c=Number(code);
    if(c===0)return '☀️';
    if(c<=3)return '⛅';
    if(c<=48)return '🌫️';
    if(c<=67)return '🌧️';
    if(c<=77)return '🌨️';
    if(c<=82)return '🌦️';
    if(c<=86)return '❄️';
    if(c>=95)return '⛈️';
    return '🌤️';
  }
  function weatherLabel(code){
    const c=Number(code);
    if(c===0)return 'klar';
    if(c<=3)return 'bewölkt';
    if(c<=48)return 'Nebel';
    if(c<=67)return 'Regen';
    if(c<=77)return 'Schnee';
    if(c<=82)return 'Schauer';
    if(c<=86)return 'Schneeschauer';
    if(c>=95)return 'Gewitter';
    return 'Wetterlage';
  }
  function drawForecast() {
    const a=S.forecast,idx=Number($('sic-forecast').value);
    if(!a?.time?.[idx])return;
    $('sic-fhour').textContent=String(idx);
    $('sic-ftime').textContent=a.time[idx].replace('T',' ');
    $('sic-forecast-text').textContent=weatherIcon(a.weather_code?.[idx])+' '+
      number(a.temperature_2m?.[idx])+' °C · '+weatherLabel(a.weather_code?.[idx])+
      ' · Niederschlag '+number(a.precipitation?.[idx])+' mm · Wahrscheinlichkeit '+
      number(a.precipitation_probability?.[idx],0)+' %';
  }
  async function loadPinWeather(force=false) {
    if(!S.map || !S.pins)return;
    if(S.pinData && !force && Date.now()-S.pinData.at<20*60*1000){drawWeatherPins();return;}
    const spots=[PLACES[0],PLACES[1],PLACES[2],PLACES[3],PLACES[4],PLACES[5]];
    const params=new URLSearchParams({latitude:spots.map(x=>x.lat).join(','),
      longitude:spots.map(x=>x.lng).join(','),
      current:'temperature_2m,weather_code',timezone:'Europe/Rome'});
    try{
      const r=await fetch('https://api.open-meteo.com/v1/forecast?'+params);
      if(!r.ok)throw Error('Weather pins');
      const data=await r.json();
      const list=Array.isArray(data)?data:[data];
      if(list.length!==spots.length)throw Error('Incomplete response');
      S.pinData={at:Date.now(),spots:spots.map((p,i)=>({p,current:list[i].current}))};
      drawWeatherPins();
    }catch(error){console.warn('Wetterpunkte:',error);}
  }
  function drawWeatherPins() {
    S.weatherPins.forEach(p=>p.remove());S.weatherPins=[];
    if(!S.pins||!S.map||!S.pinData)return;
    S.pinData.spots.forEach(item=>{
      const el=document.createElement('button');el.className='sic-wx-pin';
      const temp=item.current?.temperature_2m;
      el.textContent=weatherIcon(item.current?.weather_code)+' '+item.p.name+' '+number(temp,0)+'°';
      el.title='Wetter und Informationen zu '+item.p.name;
      el.onclick=event=>{event.stopPropagation();focusPlace(item.p);};
      const marker=new maplibregl.Marker({element:el,anchor:'bottom'})
        .setLngLat([item.p.lng,item.p.lat]).addTo(S.map);
      S.weatherPins.push(marker);
    });
  }
  function start() {
    if(typeof window.maplibregl==='undefined'){
      setStatus('MapLibre konnte nicht geladen werden');
      $('error').hidden=false;return;
    }
    injectInterface();
    S.map=new maplibregl.Map({
      container:'map',style:OMF,center:[14.12,37.65],zoom:7.7,
      pitch:55,bearing:-12,maxPitch:85,antialias:true
    });
    S.map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'bottom-right');
    S.map.on('style.load',()=>{prepareMap();setStatus('● SICILIA 3D v4.0 · Höhenkarte');});
    S.map.on('load',()=>{$('error').hidden=true;loadPinWeather();});
    S.map.on('click',mapClick);
    S.map.on('error',event=>{console.warn('Karten-/Datenquelle:',event.error?.message||event);
      S.networkErrors++;
      if(S.networkErrors===8)setStatus('Einige externe Kartenkacheln nicht erreichbar');
    });
    PLACES.forEach(p=>{
      const b=document.createElement('button');
      b.type='button';b.dataset.name=p.name;b.textContent=p.icon+' '+p.name;
      b.onclick=()=>focusPlace(p);
      $('places').appendChild(b);
    });
    $('overview').onclick=()=>{
      S.map.flyTo({center:[14.1,37.65],zoom:7.6,pitch:55,bearing:0,duration:1350});
      $('placeTitle').textContent='Sizilien';
      $('details').textContent='Inselübersicht – erkunde Städte, Dörfer, Gebäude, Berge und Wetter.';
      if(S.popup){S.popup.remove();S.popup=null;}
    };
    $('buildings').onclick=()=>{
      S.buildings=!S.buildings;$('buildings').classList.toggle('active',S.buildings);
      $('buildings').setAttribute('aria-pressed',String(S.buildings));applyModes();
    };
    $('perspective').onclick=()=>{
      S.perspective=!S.perspective;$('perspective').classList.toggle('active',S.perspective);
      $('perspective').setAttribute('aria-pressed',String(S.perspective));
      S.map.easeTo({pitch:S.perspective?64:0,bearing:S.perspective?-18:0,duration:850});
    };
    $('retry').onclick=()=>location.reload();
    openDetails({...pickPlace(PLACES[0]),articleEligible:true});
    loadPinWeather();
    setInterval(()=>{if(!document.hidden){weatherFor(S.selected||pickPlace(S.place),true);loadPinWeather(true);}},15*60*1000);
  }
  window.SICILIA_API={
    PLACES, focusPlace, openDetails, weatherFor, applyModes,
    get map(){return S.map;}, get state(){return S;}
  };
  start();
})();
