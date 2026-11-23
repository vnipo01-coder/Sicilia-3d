# SICILIA 3D – Professional Geo Atlas v8.0

Ein geografischer 3D-Atlas von Sizilien mit Kartenansicht, lokal begehbaren 3D-Modellen und einem Flight Explorer.

## Ansichten

- Kartenatlas: https://vnipo01-coder.github.io/Sicilia-3d/
- Orts-Spaziergang: https://vnipo01-coder.github.io/Sicilia-3d/walk.html
- Flughafen in 3D: https://vnipo01-coder.github.io/Sicilia-3d/airport.html

## Dateien

- index.html, atlas.css, atlas.js: MapLibre-Karte, 3D-Gelände, Höhenfarben, Satellitenbild, Wetter, OSM-Objekte und Wissensfenster.
- walk.html, walk.js: Three.js-Ortsmodell für frei wählbare Sizilien-Koordinaten über die URL-Parameter lat, lng und name.
- airport.html, airport.js: 3D-Flugzeuge, klar bezeichnete Landedemo und optional echte ADS-B-Daten mit eigenem FlyItalyADSB-Schlüssel.
- app.js, v5.js, v6.js, style.css: alte Versionen, im Atlas v8 nicht mehr eingebunden.

## Steuerung am Computer

- Mausrad: Karte zoomen; Shift + Mausrad: Kartenneigung verändern.
- Rechte Maustaste halten und ziehen: Karte drehen/neigen (MapLibre).
- Karte > Kamerasteuerung: Pitchregler und Nordausrichtung.
- Orte oder Gebäude anklicken: verfügbare Attribute, Links, Herkunft und lokaler 3D-Spaziergang.
- Gipfel-Punkte sind wegen Überfüllung standardmässig deaktiviert. Im Menü Karte können sie eingeschaltet werden; bei niedrigen Zoomstufen erscheinen keine Gipfelmarker.

## Begehbares Modell

Die Walking-Engine lädt OSM-Baugrundrisse und Wege für einen lokalen Umkreis von bis zu etwa 370 Metern, ausserdem Terrain-Kacheln von Mapzen/AWS. Kein vollständiger fotorealistischer Zwilling: Fassaden, Turmgeometrie, Dächer, Fenster und unbekannte Gebäudehöhen werden teilweise prozedural erzeugt. Ein gezeigter Kirchenturm ist ausdrücklich eine illustrative Form, auch wenn die Kirchenfunktion aus OSM stammt.

Die Szene funktioniert auch ausserhalb von Casalvecchio mit gültigen Sizilien-Koordinaten. Wenn keine OpenStreetMap-Daten laden, zeigt die Anwendung eine als schematisch gekennzeichnete Ersatzszene. Nicht alle Gebäude sind erfasst, nicht alle Informationen liegen vor.

## Flugverkehr

Der Flight Explorer zeigt zunächst eine modellierte, ausdrücklich nicht reale Landung. Für echte gemeldete Positionen kann eine Person einen eigenen FlyItalyADSB-API-Schlüssel eingeben. Die App fragt https://api.flyitalyadsb.com/v2/lat/37.4668/lon/15.0664/dist/55 direkt im Browser ab. Der Schlüssel wird nicht im GitHub-Repository gespeichert oder serverseitig verwaltet; er ist während Netzwerkanfragen in den Browser-Werkzeugen sichtbar. API-Limits, CORS und Bedingungen des Dienstes bleiben relevant.

Bei erlaubten ADS-B-Antworten wird maximal 20 Sekunden Bewegung aus aktueller Richtung und Bodengeschwindigkeit extrapoliert. Eine eventuelle Annäherungszeit ist eine grobe Rechnung aus empfangenen Messungen; keine bestätigte Landezeit oder Flugplaninformation. Offizielle Ankunfts- und Abflugtafeln des Flughafens Catania sind verlinkt. Ohne Schlüssel bzw. gültige Daten werden keine Flüge als live ausgegeben.

## Herkunft und Unsicherheit

- Höhen: Mapzen/AWS Terrarium DEM, bei fehlenden Daten eine als Modell bezeichnete Ersatz-Topografie.
- Kartenobjekte: OpenStreetMap / OpenMapTiles, regionale Abdeckung und Attributvollständigkeit variieren.
- Luftbild: Esri und Datenpartner, nicht live.
- Wetter und Wolken: Open-Meteo-Modellwerte und grobe räumliche Bewölkungsstichprobe, keine echten Wolkenbilder.
- Ortswissen: Wikipedia/Wikidata/OSM und amtliche Kulturquellen, soweit öffentlich. Titelgleichheit ist kein Beweis für die Objektzuordnung.
- Fehlende Baujahre werden nicht erfunden; modellierte Gebäudehöhen sind nicht als amtliche Messwerte zu verstehen.

## Nächste technische Schritte

1. Sichtprüfung im Browser (Chrome/Firefox) und mit den Entwicklertools auf Fehler, WebGL und externe APIs.
2. Für bestimmte Gemeinden amtliche sizilianische LiDAR-/Orthofotodaten aufbereiten, reprojizieren und als Cloud-Optimized GeoTIFF und 3D Tiles bereitstellen.
3. Quellen- und Qualitätsdatenbank pro Gebäude (OSM-ID, Wikidata-ID, amtliche Kennung, Dokumentationsstatus, Vertrauensniveau).
4. Lizensierte Photogrammetrie und genaue Architekturmodelle für einzelne Orte statt beliebiger Schätzungen.
5. Ein eigenes Backend für Live-Daten mit Caching, CORS, API-Schlüsseln, Datenschutz und Monitoring.

## Nutzung / Nachweise

© OpenStreetMap-Mitwirkende, OpenFreeMap, Mapzen/AWS, Esri und Bilddatenpartner, Open-Meteo, Wikimedia-Mitwirkende, Three.js. Vor einer kommerziellen Nutzung müssen die jeweiligen API- und Datenlizenzen geprüft werden.