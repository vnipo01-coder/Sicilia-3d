import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

/* SICILIA 3D | WALK ENGINE 7.0
   Actual OpenStreetMap footprints and roads are loaded through Overpass when available.
   Terrarium DEM data are sampled when CORS permits. Generated facades and decorations
   are illustrative, not verified reconstructions of real buildings or streets.
*/
const queryParams=new URLSearchParams(location.search);
const candidate={lat:Number(queryParams.get('lat')),lng:Number(queryParams.get('lng'))};
const valid=queryParams.has('lat')&&queryParams.has('lng')&&Number.isFinite(candidate.lat)&&Number.isFinite(candidate.lng)&&candidate.lat>=35.7&&candidate.lat<=39.2&&candidate.lng>=11.4&&candidate.lng<=16.5;
const ORIGIN=valid?candidate:{lat:37.95736,lng:15.32230};
const PLACE_NAME=(queryParams.get('name')||'Casalvecchio Siculo').slice(0,75),LAT_METERS=111320;
const LON_METERS=LAT_METERS*Math.cos(ORIGIN.lat*Math.PI/180);
const ui=id=>document.getElementById(id);
const host=ui('world');
if(document.querySelector('.logo small'))document.querySelector('.logo small').textContent=PLACE_NAME+' · Begehbares 3D-Modell';
if(document.querySelector('.hud h2'))document.querySelector('.hud h2').textContent='🚶 '+PLACE_NAME+' · 3D Walk';
document.title=PLACE_NAME+' | SICILIA 3D Walk';
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.7));
renderer.setSize(innerWidth,innerHeight);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.24;
host.appendChild(renderer.domElement);
const scene=new THREE.Scene();
scene.background=new THREE.Color('#94b9c7');
scene.fog=new THREE.FogExp2('#99b9b9',0.00125);
const camera=new THREE.PerspectiveCamera(73,innerWidth/innerHeight,0.08,4500);
const ambient=new THREE.HemisphereLight(0xdbefff,0x8b8468,2.1);scene.add(ambient);
const sun=new THREE.DirectionalLight('#fff2d5',2.0);
sun.position.set(-160,350,-210);scene.add(sun);
const world=new THREE.Group();scene.add(world);
const detailRaycaster=new THREE.Raycaster(), clickable=[];
const state={
  yaw:0.38,pitch:0,thirdPerson:false,x:0,z:0,keys:new Set(),terrainOK:false,osmOK:false,
  groundLabel:'Höhenmodell nicht verfügbar',buildings:[],churches:[],buildingCount:0,streetCount:0,
  dem:new Map(),originElevation:0,viewReady:false,cloudCover:null,walkSpeed:9,
  last:performance.now(),elapsed:0,drag:false,rx:0,ry:0,raf:0
};
const palette=['#ead9bf','#cda78a','#e7c6aa','#e2d7c0','#dab99b','#dec8b2','#f0d9b5','#d6b59a'];
const rng=(()=>{let seed=99837;return()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);})();
const toLocal=(lon,lat)=>({x:(lon-ORIGIN.lng)*LON_METERS,z:-(lat-ORIGIN.lat)*LAT_METERS});
const toGeo=(x,z)=>({lng:ORIGIN.lng+x/LON_METERS,lat:ORIGIN.lat-z/LAT_METERS});
const num=(v,d=0)=>Number.isFinite(Number(v))?Number(v).toFixed(d):'–';
const safe=(v)=>String(v||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mat=(color,roughness=0.94)=>new THREE.MeshStandardMaterial({color,roughness,metalness:0,side:THREE.DoubleSide});
const matGround=mat('#a1aa7d'),matStone=mat('#c5bba5'),matRoad=mat('#a59f92');
function setProgress(t){ui('load-status').textContent=t;}
function showNotice(t){ui('notice').textContent=t;}

function tileXY(lon,lat,z=14){
  const n=2**z,phi=lat*Math.PI/180;
  return {tx:(lon+180)/360*n,ty:(1-Math.log(Math.tan(phi)+1/Math.cos(phi))/Math.PI)*n};
}
async function loadElevationTiles(){
  setProgress('Lade echte Höhendaten für die Hügel der Peloritani …');
  const corners=[toGeo(-650,-650),toGeo(650,650),toGeo(-650,650),toGeo(650,-650)];
  const t=corners.map(p=>tileXY(p.lng,p.lat));
  const minX=Math.floor(Math.min(...t.map(p=>p.tx))),maxX=Math.floor(Math.max(...t.map(p=>p.tx)));
  const minY=Math.floor(Math.min(...t.map(p=>p.ty))),maxY=Math.floor(Math.max(...t.map(p=>p.ty)));
  const jobs=[];
  for(let tx=minX;tx<=maxX;tx++)for(let ty=minY;ty<=maxY;ty++){
    jobs.push((async()=>{
      const url='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/'+tx+'/'+ty+'.png';
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
      let response;
      try{response=await fetch(url,{mode:'cors',signal:controller.signal});}
      finally{clearTimeout(timer);}
      if(!response.ok)throw Error('Elevation '+response.status);
      const image=await createImageBitmap(await response.blob());
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
      const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
      state.dem.set(tx+'/'+ty,ctx.getImageData(0,0,256,256).data);
      image.close();
    })());
  }
  const results=await Promise.allSettled(jobs);
  const success=results.filter(x=>x.status==='fulfilled').length;
  state.terrainOK=success>0 && rawDEM(0,0)!==null;
  if(state.terrainOK)state.originElevation=rawDEM(0,0);
  state.groundLabel=state.terrainOK?'Mapzen/AWS-Höhendaten':'Schematisches Geländemodell';
  if(success<jobs.length)console.warn('Terrain tiles partially unavailable',success,jobs.length);
}
function rawDEM(x,z){
  const geo=toGeo(x,z),p=tileXY(geo.lng,geo.lat),tx=Math.floor(p.tx),ty=Math.floor(p.ty);
  const array=state.dem.get(tx+'/'+ty);
  if(!array)return null;
  const px=Math.max(0,Math.min(255,Math.floor((p.tx-tx)*256)));
  const py=Math.max(0,Math.min(255,Math.floor((p.ty-ty)*256)));
  const idx=(py*256+px)*4;
  return array[idx]*256+array[idx+1]+array[idx+2]/256-32768;
}
function ground(x,z){
  const actual=state.terrainOK?rawDEM(x,z):null;
  const demo=18*Math.sin((x+70)/170)+15*Math.cos(z/155)+0.065*x+0.042*z;
  let y=actual==null?demo:actual-state.originElevation;
  if(actual==null && !state.terrainOK)y-=18*Math.sin(70/170)+15;
  // In the short plaza radius the gameplay surface is gently levelled;
  // this is a rendered walkable model, not an official land survey.
  const r=Math.hypot(x,z);
  if(r<24)y*=0.20+0.8*Math.min(1,r/24);
  return Math.max(-120,Math.min(220,y));
}
function makeTerrain(){
  const W=1300,segments=145;
  const geometry=new THREE.PlaneGeometry(W,W,segments,segments);
  geometry.rotateX(-Math.PI/2);
  const pos=geometry.attributes.position;
  const colors=[];
  const c=new THREE.Color();
  for(let i=0;i<pos.count;i++){
    const x=pos.getX(i),z=pos.getZ(i),y=ground(x,z);
    pos.setY(i,y-0.13);
    const yNorm=(y+45)/170;
    c.set(yNorm>0.8?'#a1a58b':yNorm>0.48?'#879b75':yNorm>0.18?'#a0b18a':'#8ea67c');
    const noise=(rng()-.5)*.12;
    c.offsetHSL(0,0,noise);
    colors.push(c.r,c.g,c.b);
  }
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.computeVertexNormals();
  world.add(new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({vertexColors:true,roughness:1,side:THREE.DoubleSide})));
  const circle=new THREE.Mesh(new THREE.CircleGeometry(19,48),mat('#c3b09a'));
  circle.rotation.x=-Math.PI/2;circle.position.y=ground(0,0)+.08;
  world.add(circle);
  // Decorative pavement pattern is not cadastral geometry.
  for(let i=-17;i<=17;i+=2.8){
    const a=new THREE.Mesh(new THREE.BoxGeometry(35,.014,.028),mat('#807e73'));
    a.position.set(0,ground(0,0)+.105,i);world.add(a);
    const b=new THREE.Mesh(new THREE.BoxGeometry(.028,.014,35),mat('#7b8079'));
    b.position.set(i,ground(0,0)+.106,0);world.add(b);
  }
}
function boxMesh(w,h,d,color,x,y,z){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));mesh.position.set(x,y,z);world.add(mesh);return mesh;
}
function drawRoad(points,width=3.4,color='#9e998d'){
  if(points.length<2)return;
  const vertices=[];
  for(let i=0;i<points.length-1;i++){
    const a=points[i],b=points[i+1],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz);
    if(length<.2||length>190)continue;
    const nx=-dz/length*width/2,nz=dx/length*width/2;
    const y1=ground(a.x,a.z)+.16,y2=ground(b.x,b.z)+.16;
    const P=[
      [a.x+nx,y1,a.z+nz],[a.x-nx,y1,a.z-nz],[b.x+nx,y2,b.z+nz],
      [a.x-nx,y1,a.z-nz],[b.x-nx,y2,b.z-nz],[b.x+nx,y2,b.z+nz]
    ];
    P.forEach(p=>vertices.push(...p));
  }
  if(!vertices.length)return;
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();
  world.add(new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-1})));
}
function polygonArea(poly){let a=0;for(let i=0;i<poly.length;i++){let p=poly[i],q=poly[(i+1)%poly.length];a+=p.x*q.z-q.x*p.z;}return Math.abs(a/2);}
function polygonContains(x,z,poly){
  let inside=false;
  for(let i=0,j=poly.length-1;i<poly.length;j=i++){
    const p=poly[i],q=poly[j];
    if((p.z>z)!=(q.z>z)&&x<(q.x-p.x)*(z-p.z)/(q.z-p.z)+p.x)inside=!inside;
  }
  return inside;
}
function geometryQuad(arr,material){
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(arr,3));
  geo.computeVertexNormals();return new THREE.Mesh(geo,material);
}
function addFacade(poly,base,height,tags,color,isReal,index,osmId){
  const tagHeight=Number.parseFloat(tags.height)||Number.parseFloat(tags['building:height']);
  const levels=Number.parseFloat(tags['building:levels']);
  const church=tags.building==='church'||tags.building==='chapel'||tags.amenity==='place_of_worship'||/chiesa|church|basilica|cattedrale/i.test(tags.name||'');
  const h=Number.isFinite(tagHeight)&&tagHeight>2&&tagHeight<70?tagHeight:church?Math.max(10,Math.min(19,7.5+(index%3)*2.6)):
    Number.isFinite(levels)&&levels>=1&&levels<=10?levels*3.1:5.8+(index%3)*2.4;
  const shape=new THREE.Shape();
  poly.forEach((p,i)=>{if(i===0)shape.moveTo(p.x,-p.z);else shape.lineTo(p.x,-p.z);});
  shape.closePath();
  let wallGeo;
  try{wallGeo=new THREE.ExtrudeGeometry(shape,{depth:h,steps:1,bevelEnabled:false,curveSegments:1});}
  catch(e){return;}
  wallGeo.rotateX(-Math.PI/2);
  const wall=new THREE.Mesh(wallGeo,mat(color));
  wall.position.y=base;
  wall.userData.building={tags,index,osmId,isReal,height:h};
  world.add(wall);clickable.push(wall);
  const center=poly.reduce((a,p)=>({x:a.x+p.x/poly.length,z:a.z+p.z/poly.length}),{x:0,z:0});
  const roofH=Math.min(church?5:3.6,Math.max(1.1,h*.25));
  if(church){
    const name=tags.name||'Religiöses Gebäude';
    // Approximate bell tower derived from mapped church usage, not real surveyed geometry.
    const minX=Math.min(...poly.map(p=>p.x)),maxZ=Math.max(...poly.map(p=>p.z));
    const towerHeight=Math.min(20,h*1.45);
    boxMesh(3.2,towerHeight,3.2,'#d2b997',minX+2,base+towerHeight/2,maxZ-2);
    const top=new THREE.Mesh(new THREE.ConeGeometry(2.5,4.2,4),mat('#b97355'));
    top.position.set(minX+2,base+towerHeight+2.1,maxZ-2);top.rotation.y=Math.PI/4;world.add(top);
    state.churches.push({name,center:{x:minX+2,z:maxZ-2},osmId});
  }
  if(tags['roof:shape']==='flat'){
    const roof=new THREE.Mesh(new THREE.ShapeGeometry(shape),mat('#c77f62'));
    roof.rotation.x=-Math.PI/2;roof.position.y=base+h+.09;world.add(roof);
  }else{
    const verts=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      verts.push(a.x,base+h,a.z,b.x,base+h,b.z,center.x,base+h+roofH,center.z);
    }
    const roofGeo=new THREE.BufferGeometry();
    roofGeo.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));roofGeo.computeVertexNormals();
    const roof=new THREE.Mesh(roofGeo,mat(index%4===0?'#a65b45':'#bd7b61'));world.add(roof);
  }
  const floors=Math.min(5,Math.max(1,Math.round(h/3.2)));
  const glass=mat('#2a4c55'),frames=mat('#ede5d4'),shutters=mat(index%3===0?'#58795b':'#6a7b7b');
  let windows=0;
  // Mobile performance: render facade details only in the near field.
  if(Math.hypot(center.x,center.z)<115){
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],dx=b.x-a.x,dz=b.z-a.z,len=Math.hypot(dx,dz);
    if(len<4.8)continue;
    let nx=dz/len,nz=-dx/len;
    const mid={x:(a.x+b.x)/2,z:(a.z+b.z)/2};
    if((mid.x-center.x)*nx+(mid.z-center.z)*nz<0){nx=-nx;nz=-nz;}
    const n=Math.min(6,Math.max(1,Math.floor(len/3.7)));
    for(let f=0;f<floors;f++)for(let j=0;j<n;j++){
      if(windows++>26)break;
      const t=(j+1)/(n+1),x=a.x+dx*t+nx*.09,z=a.z+dz*t+nz*.09,y=base+1.95+f*3.05;
      if(y+0.7>base+h-.4)continue;
      const win=new THREE.Mesh(new THREE.PlaneGeometry(.84,1.18),frames);
      win.position.set(x,y,z);win.rotation.y=Math.atan2(nx,nz);world.add(win);
      const glassPane=new THREE.Mesh(new THREE.PlaneGeometry(.63,.98),glass);
      glassPane.position.set(x+nx*.015,y,z+nz*.015);glassPane.rotation.y=win.rotation.y;world.add(glassPane);
      if(j%3===0){
        const pane=new THREE.Mesh(new THREE.PlaneGeometry(.13,1.18),shutters);
        pane.position.set(x+dx/len*.53+nx*.02,y,z+dz/len*.53+nz*.02);
        pane.rotation.y=win.rotation.y;world.add(pane);
      }
    }
    if(i===0&&len>3){
      const x=mid.x+nx*.1,z=mid.z+nz*.1;
      const door=new THREE.Mesh(new THREE.PlaneGeometry(1.15,2.18),mat('#61473c'));
      door.position.set(x,base+1.11,z);door.rotation.y=Math.atan2(nx,nz);world.add(door);
    }
  }
  }
  state.buildings.push({poly,base,height:h,tags,osmId,isReal,center});
  state.buildingCount++;
}
function addTree(x,z,scale=1){
  const y=ground(x,z);
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.18*scale,.28*scale,2.7*scale,6),mat('#5d5142'));
  trunk.position.set(x,y+1.35*scale,z);world.add(trunk);
  const crown=new THREE.Mesh(new THREE.ConeGeometry(1.55*scale,7*scale,7),mat('#476d57'));
  crown.position.set(x,y+5.8*scale,z);world.add(crown);
}
function addDecoration(){
  for(let i=0;i<95;i++){
    const x=(rng()-.5)*1050,z=(rng()-.5)*1050;
    if(Math.hypot(x,z)<75)continue;
    if(state.buildings.some(b=>polygonContains(x,z,b.poly)))continue;
    addTree(x,z,.6+rng()*.55);
  }
  const pillar=boxMesh(.7,3,.7,'#d4c6ac',20,ground(20,0)+1.5,0);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.7,10,8),
    new THREE.MeshBasicMaterial({color:'#ffeac0'}));
  lamp.position.set(20,ground(20,0)+3.4,0);world.add(lamp);
  pillar.userData.decorative=true;
  const bench=boxMesh(3,.27,.7,'#825a43',-13,ground(-13,10)+.65,10);
  bench.userData.decorative=true;
}
function fallbackVillage(){
  state.osmOK=false;
  showNotice('⚠️ Rekonstruktionsdemo: Reale OSM-Gebäude nicht abrufbar. Häuser, Strassen und Details sind beispielhaft modelliert.');
  const roads=[
    [{x:-270,z:0},{x:270,z:0}],
    [{x:0,z:-270},{x:0,z:270}],
    [{x:-180,z:-150},{x:180,z:150}]
  ];
  roads.forEach((p,i)=>drawRoad(p,i===2?3:4));
  for(let i=0;i<34;i++){
    const a=i*2.399;const r=30+(i%4)*18+(rng()*10);
    const x=Math.sin(a)*r,z=Math.cos(a)*r;
    if(Math.abs(x)<19&&Math.abs(z)<19)continue;
    const w=7+2*rng(),d=9+4*rng(),poly=[
      {x:x-w/2,z:z-d/2},{x:x+w/2,z:z-d/2},
      {x:x+w/2,z:z+d/2},{x:x-w/2,z:z+d/2}];
    addFacade(poly,ground(x,z),0,{},palette[i%palette.length],false,i,null);
  }
}
async function getOSM(){
  setProgress('Lade Gebäudegrundrisse und Strassen aus OpenStreetMap …');
  const query='[out:json][timeout:14];(way(around:330,'+ORIGIN.lat+','+ORIGIN.lng+')["building"];way(around:370,'+ORIGIN.lat+','+ORIGIN.lng+')["highway"];way(around:350,'+ORIGIN.lat+','+ORIGIN.lng+')["amenity"="place_of_worship"];);out geom;';
  let data=null;
  for(const endpoint of ['https://overpass.kumi.systems/api/interpreter','https://overpass-api.de/api/interpreter']){
    try{
      const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),7900);
      let response;
      try{response=await fetch(endpoint+'?data='+encodeURIComponent(query),{signal:ctrl.signal});}
      finally{clearTimeout(timer);}
      if(!response.ok)throw Error('Overpass '+response.status);
      const json=await response.json();
      if((json.elements||[]).length){data=json;break;}
    }catch(e){console.warn('OpenStreetMap source issue:',e);}
  }
  if(!data){fallbackVillage();return;}
  const ways=data.elements||[];
  let roadCount=0,buildingCount=0;
  for(const element of ways){
    if(!element.geometry||!element.tags?.highway)continue;
    const points=element.geometry.map(p=>toLocal(p.lon,p.lat));
    const roadClass=element.tags.highway;
    const width=roadClass==='primary'?8:roadClass==='residential'?4.9:
      roadClass==='pedestrian'?4.6:roadClass==='footway'?2.0:3.0;
    drawRoad(points,width,roadClass==='footway'?'#bcb5a3':'#a59d8f');roadCount++;
  }
  for(const element of ways){
    if(!element.geometry||!element.tags?.building)continue;
    let pts=element.geometry.map(p=>toLocal(p.lon,p.lat));
    if(pts.length>2&&Math.hypot(pts[0].x-pts.at(-1).x,pts[0].z-pts.at(-1).z)<.5)pts.pop();
    if(pts.length<3||pts.length>48||polygonArea(pts)<9)continue;
    const xs=pts.reduce((a,p)=>a+p.x/pts.length,0),zs=pts.reduce((a,p)=>a+p.z/pts.length,0);
    if(Math.hypot(xs,zs)>340)continue;
    addFacade(pts,ground(xs,zs),0,element.tags,palette[buildingCount%palette.length],true,buildingCount,element.id);
    buildingCount++;
    if(buildingCount>125)break;
  }
  if(buildingCount<3){fallbackVillage();return;}
  state.osmOK=true;state.streetCount=roadCount;
  showNotice('✓ '+buildingCount+' OSM-Gebäude, '+roadCount+' Wege geladen. Fassaden, Fenster, Dachformen und fehlende Höhen sind als 3D-Modell rekonstruiert.');
}
function findWalkableSpawn(){
  const tryPoints=[[0,0],[7,0],[-7,0],[0,-9],[12,12],[-12,-12],[24,0],[0,24],[35,30]];
  for(const [x,z] of tryPoints)
    if(!state.buildings.some(b=>polygonContains(x,z,b.poly)))return {x,z};
  return {x:0,z:0};
}
function avatarModel(){
  const group=new THREE.Group();
  const clothes=mat('#2f7e8c'),skin=mat('#e7b89d'),pants=mat('#354655');
  const torso=new THREE.Mesh(new THREE.CapsuleGeometry(.36,.95,5,8),clothes);
  torso.position.y=1.12;group.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.27,12,10),skin);
  head.position.y=2.05;group.add(head);
  const hair=new THREE.Mesh(new THREE.SphereGeometry(.275,12,7),mat('#302b2c'));
  hair.scale.y=.47;hair.position.y=2.20;group.add(hair);
  for(const sign of [-1,1]){
    const arm=new THREE.Mesh(new THREE.CapsuleGeometry(.12,.55,4,7),clothes);
    arm.position.set(sign*.50,1.17,0);group.add(arm);
    const leg=new THREE.Mesh(new THREE.CapsuleGeometry(.17,.63,4,7),pants);
    leg.position.set(sign*.19,.43,0);group.add(leg);
  }
  group.visible=false;scene.add(group);return group;
}
const avatar=avatarModel();
function hitBuilding(x,z){
  const margin=.7;
  return state.buildings.some(b=>
    polygonContains(x,z,b.poly)||
    polygonContains(x+margin,z,b.poly)||
    polygonContains(x-margin,z,b.poly)||
    polygonContains(x,z+margin,b.poly)||
    polygonContains(x,z-margin,b.poly)
  );
}
function updateCamera(){
  const y=ground(state.x,state.z)+1.69;
  const dir=new THREE.Vector3(Math.sin(state.yaw)*Math.cos(state.pitch),
    Math.sin(state.pitch),-Math.cos(state.yaw)*Math.cos(state.pitch));
  avatar.position.set(state.x,ground(state.x,state.z),state.z);
  avatar.rotation.y=state.yaw;
  avatar.visible=state.thirdPerson;
  if(state.thirdPerson){
    camera.position.set(state.x-Math.sin(state.yaw)*5.2,y+2.15,
      state.z+Math.cos(state.yaw)*5.2);
    camera.lookAt(state.x,y-.3,state.z);
  }else{
    camera.position.set(state.x,y,state.z);
    camera.lookAt(camera.position.clone().add(dir));
  }
  if(state.terrainOK){
    const elev=rawDEM(state.x,state.z);
    ui('height').textContent='⛰️ '+(elev==null?'–':Math.round(elev))+' m ü. M. (DEM)';
  }else ui('height').textContent='⛰️ Relief: Modell';
}
function move(dt){
  // Faster navigation for desktop and long streets. Speed is deliberately adjustable.
  const speed=dt*state.walkSpeed*(state.keys.has('sprint')?2.0:1.0);
  const forward=(state.keys.has('forward')?1:0)-(state.keys.has('back')?1:0);
  const sideways=(state.keys.has('right')?1:0)-(state.keys.has('left')?1:0);
  if(!forward&&!sideways)return;
  const norm=Math.hypot(forward,sideways);
  const dx=(Math.sin(state.yaw)*forward+Math.cos(state.yaw)*sideways)*speed/norm;
  const dz=(-Math.cos(state.yaw)*forward+Math.sin(state.yaw)*sideways)*speed/norm;
  const nx=state.x+dx,nz=state.z+dz;
  if(Math.hypot(nx,nz)<310&&!hitBuilding(nx,nz)){
    state.x=nx;state.z=nz;
  }
}
const keyMap={w:'forward',W:'forward',ArrowUp:'forward',s:'back',S:'back',ArrowDown:'back',
  a:'left',A:'left',ArrowLeft:'left',d:'right',D:'right',ArrowRight:'right',Shift:'sprint'};
