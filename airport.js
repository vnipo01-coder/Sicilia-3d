import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/* SICILIA 3D Airport Explorer: 3D airplane models.
 * DEMO is visually simulated and never labelled live.
 * Live ADS-B works only when the provider permits cross-origin requests.
 */
document.body.dataset.airportReady='1';
const LAT=37.4668,LNG=15.0664,MX=111320*Math.cos(LAT*Math.PI/180),MZ=111320;
const $=id=>document.getElementById(id),center=()=>({x:0,z:0});
const loc=(lon,lat)=>({x:(lon-LNG)*MX,z:-(lat-LAT)*MZ});
const scene=new THREE.Scene();scene.background=new THREE.Color('#86adce');
scene.fog=new THREE.FogExp2('#9cbacf',0.00013);
const host=$('scene');
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.3;
host.appendChild(renderer.domElement);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,1,85000);
const sun=new THREE.DirectionalLight(0xffeed2,2.4);sun.position.set(-2800,4000,-2400);scene.add(sun);
scene.add(new THREE.HemisphereLight(0xd7ebf6,0x788a97,2.4));
const ground=new THREE.Mesh(new THREE.PlaneGeometry(75000,75000),new THREE.MeshStandardMaterial({color:0x739b84,roughness:1}));
ground.rotation.x=-Math.PI/2;ground.position.y=-1;scene.add(ground);
const sea=new THREE.Mesh(new THREE.PlaneGeometry(60000,60000),new THREE.MeshStandardMaterial({color:0x2d7798,metalness:.04,roughness:.64}));
sea.rotation.x=-Math.PI/2;sea.position.set(0,-.5,31500);scene.add(sea);
const runway=new THREE.Group();scene.add(runway);
const asphalt=new THREE.MeshStandardMaterial({color:0x3a474e,roughness:.96});
const markings=new THREE.MeshBasicMaterial({color:0xebf1e9});
const tarmac=new THREE.Mesh(new THREE.BoxGeometry(45,1.1,2436),asphalt);
tarmac.position.y=.1;runway.add(tarmac);runway.rotation.y=Math.PI*(100/180); // 08/26 axis; approximate geometry before OSM alignment
for(let i=-1100;i<1100;i+=70){
  const mark=new THREE.Mesh(new THREE.BoxGeometry(1.6,.05,40),markings);
  mark.position.set(0,.71,i);runway.add(mark);
}
for(let side of [-1,1]){
  const edge=new THREE.Mesh(new THREE.BoxGeometry(1,.05,2330),markings);
  edge.position.set(side*21.5,.71,0);runway.add(edge);
}
const terminal=new THREE.Mesh(new THREE.BoxGeometry(210,21,75),new THREE.MeshStandardMaterial({color:0xb4bec1,roughness:1}));
terminal.position.set(280,10,-60);scene.add(terminal);
const controlTower=new THREE.Mesh(new THREE.CylinderGeometry(9,12,43,10),new THREE.MeshStandardMaterial({color:0xd7d4c6}));
controlTower.position.set(440,21,70);scene.add(controlTower);
const towerGlass=new THREE.Mesh(new THREE.CylinderGeometry(14,13,10,10),new THREE.MeshStandardMaterial({color:0x477184,roughness:.35}));
towerGlass.position.set(440,46,70);scene.add(towerGlass);
const labelSprites=[];
function textSprite(text,x,y,z){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=90;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#0d2b42db';ctx.fillRect(0,8,512,72);
  ctx.font='bold 31px system-ui';ctx.fillStyle='#ffffff';ctx.fillText(text,18,54);
  const texture=new THREE.CanvasTexture(canvas);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.position.set(x,y,z);sprite.scale.set(400,70,1);scene.add(sprite);labelSprites.push(sprite);
}
textSprite('CATANIA – CTA',80,110,160);
// v9: richer airport model. The layout is initially a schematic render
// grounded to the real runway length and approximate 08/26 alignment;
// OpenStreetMap geometries are drawn above it if the source responds.
const airfield=new THREE.Group();scene.add(airfield);
const apronMaterial=new THREE.MeshStandardMaterial({color:0x69767b,roughness:.98,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
const taxiMaterial=new THREE.MeshStandardMaterial({color:0x454e55,roughness:.97,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
const lineYellow=new THREE.MeshBasicMaterial({color:0xe5c965});
const whitePaint=new THREE.MeshBasicMaterial({color:0xeeeeeb});
const fillMaterial=c=>new THREE.MeshStandardMaterial({color:c,roughness:.85,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1});
function airportBox(w,h,d,color,x,y,z,group=airfield){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),
    new THREE.MeshStandardMaterial({color,roughness:.76}));
  mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
function flatPolygon(points,y,material=apronMaterial,group=airfield){
  if(points.length<3)return;
  const shape=new THREE.Shape();
  points.forEach((p,i)=>{if(!i)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});
  shape.closePath();
  const geometry=new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI/2);
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.y=y;group.add(mesh);
  return mesh;
}
function flatLine(points,width,y,material=taxiMaterial,group=airfield){
  const v=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(!len||len>3000)continue;
    const nx=-dz/len*width/2,nz=dx/len*width/2;
    v.push(
      a.x+nx,y,a.z+nz,a.x-nx,y,a.z-nz,b.x+nx,y,b.z+nz,
      a.x-nx,y,a.z-nz,b.x-nx,y,b.z-nz,b.x+nx,y,b.z+nz
    );
  }
  if(!v.length)return;
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();
  group.add(new THREE.Mesh(g,material));
}
// Parked aircraft, apron lighting and taxiways are indicative visuals only.
// Actual footprint overlays from OSM are added independently.
function makeAirportGroundDetails(){
  flatPolygon([{x:-1030,z:-230},{x:490,z:-230},{x:490,z:-550},{x:-1030,z:-550}],.25,apronMaterial);
  flatLine([{x:-1160,z:-145},{x:1050,z:-145}],22,.34);
  flatLine([{x:-480,z:-145},{x:-430,z:-30},{x:-350,z:0}],20,.37);
  flatLine([{x:320,z:-145},{x:400,z:-30},{x:450,z:0}],20,.37);
  flatLine([{x:-800,z:-145},{x:-760,z:-265}],18,.38);
  flatLine([{x:0,z:-145},{x:35,z:-265}],18,.38);
  for(let j=0;j<13;j++){
    const x=-930+j*115;
    airportBox(2,.05,49,0xe1d47b,x,.47,-336);
    airportBox(38,1,1,0xf5ecd3,x,.55,-530);
    const post=airportBox(1.4,19,1.4,0xd4d9d6,x,10,-460);
    const lamp=new THREE.PointLight(0xe5efff,.25,135);
    lamp.position.set(x,21,-460);airfield.add(lamp);
  }
  // Runway threshold markings at both ends; correct *illustrative* runway markings.
  for(const end of [-1,1]){
    for(const side of [-1,1]){
      for(let k=0;k<4;k++){
        const mark=airportBox(3.1,.07,28,0xf6f7f1,side*(4+k*4),.74,end*1080);
        runway.add(mark);mark.position.set(side*(4+k*4),.74,end*1080);
      }
    }
    for(const x of [-13,13]){
      const aim=airportBox(5,.07,48,0xfafafa,x,.75,end*640,runway);
      aim.position.set(x,.75,end*640);
    }
  }
  for(let i=0;i<8;i++){
    const x=-900+i*235;
    airportBox(96,18,64,i%2?0xc0c6c9:0xb9bcb8,x,9,-700);
    airportBox(91,1,69,0xe2e6e7,x,18.9,-700);
    for(let c=0;c<6;c++)airportBox(8,7,1,0x416779,x-37+c*15,11,-666);
  }
  // Airport perimeter / runway approach lights.
  for(const end of [-1,1])for(let n=0;n<15;n++){
    const z=end*(1250+n*42);
    const light=airportBox(1.2,1.6,1.2,n%3===0?0xf4443d:0xf6e6db,0,1,z,runway);
    light.position.set(0,1,z);
  }
}
makeAirportGroundDetails();
const sourceOverlay=new THREE.Group();scene.add(sourceOverlay);
async function loadAirportOSM(){
  const info=document.getElementById('airport-data-status');
  if(info)info.textContent='Lade reale Flughafen-Geometrien aus OpenStreetMap …';
  const query='[out:json][timeout:18];(way(around:2100,37.4668,15.0664)["aeroway"];'+
    'way(around:1950,37.4668,15.0664)["building"];);out geom;';
  let result;
  try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),13500);
    let response;try{
      response=await fetch('https://overpass.kumi.systems/api/interpreter?data='+
        encodeURIComponent(query),{signal:controller.signal});
    }finally{clearTimeout(timer);}
    if(!response.ok)throw Error('OSM HTTP '+response.status);
    result=await response.json();
  }catch(e){
    if(info)info.textContent='⚠️ OSM nicht erreichbar. Das sichtbare Flughafenmodell ist eine schematische Rekonstruktion, keine exakte Anlage.';
    return;
  }
  let apron=0,taxi=0,term=0,runways=0;
  for(const element of (result.elements||[])){
    if(!element.geometry?.length)continue;
    const t=element.tags||{},points=element.geometry.map(p=>loc(p.lon,p.lat));
    if(points.some(p=>Math.hypot(p.x,p.z)>6000))continue;
    if(t.aeroway==='apron'&&points.length>3){
      flatPolygon(points,.67,fillMaterial(0x707b83),sourceOverlay);apron++;
    }else if(t.aeroway==='taxiway'&&points.length>1){
      flatLine(points,Number(t.width)||20,.73,fillMaterial(0x4a5157),sourceOverlay);taxi++;
    }else if(t.aeroway==='runway'&&points.length>1){
      const width=Number(t.width)||45;
      if(points.length>=4&&Math.hypot(points[0].x-points.at(-1).x,points[0].z-points.at(-1).z)<10)
        flatPolygon(points,.86,fillMaterial(0x333f46),sourceOverlay);
      else if(points.length>=2)flatLine(points,width,.82,fillMaterial(0x333f46),sourceOverlay);
      runways++;
    }else if(t.building&&points.length>3&&term<85){
      const cx=points.reduce((a,p)=>a+p.x,0)/points.length;
      const cz=points.reduce((a,p)=>a+p.z,0)/points.length;
      const h=Math.min(45,Math.max(5,Number(t.height)||((+t['building:levels']||3)*3.5)));
      const shape=new THREE.Shape();
      points.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));
      shape.closePath();
      const geometry=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false,steps:1});
      geometry.rotateX(-Math.PI/2);
      const mesh=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({
        color:t.aeroway==='terminal'?0x9eb9bf:0xb7bec1,roughness:.88}));
      mesh.position.y=.2;sourceOverlay.add(mesh);term++;
    }
  }
  if(info)info.textContent=apron+taxi+term+runways ?
    '✓ OpenStreetMap-Overlay: '+runways+' Landebahn-Einträge, '+taxi+
    ' Rollwege, '+apron+' Vorfelder, '+term+' Gebäude. Detailgeometrie und Beleuchtung teilweise modelliert.':
    'Keine zusätzlichen OSM-Objekte geliefert. Es bleibt bei der ausdrücklich schematischen 3D-Modellierung.';
}
loadAirportOSM();

