/* v10.7 – thematic architecture profiles with factual source attribution.
   Historical explanations are linked to city/landmark; generic architecture
   reading is never described as a documented history of an unnamed house. */
import {cityForObject} from './city-pages.js?v=131';
const UNESCO_BAROQUE='https://whc.unesco.org/en/list/1024/';
const UNESCO_NORMAN='https://whc.unesco.org/en/list/1487/';
const ITALIAN_UNESCO='https://unesco.cultura.gov.it/en/projects/late-baroque-towns-of-the-val-di-noto-south-eastern-sicily/';
export const ARCHITECTURE_PROFILES=Object.freeze([
  {id:'santa-sacro',city:'Santa Teresa di Riva',title:'Chiesa del Sacro Cuore di Gesù',
   terms:['sacro cuore'],kind:'landmark',
   era:'20. Jahrhundert · belegte Einweihung 1922',
   paragraphs:[
     'Die Gemeindedokumentation beschreibt die Kirche zusammen mit dem angrenzenden religiösen Institut. Beide wurden am 8. Dezember 1922 eingeweiht. Damit lässt sich die Entstehungsphase dieser Anlage historisch einordnen, ohne allein aus der heutigen Fassade einen Baustil abzuleiten.',
     'Architektonisch sollte man den Sakralbau als Ensemble betrachten: die Beziehung zwischen Kirchenraum, angeschlossenem Institut und der Quartierstruktur. Grundriss, Aussenwand, Eingänge und das Umfeld sind im realen Ort zu prüfen. Das vereinfachte 3D-Kartenmodell bildet keine verifizierte Fenster- oder Fassadenrekonstruktion ab.',
     'Die Gemeinde hebt ausserdem die religiöse Bedeutung des Instituts hervor. Bei einer vertieften Untersuchung wäre zwischen dem belegten Eröffnungsdatum, späteren Veränderungen und dem heutigen Erhaltungszustand zu unterscheiden.'
   ],
   sources:[{title:'Comune di Santa Teresa di Riva – Kirchenbeschreibung',
     url:'https://comune.santateresadiriva.me.it/it/vivere/chiesa-del-sacro-cuore-di-gesu'}]},
  {id:'santa-famiglia',city:'Santa Teresa di Riva',title:'Chiesa della Sacra Famiglia',
   terms:['sacra famiglia'],kind:'landmark',
   era:'Religiöse Architektur · Dorf- und Platzbezug',
   paragraphs:[
     'Die Gemeinde führt die Chiesa della Sacra Famiglia an der Piazza Sacra Famiglia als eigenständigen kulturellen und religiösen Ort. Die Lage an einem benannten Platz ist für die städtebauliche Interpretation wichtig: Sakralbauten wirken über Fassaden und Innenraum hinaus als räumliche Bezugspunkte.',
     'Eine Architekturbetrachtung untersucht hier die Gliederung der Fassade, den Übergang vom öffentlichen Platz zum Kirchenraum, Öffnungen, Material und Innenausstattung. Solche Merkmale lassen sich aus einem einfachen Gebäudepolygon nicht hinreichend erschliessen; ihre genaue Form darf nicht automatisch aus dem 3D-Kartenkörper abgeleitet werden.',
     'Die Gemeindeseite dient als Einstieg für Objektbeschreibung und Originaladresse. Historische Bauphasen, Restaurierungen oder Künstlerzuschreibungen sind nur dann als Tatsachen zu übernehmen, wenn eine geeignete Quelle sie ausdrücklich belegt.'
   ],
   sources:[{title:'Comune di Santa Teresa di Riva – Sacra Famiglia',
     url:'https://www.comune.santateresadiriva.me.it/it/vivere/chiesa-della-sacra-famiglia'}]},
  {id:'santa-villa',city:'Santa Teresa di Riva',title:'Villa Crisafulli-Ragno',
   terms:['crisafulli','ragno'],kind:'landmark',
   era:'Historischer Villenbau · heutige kommunale Nutzung',
   paragraphs:[
     'Die Villa Crisafulli-Ragno ist ein dokumentiertes historisches Gebäude in Santa Teresa di Riva. Nach Angaben der Gemeinde wird das Haus für öffentliche Funktionen genutzt, unter anderem für Sitzungen des Gemeinderats. Solche Umnutzungen sind für die Baugeschichte relevant: repräsentative Wohnarchitektur wird Teil des städtischen Lebens.',
     'Für eine gebäudekundliche Analyse sind Baukörper und Raumfolge, Eingänge, Treppen, Tragstruktur, Fassadenachsen und mögliche Veränderungen durch die öffentliche Nutzung besonders aufschlussreich. Diese Details liegen nicht automatisch in OpenStreetMap vor und werden in der Karte nicht als gesicherte 3D-Fassaden ausgegeben.',
     'Die städtische Beschreibung ist die wichtigste Originalquelle für die Nutzungsgeschichte. Aussagen über Baumeister, Baujahr oder einzelne Ornamente sollen nur übernommen werden, wenn sie darin oder in Fachliteratur dokumentiert sind.'
   ],
   sources:[{title:'Comune di Santa Teresa di Riva – Villa Crisafulli-Ragno',
     url:'https://comune.santateresadiriva.me.it/it/vivere/753187'}]},
  {id:'santa-torre',city:'Santa Teresa di Riva',title:'Torre Catalmo',
   terms:['torre catalmo'],kind:'landmark',
   era:'Historischer Turmbau · bauliches Kulturerbe',
   paragraphs:[
     'Die Torre Catalmo ist im kommunalen Verzeichnis der historischen Orte erfasst. Türme sind baugeschichtlich nicht nur als vertikale Volumen, sondern als Konstruktionen mit besonderen Wandstärken, Zugängen, Öffnungen und einem Bezug zum ehemaligen Siedlungs- und Landschaftsraum zu untersuchen.',
     'Wird in der Karte lediglich ein rechteckiger 3D-Körper angezeigt, lassen sich weder das authentische Mauerwerk noch die genaue Gestalt von Dach, Öffnungen oder Bauphasen daraus erschliessen. Entsprechende Einzelheiten erfordern historische Aufnahmen, Pläne oder Bauaufnahmen.',
     'Die verlinkte Gemeindequelle dient als Ausgangspunkt für die Überprüfung des konkreten Denkmals. Der Vergleich von historischem Bestand und heutigem Stadtbild ist als eigenständige Forschungsfrage zu behandeln.'
   ],
   sources:[{title:'Comune di Santa Teresa di Riva – Torre Catalmo',
     url:'https://comune.santateresadiriva.me.it/it/vivere/753082'}]},
  {id:'baroque-noto',city:'Noto',title:'Spätbarocker Wiederaufbau im Val di Noto',
   terms:[],kind:'regional',
   era:'Nach dem Erdbeben von 1693 · sizilianischer Spätbarock',
   paragraphs:[
     'Die UNESCO beschreibt acht Städte und historische Ensembles des Val di Noto als aussergewöhnliches Beispiel spätbarocker Architektur und Stadtplanung. Der Charakter des Gebiets ist eng mit dem Wiederaufbau nach dem Erdbeben von 1693 verbunden.',
     'Kennzeichnend ist nicht nur die Gestaltung einzelner Kirchen und Palazzi, sondern das Zusammenwirken von Strassenachsen, Plätzen, Treppen, repräsentativen Fassaden und einer auf Wirkung im Stadtraum bedachten Baukomposition. Eine detaillierte Betrachtung sollte deshalb sowohl auf Gebäude- als auch Quartierebene erfolgen.',
     'Für einzelne Gebäude müssen Fassadendetails, Baujahr, Material und Urheberschaft separat belegt werden. Eine allgemeine UNESCO-Einordnung des Orts ist keine automatische Bestätigung eines konkreten OSM-Hauses als Barockgebäude.'
   ],
   sources:[{title:'UNESCO World Heritage Centre – Late Baroque Towns of the Val di Noto',url:UNESCO_BAROQUE},
     {title:'Ministero della Cultura – italienische UNESCO-Kulturgüter',url:ITALIAN_UNESCO}]},
  {id:'baroque-ragusa',city:'Ragusa',title:'Ragusa und die spätbarocke Stadtstruktur',
   terms:[],kind:'regional',
   era:'17.–18. Jahrhundert · Wiederaufbau und Städtebau',
   paragraphs:[
     'Ragusa gehört zu den acht Teilgebieten der UNESCO-Welterbestätte Val di Noto. Ihr architektonisches Profil ist im Zusammenhang der Wiederaufbauphase nach dem Erdbeben von 1693 zu analysieren.',
     'Die Wirkung barocker Strassen- und Platzräume entsteht aus dem Zusammenspiel von Höhenlage, geneigten Strassen, Treppen, Kirchenfassaden und geschlossener Blockbebauung. Das topografische Relief ist daher ein wichtiger Bestandteil des historischen Stadtgrundrisses und nicht bloss ein Hintergrund.',
     'Die volumetrische Kartendarstellung veranschaulicht Höhen und Gebäudemassen. Sie darf aber ohne objektbezogene Befunde nicht als photogrammetrischer Nachbau barocker Fassaden verstanden werden.'
   ],
   sources:[{title:'UNESCO – Late Baroque Towns of the Val di Noto',url:UNESCO_BAROQUE}]},
  {id:'baroque-catania',city:'Catania',title:'Barocke Stadtplanung und lokale Bautraditionen',
   terms:[],kind:'regional',
   era:'Städtebauliche Entwicklung nach 1693',
   paragraphs:[
     'Auch bestimmte Bereiche Catanias sind Teil der UNESCO-Welterbestätte Val di Noto. Die heutige Stadtgestalt steht in wichtigen Teilen im Zusammenhang mit dem Wiederaufbau nach dem Erdbeben von 1693.',
     'Bei der architektonischen Analyse sollten Monumentalbauten und öffentliche Räume gemeinsam untersucht werden: Strassenfluchten, Platzproportionen, Fassadengliederung und die Materialwirkung im städtischen Gesamtbild.',
     'Nicht jedes heutige Gebäude Catanias stammt aus dieser Epoche. Die Karte verwendet für unzureichend dokumentierte Baukörper deshalb eine funktionale Farbcodierung, keine behauptete Rekonstruktion eines bestimmten historischen Stils.'
   ],
   sources:[{title:'UNESCO World Heritage Centre – Val di Noto',url:UNESCO_BAROQUE}]},
  {id:'palermo-norman',city:'Palermo',title:'Arabisch-normannische Baukunst',
   terms:[],kind:'regional',
   era:'Normannisches Königreich Sizilien · 1130–1194',
   paragraphs:[
     'Die UNESCO-Welterbestätte Arabisch-normannisches Palermo mit den Kathedralen von Cefalù und Monreale umfasst neun religiöse und weltliche Monumente aus der Zeit des normannischen Königreichs Sizilien.',
     'Hervorgehoben wird eine Architektur, die unterschiedliche kulturelle Bau- und Dekorationstraditionen verbindet. Die UNESCO beschreibt insbesondere die Neugestaltung von Formen, Konstruktionen, Materialien und Bildprogrammen sowie Mosaiken und aufwendig gearbeitete Oberflächen.',
     'Eine wissenschaftlich tragfähige Einzelanalyse berücksichtigt räumliche Organisation, historische Bauphasen, Mauerwerks- und Dekorationssysteme. Die farbigen 3D-Baukörper der digitalen Karte sind hingegen Orientierungshilfen und keine Rekonstruktion dieser komplexen Denkmäler.'
   ],
   sources:[{title:'UNESCO – Arab-Norman Palermo, Cefalù and Monreale',url:UNESCO_NORMAN},
     {title:'Italienisches Kulturministerium – Arab-Norman Palermo',url:'https://unesco.cultura.gov.it/en/projects/palermo-arabo-normanna-e-le-cattedrali-cefalu-e-monreale/'}]},
  {id:'taormina-teatro',city:'Taormina',title:'Das antike Theater von Taormina',
   terms:['teatro antico','teatro greco'],kind:'regional',
   era:'Antike Theaterarchitektur · griechische Ursprünge, römische Umgestaltung',
   paragraphs:[
     'Das Teatro Antico gehört zu den bedeutendsten antiken Bauwerken Taorminas. Der archäologische Park der Region Sizilien weist darauf hin, dass der heute sichtbare Baubestand weitgehend von römischen Umgestaltungen geprägt ist, insbesondere aus der frühen Kaiserzeit.',
     'Architektonisch lässt sich das Theater anhand des halbkreisförmigen Zuschauerraums, der Bühnenanlage und der Einbindung in die steile Topografie untersuchen. Seine Wirkung im Landschaftsraum entsteht nicht allein aus der Bauform, sondern auch aus der Beziehung von Bauwerk, Höhenlage, Meer und Ätna.',
     'Der 3D-Kartenatlas kann das Relief und vorhandene Bauwerksgrundrisse zeigen. Die tatsächliche Gestalt antiker Säulen, Sitzreihen, Durchgänge und rekonstruierten Bauteile erfordert dagegen archäologische Fachpläne; eine einfache Extrusion ist kein authentisches antikes Modell.'
   ],
   sources:[{title:'Regione Siciliana – Parco archeologico Naxos Taormina, Teatro Antico',
     url:'https://parchiarcheologici.regione.sicilia.it/naxos-taormina/en/siti-archeologici/teatro-antico-di-taormina/'}]},
  {id:'agrigento-valle',city:'Agrigento',title:'Dorisische Tempelarchitektur im Tal der Tempel',
   terms:[],kind:'regional',
   era:'Antike griechische Architektur · UNESCO-Welterbe',
   paragraphs:[
     'Die archäologische Zone von Agrigento bewahrt das Erbe der griechischen Polis Akragas. Die UNESCO hebt die Tempelbauten als aussergewöhnliche Zeugnisse der dorischen Bauordnung hervor. Die Tempel sind nicht isoliert zu betrachten, sondern stehen im Zusammenhang von Stadtmauern, Heiligtümern und der topografischen Lage.',
     'Für die Analyse der dorischen Architektur sind das Verhältnis von Säulenschaft, Kapitell, Gebälk, Jochweiten und Tempelgrundriss wichtige Beobachtungsebenen. Daneben sind die örtlichen Kalksteinmaterialien, Erhaltung und die Unterschiede zwischen ursprünglicher Konstruktion und späteren Restaurierungen zu unterscheiden.',
     'Das digitale Relief hilft, die Lage der antiken Stadt und des Heiligtumshügels im Gelände zu begreifen. Es ersetzt jedoch weder ein photogrammetrisches Tempelmodell noch archäologische Bauaufnahmen und kann fehlende Säulenelemente nicht allein aus OpenStreetMap rekonstruieren.'
   ],
   sources:[{title:'UNESCO – Archaeological Area of Agrigento',
     url:'https://whc.unesco.org/en/list/831/'},
     {title:'Regione Siciliana – Parco archeologico Valle dei Templi',
     url:'https://parchiarcheologici.regione.sicilia.it/valle-templi/en/siti-archeologici/area-archeologica-della-valle-dei-templi/'}]},
  {id:'siracusa-strata',city:'Siracusa',title:'Ortigia und die architektonischen Zeitschichten',
   terms:[],kind:'regional',
   era:'Antikes Griechenland bis Barock · UNESCO-Welterbe',
   paragraphs:[
     'Die UNESCO beschreibt Siracusa mit der historischen Insel Ortigia und den archäologischen Gebieten der Neapolis als eine Stätte mit sehr langen kulturellen und architektonischen Entwicklungslinien. Das Welterbe umfasst ausserdem die Felsnekropole von Pantalica.',
     'Ortigia macht historische Schichtung besonders sichtbar: Der Stadtgrundriss, religiöse Bauwerke und öffentliche Räume tragen Spuren unterschiedlicher Epochen. Bei der Architekturbeobachtung sind daher frühere Bauteile, spätere Fassadenfassungen, Umnutzungen und der Bezug zu engen Strassen- und Platzräumen getrennt zu betrachten.',
     'Die Karte veranschaulicht die Struktur der Insel und das topografische Umfeld. Einzelne historische Fassaden, antike Bauteile oder Innenräume werden aus nicht vorhandenen OSM-Attributen nicht nachgebildet; eine genaue Untersuchung verlangt Denkmalinventare und Bauaufnahmen.'
   ],
   sources:[{title:'UNESCO – Syracuse and the Rocky Necropolis of Pantalica',
     url:'https://whc.unesco.org/en/list/1200/'},
     {title:'Italienisches Kulturministerium – Siracusa e Pantalica',
     url:'https://unesco.cultura.gov.it/en/projects/syracuse-and-the-rocky-necropolis-of-pantalica/'}]},
  {id:'santa-urban',city:'Santa Teresa di Riva',title:'Küstenort, Bebauung und Strassenraum',
   terms:[],kind:'regional',
   era:'Stadtmorphologie · Küstenraum',
   paragraphs:[
     'Santa Teresa di Riva liegt an der ionischen Küste. In der Kartendarstellung wird der Zusammenhang zwischen Küstenlinie, der linearen Erschliessung, der Bebauung und dem ansteigenden Hinterland räumlich sichtbar. Diese Beschreibung betrifft die Siedlungsstruktur, nicht die Baugeschichte jedes einzelnen Hauses.',
     'Für eine Ortsanalyse lohnt sich der Wechsel zwischen Massstabsebenen: Aus der Inselperspektive lassen sich Topografie und Küstenverlauf betrachten; im Quartiermassstab werden Strassenraum, Häuserfronten, Parzellen und öffentliche Orte wichtiger. Die geografische Nähe von Bebauung zum Meer erlaubt nicht automatisch Aussagen über Baujahr oder Stil.',
     'Bei der Kartierung von Fassaden sollten getrennt erfasst werden: authentisch gemessene Höhe, Geschosszahl, Baumaterial, Dachform, Dachmaterial, Öffnungen und Nutzungsänderungen. Fehlende Merkmale können als Forschungsbedarf ausgewiesen werden, aber nicht als gesicherte Bestandteile eines digitalen Zwillings.'
   ],
   sources:[{title:'Comune di Santa Teresa di Riva – Kultur und Tourismus',url:'https://www.comune.santateresadiriva.me.it/it/topics/turismo'}]}
]);
export function architectureProfilesFor(obj){
  const city=cityForObject(obj);if(!city)return [];
  const selected=ARCHITECTURE_PROFILES.filter(p=>p.city===city.name);
  const text=String(obj?.name||'').toLocaleLowerCase('it');
  const matching=selected.filter(p=>p.kind==='landmark'&&p.terms.some(x=>text.includes(x)));
  if(matching.length)return matching;
  if(obj?.kind==='Gebäude')return []; // no claimed architectural biography of a generic house
  return selected.filter(p=>p.kind==='regional');
}
export function architectureProperties(tags={}){
  const fields=[
    ['Bauwerkstyp','building'],['Geschosse','building:levels'],
    ['Messhöhe','height'],['Fassadenmaterial','building:material'],
    ['Fassadenfarbe','building:colour'],['Dachform','roof:shape'],
    ['Dachmaterial','roof:material'],['Dachfarbe','roof:colour'],
    ['Dachhöhe','roof:height'],['Dokumentiertes Baudatum','start_date'],
    ['Denkmalhinweis','historic'],['Denkmalschutzkennzeichen','heritage']
  ];
  return fields.filter(([,tag])=>tags[tag]!==undefined&&tags[tag]!==null&&String(tags[tag]).trim())
    .map(([label,tag])=>({label,value:String(tags[tag]),tag,source:'OpenStreetMap'}));
}
export const MATERIAL_NOTE='Die Farben der Karte codieren Gebäudearten und Höhen. Sie entsprechen nur dann der realen Fassade, wenn die Originaldaten eine Farbe oder ein Material ausdrücklich nennen. Kartenfarben sind keine historischen Befunde.';
