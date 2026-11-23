import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/* SICILIA 3D Airport Explorer: 3D airplane models.
 * DEMO is visually simulated and never labelled live.
 * Live ADS-B works only when the provider permits cross-origin requests.
 */
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
sea.rotation.x=-Math.PI/2;sea.position.set(0,-.5,20000);scene.add(sea);
const runway=new THREE.Group();scene.add(runway);
const asphalt=new THREE.MeshStandardMaterial({color:0x3a474e,roughness:.96});
const markings=new THREE.MeshBasicMaterial({color:0xebf1e9});
const tarmac=new THREE.Mesh(new THREE.BoxGeometry(62,1.1,2400),asphalt);
tarmac.position.y=.1;runway.add(tarmac);runway.rotation.y=-Math.PI/2+0.16;
for(let i=-1080;i<1100;i+=95){
  const mark=new THREE.Mesh(new THREE.BoxGeometry(1.6,.05,40),markings);
  mark.position.set(0,.71,i);runway.add(mark);
}
for(let side of [-1,1]){
  const edge=new THREE.Mesh(new THREE.BoxGeometry(1,.05,2330),markings);
  edge.position.set(side*29.5,.71,0);runway.add(edge);
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
    if(obj.geometry)obj.geometry.dispose();
  });}
  planeItems.length=0;
}
let mode='demo',paused=false,theta=.9,phi=.75,distance=3900;
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
  $('status').textContent='🎮 MODELLSIMULATION – alle Flugbahnen und Positionen sind erfunden. Flugzeuge sind räumliche 3D-Modelle.';
  for(let i=0;i<4;i++){
    const group=planeModel();group.scale.setScalar(i===3?1.4:1.0);
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
    info.textContent=a.demo?'3D-Simulation · '+Math.round(a.alt)+' m Beispielhöhe':
      'ADS-B Position · '+(a.age??'–')+' s alt · '+Math.round(a.alt)+' m';
    b.append(name,info);b.onclick=()=>selectPlane(a);list.appendChild(b);
  }
}
let chosen=null;
function selectPlane(a){
  chosen=a;
  $('card-title').textContent='✈ '+a.id;
  $('card-text').textContent=a.demo?
    'Dies ist ein modelliertes Beispiel. Flugroute und Höhe sind nicht real.':
    'Bestätigte empfangene ADS-B-Positionsmeldung. Zuletzt gemeldet vor '+(a.age??'–')+' Sekunden. Lage und Höhe können ungenau sein.';
  $('card').classList.add('open');
  const target=a.group.position;
  lookAt.copy(target);
  distance=a.demo?900:2000;
  updateCamera();
}
$('close').onclick=()=>{$('card').classList.remove('open');chosen=null;};
$('demo').onclick=demoPlanes;
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶ Weiter':'⏸ Pause';};
async function loadLive(){
  $('live').classList.add('active');$('demo').classList.remove('active');
  $('status').textContent='📡 Prüfe öffentliche ADS-B-Positionsdaten …';
  try{
    const response=await fetch('https://opendata.adsb.fi/api/v3/lat/37.4668/lon/15.0664/dist/55',{cache:'no-store'});
    if(!response.ok)throw Error('HTTP '+response.status);
    const data=await response.json();
    const aircraft=(data.ac||[]).filter(a=>Number.isFinite(a.lat)&&Number.isFinite(a.lon)&&!a.ground);
    clearPlanes();
    for(const a of aircraft.slice(0,30)){
      const local=loc(a.lon,a.lat);
      const altFeet=Number(a.alt_baro??a.alt_geom);
      const alt=Number.isFinite(altFeet)?Math.max(20,altFeet*.3048):400;
      const heading=Number.isFinite(a.track)?a.track:0;
      const group=planeModel();group.position.set(local.x,alt,local.z);
      // Model forward is -Z, heading is measured clockwise from North.
      group.rotation.y=heading*Math.PI/180;
      group.scale.setScalar(2); // visual enhancement: airplanes are enlarged for visibility
      putPlane({group,id:String(a.flight||a.r||a.hex||'Unbekannt').trim(),alt,demo:false,
        age:Number.isFinite(a.seen)?Math.round(a.seen):null,
        speed:Number.isFinite(a.gs)?a.gs*1.852:0,heading:heading*Math.PI/180,
        note:'Flugzeugmodell ist zur Sichtbarkeit vergrössert'});
    }
    mode='live';chosen=null;renderList();
    $('status').textContent='🟢 '+planeItems.length+' empfangene ADS-B-Positionen · Zeitstempel/Verzögerung möglich. Flugzeugmodelle sind zur Sichtbarkeit vergrössert.';
  }catch(error){
    // Keep no purported live aircraft on screen.
    clearPlanes();mode='live';chosen=null;renderList();
    $('status').textContent='⚠️ Live-Flugdaten nicht erreichbar (wahrscheinlich Browser-CORS/Rate-Limit). Es werden keine erfundenen Live-Flugzeuge angezeigt. Wähle 3D-Demo oder das externe Flugradar.';
    console.warn('ADS-B blocked/unavailable:',error);
  }
}
$('live').onclick=loadLive;
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
  if(!paused)time+=dt;
  if(mode==='demo'&&!paused){
    for(const p of planeItems){
      const i=p.idx,speed=p.speed,t=time*speed;
      // Deliberately simulated approach/holding patterns, NOT actual flights.
      const x=((t+i*1400)%9500)-4750;
      const z=Math.sin((x+i*120)/1900)*600+(i-1.5)*480;
      const y=p.alt+Math.sin(time*.15+i)*65;
      p.group.position.set(x,y,z);
      p.group.rotation.y=(i%2===0)?-Math.PI/2:Math.PI/2;
    }
  }
  if(chosen&&mode==='demo')lookAt.lerp(chosen.group.position,.08);
  updateCamera();
  renderer.render(scene,camera);
}
demoPlanes();updateCamera();requestAnimationFrame(render);
