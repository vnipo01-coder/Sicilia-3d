/* SICILIA 3D v6.0 – Compact interface and Piazza walking mode.
   Keeps map layers, terrain, weather, Wikipedia and aviation from v4/v5.
   The playable avatar is schematic; this is NOT photorealistic Street View.
*/
'use strict';
(function () {
  const API=window.SICILIA_API;
  if(!API || !API.map){console.warn('SICILIA v6: core map missing');return;}
  const map=API.map, $=id=>document.getElementById(id);
  const PIAZZA={lng:15.32230,lat:37.95736};
  const walking={active:false,lng:PIAZZA.lng,lat:PIAZZA.lat,heading:158,keys:new Set(),
    marker:null,animation:0,lastTime:0,lastRender:0,previous:null,view:'shoulder'};
  const css=document.createElement('style');
  css.textContent=[
    '#map{z-index:0}',
    '.brand{z-index:7;top:12px!important;left:12px!important;padding:8px 11px!important;border-radius:11px!important;box-shadow:0 4px 18px #001a26a8!important}',
    '.brand strong{font-size:14px!important;letter-spacing:.12em!important}',
    '.brand small{font-size:8px!important}',
    '.status{z-index:7;top:12px!important;right:12px!important;font-size:10px!important;max-width:40%!important;padding:7px 9px!important}',
    '.panel{z-index:18;left:12px!important;right:auto!important;bottom:71px!important;',
    'width:min(345px,calc(100vw - 24px))!important;max-width:345px!important;',
    'max-height:calc(100dvh - 145px)!important;overflow-y:auto!important;',
    'border-radius:15px!important;padding:12px!important;box-shadow:0 12px 55px #0009!important}',
    '.panel .panel-head h1{font-size:17px!important;margin:2px 0!important}',
    '.panel .places button{font-size:11px!important;padding:7px 8px!important}',
    '.panel .toggles button{padding:8px 4px!important;font-size:11px!important}',
    '.sic-v5-tabs{position:relative!important;top:auto!important}',
    '.sic-v5-tabs button{font-size:11px!important;padding:8px 3px!important}',
    '.sic-floating{position:fixed;left:12px;bottom:max(12px,env(safe-area-inset-bottom));',
    'display:flex;flex-wrap:wrap;gap:7px;z-index:21}',
    '.sic-floating button{background:#0c2a3de8;color:white;border:1px solid #75cdd2a5;',
    'border-radius:11px;font-size:12px;font-weight:700;padding:11px 14px;',
    'box-shadow:0 5px 20px #0006;backdrop-filter:blur(10px)}',
    '.sic-floating button.active{background:#1d6a75}',
    'body.sic-panel-closed .panel{display:none!important}',
    'body.sic-walk .panel{display:none!important}',
    '.sic-walk-controls{position:fixed;right:12px;bottom:max(16px,env(safe-area-inset-bottom));',
    'z-index:22;display:none;width:178px;touch-action:none;user-select:none}',
    'body.sic-walk .sic-walk-controls{display:block}',
    '.sic-walk-grid{display:grid;grid-template-columns:repeat(3,54px);grid-template-rows:repeat(2,54px);gap:5px;justify-content:end}',
    '.sic-walk-grid button{font-size:20px;font-weight:700;background:#0b3448e8;',
    'color:white;border:1px solid #9dd8e7a8;border-radius:13px;touch-action:none;',
    'box-shadow:0 5px 16px #0005;user-select:none}',
    '.sic-walk-grid button:active{background:#26778e}',
    '.sic-walk-info{position:fixed;left:12px;bottom:max(84px,env(safe-area-inset-bottom) + 72px);',
    'max-width:min(285px,65vw);z-index:22;background:#072a3ce9;border:1px solid #8aabba77;',
    'padding:12px;border-radius:13px;color:white;display:none;box-shadow:0 8px 25px #0007}',
    '.sic-walk-info strong{display:block;font-size:13px;margin-bottom:5px}',
    '.sic-walk-info small{font-size:10px;line-height:1.45;color:#c5e1ea}',
    '.sic-walk-info button{margin-top:8px;font-size:11px;padding:7px 10px;border-radius:8px}',
    'body.sic-walk .sic-walk-info{display:block}',
    '.sic-avatar{width:46px;height:62px;display:flex;align-items:center;justify-content:center;',
    'font-size:33px;filter:drop-shadow(0 2px 2px #041f2e);pointer-events:none;',
    'transform-origin:center bottom}',
    '.sic-avatar:after{content:"";position:absolute;bottom:4px;width:27px;height:9px;',
    'border-radius:50%;background:#03182188;z-index:-1}',
    'body.sic-walk .sic-floating{top:72px;bottom:auto}',
    'body.sic-walk #sic-menu-v6{display:none}',
    '.sic-guide{color:#b4d5e1;font-size:10px;line-height:1.5}',
    '@media(max-width:650px){.panel{max-height:62dvh!important}.status{top:60px!important;',
    'right:9px!important;font-size:9px!important;max-width:45%!important}',
    '.sic-walk-info{bottom:95px;max-width:51vw}.sic-floating button{padding:10px 11px}}'
  ].join('');
  document.head.appendChild(css);
  const tools=document.createElement('div');tools.className='sic-floating';
  const menu=document.createElement('button');
  menu.id='sic-menu-v6';menu.type='button';menu.textContent='☰ Menü';
  menu.setAttribute('aria-expanded','false');
  const walk=document.createElement('button');
  walk.id='sic-walk-v6';walk.type='button';walk.textContent='🚶 Piazza erkunden';
  tools.append(menu,walk);document.body.appendChild(tools);
  const controls=document.createElement('section');controls.className='sic-walk-controls';
  controls.setAttribute('aria-label','Steuerung der Spielfigur');
  controls.innerHTML='<div class="sic-walk-grid">'+
    '<span></span><button data-key="forward" aria-label="Vorwärts">▲</button><span></span>'+
    '<button data-key="left" aria-label="Links drehen">◀</button>'+
    '<button data-key="back" aria-label="Rückwärts">▼</button>'+
    '<button data-key="right" aria-label="Rechts drehen">▶</button>'+
    '</div>';
  document.body.appendChild(controls);
  const hud=document.createElement('aside');hud.className='sic-walk-info';
  hud.innerHTML='<strong>🚶 Piazza · Erkundungsmodus</strong>'+
    '<small id="sic-walk-text">Bewege deine Figur mit den Pfeilen oder W/A/S/D. Kamera und Hausmodelle folgen der Bewegung.</small>'+
    '<div><button id="sic-walk-view" type="button">🎥 Kamera wechseln</button></div>'+
    '<div><button id="sic-walk-exit" type="button">✕ Modus verlassen</button></div>';
  document.body.appendChild(hud);
  const previous=document.querySelector('.panel');
  // Hide the panel on first visit, but never discard its features.
  function setPanel(open){
    document.body.classList.toggle('sic-panel-closed',!open);
    menu.textContent=open?'✕ Schliessen':'☰ Menü';
    menu.setAttribute('aria-expanded',String(open));
  }
  setPanel(false);
  menu.onclick=()=>setPanel(document.body.classList.contains('sic-panel-closed'));
  const headToggle=$('sic-min');
  if(headToggle) headToggle.addEventListener('click',()=>{
    // Existing behavior toggles .panel.minimized, but hide completely for a clean map.
    setPanel(false);
    previous.classList.remove('minimized');
    headToggle.textContent='▾';
  });
  // Clicking Map -> chosen location should close the big menu to show the result.
  const jump=(lng,lat,zoom,bearing,pitch)=>{
    const s=API.state;
    s.height=Math.min(s.height,1);
    const slider=$('sic-height');
    if(slider){slider.value='1';$('sic-hval').textContent='1.0×';}
    if(map.getSource('sic-terrain'))map.setTerrain({source:'sic-terrain',exaggeration:1});
    if(s.mode==='relief') {
      s.mode='sat';API.applyModes();
      document.querySelectorAll('#sic-modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode==='sat'));
    }
    if(s.popup){s.popup.remove();s.popup=null;}
    map.flyTo({center:[lng,lat],zoom,pitch,bearing,duration:1350});
    setPanel(false);
  };
  walk.onclick=()=>walking.active?stopWalk():startWalk();
  // Override overly steep v5 camera buttons. A gentler angle and true scale avoid enormous beige walls.
  const hookups=[
    ['v5-piazza',()=>jump(PIAZZA.lng,PIAZZA.lat,17.2,148,54)],
    ['v5-hills',()=>jump(PIAZZA.lng,PIAZZA.lat,13.7,145,57)]
  ];
  for(const [id,fn] of hookups){
    const b=$(id);if(!b)continue;
    b.addEventListener('click',e=>{e.stopImmediatePropagation();fn();},true);
  }
  // For all selection buttons, permit details, then keep map visible if choosing Piazza.
  $('places')?.addEventListener('click',e=>{
    const b=e.target.closest('button[data-name]');
    if(b?.dataset.name==='Piazza Chiesa · Casalvecchio')
      requestAnimationFrame(()=>jump(PIAZZA.lng,PIAZZA.lat,17.2,148,54));
  },true);
  function meters(lng,lat,heading,distance){
    const rad=heading*Math.PI/180;
    const latNext=lat+Math.cos(rad)*distance/111320;
    const lonNext=lng+Math.sin(rad)*distance/(111320*Math.cos(lat*Math.PI/180));
    return {lng:lonNext,lat:latNext};
  }
  function camera(){
    if(!walking.active)return;
    if(!map.getSource('sic-terrain'))return;
    const target=walking.view==='shoulder'
      ? meters(walking.lng,walking.lat,walking.heading,9)
      : {lng:walking.lng,lat:walking.lat};
    map.jumpTo({center:[target.lng,target.lat],
      bearing:walking.heading,pitch:walking.view==='shoulder'?62:40,
      zoom:walking.view==='shoulder'?19.1:18.4});
    if(walking.marker)walking.marker.setLngLat([walking.lng,walking.lat]);
  }
  function move(dt){
    const k=walking.keys;
    const turnSpeed=92,moveSpeed=2.8;
    if(k.has('left'))walking.heading=(walking.heading-turnSpeed*dt+360)%360;
    if(k.has('right'))walking.heading=(walking.heading+turnSpeed*dt+360)%360;
    const sign=(k.has('forward')?1:0)-(k.has('back')?1:0);
    if(sign){
      const nxt=meters(walking.lng,walking.lat,walking.heading,sign*moveSpeed*dt);
      walking.lng=nxt.lng;walking.lat=nxt.lat;
    }
  }
  function animate(now){
    if(!walking.active)return;
    const dt=Math.min(.06,(now-(walking.lastTime||now))/1000);
    walking.lastTime=now;
    if(dt&&walking.keys.size){
      move(dt);
      if(now-walking.lastRender>38){camera();walking.lastRender=now;}
    }
    walking.animation=requestAnimationFrame(animate);
  }
  function beginControl(key){
    if(!walking.active)return;
    walking.keys.add(key);
    // Respond to a short tap, not only a long press.
    if(key==='left')walking.heading=(walking.heading-6+360)%360;
    else if(key==='right')walking.heading=(walking.heading+6+360)%360;
    else if(key==='forward'||key==='back'){
      const step=meters(walking.lng,walking.lat,walking.heading,key==='forward'?0.8:-0.8);
      walking.lng=step.lng;walking.lat=step.lat;
    }
    camera();
  }
  controls.querySelectorAll('button[data-key]').forEach(b=>{
    const key=b.dataset.key;
    b.addEventListener('pointerdown',e=>{e.preventDefault();beginControl(key);try{b.setPointerCapture(e.pointerId);}catch(_){}});
    for(const evt of ['pointerup','pointercancel','lostpointercapture'])
      b.addEventListener(evt,()=>walking.keys.delete(key));
    b.addEventListener('contextmenu',e=>e.preventDefault());
  });
  const mapKeys={ArrowUp:'forward',ArrowDown:'back',ArrowLeft:'left',ArrowRight:'right',
    w:'forward',s:'back',a:'left',d:'right'};
  document.addEventListener('keydown',e=>{
    if(!walking.active||e.target.closest('input,textarea,select'))return;
    const key=mapKeys[e.key];if(!key)return;
    e.preventDefault();
    if(!e.repeat&&!walking.keys.has(key))beginControl(key);
  });
  document.addEventListener('keyup',e=>{const key=mapKeys[e.key];if(key)walking.keys.delete(key);});
  window.addEventListener('blur',()=>walking.keys.clear());
  document.addEventListener('visibilitychange',()=>{if(document.hidden)walking.keys.clear();});
  function startWalk(){
    if(walking.active)return;
    walking.active=true;walking.keys.clear();
    walking.lng=PIAZZA.lng;walking.lat=PIAZZA.lat;walking.heading=155;walking.view='shoulder';
    walking.previous={center:map.getCenter(),zoom:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing(),
      exaggeration:API.state.height,mode:API.state.mode};
    // Use satellite imagery and near-real terrain to reduce visual artefacts.
    API.state.mode='sat';API.applyModes();
    document.querySelectorAll('#sic-modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode==='sat'));
    API.state.height=0.7;
    if(map.getSource('sic-terrain'))map.setTerrain({source:'sic-terrain',exaggeration:0.7});
    if(API.state.popup){API.state.popup.remove();API.state.popup=null;}
    const avatar=document.createElement('div');avatar.className='sic-avatar';
    avatar.textContent='🚶';avatar.setAttribute('aria-label','Spielfigur');
    walking.marker=new maplibregl.Marker({element:avatar,anchor:'bottom'}).setLngLat([walking.lng,walking.lat]).addTo(map);
    document.body.classList.add('sic-walk');
    setPanel(false);
    walk.textContent='✕ Erkunden beenden';walk.classList.add('active');
    walking.lastTime=0;walking.lastRender=0;
    map.stop();camera();
    walking.animation=requestAnimationFrame(animate);
  }
  function stopWalk(){
    if(!walking.active)return;
    walking.active=false;walking.keys.clear();
    cancelAnimationFrame(walking.animation);
    walking.marker?.remove();walking.marker=null;
    document.body.classList.remove('sic-walk');
    walk.textContent='🚶 Piazza erkunden';walk.classList.remove('active');
    if(walking.previous){
      const p=walking.previous;
      API.state.mode=p.mode;API.state.height=p.exaggeration;
      API.applyModes();
      document.querySelectorAll('#sic-modes button').forEach(b=>b.classList.toggle('on',b.dataset.mode===p.mode));
      if(map.getSource('sic-terrain'))map.setTerrain({source:'sic-terrain',exaggeration:p.exaggeration});
      const slider=$('sic-height');if(slider){slider.value=String(p.exaggeration);$('sic-hval').textContent=p.exaggeration.toFixed(1)+'×';}
      map.flyTo({center:[PIAZZA.lng,PIAZZA.lat],zoom:16.6,pitch:52,bearing:150,duration:1000});
    }
  }
  $('sic-walk-exit').onclick=stopWalk;
  $('sic-walk-view').onclick=()=>{
    walking.view=walking.view==='shoulder'?'overview':'shoulder';
    $('sic-walk-view').textContent=walking.view==='shoulder'?'🎥 Übersichtskamera':'🎥 Schulterkamera';
    camera();
  };
  // Prevent normal page UI from obscuring the map when on a tiny screen.
  window.addEventListener('resize',()=>{if(walking.active)camera();});
  console.info('SICILIA 3D v6.0: map-first UI and game-like avatar walking enabled.');
})();
