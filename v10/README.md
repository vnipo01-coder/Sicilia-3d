# SICILIA 3D v10.7 – Farbiges Relief, Architekturwissen & Wetterwelt

**Release 132 · 24. November 2026**

Die öffentliche Hauptseite https://vnipo01-coder.github.io/Sicilia-3d/ leitet weiterhin direkt zur einzigen integrierten Kartenanwendung unter \`/v10/\` weiter. Die zuvor entfernten eigenen Walk-/Coastal-/Flughafenansichten bleiben bewusst entfernt.

## Neue Funktionen

### 1. Lebendiges topografisches Relief
- Höhenkodierung mit stärker unterscheidbaren Bereichen von Küste/Flachland bis Hochgebirge.
- Kräftigeres Hillshading; unveränderte DEM-Quelle Mapzen/AWS (Terrarium-Kacheln).
- Verfügbar in den drei Kartenmodi Relief, Satellit und Strassenkarte.
- Gebirgs- und Gipfelpunkte bleiben optional, damit die Karte nicht unübersichtlich wird.

### 2. Mehr Detail und Abwechslung bei 3D-Gebäuden
- **Architekturfokus:** Gebäude werden nach OSM-Nutzung (Kirche, Wohnen, Bildung, Handel, Gewerbe) eingefärbt, sofern entsprechende Tags verfügbar sind; sonst nach Höhenklassen.
- **Gebäudehöhe:** Regenbogenartige, lesbare Höhenpalette mit Legende.
- **Mediterrane Naturtöne:** Alternative zurückhaltendere Farbgebung.
- **Detailzoom:** Nur wenn OSM-Daten \`roof:height\` enthalten, wird eine separate flache Dachzone angedeutet. Über Zoom 16,3 kann die App echte OSM-Grundrisse und Dachattribute laden und an vorhandenen Vektor-3D-Bauten ergänzen, ohne die Wände doppelt zu rendern.
- Zusätzliche Grundstücks-/Gebäudekonturlinien bei hohem Zoom.
- Vertikaler Farbverlauf verbessert die Lesbarkeit der Gebäudekörper.
- **Wichtige Grenze:** Farben sind kartografische Kategorien, **keine echten Fassadenrekonstruktionen**; auch die Dachzonen sind vereinfacht. Nicht alle OpenMapTiles-Vektorkacheln enthalten detaillierte Typen.

### 3. Ausführlicheres Architekturwissen
Separates Modul \`architecture.js\` mit zwölf quellenorientierten Fachprofilen für:
- Santa Teresa di Riva: Chiesa del Sacro Cuore, Chiesa della Sacra Famiglia, Villa Crisafulli-Ragno, Torre Catalmo und Küsten-Stadtmorphologie
- Noto, Ragusa, Catania: spätbarocke Architektur im Val di Noto mit UNESCO-Quellen
- Palermo: arabisch-normannische Architektur mit UNESCO-Quellen
- Taormina: antikes Theater mit Originalquelle der Regione Siciliana
- Siracusa/Ortigia: UNESCO-Welterbe und architektonische Zeitschichten
- Agrigento: dorische Tempelarchitektur mit UNESCO- und archäologischer Parkquelle

Jedes Profil enthält mehrere ausführliche Absätze zu Baugeschichte, städtebaulichem Zusammenhang, möglicher Methodik der Architekturbeobachtung und Datenlimits, mit direkten Quellen. Bei OSM-Gebäuden werden dokumentierte \`height\`, \`building:levels\`, \`building:material\`, \`building:colour\`, \`roof:shape\`, \`roof:material\`, \`roof:height\`, \`start_date\`, \`historic\` etc. angezeigt, soweit vorhanden. **Ein allgemeines Stadtprofil gilt nie als Nachweis eines einzelnen Haus-Baujahrs.**

### 4. Wetterwelt – bewegte, modellbasierte Wolken
- Open-Meteo \`current\` enthält jetzt auch \`wind_direction_10m\`.
- Eine transparente 2D-Atmosphärenschicht zeichnet langsam vorbeiziehende Wolken. Die modellierte Bedeckung und meteorologische **Windrichtung (Wind von → Bewegung nach)** beeinflussen die Animation.
- Wolken können ein-/ausgeschaltet und die Intensität verändert werden.
- **Optionaler Demomodus:** ausdrücklich als fiktive Bedeckung von 68% markiert, falls das aktuelle Wetter klar ist.
- Animation mit begrenzter Bildrate, Pause bei unsichtbarem Tab und Unterstützung für reduzierte Bewegung.
- **Wichtige Grenze:** Die Wolken sind eine **bildschirmbasierte Illustration** und keine dreidimensionalen georeferenzierten Wolkenvolumen. Die gezeichneten Positionen sind weder Satellitendaten noch ein exakt berechnetes Wolkenfeld. Die Wetterparameter stammen von einem ausgewählten Open-Meteo-Modellpunkt, nicht aus einem Echtzeit-Raster aller Wolken über Sizilien.

### 5. Geführter Rundflug
- 11 3D-Kamera-Zwischenstopps über Santa Teresa, Taormina, Ätna, Catania, Siracusa, Noto, Ragusa, Agrigento, Trapani, Palermo und Messina.
- Einstellbares Tempo 0,5×–2×; manuelles Bewegen mit der Maus beendet den Rundflug.
- **Wichtige Grenze:** Der Rundflug bewegt nur die Kamera auf der Kartenszene. Es ist kein echtes Flugzeug, keine Flugradar- oder Flugplansimulation. Der zuvor entfernte Flughafen-Explorer wird nicht wieder eingeführt.

## Bedienung
1. Öffne den Atlas und wähle Relief, Satellit oder Strassen.
2. Im Kartenstudio: \`Gebäudefarben\` auf Architektur, Höhe oder Naturtöne stellen.
3. Oberhalb links: \`☁️ Wolken einschalten/ausblenden\` und \`🛩️ Inselrundflug\`; \`⚙ Einstellungen\` enthält Wolkenstärke, Flugtempo und Demowolken.
4. Für Detailansicht: in eine Stadt zoomen und \`👁 Bodennahe 3D-Ansicht\` wählen.
5. Auf eine Stadt oder ein Bauwerk klicken und im Wissensregister \`Geschichte\` die Architekturprofile lesen; Quelle direkt aufrufen.

## Prüfung
\`cd v10 && npm run check\` prüft die Syntax von Atlas, Geodaten, Quellen, Architektur-, Gebäude-, Wolken-, Wetter- und Rundflugmodulen und führt die Unit-Tests aus.

Zusätzlich ist ein **echter Browser-End-to-End-Test** erforderlich. Öffentliche Tile-/API-Server sind nicht garantiert dauerhaft erreichbar. Langfristig ist ein gebündeltes Datenbackend oder Cache sinnvoll.

## Quellen
- MapLibre 3D Extrusion: https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/
- MapLibre Style: https://maplibre.org/maplibre-style-spec/layers/
- Gemeinde Santa Teresa – Chiesa del Sacro Cuore: https://comune.santateresadiriva.me.it/it/vivere/chiesa-del-sacro-cuore-di-gesu
- Gemeinde – Sacra Famiglia: https://www.comune.santateresadiriva.me.it/it/vivere/chiesa-della-sacra-famiglia
- Gemeinde – Villa Crisafulli-Ragno: https://comune.santateresadiriva.me.it/it/vivere/753187
- Gemeinde – Torre Catalmo: https://comune.santateresadiriva.me.it/it/vivere/753082
- UNESCO – Val di Noto: https://whc.unesco.org/en/list/1024/
- UNESCO – Arab-Norman Palermo: https://whc.unesco.org/en/list/1487/
- Open-Meteo: https://open-meteo.com/en/docs

---

# SICILIA 3D v10.6 – Atlas & Stadtwissen

## Die eine aktive Anwendung
- https://vnipo01-coder.github.io/Sicilia-3d/
- https://vnipo01-coder.github.io/Sicilia-3d/v10/?release=121
- Start in Santa Teresa di Riva; direkte Auswahl weiterer Städte oder Inselübersicht.

## Änderungen gegenüber v10.5

Der neue Schwerpunkt ist **Qualität statt immer neuer halb funktionierender Sonderwelten**.

1. Die separaten 3D-Walking-, Küsten- und Flughafenexperimente sind aus \`main\` gelöscht. Ihre Dateien bleiben bei Bedarf im Archivzweig \`archive-pre-v10-6-walk-air\` zugänglich.
2. Nur der MapLibre-Atlas mit Terrain, Häusern, Relief, Satellit, Wetter, OSM-Gebäudedaten und Haltestellen wird noch öffentlich als App angeboten. Alle bisherigen Spezialrouten wurden aus der aktiven Navigation entfernt.
3. Eine strukturierte Wissenstafel ersetzt die lange Liste untereinanderliegender Inhalte:
   - **Überblick:** Koordinaten, Objektart, OSM-Merkmale, bekannte/gekennzeichnet geschätzte Höhen.
   - **Geschichte:** aufklappbare Gemeinde- und Wissensartikel, sichtbarer Originalautor/Quelle, kompakte Texte.
   - **Quellen:** direkte offizielle Stadtwebsites, Stadtartikel auf Wikipedia, Wikidata-Objekte, Original-OSM, weitere verknüpfte Objektquellen.
   - **Alltag:** aktuelle Open-Meteo-Modellwerte und offizielle Verkehrs-/Haltestellenhinweise.
4. Ein Klick auf ein Objekt im Stadtgebiet bietet über dem Artikel **«Stadtprofil»**, **«Wikipedia: Stadt»** und ggf. **«Offizielle Stadtseite»**. Ein offener Wikipedia-Artikel ist eine externe Seite; die Stadtübersicht kann zusätzlich im Atlas geöffnet werden.
5. Die Wetterleiste bleibt unabhängig vom Kartenstil; eine manuelle Aktualisierung und automatische Abfrage alle sechs Minuten sind vorhanden.
6. Die Kamera besitzt zusätzlich «Bodennahe 3D-Ansicht» (starke Neigung und Zoom), ohne einen separaten unvollständigen Walk zu starten.

## Quellenqualität

Die offizielle Webseite einer Stadt ist kein Beleg für das Baujahr irgendeines einzelnen Hauses. Stadtlinks werden nur bei geografisch plausibler Lage angeboten. Amtliche Kulturinformationen erscheinen als jeweils eigene aufklappbare Quelle. Verifizierte Gebäudeattribute (OSM) und Modellannahmen (beispielsweise Höhe ohne Tag) werden getrennt. Wenn Wikipedia und Wikidata die Objektidentität nicht ausreichend bestätigen, wird kein Artikel fälschlicherweise übernommen.

### Stadtseiten mit festen geprüften Startlinks
- Santa Teresa di Riva: https://www.comune.santateresadiriva.me.it/ und https://it.wikipedia.org/wiki/Santa_Teresa_di_Riva
- Taormina: https://www.comune.taormina.me.it/
- Palermo: https://www.comune.palermo.it/
- Catania: https://www.comune.catania.it/
- Weitere sizilianische Städte: direkte Wikipedia-Stadtartikel bei bekannter Stadtidentität; Gemeindeseiten nur, wenn geprüft.

## Funktionsgrenzen und Tests

Die Karte hat **echte OSM-Grundrisse und 3D-Körper**, aber keine gemessenen Fassaden aller Gebäude. Aus einer gezoomten 3D-GIS-Karte kann keine vollständige Street-View-Welt abgeleitet werden. Das Luftbild ist ebenfalls keine Live-Kamera. Für authentisches freies Laufen und betretbare Gebäude wären zusätzliche Daten und eine getrennte, deutlich aufwendigere 3D-Architektur notwendig; eine solche Funktion wird nicht mehr als vorhanden dargestellt.

Die JavaScript-Syntax, HTML-/Scriptverweise und Testregeln sind prüfbar mit \`npm run check\`. Ein echter Browser-End-to-End-Test ist nach dem GitHub-Pages-Build notwendig. Die früheren Sonderansichten wurden bewusst **nicht** nur umbenannt oder versteckt, sondern aus dem aktuellen Zweig entfernt.

## Technische Module
- \`atlas.js\` – MapLibre GIS, Layer, Stadtlinks und Wissensnavigation
- \`atlas.css\` – responsives Karten-/Wissensdesign
- \`city-pages.js\` – geografisch validierte Stadtprofile und direkte Homepages
- \`knowledge.js\` – Wikipedia-/Wikidata-Zuordnung
- \`local-sources.js\` – lokale Originalquellen und Haltestellen
- \`weather.js\` – modelliertes, zeitgestempeltes Wetter
- \`geo.js\` – Höhen und OpenStreetMap-Daten
- \`tests/geo.test.mjs\` – Geodaten- und UI-Regressionsprüfungen

Der letzte Stand vor der Bereinigung ist im Archivzweig vorhanden; Neuimplementierungen sollten erst nach einem detaillierten Design- und Testkonzept erfolgen.
