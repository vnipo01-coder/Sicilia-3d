/* SICILIA 3D · CesiumJS pilot — Santa Teresa di Riva.
 * No secret keys in repository. Token is only in JS memory during this tab.
 * Satellite raster, OSM 3D extrusions, verified ion 3D Tiles are different
 * quality classes. We label every one and never fake detailed facades.
*/
import {PILOT,PLACES,fetchPilotOsm,SOURCE_LINKS} from "./core.js?v=2";
import {prepareTerrarium} from "./terrain.js?v=2";
import {architectureProfilesFor,architectureProperties} from "../v10/architecture.js?v=132";
import {getWeather,formatWeather} from "../v10/weather.js?v=132";
const $=id=>document.getElementById(id);
const Cesium=window.Cesium;
if(!Cesium){
  $("loading-detail").textContent="CesiumJS konnte nicht geladen werden. Bitte Internetverbindung oder Scriptblocker prüfen.";
  throw Error("CesiumJS CDN unavailable");
}
const state={
  viewer:null,source:null,roads:null,bus:null,
  terrain:false,tiles:null,photoreal:null,mode:"osm",
  osmData:null,loading:false,tokenConnected:false,lastPlace:"municipio",
  terrainMode:"ellipsoid",terrainLoading:false,terrainBuild:0,openTerrain:null
};
const log=(msg,isError=false)=>{
  $("data-state").textContent=msg;
  $("data-state").dataset.state=isError?"error":"ok";
};
const quality=(msg)=>{$("quality-label").textContent=msg;};
const loader=(message,visible=true)=>{
  $("loading").hidden=!visible;
  if(message)$("loading-detail").textContent=message;
};
const dataSources=[];
function addLink(label,url){
  if(!/^https:\/\//.test(url))return null;
  const a=document.createElement("a");
  a.textContent=label+" ↗";a.href=url;a.target="_blank";
  a.rel="noopener noreferrer";
  return a;
}
function color(hex,alpha=1){
  return Cesium.Color.fromCssColorString(hex).withAlpha(alpha);
}
function toCartesian(points){
  const flat=[];
  for(const point of points)flat.push(point.lon,point.lat);
  return Cesium.Cartesian3.fromDegreesArray(flat);
}
function viewPlace(id="municipio",duration=1.4){
  const p=PLACES.find(x=>x.id===id)||PLACES[0];
  state.lastPlace=p.id;
  document.querySelectorAll("[data-place]").forEach(button=>
    button.classList.toggle("selected",button.dataset.place===p.id));
  state.viewer.camera.flyTo({
    destination:Cesium.Cartesian3.fromDegrees(p.lon,p.lat,p.height),
    orientation:{
      heading:Cesium.Math.toRadians(p.heading),
      pitch:Cesium.Math.toRadians(p.pitch),roll:0
    },duration
  });
}
function setSourceVisibility(){
  const show=$("osm-layer").checked&&state.mode==="osm";
  if(state.source)state.source.show=show;
  if(state.roads)state.roads.show=$("roads-layer").checked&&state.mode!=="photo";
  if(state.bus)state.bus.show=$("roads-layer").checked&&state.mode!=="photo";
  if(state.tiles)state.tiles.show=state.mode==="ion";
  if(state.photoreal)state.photoreal.show=state.mode==="photo";
  state.viewer.scene.globe.show=state.mode!=="photo";
}
function setMode(mode){
  state.mode=mode;
  setSourceVisibility();
  if(mode==="osm")
    quality(state.terrainMode==="ellipsoid"?
      "Satellit + kartierte OSM-Gebäude · Gelände derzeit flach":
      state.terrainMode==="terrarium"?
      "Reales AWS-Terrarium-Gelände + OSM-Gebäudegrundrisse":
      "Cesium World Terrain + kartierte OSM-Gebäude");
  if(mode==="ion")quality("Cesium OSM Buildings · gestreamte 3D Tiles");
  if(mode==="photo")quality("Photorealistische 3D Tiles · Abdeckung noch prüfen");
}
async function initViewer(){
  const viewer=new Cesium.Viewer("cesiumContainer",{
    baseLayer:false,baseLayerPicker:false,
    terrainProvider:new Cesium.EllipsoidTerrainProvider(),
    animation:false,timeline:false,
    homeButton:false,geocoder:false,
    sceneModePicker:false,navigationHelpButton:false,
    fullscreenButton:false,infoBox:false,selectionIndicator:false,
    shouldAnimate:true,requestRenderMode:false
  });
  state.viewer=viewer;
  viewer.scene.globe.enableLighting=false;
  viewer.scene.globe.maximumScreenSpaceError=2.5;
  viewer.scene.globe.depthTestAgainstTerrain=false;
  viewer.scene.fog.enabled=true;
  viewer.scene.fog.density=.00009;
  viewer.scene.screenSpaceCameraController.minimumZoomDistance=12;
  viewer.scene.screenSpaceCameraController.maximumZoomDistance=160000;
  viewer.scene.backgroundColor=color("#113a53");
  viewer.resolutionScale=Math.min(window.devicePixelRatio||1,1.6);
  // Unlike the older atlas, a failure to load buildings NEVER
  // removes the globe, its imagery or the camera.
  try{
    // Direct XYZ imagery has no mandatory metadata round-trip. It avoids
    // the "infinite loading" regression from earlier atlas versions.
    const imagery=new Cesium.UrlTemplateImageryProvider({
      url:"https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      tilingScheme:new Cesium.WebMercatorTilingScheme(),
      maximumLevel:19,
      credit:"Esri und Datenpartner"
    });
    viewer.imageryLayers.addImageryProvider(imagery);
    log("Esri-Luftbildquelle verbunden. OSM-Gebäude werden unabhängig nachgeladen.");
  }catch(e){
    log("Satellitenkacheln nicht initialisierbar: "+String(e.message||e)+
      ". Der Cesium-Globus bleibt unabhängig davon benutzbar.",true);
  }
  viewPlace("municipio",0);
  loader(null,false);
  quality("Satellitenbasis + OSM-Gebäude werden vorbereitet");
  viewer.screenSpaceEventHandler.setInputAction(movement=>{
    const picked=viewer.scene.pick(movement.position);
    if(!Cesium.defined(picked))return;
    if(picked.id&&picked.id._siciliaInfo)showFeature(picked.id._siciliaInfo);
    else if(picked.getProperty){
      const name=picked.getProperty("name")||"3D-Bauwerk";
      $("place-title").textContent=String(name);
      $("place-source").textContent="3D TILES · EXTERNE DATEN";
      const box=$("place-detail");box.replaceChildren();
      const p=document.createElement("p");
      p.textContent="Dieses Objekt gehört zu einer externen 3D-Tiles-Datenquelle. Genauigkeit und Baugeschichte hängen von deren Metadaten ab.";
      box.append(p);
      $("place-links").replaceChildren();
      $("place-overlay").hidden=false;
    }
  },Cesium.ScreenSpaceEventType.LEFT_CLICK);
  return viewer;
}
function infoRow(container,label,value){
  const row=document.createElement("div");row.className="fact";
  const title=document.createElement("span");title.textContent=label;
  const v=document.createElement("span");v.textContent=String(value);
  row.append(title,v);container.append(row);
}
function showFeature(info){
  $("place-overlay").hidden=false;
  $("place-title").textContent=info.name||"Gebäude in Santa Teresa";
  $("place-source").textContent=info.type==="building"?
    "OPENSTREETMAP · GEBÄUDEGRUNDRISS":"OPENSTREETMAP · ORTSDATEN";
  const detail=$("place-detail"),links=$("place-links");detail.replaceChildren();links.replaceChildren();
  if(info.type==="building"){
    infoRow(detail,"Höhe",info.height.metres.toFixed(1)+" m");
    infoRow(detail,"Höhenangabe",info.height.estimated?"Schätzung – "+info.height.basis:"Direkt dokumentiert – "+info.height.basis);
    infoRow(detail,"Grundfläche",Math.round(info.area)+" m² (berechnet)");
    infoRow(detail,"Nutzung",info.tags.building||"nicht dokumentiert");
    if(info.tags["roof:shape"])infoRow(detail,"Dachform (OSM)",info.tags["roof:shape"]);
    if(info.tags["building:material"])infoRow(detail,"Baumaterial (OSM)",info.tags["building:material"]);
    infoRow(detail,"Baujahr",info.tags.start_date||"nicht dokumentiert");
    const p=document.createElement("p");
    p.textContent="3D-Darstellung: extrudierter OSM-Grundriss. Fenster, echte Fassade und komplexe Dachformen fehlen. Dekorative Farbe ist kein Echtheitsbeleg.";
    detail.append(p);
  }else{
    infoRow(detail,"Objekt",info.name);
    if(info.tags?.operator)infoRow(detail,"Betreiber",info.tags.operator);
    if(info.tags?.ref)infoRow(detail,"Referenz",info.tags.ref);
    const p=document.createElement("p");p.textContent="Abfahrtszeiten werden nicht erfunden: Vor der Fahrt aktuelle Betreiberfahrpläne prüfen.";detail.append(p);
  }
  if(info.type==="building"){
    const centre=info.ring?.reduce((acc,p)=>({
      lat:acc.lat+p.lat/info.ring.length,
      lon:acc.lon+p.lon/info.ring.length
    }),{lat:0,lon:0});
    if(centre){
      const papers=architectureProfilesFor({
        name:info.name,kind:"Gebäude",lat:centre.lat,lon:centre.lon
      });
      if(papers.length){
        const heading=document.createElement("h3");
        heading.textContent="Quellenorientiertes Architekturwissen";detail.append(heading);
        for(const paper of papers){
          const section=document.createElement("details");
          section.className="architecture-record";
          section.open=true;
          const summary=document.createElement("summary");
          summary.textContent=paper.title+" · "+paper.era;section.append(summary);
          for(const para of paper.paragraphs){
            const p=document.createElement("p");p.textContent=para;section.append(p);
          }
          for(const src of paper.sources){
            const a=addLink("Originalquelle: "+src.title,src.url);
            if(a)section.append(a);
          }
          detail.append(section);
        }
      }
    }
    const known=architectureProperties(info.tags);
    if(known.length){
      const h=document.createElement("h3");h.textContent="Weitere dokumentierte OSM-Bauattribute";
      detail.append(h);
      for(const p of known){
        if(!["Bauwerkstyp","Geschosse","Messhöhe","Dachform"].includes(p.label))
          infoRow(detail,p.label,p.value);
      }
    }
  }
  const match=/^(way|node)\/(\d+)$/.exec(info.id);
  if(match)links.append(addLink("Originales OSM-Objekt",SOURCE_LINKS.osm+match[1]+"/"+match[2]));
  links.append(addLink("Offizielle Gemeinde",SOURCE_LINKS.comune));
}
function renderPilotOSM(data){
  const viewer=state.viewer;
  const buildings=new Cesium.CustomDataSource("Santa Teresa · OSM-Baugrundrisse");
  const roads=new Cesium.CustomDataSource("Santa Teresa · kartierte Strassen");
  const stops=new Cesium.CustomDataSource("Santa Teresa · Haltestellen");
  let shown=0,failed=0;
  for(const b of data.buildings){
    try{
      const entity=buildings.entities.add({
        name:b.tags.name||"Gebäude",
        polygon:{
          hierarchy:toCartesian(b.ring),
          height:0,
          heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,
          extrudedHeight:b.height.metres,
          extrudedHeightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,
          material:color(b.color.hex,.91),
          outline:false
        }
      });
      entity._siciliaInfo={...b,type:"building",name:b.tags.name||"Gebäude"};
      shown++;
    }catch(e){failed++;}
  }
  for(const road of data.roads){
    try{
      const small=["footway","pedestrian","path"].includes(road.type);
      roads.entities.add({
        name:road.name||road.type,
        polyline:{
          positions:toCartesian(road.points),
          width:small?2.5:4.5,
          clampToGround:true,
          material:color(small?"#b9e7c3":"#fff3d5",small?.65:.82)
        }
      });
    }catch(e){}
  }
  for(const stop of data.stops){
    const ent=stops.entities.add({
      name:stop.name,
      position:Cesium.Cartesian3.fromDegrees(stop.lon,stop.lat),
      point:{
        pixelSize:12,color:color("#f6cd6a"),
        outlineColor:color("#0d3850"),outlineWidth:3,
        heightReference:Cesium.HeightReference.CLAMP_TO_GROUND
      },
      label:{
        text:"🚌 "+stop.name,font:"11px sans-serif",
        pixelOffset:new Cesium.Cartesian2(0,-22),
        fillColor:color("#ffffff"),
        showBackground:true,
        backgroundColor:color("#104256",.82),
        horizontalOrigin:Cesium.HorizontalOrigin.CENTER,
        heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,
        distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,1100)
      }
    });
    ent._siciliaInfo={...stop,type:"stop"};
  }
  viewer.dataSources.add(buildings);
  viewer.dataSources.add(roads);
  viewer.dataSources.add(stops);
  state.source=buildings;state.roads=roads;state.bus=stops;state.osmData=data;
  setSourceVisibility();
  const measured=data.buildings.filter(b=>!b.height.estimated).length;
  $("building-count").textContent=String(shown);
  $("road-count").textContent=String(data.roads.length);
  $("measured-count").textContent=String(measured);
  log("OSM geladen: "+shown+" Gebäude, "+data.roads.length+" Strassen und "+data.stops.length+
    " Haltestellen. "+measured+" Gebäude mit direkt dokumentierter Höhe."+
    (failed?" "+failed+" ungültige Polygone übersprungen.":""));
  quality("OSM-3D-Baukörper · echte Grundrisse, modellierte Fassaden");
}
function setTerrainStatus(message,error=false){
  const el=$("terrain-state");
  if(el){el.textContent=message;el.dataset.state=error?"error":"ok";}
}
function terrainButtonLabel(){
  const b=$("terrain-free");
  if(!b)return;
  b.disabled=state.terrainLoading;
  b.textContent=state.terrainLoading?
    "⏳ Lade echtes Relief …":
    state.terrainMode==="terrarium"?
      "⛰️ Reales Relief deaktivieren":
      "⛰️ Kostenloses reales Relief aktivieren";
}
function switchToEllipsoid(){
  // Invalidate unfinished requests before they can replace a later choice.
  state.terrainBuild++;
  state.terrainLoading=false;
  if(!state.viewer)return;
  state.viewer.terrainProvider=new Cesium.EllipsoidTerrainProvider();
  state.viewer.scene.globe.depthTestAgainstTerrain=false;
  state.terrain=false;
  state.terrainMode="ellipsoid";
  setTerrainStatus("Flaches Erdmodell aktiv. Das Luftbild und die OSM-Gebäude bleiben sichtbar.");
  terrainButtonLabel();
  setMode(state.mode);
}
async function enableOpenTerrain(){
  if(state.terrainLoading)return;
  if(state.terrainMode==="terrarium"){switchToEllipsoid();return;}
  const generation=++state.terrainBuild;
  state.terrainLoading=true;
  terrainButtonLabel();
  setTerrainStatus("AWS-Geländekachel für Santa Teresa wird unabhängig von der Karte geprüft …");
  try{
    const result=state.openTerrain||await prepareTerrarium(Cesium,{
      lat:PILOT.lat,lon:PILOT.lon,
      onStatus:message=>{if(generation===state.terrainBuild)setTerrainStatus(message);}
    });
    if(generation!==state.terrainBuild)return;
    state.openTerrain=result;
    state.viewer.terrainProvider=result.provider;
    state.viewer.scene.globe.depthTestAgainstTerrain=false;
    state.terrainMode="terrarium";
    state.terrain=true;
    setTerrainStatus("✓ Reales Relief aus AWS/Mapzen aktiv. Referenzpunkt ca. "+
      result.preflightHeightMetres.toFixed(1)+
      " m im DEM; weitere Kacheln laden bei Bedarf. Kein lokales 1-m-LiDAR.");
    setMode(state.mode);
  }catch(error){
    if(generation!==state.terrainBuild)return;
    state.terrainMode="ellipsoid";
    state.terrain=false;
    state.viewer.terrainProvider=new Cesium.EllipsoidTerrainProvider();
    setTerrainStatus("Geländekacheln nicht verfügbar: "+String(error.message||error)+
      " · flache Satellitenwelt bleibt bedienbar.",true);
    setMode(state.mode);
  }finally{
    if(generation===state.terrainBuild){
      state.terrainLoading=false;terrainButtonLabel();
    }
  }
}
async function loadOSM(){
  if(state.loading)return;
  state.loading=true;
  log("OpenStreetMap-Lokalgeometrie wird geladen. Die Satellitenwelt bleibt bedienbar.");
  const controller=new AbortController();
  try{
    const data=await fetchPilotOsm({signal:controller.signal});
    renderPilotOSM(data);
  }catch(e){
    $("building-count").textContent="–";
    $("road-count").textContent="–";
    $("measured-count").textContent="–";
    log("OSM-Daten im Moment nicht verfügbar: "+e.message+
      ". Der Satellitenatlas bleibt erhalten. Über die offizielle OSM-Karte kannst du Daten prüfen.",true);
  }finally{state.loading=false;}
}
function getIonToken(){
  const t=$("ion-token").value.trim();
  if(t.length<20)throw Error("Bitte einen gültigen Cesium-ion-Token eingeben.");
  Cesium.Ion.defaultAccessToken=t; // only in active JS memory; no persistent storage
  return t;
}
function setTokenState(message,error=false){
  const el=$("token-state");
  el.textContent=message;el.className="token-state "+(error?"error":"ok");
}
async function runIon(action){
  for(const id of ["terrain-enable","tiles-enable","photo-enable"])$(id).disabled=true;
  try{
    getIonToken();
    if(action==="terrain"){
      setTokenState("Lade echte Gelände-Kacheln von Cesium ion …");
      const terrain=await Cesium.createWorldTerrainAsync({requestVertexNormals:true});
      ++state.terrainBuild; // discard pending public DEM requests
      state.terrainLoading=false;
      state.viewer.terrainProvider=terrain;
      state.viewer.scene.globe.depthTestAgainstTerrain=false;
      state.terrain=true;state.terrainMode="ion";
      setTokenState("Geländedaten erfolgreich verbunden. Gebäude bleiben geometrisch vereinfachte OSM-Körper.");
      setTerrainStatus("Cesium World Terrain mit ion-Zugriff aktiv.");terrainButtonLabel();
      quality("Cesium World Terrain aktiv · Datenabdeckung prüfen");
      if(state.mode==="photo")setMode("osm");
    }else if(action==="tiles"){
      setTokenState("Lade Cesium OSM Buildings als 3D Tiles …");
      if(!state.tiles){
        const tileset=await Cesium.createOsmBuildingsAsync();
        tileset.maximumScreenSpaceError=8;
        state.tiles=state.viewer.scene.primitives.add(tileset);
      }
      setMode("ion");
      setTokenState("Cesium OSM 3D Tiles verbunden. Gebäudedetails hängen von den Quelldaten ab.");
    }else if(action==="photo"){
      setTokenState("Prüfe Berechtigung für Google Photorealistic 3D Tiles über Cesium ion …");
      if(!state.photoreal){
        const tileset=await Cesium.createGooglePhotorealistic3DTileset();
        tileset.maximumScreenSpaceError=10;
        state.photoreal=state.viewer.scene.primitives.add(tileset);
      }
      setMode("photo");
      setTokenState("Photorealistische Datenquelle verbunden. Ob Santa Teresa detailreich abgedeckt ist, muss visuell geprüft werden. Anbieter- und Budgetbedingungen beachten.");
    }
  }catch(e){
    setTokenState("Aktivierung nicht möglich: "+String(e.message||e)+
      ". Token-Rechte, Anbieterfreigaben und Tarif prüfen.",true);
  }finally{
    for(const id of ["terrain-enable","tiles-enable","photo-enable"])$(id).disabled=false;
  }
}
let weatherBusy=false;
async function refreshPilotWeather(){
  if(weatherBusy)return;weatherBusy=true;
  try{
    const data=await getWeather(PILOT.lat,PILOT.lon,{fresh:true});
    const v=formatWeather(data);
    $("pilot-weather").textContent=v.emoji+" "+v.temp+" · "+
      v.label+" · "+v.wind;
    $("pilot-weather").title="Open-Meteo-Wettermodell · Modellzeit "+
      v.time+" (Italien), abgerufen "+new Date(data.fetched).toLocaleTimeString("de-CH")+
      (data.stale?" (ältere Cachewerte)":"");
  }catch(e){
    $("pilot-weather").textContent="🌦️ Wetter momentan nicht verfügbar";
    $("pilot-weather").title="Externer Wetterdienst fehlgeschlagen, 3D-Viewer bleibt nutzbar";
  }finally{weatherBusy=false;}
}
function wireUI(){
  document.querySelectorAll("[data-place]").forEach(button=>{
    button.onclick=()=>viewPlace(button.dataset.place);
  });
  $("reset").onclick=()=>viewPlace("municipio");
  $("zoom-in").onclick=()=>state.viewer.camera.zoomIn(Math.max(25,
    state.viewer.camera.positionCartographic.height*.23));
  $("zoom-out").onclick=()=>state.viewer.camera.zoomOut(Math.max(25,
    state.viewer.camera.positionCartographic.height*.33));
  $("terrain-free").onclick=enableOpenTerrain;
  $("osm-layer").onchange=setSourceVisibility;
  $("roads-layer").onchange=setSourceVisibility;
  $("place-close").onclick=()=>$("place-overlay").hidden=true;
  $("help").onclick=()=>$("help-pop").hidden=!$("help-pop").hidden;
  $("quality-open").onclick=()=>$("quality-dialog").showModal();
  $("quality-dialog").addEventListener("close",()=>{
    $("ion-token").value=""; // do not keep secret in DOM after closing
  });
  $("terrain-enable").onclick=()=>runIon("terrain");
  $("tiles-enable").onclick=()=>runIon("tiles");
  $("photo-enable").onclick=()=>runIon("photo");
  $("osm-mode").onclick=()=>{
    setMode("osm");
    setTokenState("Zur freien OSM-Kartenansicht zurückgekehrt. Hochwertige Geländedaten bleiben aktiv, sofern sie bereits erfolgreich geladen wurden.");
  };
  $("quality-form").addEventListener("submit",e=>{e.preventDefault();$("quality-dialog").close();});
}
try{
  await initViewer();
  wireUI();
  enableOpenTerrain(); // does not block the satellite image or OSM loading
  refreshPilotWeather(); // independent of imagery and Overpass
  setInterval(()=>{if(!document.hidden)refreshPilotWeather();},6*60*1000);
  await loadOSM();
}catch(e){
  loader("3D-Viewer konnte nicht gestartet werden: "+String(e.message||e),true);
  log("Cesium-Initialisierung fehlgeschlagen: "+String(e.message||e),true);
}