document.addEventListener('keydown',e=>{
  const k=keyMap[e.key];if(!k)return;
  if(e.target instanceof Element&&e.target.closest('input,textarea'))return;
  e.preventDefault();state.keys.add(k);
});
document.addEventListener('keyup',e=>{const k=keyMap[e.key];if(k)state.keys.delete(k);});
window.addEventListener('blur',()=>state.keys.clear());
for(const b of document.querySelectorAll('[data-move]')){
  const key=b.dataset.move;
  b.addEventListener('pointerdown',e=>{
    e.preventDefault();state.keys.add(key);
    try{b.setPointerCapture(e.pointerId);}catch(_){}
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])
    b.addEventListener(type,()=>state.keys.delete(key));
  b.addEventListener('contextmenu',e=>e.preventDefault());
}
const speedControl=document.createElement('div');
speedControl.className='walk-speed-panel';
speedControl.innerHTML='<label for="walk-speed">🏃 Geschwindigkeit <strong id="walk-speed-label">9 m/s</strong></label>'+
  '<input id="walk-speed" type="range" min="2" max="22" step="1" value="9" aria-label="Geh- und Lauftempo">'+
  '<p class="walk-speed-note">Shift halten = Sprint (2×). Mausrad = schneller/langsamer. WASD oder Pfeiltasten bewegen.</p>'+
  '<button id="walk-mouselook" type="button">🖱️ Maussteuerung aktivieren</button>';
