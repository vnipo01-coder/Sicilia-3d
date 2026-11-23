/* SICILIA 3D v10.5 – location-specific reference registry.
   All quoted summaries are intentionally short, backed by linked sources.
   A town fact must never be treated as the construction year of a house. */
export const SANTA={name:'Santa Teresa di Riva',lat:37.94533,lon:15.36830,zoom:16.4};
export const STOPS=Object.freeze([
 {id:'bus-494',name:'Lungomare Barracca',lat:37.9393543554652,lon:15.3628167268097,
  operator:'Buscenter/Interbus',dataId:'494',kind:'bus',
  origin:'Buscenter – Verzeichnis der Haltestellen',
  url:'https://buscenter.travel/wp-content/themes/bcenter/controller/get_orari.php?cmd=lista_fermate'},
 {id:'bus-606',name:'Via Savoca',lat:37.9417550549932,lon:15.3596597089612,
  operator:'Buscenter/Interbus',dataId:'606',kind:'bus',
  origin:'Buscenter – Verzeichnis der Haltestellen',
  url:'https://buscenter.travel/wp-content/themes/bcenter/controller/get_orari.php?cmd=lista_fermate'},
 {id:'bus-municipio',name:'Lungomare Pozzo Lazzaro (Municipio)',lat:37.94533,lon:15.36830,
  approximate:true,kind:'bus',operator:'Interbus',origin:'Interbus-Mitteilung vom 25.06.2026',
  url:'https://www.interbus.it/santateresa-mofidica-fermata25giugno2026/'}
]);
export const LOCAL_REFERENCES=Object.freeze([
 {id:'comune-history',title:'Gemeinde und Ortsgeschichte',
  facts:'Der Ort liegt an der ionischen Küste zwischen Messina und Taormina. Die kommunale Ortsbeschreibung erläutert die Entwicklung des Siedlungsnamens Santa Teresa di Riva.',
  attribution:'Comune di Santa Teresa di Riva – Municipio',
  url:'https://www.comune.santateresadiriva.me.it/it/vivere/municipio',type:'amtlich'},
 {id:'comune-tourism',title:'Sehenswürdigkeiten und Kulturerbe',
  facts:'Das offizielle Tourismusportal der Gemeinde führt Kirchen und weitere kulturelle Sehenswürdigkeiten auf. Details zu einzelnen Bauwerken sollten über die jeweilige Objektseite überprüft werden.',
  attribution:'Comune di Santa Teresa di Riva – Turismo',
  url:'https://www.comune.santateresadiriva.me.it/it/topics/turismo',type:'amtlich'},
 {id:'chiesa-sacro',title:'Chiesa del Sacro Cuore di Gesù',
  facts:'Die Gemeinde beschreibt die Geschichte von Kirche und religiösem Institut; die Einweihung fand laut Gemeinde am 8. Dezember 1922 statt.',
  attribution:'Comune di Santa Teresa di Riva – Kirchen-/Denkmalseite',
  url:'https://comune.santateresadiriva.me.it/it/vivere/753098',type:'amtlich'},
 {id:'chiesa-famiglia',title:'Chiesa della Sacra Famiglia',
  facts:'Die Gemeinde beschreibt die Kirche im Ortszentrum als einschiffiges Gebäude mit bedeutenden religiösen Kunstwerken und Ausstattung.',
  attribution:'Comune di Santa Teresa di Riva – Kultur',
  url:'https://www.comune.santateresadiriva.me.it/it/vivere/chiesa-della-sacra-famiglia',type:'amtlich'},
 {id:'interbus-notice',title:'Interbus: geänderte Haltestellen',
  facts:'Interbus informierte am 25. Juni 2026, dass Busse in beiden Richtungen am Lungomare Pozzo Lazzaro (Municipio) halten; frühere Halte entlang der SS114 wurden laut damaliger Mitteilung verlegt. Vor Reiseantritt aktuelle Änderungen prüfen.',
  attribution:'Interbus – offizielle Mitteilung 25.06.2026',
  url:'https://www.interbus.it/santateresa-mofidica-fermata25giugno2026/',type:'verkehr'},
 {id:'train',title:'Regionale Zugfahrpläne',
  facts:'Trenitalia veröffentlicht regionale Fahrpläne. Eine dort recherchierte Abfahrtszeit ist eine planmässige, keine automatisch gemessene Zugposition.',
  attribution:'Trenitalia – digitale regionale Fahrpläne',
  url:'https://www.trenitalia.com/it/informazioni/orari-regionali-digitali.html',type:'verkehr'}
]);
export const LINKS={
  transport:'https://www.interbus.it/',
  transportNotice:'https://www.interbus.it/santateresa-mofidica-fermata25giugno2026/',
  trains:'https://www.trenitalia.com/it/informazioni/orari-regionali-digitali.html',
  mapillary:'https://www.mapillary.com/app/',
  municipality:'https://www.comune.santateresadiriva.me.it/it/topics/turismo'
};
export function haversineMetres(a,b){
  const rad=Math.PI/180,R=6371000;
  const dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
  const k=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
  return 2*R*Math.asin(Math.min(1,Math.sqrt(k)));
}
export function inSantaTeresa(obj,radiusMetres=2700){
  return Number.isFinite(obj?.lat)&&Number.isFinite(obj?.lon)&&
    haversineMetres(obj,SANTA)<=radiusMetres;
}
export function isSpecificChurch(obj){
  const name=String(obj?.name||'').toLowerCase();
  if(/sacro cuore/.test(name))return 'chiesa-sacro';
  if(/sacra famiglia/.test(name))return 'chiesa-famiglia';
  return null;
}
export function contextualSources(obj){
  if(!inSantaTeresa(obj))return [];
  const id=isSpecificChurch(obj);
  if(id)return LOCAL_REFERENCES.filter(s=>s.id===id);
  if(obj?.kind==='Gebäude')return []; // town-history is NOT a fact about a random building
  return LOCAL_REFERENCES;
}
export function streetImageryUrl(lat,lon){
  // Discovery link, not proof of photo coverage at this exact coordinate.
  return LINKS.mapillary+'?lat='+encodeURIComponent(lat)+'&lng='+encodeURIComponent(lon)+'&z=17';
}
export function stopDetails(stop){
  const records=[
    {label:'Betreiber/Informationsquelle',value:stop.operator},
    {label:'Haltestelle',value:stop.name},
    {label:'Position',value:stop.approximate?'ungefähr am Municipio, kein exakt verifizierter Mast':'Koordinate aus Haltestellenverzeichnis'},
    {label:'Abfahrtsanzeige',value:'Keine Echtzeit-API verifiziert; offizielle Fahrpläne öffnen'},
    {label:'Fahrplanänderung',value:'Interbus-Mitteilung vom 25.06.2026 beachten'}
  ];
  return records;
}