const planeItems=[],raycaster=new THREE.Raycaster();
const mat=(c)=>new THREE.MeshStandardMaterial({color:c,metalness:.15,roughness:.42,side:THREE.DoubleSide});
const mats={body:mat(0xedf3f6),wing:mat(0xc7d6dd),tail:mat(0x2b78a1),glass:mat(0x203e53),engine:mat(0x5c7b88)};
function planeModel(){
  const group=new THREE.Group();
  const fuselage=new THREE.Mesh(new THREE.CylinderGeometry(1.65,1.75,32,12),mats.body);
  fuselage.rotation.x=Math.PI/2;group.add(fuselage);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(1.63,5,12),mats.body);
  nose.rotation.x=-Math.PI/2;nose.position.z=-18.5;group.add(nose);
  const cockpit=new THREE.Mesh(new THREE.BoxGeometry(2.2,.36,2.5),mats.glass);
  cockpit.position.set(0,1.48,-12);group.add(cockpit);
  const wings=new THREE.Mesh(new THREE.BoxGeometry(31,.36,4.2),mats.wing);
  wings.position.z=1;group.add(wings);
  const stabilizer=new THREE.Mesh(new THREE.BoxGeometry(11,.28,2.4),mats.wing);
  stabilizer.position.z=12.5;group.add(stabilizer);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.55,5.5,4.2),mats.tail);
  fin.position.set(0,2.7,12.2);group.add(fin);
  for(const x of [-7,7]){
    const engine=new THREE.Mesh(new THREE.CylinderGeometry(.75,.75,4,9),mats.engine);
    engine.rotation.x=Math.PI/2;engine.position.set(x,-1.3,1.5);group.add(engine);
    const wingtip=new THREE.Mesh(new THREE.SphereGeometry(.55,8,6),
      new THREE.MeshBasicMaterial({color:x<0?0xe9444b:0x55be7c}));
    wingtip.position.set(x<0?-15.8:15.8,.2,1);group.add(wingtip);
  }
  const trailLine=new THREE.Group();group.add(trailLine);
  group.userData.clickable=true;
  return group;
}
function clearPlanes(){
  for(const p of planeItems){scene.remove(p.group);p.group.traverse(obj=>{
    if(obj.geometry && !obj.geometry.userData?.shared)obj.geometry.dispose();
  });}
  planeItems.length=0;
}
let mode='demo',paused=false,theta=.9,phi=.75,distance=4200,following=false,demoRate=1;
let lookAt=new THREE.Vector3(0,180,0),dragged=false,px=0,py=0,prev=performance.now(),time=0;
function updateCamera(){
  const elevation=Math.cos(phi)*distance;
  const horizontal=Math.sin(phi)*distance;
  camera.position.set(lookAt.x+Math.sin(theta)*horizontal,lookAt.y+elevation,
    lookAt.z+Math.cos(theta)*horizontal);
  camera.lookAt(lookAt);
}
function putPlane(plane){
  scene.add(plane.group);planeItems.push(plane);
}
function demoPlanes(){
  clearPlanes();mode='demo';$('demo').classList.add('active');$('live').classList.remove('active');
  $('status').textContent='🎮 MODELLSIMULATION – alle Flugbahnen und Positionen sind erfunden. 3D-Flugzeuge sind für bessere Sichtbarkeit vergrössert.';
  for(let i=0;i<4;i++){
    const group=planeModel();group.scale.setScalar(i===3?3.1:2.7);
    putPlane({group,id:'SIM-'+String(i+1).padStart(2,'0'),demo:true,idx:i,
      speed:70+i*21,alt:160+(i*180),angle:(i%2)*Math.PI,
      note:'Illustrierte Flugbewegung, nicht real'});
  }
  renderList();
}
function renderList(){
  const list=$('aircraft-list');list.textContent='';
  for(const a of planeItems.slice(0,24)){
    const b=document.createElement('button');b.className='flight';
    const name=document.createElement('strong');name.textContent='✈ '+a.id;
    const info=document.createElement('small');
    info.textContent=a.demo?
      (a.idx===0?'Simulierter Landeanflug · 3D-Animation':'3D-Simulation · '+Math.round(a.alt)+' m Beispielhöhe'):
      'ADS-B-Meldung · '+(a.age??'–')+' s alt · '+(a.altKnown?Math.round(a.alt)+' m':'Höhe unbekannt')+
      (a.predicted?' · mögliche Annäherung':'');
    b.append(name,info);b.onclick=()=>selectPlane(a);list.appendChild(b);
  }
}
let chosen=null;
function selectPlane(a){
  chosen=a;following=true;
  $('card-title').textContent='✈ '+a.id;
  $('card-text').textContent=a.demo?
    'Dies ist ein modelliertes Beispiel. Flugroute und Höhe sind nicht real.':
    'Empfangene ADS-B-Positionsmeldung vor '+(a.age??'–')+
    ' Sekunden. 3D-Modell zur Sichtbarkeit vergrössert. '+(a.predicted||'Keine belastbare Landeschätzung für dieses Flugzeug.');
  $('card').classList.add('open');
  const target=a.group.position;
  lookAt.copy(target);
  distance=a.demo?900:2000;
  updateCamera();
}
$('close').onclick=()=>{$('card').classList.remove('open');chosen=null;};
$('demo').onclick=demoPlanes;
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶ Weiter':'⏸ Pause';};
const AIRPORT_LIVE={key:'',refreshed:0,busy:false};
function bearingToAirport(lon,lat){
  const phi1=lat*Math.PI/180,phi2=LAT*Math.PI/180,dLon=(LNG-lon)*Math.PI/180;
  const bearing=Math.atan2(Math.sin(dLon)*Math.cos(phi2),
    Math.cos(phi1)*Math.sin(phi2)-Math.sin(phi1)*Math.cos(phi2)*Math.cos(dLon));
  return (bearing*180/Math.PI+360)%360;
}
function proximityEstimate(lon,lat,heading,speedKnots,alt,verticalRate){
  const dx=(lon-LNG)*MX,dz=(lat-LAT)*MZ,distKm=Math.hypot(dx,dz)/1000;
  const target=bearingToAirport(lon,lat);
  const difference=Math.abs(((heading-target+540)%360)-180);
  if(!(distKm>1&&distKm<18&&difference<25&&
       speedKnots>65&&speedKnots<270&&alt!==null&&alt<1500&&
       Number.isFinite(verticalRate)&&verticalRate<0))return null;
  const minutes=distKm/(speedKnots*1.852)*60;
  return 'Annäherung möglich · rechnerisch ca. '+Math.max(1,Math.round(minutes))+
    ' Min. bis Flughafennähe. Kein bestätigter Anflug oder Landetermin.';
}
async function loadLive(){
  const key=String($('fly-key')?.value||'').trim();
  if(!key){
    $('status').textContent='🔑 Für tatsächliche Flugzeugpositionen bitte einen eigenen FlyItalyADSB-Schlüssel eingeben. Bis dahin bleibt die ausdrücklich simulierte 3D-Ansicht nutzbar.';
    return;
  }
  if(AIRPORT_LIVE.busy)return;
  AIRPORT_LIVE.busy=true;
  AIRPORT_LIVE.key=key;
  $('status').textContent='📡 Lade empfangene ADS-B-Positionen rund um Catania …';
  if($('api-indicator'))$('api-indicator').textContent='🟡 Verbindung wird geprüft …';
  try{
    const endpoint='https://api.flyitalyadsb.com/v2/lat/37.4668/lon/15.0664/dist/55';
    const response=await fetch(endpoint,{headers:{'X-Api-Key':key,'Accept':'application/json'},cache:'no-store'});
    if(!response.ok)throw Error('API HTTP '+response.status);
    const data=await response.json();
    const aircraft=(data.ac||[]).filter(a=>
      Number.isFinite(a.lat)&&Number.isFinite(a.lon)&&!a.ground);
    clearPlanes();
    for(const a of aircraft.slice(0,30)){
      const local=loc(a.lon,a.lat);
      const rawAlt=a.alt_baro??a.alt_geom;
      const altFeet=(rawAlt==null||rawAlt==='ground')?NaN:Number(rawAlt);
      const knownAltitude=Number.isFinite(altFeet);
      const alt=knownAltitude?Math.max(8,altFeet*.3048):null;
      const heading=Number.isFinite(a.track)?a.track:
        Number.isFinite(a.true_heading)?a.true_heading:0;
      const group=planeModel();
      group.position.set(local.x,alt??400,local.z);
      group.rotation.y=heading*Math.PI/180;
      group.scale.setScalar(2.7); // visibility scale, not physical aircraft size
      const speedKnots=Number.isFinite(a.gs)?a.gs:0;
      const baroRate=Number.isFinite(a.baro_rate)?a.baro_rate:
        Number.isFinite(a.geom_rate)?a.geom_rate:NaN;
      const predicted=proximityEstimate(a.lon,a.lat,heading,speedKnots,alt,baroRate);
      putPlane({group,id:String(a.flight||a.r||a.hex||'Unbekannt').trim(),
        alt,altKnown:knownAltitude,lat:a.lat,lon:a.lon,
        demo:false,age:Number.isFinite(a.seen)?Math.round(a.seen):null,
        speed:speedKnots*1.852,heading:heading*Math.PI/180,
        speedMS:speedKnots*.514444,verticalMPS:Number.isFinite(baroRate)?baroRate*.00508:0,
        trackAge:Math.max(0,Number.isFinite(a.seen)?a.seen:0),
        seenAt:performance.now(),predicted,
        note:'Gemeldete Position; 3D-Modell zur Sichtbarkeit vergrössert'});
    }
    mode='live';chosen=null;following=false;renderList();AIRPORT_LIVE.refreshed=Date.now();
    if($('api-indicator'))$('api-indicator').textContent=
      '🟢 API verbunden · '+aircraft.length+' aktuelle Flugzeugmeldungen';
    const stamp=new Date().toLocaleTimeString('de-CH',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
    $('status').textContent='🟢 '+planeItems.length+' gemeldete Flugzeuge · empfangen '+stamp+
      '. Positionen können verzögert sein. Bewegung zwischen Messungen wird höchstens 20 Sekunden geschätzt; keine garantierte Landung.';
  }catch(error){
    // Never show simulated aircraft under the live label.
    clearPlanes();mode='live';chosen=null;following=false;renderList();
    if($('api-indicator'))$('api-indicator').textContent=
      '🔴 Keine Verbindung: '+String(error.message||'Anfrage fehlgeschlagen');
    $('status').textContent='⚠️ Keine Live-Positionsdaten verfügbar ('+
      String(error.message||'Dienstfehler')+
      '). Prüfe deinen Schlüssel bzw. API-Limits oder öffne das externe Radar. Keine erfundenen Live-Positionen.';
    console.warn('FlyItalyADSB failed:',error);
  }finally{AIRPORT_LIVE.busy=false;}
}
$('live').onclick=loadLive;
setInterval(()=>{
  if(mode==='live'&&!document.hidden&&AIRPORT_LIVE.key&&
     Date.now()-AIRPORT_LIVE.refreshed>40000)loadLive();
},45000);

// Desktop presets: show the entire field or follow the long-range landing path.
const airportPanel=document.querySelector('.panel');
$('flight-panel-toggle').onclick=()=>{
  airportPanel.hidden=!airportPanel.hidden;
  $('flight-panel-toggle').textContent=airportPanel.hidden?'☰ Menü öffnen':'✕ Menü';
};
$('flight-overview').onclick=()=>{
  following=false;chosen=null;
  lookAt.set(0,80,0);
  distance=4800;theta=0.85;phi=.58;updateCamera();
};
$('flight-approach').onclick=()=>{
  const inbound=planeItems.find(a=>a.demo&&a.idx===0) || planeItems[0];
  if(inbound){
    selectPlane(inbound);
    distance=2350;theta=2.05;phi=.82;
    lookAt.copy(inbound.group.position);updateCamera();
  }else{
    following=false;lookAt.set(-3500,250,600);
    distance=3900;theta=1.25;phi=.71;updateCamera();
  }
};
$('flight-follow').onclick=()=>{
  if(!planeItems.length){$('status').textContent='Noch keine Flugzeuge verfügbar. Aktiviere die Simulation oder Live-Daten.';return;}
  if(!chosen)chosen=planeItems[0];
  following=!following;
  if(following){lookAt.copy(chosen.group.position);distance=1400;}
  $('flight-follow').textContent=following?'🎥 Verfolgung stoppen':'🎥 Flugzeug folgen';
  updateCamera();
};
$('api-connect').onclick=()=>{
  const key=$('fly-key').value.trim();
  if(!key){$('api-indicator').textContent='🟠 Bitte zuerst einen API-Schlüssel eingeben.';return;}
  loadLive();
};
$('fly-key').addEventListener('keydown',e=>{
  if(e.key==='Enter'){$('api-connect').click();}
});
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{dragged=false;px=e.clientX;py=e.clientY;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  if(!canvas.hasPointerCapture(e.pointerId))return;
  const dx=e.clientX-px,dy=e.clientY-py;px=e.clientX;py=e.clientY;
  if(Math.abs(dx)+Math.abs(dy)>1)dragged=true;
  theta-=dx*.005;phi=Math.max(.12,Math.min(1.48,phi-dy*.004));
  updateCamera();
});
canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(300,Math.min(35000,distance*Math.exp(e.deltaY*.001)));updateCamera();},{passive:false});
let lastTouchDist=0;
canvas.addEventListener('touchmove',e=>{
  if(e.touches.length===2){
    const a=e.touches[0],b=e.touches[1],d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    if(lastTouchDist){distance=Math.max(300,Math.min(35000,distance*lastTouchDist/d));updateCamera();}
    lastTouchDist=d;
  }
},{passive:true});
canvas.addEventListener('touchend',()=>lastTouchDist=0);
canvas.addEventListener('pointerup',e=>{
  if(dragged)return;
  const p=new THREE.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1));
  const ray=new THREE.Raycaster();ray.setFromCamera(p,camera);
  for(const aircraft of planeItems)if(ray.intersectObjects(aircraft.group.children,true).length){selectPlane(aircraft);break;}
});
window.addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});
function render(now){
  requestAnimationFrame(render);
  const dt=Math.min(.04,(now-prev)/1000);prev=now;
  if(!paused)time+=dt*(mode==='demo'?demoRate:1);
  if(mode==='demo'&&!paused){
    for(const p of planeItems){
      const i=p.idx,speed=p.speed,t=time*speed;
      // Deliberately simulated approach/holding patterns, NOT actual flights.
      if(i===0){
        // Fictional approach in the direction of CTA RWY 08.
        // The 3D model descends, touches down, and rolls out.
        const phase=time%60;
        let x;
        if(phase<30)x=-6000+(4820/30)*phase;
        else if(phase<48){
          const u=phase-30;
          x=-1180+145*u-2.3*u*u; // touchdown and decelerating rollout
        }else x=-1180+145*18-2.3*18*18;
        const z=-0.176*x;
        const y=x< -1180?Math.max(4,(-x-1180)*.12+4):4;
        p.group.position.set(x,y,z);
        p.group.rotation.y=Math.PI*(100/180);
      }else{
        const x=((t+i*650)%5000)-2500;
        const z=Math.sin((x+i*120)/1600)*330+(i-1.5)*360;
        const y=p.alt+Math.sin(time*.15+i)*65;
        p.group.position.set(x,y,z);
        p.group.rotation.y=(i%2===0)?-Math.PI/2:Math.PI/2;
      }
    }
  }
  if(mode==='live' && !paused){
    for(const p of planeItems){
      const seconds=Math.min(20,Math.max(0,(now-p.seenAt)/1000));
      const speed=p.speedMS||0;
      const east=Math.sin(p.heading)*speed*seconds;
      const north=Math.cos(p.heading)*speed*seconds;
      const anchor=loc(p.lon,p.lat);
      p.group.position.x=anchor.x+east;
      p.group.position.z=anchor.z-north;
      if(p.altKnown)p.group.position.y=Math.max(5,p.alt+p.verticalMPS*seconds);
    }
  }
  if(following && chosen)lookAt.lerp(chosen.group.position,.08);
  updateCamera();
  renderer.render(scene,camera);
}
// Make demo landing observable without having to watch a full loop.
$('flight-approach').addEventListener('dblclick',()=>{
  if(mode==='demo'){time=20;demoRate=1;}
});
demoPlanes();updateCamera();requestAnimationFrame(render);
console.info('SICILIA 3D airport v9 - official runway dimension, 3D overlays and API status');