document.querySelector('.hud')?.append(speedControl);
const speedSlider=ui('walk-speed');
speedSlider.oninput=()=>{
  state.walkSpeed=Number(speedSlider.value);
  ui('walk-speed-label').textContent=state.walkSpeed+' m/s';
};
renderer.domElement.addEventListener('wheel',e=>{
  e.preventDefault();
  state.walkSpeed=Math.max(2,Math.min(22,state.walkSpeed+(e.deltaY<0?1:-1)));
  speedSlider.value=state.walkSpeed;
  ui('walk-speed-label').textContent=state.walkSpeed+' m/s';
},{passive:false});
const mouseBtn=ui('walk-mouselook');
mouseBtn.onclick=async()=>{
  if(document.pointerLockElement===renderer.domElement){
    document.exitPointerLock();return;
  }
  if(renderer.domElement.requestPointerLock){
    try{await renderer.domElement.requestPointerLock();}
    catch(e){showNotice('Maussteuerung im Browser nicht verfügbar. Du kannst weiterhin ziehen.');}
  }
};
document.addEventListener('pointerlockchange',()=>{
  mouseBtn.textContent=document.pointerLockElement===renderer.domElement?
    '✕ Maussteuerung verlassen (Esc)':'🖱️ Maussteuerung aktivieren';
});
document.addEventListener('mousemove',e=>{
  if(document.pointerLockElement!==renderer.domElement)return;
  state.yaw+=e.movementX*.0032;
  state.pitch=Math.max(-.72,Math.min(1.1,state.pitch-e.movementY*.003));
});
renderer.domElement.addEventListener('pointerdown',e=>{
  state.drag=false;state.rx=e.clientX;state.ry=e.clientY;
  renderer.domElement.setPointerCapture(e.pointerId);
});
renderer.domElement.addEventListener('pointermove',e=>{
  if(!renderer.domElement.hasPointerCapture(e.pointerId))return;
  const dx=e.clientX-state.rx,dy=e.clientY-state.ry;
  if(Math.abs(dx)+Math.abs(dy)>1)state.drag=true;
  state.rx=e.clientX;state.ry=e.clientY;
  state.yaw+=dx*.0045;
  state.pitch=Math.max(-.62,Math.min(.85,state.pitch-dy*.0037));
});
renderer.domElement.addEventListener('pointerup',e=>{
  if(state.drag)return;
  if(!state.viewReady)return;
  const xy=new THREE.Vector2(e.clientX/innerWidth*2-1,-(e.clientY/innerHeight*2-1));
  inspect(xy);
});
function inspect(pointer){
  detailRaycaster.setFromCamera(pointer,camera);
  const hits=detailRaycaster.intersectObjects(clickable,false);
  if(!hits.length){ui('details').classList.remove('visible');return;}
  const entry=hits[0].object.userData.building;
  if(!entry)return;
  const tags=entry.tags||{};
  const name=tags.name||tags['addr:street']||'Gebäude (3D-Modell)';
  ui('detail-title').textContent='🏠 '+name;
  const known=tags.start_date||tags['building:year_built'];
  const typ=tags.building||'Gebäude';
  const list=[
    ['Objekttyp',typ],
    ['Höhe',Math.round(entry.height)+' m'+(tags.height?' (OSM)':' (geschätzt)')],
    ['Stockwerke',tags['building:levels']||'nicht erfasst'],
    ['Baujahr',known||'nicht dokumentiert'],
    ['Kirchliche Nutzung',tags.building==='church'||tags.amenity==='place_of_worship'?'OSM erfasst':'nicht erfasst'],
    ['Darstellung',entry.isReal?'OSM-Grundriss; Fassaden illustrativ':'Schematisches Beispielgebäude']
  ];
  const body=ui('detail-text');body.replaceChildren();
  for(const [label,value] of list){
    const p=document.createElement('p'),strong=document.createElement('strong');
    strong.textContent=label+': ';p.append(strong,document.createTextNode(value));body.appendChild(p);
  }
  if(entry.osmId){
    const link=document.createElement('a');link.target='_blank';link.rel='noopener noreferrer';
    link.href='https://www.openstreetmap.org/way/'+entry.osmId;link.textContent='OSM-Originaldaten';
    body.appendChild(link);
  }
  const wiki=document.createElement('a');wiki.target='_blank';wiki.rel='noopener noreferrer';
  wiki.href='https://de.wikipedia.org/w/index.php?search='+encodeURIComponent(name+' Casalvecchio Siculo');
  wiki.textContent='Historischen Kontext suchen';body.appendChild(wiki);
  ui('details').classList.add('visible');
}
ui('interact').onclick=()=>inspect(new THREE.Vector2(0,0));
ui('close-details').onclick=()=>ui('details').classList.remove('visible');
ui('perspective').onclick=()=>{
  state.thirdPerson=!state.thirdPerson;
  ui('perspective').textContent=state.thirdPerson?'🎮 Dritte Person':'🧍 Erste Person';
  ui('perspective').classList.toggle('on',state.thirdPerson);
};
ui('reset').onclick=()=>{const s=findWalkableSpawn();state.x=s.x;state.z=s.z;state.yaw=.38;state.pitch=0;updateCamera();ui('details').classList.remove('visible');};
window.addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);
});
async function loadWeather(){
  try{
    const params=new URLSearchParams({latitude:String(ORIGIN.lat),longitude:String(ORIGIN.lng),
      current:'temperature_2m,weather_code,cloud_cover',timezone:'Europe/Rome'});
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+params);
    if(!response.ok)throw Error('Weather unavailable');
    const data=await response.json(),v=data.current||{};
    state.cloudCover=v.cloud_cover;
    ui('weather').textContent='🌦️ '+num(v.temperature_2m,1)+' °C · ☁ '+num(v.cloud_cover)+' %';
    // Sky tone only indicates current model cloud cover, not cloud locations.
    if(Number(v.cloud_cover)>=70){
      scene.background.set('#9aaab3');scene.fog.color.set('#aab3b4');
    }else if(Number(v.cloud_cover)<=25){
      scene.background.set('#86b8d0');scene.fog.color.set('#a5c4bd');
    }
  }catch(e){ui('weather').textContent='Wetter nicht abrufbar';}
}
function animate(now){
  requestAnimationFrame(animate);
  const dt=Math.min(.05,(now-state.last)/1000);state.last=now;
  move(dt);updateCamera();
  renderer.render(scene,camera);
}
async function boot(){
  const load=ui('loading');
  try{
    try{await loadElevationTiles();}catch(error){
      console.warn('Elevation DEM unavailable:',error);state.terrainOK=false;
    }
    makeTerrain();
    try{await getOSM();}catch(error){console.warn('OSM data failed',error);fallbackVillage();}
    addDecoration();
    const p=findWalkableSpawn();state.x=p.x;state.z=p.z;
    if(speedSlider)speedSlider.value=String(state.walkSpeed);
    state.viewReady=true;
    ui('height').textContent=state.groundLabel;
    if(state.osmOK)showNotice('✓ '+state.buildingCount+' OpenStreetMap-Gebäude, '+state.streetCount+' Wege. Fassaden teilweise modelliert; erfasste Kirchen: '+state.churches.length+'.');
    const cb=document.createElement('button');cb.textContent='⛪ Kirche finden';
    cb.style.cssText='padding:8px 10px;background:#155c6b;color:#fff;border:1px solid #82dfe0;border-radius:8px;margin-top:8px;font-size:11px';
    cb.onclick=()=>{
      if(!state.churches.length){showNotice('Keine als Kirche erfassten Gebäude im sichtbaren Ausschnitt.');return;}
      const near=state.churches.map(c=>({...c,d:Math.hypot(state.x-c.center.x,state.z-c.center.z)})).sort((a,b)=>a.d-b.d)[0];
      const x=near.center.x+8,z=near.center.z+8;
      if(!hitBuilding(x,z)){state.x=x;state.z=z;}
      state.yaw=Math.atan2(near.center.x-state.x,-(near.center.z-state.z));
      updateCamera();showNotice('⛪ '+near.name+' · OSM-Kirche, modellierte Fassade.');
    };
    document.querySelector('.hud')?.append(cb);
    loadWeather();
  }catch(error){
    console.error('Walking world error',error);
    showNotice('Begehbares 3D-Modell eingeschränkt – bitte neu laden.');
  }finally{
    load.style.display='none';
    requestAnimationFrame(animate);
  }
}
boot();
