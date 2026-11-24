/* v10.5 open knowledge: official municipality cards, Wikipedia, Wikidata.
 * Titles alone are not proof of matching a building. */
import {contextualSources} from './local-sources.js?v=141';
export function officialKnowledge(obj){return contextualSources(obj);}
async function jsonFetch(url,timeoutMs=7500){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{signal:controller.signal});
    if(!response.ok)throw Error('HTTP '+response.status);
    return await response.json();
  }finally{clearTimeout(timer);}
}
function distanceKm(lat1,lon1,lat2,lon2){
  return Math.hypot((lat1-lat2)*111,(lon1-lon2)*88);
}
export async function lookupWikipedia(obj){
  if(obj.kind==='Bushaltestelle')return null;
  if(obj.kind==='Gebäude'&&!obj.props?.wikidata&&!obj.props?.wikipedia)return null;
  const referenced=String(obj.props?.wikipedia||'');
  for(const lang of ['de','it']){
    let title=obj.name;
    if(referenced&&referenced.startsWith(lang+':'))title=referenced.slice(lang.length+1);
    try{
      const params=new URLSearchParams({action:'query',prop:'extracts|info|coordinates',
        inprop:'url',titles:title,exintro:'1',explaintext:'1',
        redirects:'1',format:'json',origin:'*'});
      const data=await jsonFetch('https://'+lang+'.wikipedia.org/w/api.php?'+params);
      const page=Object.values(data.query?.pages||{})[0];
      if(!page||page.missing!==undefined||!page.extract)continue;
      const location=page.coordinates?.[0];
      if(location){
        const distance=distanceKm(location.lat,location.lon,obj.lat,obj.lon);
        const maxDistance=obj.kind==='Gebäude'?0.35:obj.kind==='Sehenswürdigkeit'?2:16;
        if(distance>maxDistance)continue;
      }else if(obj.kind==='Gebäude'&&!referenced)continue;
      return {title:page.title,text:page.extract.slice(0,1050),
        attribution:'Wikipedia '+lang.toUpperCase()+
          (location?' · Koordinaten geprüft':' · geografische Zuordnung nicht geprüft'),
        url:page.fullurl||'https://'+lang+'.wikipedia.org/wiki/'+encodeURIComponent(page.title)};
    }catch(error){console.info('Wikipedia not available',lang,error);}
  }
  return null;
}
export async function lookupWikidata(obj){
  if(obj.kind==='Bushaltestelle')return null;
  if(obj.kind==='Gebäude'&&!obj.props?.wikidata)return null;
  const direct=String(obj.props?.wikidata||'');
  const base='https://www.wikidata.org/w/api.php?';
  try{
    let ids=[];
    if(/^Q[0-9]+$/.test(direct))ids=[direct];
    else{
      for(const lang of ['it','de']){
        const q=new URLSearchParams({action:'wbsearchentities',search:obj.name,
          language:lang,type:'item',limit:'4',format:'json',origin:'*'});
        const data=await jsonFetch(base+q);
        ids=(data.search||[]).map(x=>x.id);
        if(ids.length)break;
      }
    }
    if(!ids.length)return null;
    const q=new URLSearchParams({action:'wbgetentities',ids:ids.slice(0,4).join('|'),
      props:'labels|descriptions|claims',languages:'de|it|en',
      format:'json',origin:'*'});
    const entities=(await jsonFetch(base+q)).entities||{};
    for(const id of ids){
      const e=entities[id];if(!e)continue;
      const point=e.claims?.P625?.[0]?.mainsnak?.datavalue?.value;
      if(!/^Q[0-9]+$/.test(direct)){
        if(!Number.isFinite(point?.latitude)||!Number.isFinite(point?.longitude))continue;
        const km=distanceKm(point.latitude,point.longitude,obj.lat,obj.lon);
        if(km>(obj.kind==='Gebäude'?0.35:5))continue;
      }
      const description=e.descriptions?.de?.value||e.descriptions?.it?.value||
        e.descriptions?.en?.value;
      if(!description)continue;
      return{title:e.labels?.de?.value||e.labels?.it?.value||obj.name,
        text:description,attribution:'Wikidata '+id+
          (point?' · Koordinaten abgeglichen':' · direkte Kennung aus OSM'),
        url:'https://www.wikidata.org/wiki/'+id};
    }
  }catch(error){console.info('Wikidata unavailable',error);}
  return null;
}
