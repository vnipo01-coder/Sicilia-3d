// Use a second CDN when the first 3D library server is blocked.
let THREE;
try{
  THREE=await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js');
}catch(primaryError){
  console.warn('Three.js primary CDN failed',primaryError);
  try{
    THREE=await import('https://unpkg.com/three@0.180.0/build/three.module.js');
  }catch(secondaryError){
    document.getElementById('load-message').textContent=
      '3D-Engine nicht erreichbar. Verwende die bisherige 3D-Version oder lade neu.';
    document.getElementById('load-retry').hidden=false;
    document.getElementById('legacy-walk').hidden=false;
    throw secondaryError;
  }
}
import {readLocation,GeoFrame,TerrainDEM,getLocalOSM,polygonArea,pointInPolygon,tileXY,
  getRoadWidth,getBuildingHeight,propertyRows,validateGeo} from './geo.js?v=102';

/* Walk v10.1: OSM building geometry + single shared DEM. No fictional replacement city. */
validateGeo();
const $=id=>document.getElementById(id),loc=readLocation(),frame=new GeoFrame(loc.lat,loc.lon);
const dem=new TerrainDEM(frame,14),scene=new THREE.Scene();
scene.background=new THREE.Color('#92b5bd');scene.fog=new THREE.FogExp2('#acc3bf',.0012);
document.title=loc.name+' | SICILIA 3D v10 Walk';
$('place-name').textContent=loc.name+' · v10.1';
const host=$('world'),renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.2;host.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#f0f5ff','#818d80',2.1));
const sun=new THREE.DirectionalLight('#fff2dd',1.95);sun.position.set(-190,390,-210);scene.add(sun);
const world=new THREE.Group();scene.add(world);
const camera=new THREE.PerspectiveCamera(73,innerWidth/innerHeight,.06,3200);
const buildings=[],roads=[],churches=[],targets=[],palette=['#dbc7b0','#c9b6a7','#d0bdac','#e5d2b7','#bbaca0'];
const mats=new Map();
function material(color){if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.94,side:THREE.DoubleSide}));return mats.get(color);}
const state={x:0,z:0,yaw:.42,pitch:0,third:false,speed:7,keys:new Set(),
  ready:false,drag:false,pointer:null,last:0,stamp:0,weatherCover:null};
