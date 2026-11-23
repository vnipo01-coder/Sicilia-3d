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
  getRoadWidth,getBuildingHeight,propertyRows,validateGeo} from './geo.js?v=115';
import {SANTA,STOPS,LOCAL_REFERENCES,LINKS,inSantaTeresa,streetImageryUrl,stopDetails} from './local-sources.js?v=115';
import {getWeather,formatWeather,weatherDescription} from './weather.js?v=115';

/* Walk v10.1: OSM building geometry + single shared DEM. No fictional replacement city. */
validateGeo();
const $=id=>document.getElementById(id),loc=readLocation(),frame=new GeoFrame(loc.lat,loc.lon);
const isSanta=inSantaTeresa(loc,3800);
const sceneRadius=isSanta?495:345;
const dem=new TerrainDEM(frame,14),scene=new THREE.Scene();
scene.background=new THREE.Color('#92b5bd');scene.fog=new THREE.FogExp2('#acc3bf',.0012);
document.title=loc.name+' | SICILIA 3D v10.5 Walk';
$('place-name').textContent=loc.name+' · v10.5';
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
function sourceColor(raw,fallback){
  const name=String(raw||'').trim().toLowerCase();
  const standards={white:'#eee5d4',beige:'#d5c6ae',cream:'#ead7b4',
    yellow:'#d4ba86',orange:'#bb8665',red:'#af6856',
    brown:'#9b765d',grey:'#a8a5a0',gray:'#a8a5a0',
    sandstone:'#c1ab8b',stone:'#b8ad9a',brick:'#b0775e',
    terracotta:'#b77255',concrete:'#bab9b1',plaster:'#d9c9ab'};
  if(/^#[0-9a-f]{6}$/.test(name))return name;
  return standards[name]||fallback;
}
const state={x:0,z:0,yaw:.42,pitch:0,third:false,speed:7,keys:new Set(),
  ready:false,drag:false,pointer:null,last:0,stamp:0,weatherCover:null};
const height=(x,z)=>dem.height(x,z)??0;
const toast=msg=>$('toast').textContent=msg;
function makeTerrain(){
  const size=isSanta?1100:820,seg=isSanta?180:148,mesh=new THREE.PlaneGeometry(size,size,seg,seg);
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
// Optional imagery drape: unlike invented facades, source pixels map to real
// geographic coordinates. A failed imagery request never blocks walking.
const aerial=new THREE.Group();
aerial.name='Esri-Luftbilder auf DEM';
world.add(aerial);
let aerialLoaded=0,aerialRequested=0;
const tileLon=(x,z)=>x/(2**z)*360-180;
const tileLat=(y,z)=>Math.atan(Math.sinh(Math.PI*(1-2*y/(2**z))))*180/Math.PI;
function loadAerial(){
  const extent=isSanta?530:415;
  const zoom=16,coords=[frame.geo(-extent,-extent),frame.geo(extent,extent)];
  const tiles=coords.map(p=>tileXY(p.lat,p.lon,zoom));
  const minX=Math.floor(Math.min(...tiles.map(p=>p.x)));
  const maxX=Math.floor(Math.max(...tiles.map(p=>p.x)));
  const minY=Math.floor(Math.min(...tiles.map(p=>p.y)));
  const maxY=Math.floor(Math.max(...tiles.map(p=>p.y)));
  const loader=new THREE.TextureLoader();loader.setCrossOrigin('anonymous');
  const output=$('aerial-status');
  for(let tx=minX;tx<=maxX;tx++)for(let ty=minY;ty<=maxY;ty++){
    if(aerialRequested>=18)break;
    aerialRequested++;
    const nw=frame.local(tileLon(tx,zoom),tileLat(ty,zoom));
    const se=frame.local(tileLon(tx+1,zoom),tileLat(ty+1,zoom));
    const vertices=[],uv=[],indices=[],n=16;
    for(let row=0;row<=n;row++)for(let col=0;col<=n;col++){
      const u=col/n,v=row/n;
      const x=nw.x+(se.x-nw.x)*u,z=nw.z+(se.z-nw.z)*v;
      vertices.push(x,height(x,z)-.18,z);
      uv.push(u,1-v);
    }
    for(let row=0;row<n;row++)for(let col=0;col<n;col++){
      const i=row*(n+1)+col;
      indices.push(i,i+n+1,i+1,i+1,i+n+1,i+n+2);
    }
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
    geometry.setIndex(indices);geometry.computeVertexNormals();
    const url='https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/'+zoom+'/'+ty+'/'+tx;
    loader.load(url,texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      aerial.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
        map:texture,side:THREE.DoubleSide})));
      aerialLoaded++;
      if(output)output.textContent='✓ '+aerialLoaded+' Luftbildkacheln geladen · Esri/Datenpartner, nicht live';
    },undefined,()=>{
      geometry.dispose();
      if(!aerialLoaded&&output)
        output.textContent='Luftbildserver nicht erreichbar · Gelände bleibt sichtbar';
    });
  }
  const button=$('aerial-toggle');
  if(button)button.onclick=()=>{
    aerial.visible=!aerial.visible;
    button.textContent=aerial.visible?'🛰️ Luftbild ausblenden':'🛰️ Luftbild anzeigen';
  };
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
  const surface=tags.surface;
  const roadColour=surface==='paving_stones'?'#b8aca1':
    surface==='sett'?'#aba399':surface==='concrete'?'#9da19d':
    surface==='gravel'?'#c2b59e':path?'#c1b7a2':'#939a95';
  world.add(new THREE.Mesh(g,material(roadColour)));
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
  if(Math.hypot(cx,cz)>(isSanta?520:390))return;
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
  const facadeColour=sourceColor(tags['building:colour'],
  tags['building:material']==='stone'?'#c3b49e':
    church?'#d9cfb4':palette[index%palette.length]);
  const wall=new THREE.Mesh(geom,material(facadeColour));
  wall.userData.object=obj;world.add(wall);targets.push(wall);
  const shape=new THREE.Shape();
  poly.forEach((p,i)=>i?shape.lineTo(p.x,-p.z):shape.moveTo(p.x,-p.z));shape.closePath();
  const roofGeo=new THREE.ShapeGeometry(shape);roofGeo.rotateX(-Math.PI/2);
  const roofColour=sourceColor(tags['roof:colour'],
  tags['roof:material']==='metal'?'#777d7d':
    tags['roof:material']==='tiles'?'#b47b5e':'#b47b5e');
  const roof=new THREE.Mesh(roofGeo,material(roofColour));roof.position.y=roofY+.07;
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
  if(Math.hypot(nextX,nextZ)>sceneRadius)return;
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
  $('mapillary-current').href=streetImageryUrl(p.lat,p.lon);
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
  const stop=hit.object.userData.stop;
  if(stop){
    $('detail-title').textContent='🚌 '+stop.name;
    const body=$('detail-body');body.replaceChildren();
    for(const entry of stopDetails(stop)){
      const p=document.createElement('p'),strong=document.createElement('strong');
      strong.textContent=entry.label+': ';
      p.append(strong,document.createTextNode(entry.value));body.append(p);
    }
    const links=[
      ['Fahrplan bei Interbus',LINKS.transport],
      ['Offizielle Haltestellen-Mitteilung',LINKS.transportNotice],
      ['Datensatz zur Haltestelle',stop.url]
    ];
    for(const [label,url] of links){
      const a=document.createElement('a');a.textContent=label+' ↗';
      a.href=url;a.target='_blank';a.rel='noopener noreferrer';body.append(a);
    }
    $('detail').classList.add('show');return;
  }
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
  line('Fassaden','illustrative Modellierung; Farbe nur bei entsprechendem OSM-Tag belegt');
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
// Santa Teresa neighbourhood navigation: real locations, separate high-detail
// sectors because a single browser mesh cannot hold every building on the coast.
function townLink(label,coords){
  const params=new URLSearchParams({lat:coords.lat.toFixed(6),
    lng:coords.lon.toFixed(6),name:label});
  return './walk.html?'+params;
}
function initTownTools(){
  const a=$('mapillary-current');
  if(a)a.href=streetImageryUrl(loc.lat,loc.lon);
  if(!isSanta)return;
  $('santa-district').hidden=false;
  $('town-heritage').hidden=false;
  const cities=[
    {label:'🏛️ Municipio',lat:SANTA.lat,lon:SANTA.lon},
    {label:'🌊 Lungomare Barracca',lat:37.9393543554652,lon:15.3628167268097},
    {label:'🚌 Via Savoca',lat:37.9417550549932,lon:15.3596597089612},
    {label:'🏖️ Lungomare Nord',lat:37.955189,lon:15.376800}
  ];
  const list=$('santa-district-buttons');list.replaceChildren();
  for(const city of cities){
    const b=document.createElement('button');
    b.textContent=city.label;
    b.onclick=()=>{location.href=townLink(city.label,city);};
    list.append(b);
  }
  const sources=$('town-heritage-links');sources.replaceChildren();
  for(const ref of LOCAL_REFERENCES){
    const a=document.createElement('a');
    a.href=ref.url;a.target='_blank';a.rel='noopener noreferrer';
    a.textContent=ref.title;
    const small=document.createElement('small');
    small.textContent=ref.attribution+' – '+ref.facts;
    a.append(small);sources.append(a);
  }
  $('santa-bus-status').textContent='Interbus-Haltestellen und Betreiberquellen: anklickbare 🚌-Symbole erscheinen an dokumentierten bzw. klar als ungefähr gekennzeichneten Orten.';
}
let busSymbolsBuilt=false;
function townBusSymbols(){
  if(!isSanta||busSymbolsBuilt)return;
  busSymbolsBuilt=true;
  let count=0;
  for(const stop of STOPS){
    const p=frame.local(stop.lon,stop.lat);
    if(Math.hypot(p.x,p.z)>sceneRadius+35)continue;
    const y=height(p.x,p.z),g=new THREE.Group();
    g.position.set(p.x,y,p.z);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,3,8),material('#cad4d5'));
    pole.position.y=1.5;g.add(pole);
    const sign=new THREE.Mesh(new THREE.BoxGeometry(1.7,1.15,.20),material('#0b668d'));
    sign.position.y=3.05;g.add(sign);
    const disk=new THREE.Mesh(new THREE.CircleGeometry(.45,20),material('#f5de9c'));
    disk.position.set(0,3.05,.13);g.add(disk);
    const hit=new THREE.Mesh(new THREE.BoxGeometry(2.6,4,2.6),
      new THREE.MeshBasicMaterial({visible:false}));
    hit.position.y=1.9;hit.userData.stop=stop;g.add(hit);targets.push(hit);
    world.add(g);
    addLabel('🚌 '+stop.name,p.x,y+8,p.z);
    count++;
  }
  $('santa-bus-status').textContent=count+' lokal verortete Haltestelle(n) in diesem Sektor. Zeiten nur über offizielle Betreiberquellen; keine erfundenen Live-Abfahrten.';
}
function addMappedStreetLamps(elements){
  let added=0;
  for(const obj of elements){
    if(obj.type!=='node'||obj.tags?.highway!=='street_lamp')continue;
    if(!Number.isFinite(obj.lat)||!Number.isFinite(obj.lon))continue;
    const p=frame.local(obj.lon,obj.lat);
    if(Math.hypot(p.x,p.z)>sceneRadius)continue;
    const y=height(p.x,p.z);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(.11,.16,4.1,6),material('#586776'));
    pole.position.set(p.x,y+2.05,p.z);world.add(pole);
    const light=new THREE.Mesh(new THREE.SphereGeometry(.29,8,8),
      new THREE.MeshBasicMaterial({color:'#fff3bb'}));
    light.position.set(p.x,y+4.25,p.z);world.add(light);
    // Glow uses emissive geometry; no hundreds of costly dynamic lights.
    added++;
    if(added>=90)break;
  }
  return added;
}
async function loadOSM(){
  $('osm-status').textContent='Lade OpenStreetMap-Grundrisse und Wege …';
  try{
    const data=await getLocalOSM(loc.lat,loc.lon,isSanta?470:370);
    if(buildings.length||roads.length){$('osm-status').textContent='Daten schon geladen. Zum Aktualisieren bitte neu laden.';return;}
    for(const e of data.elements){
      if(!e.tags?.highway||!e.geometry?.length)continue;
      addRoad(e.geometry.map(p=>frame.local(p.lon,p.lat)),e.tags);
      if(roads.length>=(isSanta?400:260))break;
    }
    let index=0;
    for(const e of data.elements){
      if(!e.tags?.building||!e.geometry?.length)continue;
      let poly=e.geometry.map(p=>frame.local(p.lon,p.lat));
      if(poly.length>2&&Math.hypot(poly[0].x-poly.at(-1).x,poly[0].z-poly.at(-1).z)<.4)poly.pop();
      addBuilding(poly,e.tags,e.id,index++);
      if(buildings.length>=(isSanta?400:250))break;
    }
    const lightCount=addMappedStreetLamps(data.elements);
    $('osm-status').textContent='✓ '+buildings.length+' OSM-Gebäude · '+roads.length+
      ' Wege · '+lightCount+' kartierte Strassenlampen · '+new Date(data.queriedAt).toLocaleTimeString('de-CH')+
      '. Dachformen und Fenster sind Modelle; dokumentierte Materialfarben aus OSM.';
    townBusSymbols();
    if(collision(state.x,state.z)){const p=spawn();state.x=p.x;state.z=p.z;}
    $('toast').textContent='✓ '+buildings.length+' echte Grundrisse und '+roads.length+' Wege geladen';
  }catch(e){
    $('osm-status').textContent='Keine OSM-Daten: '+e.message+
      '. Luftbild und Gelände bleiben sichtbar; alternativ die bisherige 3D-Version öffnen.';
    $('legacy-panel').hidden=false;
    $('toast').textContent='OSM momentan nicht erreichbar; Geländeszene bleibt benutzbar.';
  }
}
$('retry-data').onclick=loadOSM;
async function loadWeather(){
  const target=$('weather');
  target.textContent='Aktuelle Wettermodellwerte werden aktualisiert …';
  try{
    const data=await getWeather(loc.lat,loc.lon,{fresh:true});
    const v=formatWeather(data);
    target.textContent=weatherDescription(data)+' · gefühlt '+v.feels+
      ' · Niederschlag '+v.precipitation+' · Quelle: Open-Meteo, Modellzeit '+
      v.time+' (Italien); zuletzt abgerufen '+
      new Date(data.fetched).toLocaleTimeString('de-CH')+
      (data.stale?' · vorheriger Cachewert':'');
    if(Number.isFinite(data.current.cloud_cover)){
      const clouds=data.current.cloud_cover;
      scene.background.set(clouds>=75?'#9db5c0':clouds<=15?'#86b9ce':'#93b8c4');
    }
  }catch(e){
    target.textContent='Wettermodell im Moment nicht erreichbar. Die 3D-Szene bleibt nutzbar.';
  }
}
setInterval(()=>{if(!document.hidden)loadWeather();},6*60*1000);

window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
async function boot(){
  $('skip-load').hidden=false;
  $('skip-load').onclick=()=>{$('loading').style.display='none';};
  try{
    $('load-message').textContent='Lade echte Terrarium-Höhenkacheln …';
    const r=await dem.load(isSanta?560:420);
    $('terrain-status').textContent=r.valid?
      '✓ '+r.loaded+'/'+r.attempted+' Kacheln · Ortszentrum ca. '+
      Math.round(r.center)+' m ü. M. (DEM-Raster)':
      '⚠️ Kein DEM am Ortszentrum. Keine erfundene Ortshöhe; Gelände wird flach dargestellt.';
    makeTerrain();
    loadAerial(); // background, non-blocking
    state.ready=true;
    $('loading').style.display='none';
    $('toast').textContent=r.valid?'Echtes Geländerelief geladen':'Höhendaten fehlen – keine erfundene Topografie';
    initTownTools();
    townBusSymbols();
    loadOSM();loadWeather();
  }catch(error){
    console.error(error);
    $('load-message').textContent='3D-Szene nicht startbar: '+error.message;
    $('load-retry').hidden=false;
    $('legacy-walk').hidden=false;
  }
}
requestAnimationFrame(tick);
boot();