/* SICILIA 3D v10.5 – refreshed, timestamped Open-Meteo model conditions.
   No fabricated weather, no claim of on-site sensor measurements. */
const cache=new Map();
const codes={
  0:['☀️','Klar'],1:['🌤️','Überwiegend klar'],2:['⛅','Teilweise bewölkt'],
  3:['☁️','Bewölkt'],45:['🌫️','Nebel'],48:['🌫️','Gefrierender Nebel'],
  51:['🌦️','Leichter Nieselregen'],53:['🌦️','Nieselregen'],55:['🌧️','Starker Nieselregen'],
  61:['🌦️','Leichter Regen'],63:['🌧️','Regen'],65:['🌧️','Starker Regen'],
  71:['🌨️','Leichter Schneefall'],73:['🌨️','Schneefall'],75:['❄️','Starker Schneefall'],
  80:['🌦️','Leichte Regenschauer'],81:['🌧️','Regenschauer'],82:['⛈️','Heftige Schauer'],
  95:['⛈️','Gewitter'],96:['⛈️','Gewitter mit Hagel'],99:['⛈️','Kräftiges Gewitter']
};
export function weatherLabel(code){return codes[Number(code)]||['🌡️','Aktuelle Bedingungen'];}
export function weatherParams(lat,lon){
  return new URLSearchParams({
    latitude:String(lat),longitude:String(lon),
    current:'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,cloud_cover,wind_speed_10m,precipitation,is_day',
    hourly:'temperature_2m,precipitation_probability,weather_code,cloud_cover',
    forecast_days:'2',timezone:'Europe/Rome'
  });
}
export async function getWeather(lat,lon,{fresh=false}={}){
  if(!Number.isFinite(lat)||!Number.isFinite(lon))throw Error('Ungültige Ortskoordinaten');
  const key=lat.toFixed(3)+'/'+lon.toFixed(3);
  const prev=cache.get(key);
  if(!fresh&&prev&&Date.now()-prev.fetched<6*60*1000)return {...prev.value,cached:true};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),10000);
  let json;
  try{
    const response=await fetch('https://api.open-meteo.com/v1/forecast?'+weatherParams(lat,lon),{
      signal:controller.signal,cache:'no-store'});
    if(!response.ok)throw Error('Wetterdienst HTTP '+response.status);
    json=await response.json();
  }catch(err){
    if(prev&&Date.now()-prev.fetched<60*60*1000)
      return {...prev.value,cached:true,stale:true};
    throw err;
  }finally{clearTimeout(timeout);}
  const c=json?.current;
  if(!c||!Number.isFinite(c.temperature_2m))throw Error('Ungültige Wetterdaten');
  const forecast=[];
  const times=json?.hourly?.time||[];
  const now=c.time||'';
  const first=times.findIndex(t=>t>=now.slice(0,13));
  if(first>=0)for(let k=first;k<Math.min(first+6,times.length);k++){
    forecast.push({time:times[k],temperature:json.hourly.temperature_2m?.[k],
      chance:json.hourly.precipitation_probability?.[k],
      weather:json.hourly.weather_code?.[k],clouds:json.hourly.cloud_cover?.[k]});
  }
  const result={current:c,forecast,timezone:json.timezone||'Europe/Rome',
    fetched:new Date().toISOString(),cached:false,stale:false};
  cache.set(key,{value:result,fetched:Date.now()});return result;
}
export function formatWeather(data){
  const c=data.current,[emoji,label]=weatherLabel(c.weather_code);
  const fmt=(value,unit)=>Number.isFinite(value)?Math.round(value)+unit:'–';
  return {
    emoji,label,temp:fmt(c.temperature_2m,'°C'),
    feels:fmt(c.apparent_temperature,'°C'),
    humidity:fmt(c.relative_humidity_2m,'%'),
    clouds:fmt(c.cloud_cover,'%'),
    wind:fmt(c.wind_speed_10m,' km/h'),
    precipitation:Number.isFinite(c.precipitation)?c.precipitation.toFixed(1)+' mm':'–',
    time:c.time||'Zeit unbekannt',fetched:data.fetched
  };
}
export function weatherDescription(data){
  const c=formatWeather(data);
  return c.emoji+' '+c.temp+' · '+c.label+' · Wolken '+c.clouds+' · Wind '+c.wind;
}
