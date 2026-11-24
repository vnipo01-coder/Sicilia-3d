/* SICILIA 3D v10.7 – illustrative weather-driven drifting cloud layer.
   CLOUDS ARE NOT a live satellite feed or physically simulated 3D volumes.
   Position is illustrative; wind speed/direction and cloud cover derive from
   Open-Meteo model values at the currently selected place. */
export function clamp(v,min,max){return Math.max(min,Math.min(max,Number(v)||0));}
export function cloudDrift(windFrom=270,windKmh=12,bearing=0){
  // Meteorological wind direction is FROM, so travel 180 degrees opposite.
  const to=(Number(windFrom)+180-Number(bearing))*Math.PI/180;
  const speed=clamp(windKmh*.35,1.4,22);
  return{x:Math.sin(to)*speed,y:-Math.cos(to)*speed,speed};
}
export function cloudOpacity(cover,scale=1){
  return clamp(cover,0,100)/100*clamp(scale,0,1)*.30;
}
export class CloudVisual{
  constructor(canvas,map){
    this.canvas=canvas;
    this.map=map;
    this.ctx=canvas.getContext('2d',{alpha:true});
    if(!this.ctx)throw Error('Kein Canvas-Kontext für Wolken');
    this.cover=38;this.wind=12;this.direction=280;
    this.enabled=false;this.intensity=1;this.prev=0;this.raf=0;
    this.sprites=[];
    this.cloudSprite=this.makeCloud();
    this.resize();
    const seed=()=>Math.random();
    for(let i=0;i<80;i++){
      this.sprites.push({
        x:seed(),y:seed(),size:.4+seed()*1.4,
        speed:.5+seed()*.7,depth:.35+seed()*.65
      });
    }
    this.resizeHandler=()=>this.resize();
    window.addEventListener('resize',this.resizeHandler);
    this.visibilityHandler=()=>{
      if(this.enabled&&!document.hidden&&!this.raf){
        this.prev=0;this.raf=requestAnimationFrame(this.frame);
      }
    };
    document.addEventListener('visibilitychange',this.visibilityHandler);
    this.reducedMotion=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
    this.frame=this.frame.bind(this);
  }
  makeCloud(){
    const sprite=document.createElement('canvas');
    sprite.width=256;sprite.height=140;
    const c=sprite.getContext('2d');
    if(!c)return sprite;
    // Soft, multi-lobed cloud silhouette. A 2D stylistic overlay,
    // not a reconstructed cloud geometry.
    for(const lobe of [
      [82,78,62,.55],[122,58,72,.78],[174,77,60,.62],
      [126,96,96,.4],[53,100,38,.25],[212,98,36,.27]]){
      const [x,y,r,alpha]=lobe;
      const g=c.createRadialGradient(x,y,r*.03,x,y,r);
      g.addColorStop(0,'rgba(255,255,255,'+alpha+')');
      g.addColorStop(.33,'rgba(251,253,255,'+(alpha*.72)+')');
      g.addColorStop(.75,'rgba(239,247,251,'+(alpha*.24)+')');
      g.addColorStop(1,'rgba(232,244,250,0)');
      c.fillStyle=g;c.fillRect(x-r,y-r,2*r,2*r);
    }
    return sprite;
  }
  resize(){
    const scale=Math.min(1.25,window.devicePixelRatio||1);
    this.canvas.width=Math.max(1,Math.round(innerWidth*scale));
    this.canvas.height=Math.max(1,Math.round(innerHeight*scale));
    this.ctx.setTransform(scale,0,0,scale,0,0);
    this.w=innerWidth;this.h=innerHeight;this.scale=scale;
  }
  setWeather(weather={}){
    if(Number.isFinite(weather.cloud_cover))this.cover=clamp(weather.cloud_cover,0,100);
    if(Number.isFinite(weather.wind_speed_10m))this.wind=clamp(weather.wind_speed_10m,0,160);
    if(Number.isFinite(weather.wind_direction_10m))this.direction=weather.wind_direction_10m;
  }
  setIntensity(value){this.intensity=clamp(value,0,1);}
  setEnabled(value){
    this.enabled=Boolean(value);
    this.canvas.hidden=!this.enabled;
    if(this.enabled&&!this.raf){this.prev=0;this.raf=requestAnimationFrame(this.frame);}
    if(!this.enabled&&this.raf){
      cancelAnimationFrame(this.raf);this.raf=0;
      this.ctx.clearRect(0,0,this.w,this.h);
    }
  }
  frame(t){
    this.raf=0;
    if(!this.enabled||document.hidden)return;
    if(this.prev&&t-this.prev<65){this.raf=requestAnimationFrame(this.frame);return;}
    const dt=Math.min(.09,this.prev?(t-this.prev)/1000:.016);
    this.prev=t;
    this.draw(dt);
    this.raf=requestAnimationFrame(this.frame);
  }
  draw(dt){
    const ctx=this.ctx,w=this.w,h=this.h;
    ctx.clearRect(0,0,w,h);
    const cover=clamp(this.cover,0,100);
    if(cover<3||this.intensity<.01)return;
    const p=this.map?.getPitch?.()||0;
    const z=this.map?.getZoom?.()||9;
    const b=this.map?.getBearing?.()||0;
    const drift=cloudDrift(this.direction,this.wind,b);
    const count=Math.round(7+cover*.48);
    const maxY=p>=50?.72:1;
    const base=cloudOpacity(cover,this.intensity)*
      (z>15?.80:.93);
    for(let i=0;i<count;i++){
      const c=this.sprites[i];
      c.x+=drift.x*dt*c.speed/Math.max(1,w);
      c.y+=drift.y*dt*c.speed/Math.max(1,h);
      if(c.x>1.3)c.x=-.3;
      if(c.x<-.3)c.x=1.3;
      if(c.y>1.3)c.y=-.3;
      if(c.y<-.3)c.y=1.3;
      const wx=c.x*w,wy=c.y*h*maxY;
      const sz=clamp(w*.16*c.size,100,420);
      ctx.globalAlpha=base*(.55+.42*c.depth);
      ctx.drawImage(this.cloudSprite,wx-sz*.5,wy-sz*.26,sz,sz*.55);
    }
    ctx.globalAlpha=1;
  }
  destroy(){
    this.setEnabled(false);
    window.removeEventListener('resize',this.resizeHandler);
    document.removeEventListener('visibilitychange',this.visibilityHandler);
  }
}