const height=(x,z)=>dem.height(x,z)??0;
const toast=msg=>$('toast').textContent=msg;
function makeTerrain(){
  const size=820,seg=148,mesh=new THREE.PlaneGeometry(size,size,seg,seg);
  mesh.rotateX(-Math.PI/2);
  const p=mesh.getAttribute('position'),colors=[],c=new THREE.Color();
  for(let i=0;i<p.count;i++){
    const x=p.getX(i),z=p.getZ(i),h=height(x,z);p.setY(i,h-.38);
    const altitude=dem.center===null?null:dem.center+h;
    c.set(altitude===null?'#a4af92':altitude>2000?'#d6d3ca':
      altitude>1100?'#acaa8b':altitude>600?'#849b75':
      altitude>200?'#9caf86':'#91ac8b');
    colors.push(c.r,c.g,c.b);
  }
  mesh.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  mesh.computeVertexNormals();
  world.add(new THREE.Mesh(mesh,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide})));
}
function addRoad(points,tags){
  if(points.length<2)return;
  const samples=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],len=Math.hypot(b.x-a.x,b.z-a.z),n=Math.min(50,Math.max(1,Math.ceil(len/3)));
    if(!i)samples.push(a);
    for(let k=1;k<=n;k++)samples.push({x:a.x+(b.x-a.x)*k/n,z:a.z+(b.z-a.z)*k/n});
  }
  const width=getRoadWidth(tags),v=[];
  for(let i=0;i<samples.length-1;i++){
    const a=samples[i],b=samples[i+1],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(len<.1)continue;
    const nx=-dz/len*width/2,nz=dx/len*width/2;
    const corners=[
      {x:a.x+nx,z:a.z+nz},{x:a.x-nx,z:a.z-nz},
      {x:b.x+nx,z:b.z+nz},{x:b.x-nx,z:b.z-nz}].map(t=>[t.x,height(t.x,t.z)+.085,t.z]);
    v.push(...corners[0],...corners[1],...corners[2],...corners[1],...corners[3],...corners[2]);
  }
  if(!v.length)return;
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(v,3));g.computeVertexNormals();
  const path=['footway','path','steps','pedestrian'].includes(tags.highway);
  world.add(new THREE.Mesh(g,material(path?'#c1b7a2':'#939a95')));
  roads.push({points:samples,tags});
}
function addLabel(text,x,y,z){
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=90;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#123747ea';ctx.fillRect(0,2,512,86);
  ctx.fillStyle='#f3faf6';ctx.font='bold 28px sans-serif';ctx.fillText(text.slice(0,30),15,55);
  const texture=new THREE.CanvasTexture(canvas);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));
  sprite.position.set(x,y,z);sprite.scale.set(40,7,1);world.add(sprite);
}
function addBuilding(poly,tags,id,index){
  if(poly.length<3||poly.length>85||polygonArea(poly)<8)return;
  const cx=poly.reduce((a,p)=>a+p.x,0)/poly.length;
  const cz=poly.reduce((a,p)=>a+p.z,0)/poly.length;
  if(Math.hypot(cx,cz)>390)return;
  const heights=poly.map(p=>height(p.x,p.z)),modelHeight=getBuildingHeight(tags);
  const roofY=Math.max(...heights)+modelHeight.metres,vertices=[];
  for(let i=0;i<poly.length;i++){
    const j=(i+1)%poly.length,a=poly[i],b=poly[j];
    // Subdivide long walls: every wall segment uses the same DEM as the ground.
    // This reduces floating wall edges on a steep hillside.
    const dist=Math.hypot(b.x-a.x,b.z-a.z);
    const segments=Math.min(35,Math.max(1,Math.ceil(dist/3)));
    for(let k=0;k<segments;k++){
      const t=k/segments,u=(k+1)/segments;
      const p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};
      const q={x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u};
      const hp=height(p.x,p.z)-.05,hq=height(q.x,q.z)-.05;
      vertices.push(p.x,hp,p.z,q.x,hq,q.z,q.x,roofY,q.z,
        p.x,hp,p.z,q.x,roofY,q.z,p.x,roofY,p.z);
    }
  }
  const geom=new THREE.BufferGeometry();
  geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geom.computeVertexNormals();
  const church=tags.building==='church'||tags.building==='cathedral'||tags.amenity==='place_of_worship';
  const obj={tags,id,poly,cx,cz,roofY,modelHeight,church};
  const wall=new THREE.Mesh(geom,material(church?'#d9cfb4':palette[index%palette.length]));
  wall.userData.object=obj;world.add(wall);targets.push(wall);
  const shape=new THREE.Shape();
  poly.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const roofGeo=new THREE.ShapeGeometry(shape);roofGeo.rotateX(-Math.PI/2);
  const roof=new THREE.Mesh(roofGeo,material('#b47b5e'));roof.position.y=roofY+.07;
  roof.userData.object=obj;world.add(roof);targets.push(roof);
  // Schematic near-field windows, NOT documented facades.
  if(Math.hypot(cx,cz)<110){
    const pane=material('#56747e');
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,dist=Math.hypot(dx,dz);
      if(dist<4.5||dist>90)continue;
      const count=Math.min(5,Math.floor(dist/4.5)),nx=dz/dist,nz=-dx/dist;
      const midx=(a.x+b.x)/2,midz=(a.z+b.z)/2;
      const sign=(midx-cx)*nx+(midz-cz)*nz>=0?1:-1;
      const floor=Math.min(4,Math.max(1,Math.floor((roofY-Math.max(heights[i],heights[(i+1)%poly.length]))/3)));
      for(let f=0;f<floor;f++)for(let k=0;k<count;k++){
        const t=(k+1)/(count+1),x=a.x+dx*t,z=a.z+dz*t,y=Math.max(heights[i],heights[(i+1)%poly.length])+1.6+f*3.1;
        if(y+.8>=roofY-.4)continue;
        const w=new THREE.Mesh(new THREE.PlaneGeometry(.76,1.08),pane);
        w.rotation.y=Math.atan2(nx*sign,nz*sign);w.position.set(x+nx*.10*sign,y,z+nz*.10*sign);world.add(w);
      }
    }
  }
  buildings.push(obj);
  if(church){churches.push(obj);addLabel('⛪ '+(tags.name||'Kirche (OSM)'),cx,roofY+10,cz);}
}
function collision(x,z){
  for(const b of buildings){
    if(Math.abs(x-b.cx)>90||Math.abs(z-b.cz)>90)continue;
    if(pointInPolygon(x,z,b.poly)||pointInPolygon(x+.5,z,b.poly)||
      pointInPolygon(x-.5,z,b.poly)||pointInPolygon(x,z+.5,b.poly)||
      pointInPolygon(x,z-.5,b.poly))return true;
  }
  return false;
}
function spawn(){
  const points=[{x:0,z:0}];
  for(const road of roads){
    for(const p of road.points)if(Math.hypot(p.x,p.z)<75)points.push(p);
  }
  points.sort((a,b)=>Math.hypot(a.x,a.z)-Math.hypot(b.x,b.z));
  for(const p of points)if(!collision(p.x,p.z))return p;
  for(let r=5;r<90;r+=7)for(let a=0;a<2*Math.PI;a+=Math.PI/9){
    const p={x:r*Math.sin(a),z:r*Math.cos(a)};if(!collision(p.x,p.z))return p;
  }
  return{x:0,z:0};
}
function avatarModel(){
  const g=new THREE.Group();
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.32,.95,4,9),material('#17657a'));
  torso.position.y=1.1;g.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.25,12,8),material('#e6bea0'));
  head.position.y=2.05;g.add(head);
  for(const dir of [-1,1]){
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.6,3,7),material('#254452'));
    leg.position.set(dir*.18,.41,0);g.add(leg);
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.5,3,7),material('#17657a'));
    arm.position.set(dir*.48,1.15,0);g.add(arm);
  }
  scene.add(g);return g;
}
const avatar=avatarModel();
function cameraMove(){
  const h=height(state.x,state.z),eye=h+1.72;
  avatar.position.set(state.x,h,state.z);avatar.rotation.y=state.yaw;avatar.visible=state.third;
  if(state.third){
    const back=5.8,x=state.x-Math.sin(state.yaw)*back,z=state.z+Math.cos(state.yaw)*back;
    camera.position.set(x,Math.max(height(x,z)+1,eye+2+Math.sin(state.pitch)*4),z);
    camera.lookAt(state.x,eye+.2,state.z);
  }else{
    camera.position.set(state.x,eye,state.z);
    camera.lookAt(state.x+Math.sin(state.yaw)*Math.cos(state.pitch),
      eye+Math.sin(state.pitch),state.z-Math.cos(state.yaw)*Math.cos(state.pitch));
  }
}
function move(dt){
  const f=Number(state.keys.has('forward'))-Number(state.keys.has('back'));
  const side=Number(state.keys.has('right'))-Number(state.keys.has('left'));
  if(!f&&!side)return;
  const speed=state.speed*(state.keys.has('sprint')?1.8:1),n=Math.hypot(f,side);
  const dx=(Math.sin(state.yaw)*f+Math.cos(state.yaw)*side)*speed*dt/n;
  const dz=(-Math.cos(state.yaw)*f+Math.sin(state.yaw)*side)*speed*dt/n;
  const nextX=state.x+dx,nextZ=state.z+dz;
  if(Math.hypot(nextX,nextZ)>345)return;
  if(height(nextX,nextZ)-height(state.x,state.z)>2.0&&Math.hypot(dx,dz)<1.2)return;
  if(!collision(nextX,nextZ)){state.x=nextX;state.z=nextZ;}
  else{
    if(!collision(nextX,state.z))state.x=nextX;
    if(!collision(state.x,nextZ))state.z=nextZ;
  }
}
function updateLocation(){
  const p=frame.geo(state.x,state.z),absolute=dem.absolute(p.lat,p.lon);
  $('altitude').textContent=absolute===null?'⛰️ Höhe nicht verfügbar':'⛰️ '+Math.round(absolute)+' m ü. M.';
  $('location').textContent='📍 '+p.lat.toFixed(5)+' / '+p.lon.toFixed(5);
}
function tick(now){
  requestAnimationFrame(tick);
  const dt=Math.min(.045,(now-(state.last||now))/1000);state.last=now;
  if(state.ready)move(dt);
  cameraMove();renderer.render(scene,camera);
  if(now-state.stamp>900){state.stamp=now;updateLocation();}
}
const keymap={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',
  a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right',Shift:'sprint'};
document.addEventListener('keydown',e=>{
  if(e.target instanceof Element&&e.target.closest('input,textarea'))return;
  const key=keymap[e.key];if(key){e.preventDefault();state.keys.add(key);}
});
document.addEventListener('keyup',e=>{const key=keymap[e.key];if(key)state.keys.delete(key);});
window.addEventListener('blur',()=>state.keys.clear());
for(const button of document.querySelectorAll('[data-key]')){
  const key=button.dataset.key;
  button.addEventListener('pointerdown',e=>{
    e.preventDefault();state.keys.add(key);
    try{button.setPointerCapture(e.pointerId);}catch(_){}
  });
  for(const name of ['pointerup','pointercancel','lostpointercapture'])
    button.addEventListener(name,()=>state.keys.delete(key));
}
const canvas=renderer.domElement;
canvas.addEventListener('pointerdown',e=>{
  state.drag=false;state.pointer={x:e.clientX,y:e.clientY};
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
});
canvas.addEventListener('pointermove',e=>{
  if(document.pointerLockElement===canvas||!canvas.hasPointerCapture(e.pointerId))return;
  const dx=e.clientX-state.pointer.x,dy=e.clientY-state.pointer.y;
  state.pointer={x:e.clientX,y:e.clientY};
  if(Math.abs(dx)+Math.abs(dy)>2)state.drag=true;
  state.yaw+=dx*.004;state.pitch=Math.max(-.84,Math.min(.9,state.pitch-dy*.0035));
});
canvas.addEventListener('pointerup',e=>{
  if(!state.drag)inspect(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1));
});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==canvas)return;
  state.yaw+=e.movementX*.0028;
  state.pitch=Math.max(-.84,Math.min(.9,state.pitch-e.movementY*.0028));
});
$('mouse-lock').onclick=async()=>{
  if(document.pointerLockElement===canvas){document.exitPointerLock();return;}
  try{await canvas.requestPointerLock();}catch(e){$('toast').textContent='Mausmodus nicht möglich; benutze Mausziehen.';}
};
document.addEventListener('pointerlockchange',()=>{
  $('mouse-lock').textContent=document.pointerLockElement===canvas?'✕ Maus freigeben (Esc)':'🖱️ Maus übernehmen';
});
$('speed').oninput=e=>{
  state.speed=Number(e.target.value);$('speed-label').textContent=state.speed+' m/s';
};
$('perspective').onclick=()=>{
  state.third=!state.third;
  $('perspective').textContent=state.third?'🧍 Erste Person':'🎮 Dritte Person';
};
$('reset').onclick=()=>{const p=spawn();state.x=p.x;state.z=p.z;state.pitch=0;state.yaw=.4;};
$('panel-toggle').onclick=()=>{
  $('panel').hidden=!$('panel').hidden;
  $('panel-toggle').textContent=$('panel').hidden?'☰ Bedienfeld öffnen':'☰ Bedienfeld schliessen';
};
const ray=new THREE.Raycaster();
function inspect(x=0,y=0){
  ray.setFromCamera(new THREE.Vector2(x,y),camera);
  const hit=ray.intersectObjects(targets,false)[0];
  if(!hit){$('detail').classList.remove('show');return;}
  const obj=hit.object.userData.object;
  if(!obj)return;
  $('detail-title').textContent='🏠 '+(obj.tags.name||obj.tags['addr:street']||'Gebäude');
  const body=$('detail-body');body.replaceChildren();
  function line(key,value){
    const p=document.createElement('p'),strong=document.createElement('strong');
    strong.textContent=key+': ';p.append(strong,document.createTextNode(String(value)));body.append(p);
  }
  for(const [k,v] of propertyRows(obj.tags))line(k,v);
  line('Grundriss','aus OSM');
  line('3D-Höhe',obj.modelHeight.metres.toFixed(1)+' m ('+obj.modelHeight.source+')');
  line('Fassaden','illustrative Modellierung');
  if(!obj.tags.start_date&&!obj.tags['building:year_built'])
    line('Baujahr','nicht dokumentiert');
  const a=document.createElement('a');a.target='_blank';a.rel='noopener noreferrer';
  a.href='https://www.openstreetmap.org/way/'+obj.id;a.textContent='Originaldatensatz OSM ↗';body.append(a);
  if(obj.tags.wikidata&&/^Q\d+$/.test(obj.tags.wikidata)){
    const b=document.createElement('a');b.target='_blank';b.rel='noopener noreferrer';
    b.href='https://www.wikidata.org/wiki/'+obj.tags.wikidata;b.textContent='Wikidata ↗';body.append(b);
  }
  $('detail').classList.add('show');
}
$('inspect').onclick=()=>inspect();
$('detail-close').onclick=()=>$('detail').classList.remove('show');
$('find-church').onclick=()=>{
  if(!churches.length){$('toast').textContent='Keine Kirche in den verfügbaren OSM-Daten gefunden.';return;}
  const church=[...churches].sort((a,b)=>Math.hypot(a.cx-state.x,a.cz-state.z)-
    Math.hypot(b.cx-state.x,b.cz-state.z))[0];
  for(let r=8;r<30;r+=3){
    const x=church.cx+r,z=church.cz+r;
    if(!collision(x,z)){
      state.x=x;state.z=z;
      state.yaw=Math.atan2(church.cx-state.x,-(church.cz-state.z));
      $('toast').textContent='⛪ '+(church.tags.name||'Kirche')+' · OSM-Objekt, Fassade modelliert';
      return;
    }
  }
};
async function loadOSM(){
  $('osm-status').textContent='Lade OpenStreetMap-Grundrisse und Wege …';
  try{
    const data=await getLocalOSM(loc.lat,loc.lon,370);
    if(buildings.length||roads.length){$('osm-status').textContent='Daten schon geladen. Zum Aktualisieren bitte neu laden.';return;}
    for(const e of data.elements){
      if(!e.tags?.highway||!e.geometry?.length)continue;
      addRoad(e.geometry.map(p=>frame.local(p.lon,p.lat)),e.tags);
      if(roads.length>=260)break;
    }
    let index=0;
    for(const e of data.elements){
      if(!e.tags?.building||!e.geometry?.length)continue;
      let poly=e.geometry.map(p=>frame.local(p.lon,p.lat));
      if(poly.length>2&&Math.hypot(poly[0].x-poly.at(-1).x,poly[0].z-poly.at(-1).z)<.4)poly.pop();
      addBuilding(poly,e.tags,e.id,index++);
      if(buildings.length>=250)break;
    }
    $('osm-status').textContent='✓ '+buildings.length+' OSM-Gebäude · '+roads.length+
      ' Wege · '+new Date(data.queriedAt).toLocaleTimeString('de-CH')+
      '. Dächer und Fenster sind Modelle.';
    if(collision(state.x,state.z)){const p=spawn();state.x=p.x;state.z=p.z;}
    $('toast').textContent='✓ '+buildings.length+' echte Grundrisse und '+roads.length+' Wege geladen';
  }catch(e){
    $('osm-status').textContent='Keine OSM-Daten: '+e.message+
      '. Keine erfundenen Häuser werden eingeblendet.';
    $('toast').textContent='OSM momentan nicht erreichbar; Geländeszene bleibt benutzbar.';
  }
}
$('retry-data').onclick=loadOSM;
async function loadWeather(){
  try{
    const p=new URLSearchParams({latitude:String(loc.lat),longitude:String(loc.lon),
      current:'temperature_2m,cloud_cover,wind_speed_10m',timezone:'Europe/Rome'});
    const r=await fetch('https://api.open-meteo.com/v1/forecast?'+p);
    if(!r.ok)throw Error('Wetterquelle');
    const json=await r.json(),v=json.current;
    $('weather').textContent=v.temperature_2m+' °C · '+v.cloud_cover+' % Wolken · Wind '+
      v.wind_speed_10m+' km/h · '+v.time+' (Italien). Modellwerte.';
  }catch(e){$('weather').textContent='Wetter zurzeit nicht verfügbar.';}
}
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
async function boot(){
  $('skip-load').hidden=false;
  $('skip-load').onclick=()=>{$('loading').style.display='none';};
  try{
    $('load-message').textContent='Lade echte Terrarium-Höhenkacheln …';
    const r=await dem.load(420);
    $('terrain-status').textContent=r.valid?
      '✓ '+r.loaded+'/'+r.attempted+' Kacheln · Ortszentrum ca. '+
      Math.round(r.center)+' m ü. M. (DEM-Raster)':
      '⚠️ Kein DEM am Ortszentrum. Keine erfundene Ortshöhe; Gelände wird flach dargestellt.';
    makeTerrain();state.ready=true;
    $('loading').style.display='none';
    $('toast').textContent=r.valid?'Echtes Geländerelief geladen':'Höhendaten fehlen – keine erfundene Topografie';
    loadOSM();loadWeather();
  }catch(error){
    console.error(error);
    $('load-message').textContent='3D-Szene nicht startbar: '+error.message;
    $('load-retry').hidden=false;
  }
}
requestAnimationFrame(tick);
boot();