/* SICILIA 3D v10.7 – guided cinematic camera flight over Sicily.
   A 3D-map camera tour, NOT a simulated aircraft or real flight trajectory. */
export const FLIGHT_STOPS=Object.freeze([
 {name:'Santa Teresa di Riva · Küste',lon:15.3683,lat:37.94533,zoom:15.2,pitch:70,bearing:-35},
 {name:'Taormina · Ionisches Meer',lon:15.288,lat:37.852,zoom:13.5,pitch:68,bearing:-70},
 {name:'Ätna · Vulkantopografie',lon:14.9934,lat:37.751,zoom:11.7,pitch:68,bearing:-120},
 {name:'Catania · Stadtstruktur',lon:15.0873,lat:37.5028,zoom:13.7,pitch:63,bearing:-20},
 {name:'Siracusa · Südostküste',lon:15.293,lat:37.063,zoom:12.6,pitch:67,bearing:42},
 {name:'Noto und Val di Noto',lon:15.070,lat:36.891,zoom:12.8,pitch:63,bearing:30},
 {name:'Ragusa · Hügelland',lon:14.728,lat:36.925,zoom:12.7,pitch:66,bearing:-45},
 {name:'Agrigento · Südküste',lon:13.5766,lat:37.3111,zoom:12.8,pitch:62,bearing:25},
 {name:'Trapani · Westküste',lon:12.535,lat:38.0176,zoom:12.2,pitch:63,bearing:5},
 {name:'Palermo · Nordküste',lon:13.3615,lat:38.1157,zoom:13.3,pitch:68,bearing:55},
 {name:'Messina · Meeresenge',lon:15.554,lat:38.1938,zoom:12.8,pitch:64,bearing:135}
]);
export function tourDurationMs(speed=1){
  const v=Math.max(.5,Math.min(2,Number(speed)||1));
  return Math.round(8000/v);
}
export function makeFlightTour(map,callback=()=>{}){
  let active=false,index=0,speed=1,hold=null;
  function stop(reason='Gestoppt'){
    if(hold){clearTimeout(hold);hold=null;}
    if(!active)return;
    active=false;map.stop();
    callback({active:false,index,reason});
  }
  function run(){
    if(!active)return;
    if(index>=FLIGHT_STOPS.length){
      stop('Rundflug abgeschlossen');return;
    }
    const p=FLIGHT_STOPS[index];
    callback({active:true,index,total:FLIGHT_STOPS.length,stop:p});
    map.flyTo({center:[p.lon,p.lat],zoom:p.zoom,pitch:p.pitch,bearing:p.bearing,
      duration:tourDurationMs(speed),essential:true,curve:1.15});
  }
  const onMoveEnd=()=>{
    if(!active)return;
    if(hold)clearTimeout(hold);
    hold=setTimeout(()=>{hold=null;index++;run();},450);
  };
  map.on('moveend',onMoveEnd);
  function start(speedValue=1){
    stop();
    index=0;speed=Math.max(.5,Math.min(2,Number(speedValue)||1));
    active=true;run();
  }
  // Genuine user camera input interrupts the automated tour.
  const onUserGesture=()=>{if(active)stop('Manuell gesteuert');};
  map.on('dragstart',onUserGesture);
  const canvas=map.getCanvas();
  canvas.addEventListener('wheel',onUserGesture,{passive:true});
  canvas.addEventListener('pointerdown',onUserGesture);
  return {
    start,stop,
    setSpeed(v){speed=Math.max(.5,Math.min(2,Number(v)||1));},
    get active(){return active;},
    get index(){return index;},
    destroy(){
      stop();map.off('moveend',onMoveEnd);map.off('dragstart',onUserGesture);
      canvas.removeEventListener('wheel',onUserGesture);
      canvas.removeEventListener('pointerdown',onUserGesture);
    }
  };
}
