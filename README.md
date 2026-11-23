# SICILIA 3D — Digital Island Explorer

**Version 7.0 (November 2026)**

Eine kostenlos auf GitHub Pages veröffentlichte geografische 3D-Web-App für Sizilien mit drei getrennten Ansichten.

## Links

- [SICILIA 3D – Kartenatlas](https://vnipo01-coder.github.io/Sicilia-3d/)
- [Casalvecchio – begehbares 3D-Modell](https://vnipo01-coder.github.io/Sicilia-3d/walk.html)
- [Flughafen Catania – 3D-Flugzeuge](https://vnipo01-coder.github.io/Sicilia-3d/airport.html)

## Architektur

| Dateinamen | Zweck |
|---|---|
| index.html, atlas.css, atlas.js | Moderne Kartenoberfläche mit 3D-Gelände, Satellit, Städten, Gebäudeinformationen, Quellenlinks, Wetter und Wolkenmodell |
| walk.html, walk.js | Begehbares Three.js-Dorfmodell mit Grundrissen aus OSM, Höhenmodell, rekonstruierten Fassaden und interaktiver Kamera |
| airport.html, airport.js | Eigenständige 3D-Flughafenszene, sichtbare simulierte 3D-Flugzeuge und separater ADS-B-Abruf |
| app.js, v5.js, v6.js, style.css | Ältere Iterationen; werden in Version 7 nicht mehr geladen |

## Datenherkunft und Genauigkeit

- **OpenStreetMap / OpenMapTiles:** Gebäudeumrisse, Wege, Höhen, Stockwerke, Namen und Adressen, soweit sie dort erfasst sind.
- **Mapzen/AWS Terrarium:** Digitales Höhenmodell, sofern der Browser die Datenkacheln erreichen kann.
- **Esri und Datenpartner:** Satelliten- und Luftbilder. Diese sind nicht live.
- **Open-Meteo:** Zeitgestempelte Wettermodellwerte und Prognosen, keine Live-Messung an jeder Koordinate.
- **Wikipedia / Wikidata / OSM:** Verlinkte Wissens- und Objektinformationen. Die Zuordnung zu einem Objekt muss überprüft werden.

## Was modelliert und was nicht real ist

- **3D-Fassaden, Fenster, Türen und Dächer** in der begehbaren Szene sind prozedural modelliert. Selbst bei echten OSM-Gebäudegrundrissen sind sie kein fotorealistischer Nachbau.
- Wenn OSM oder Höhendaten nicht geladen werden können, zeigt der Spaziergang eine ausdrücklich als **schematische Rekonstruktion** markierte Ersatzszene.
- **Baujahre werden nicht erfunden.** Fehlende Höhen werden allenfalls für die Visualisierung geschätzt und entsprechend gekennzeichnet.
- Die **3D-Flugzeuge** im Standardmodus zeigen ausdrücklich simulierte Flugbewegungen und keine echten Positionen.
- Der getrennte **ADS-B-Abruf** funktioniert nur, wenn der Anbieter Browserzugriff zulässt. Eine GitHub-Pages-Seite kann API-CORS, Rate-Limits und lizenzrechtliche Hürden nicht umgehen. Falls der Abruf scheitert, werden keine angeblich echten Live-Flüge gezeigt.
- Die **Wolkenebene** ist eine grobe räumliche Veranschaulichung aus Wettermodellwerten, kein Wolken-Satellitenfilm.

## Steuerung des 3D-Spaziergangs

- Mit der Maus oder dem Finger ziehen, um sich umzusehen.
- W/A/S/D, Pfeiltasten oder Touch-Tasten für Bewegung.
- Erste-Person- und Dritte-Person-Modus.
- Gebäude berühren oder auf das Untersuchen-Symbol tippen, um Attribute zu sehen.
- Zur Piazza setzt den Startpunkt zurück.

## Architektur und nächste Entwicklungsiteration

1. Mobile Browser-Tests (Touch, WebGL, FPS, Ladezeiten, Fehlerbehandlung) und Desktop-Tests.
2. Fachliche GIS-Validierung der Piazza-Koordinaten, Gebäudegrundrisse und Geländeprovenienz.
3. Detailreichere 3D-Assets, Dachmodelle, Fassadentexturen, Lizenznachweise und Photogrammetrie für ausgewählte Sehenswürdigkeiten.
4. Eigenes API-Backend mit Caching, CORS-Freigaben, zulässigen Flugdatendiensten und nachweisbaren Zeitstempeln.
5. Gebäudedatenbank mit Quellen-, Konfidenz- und Versionsfeldern statt frei erfundener Eigenschaften.

## Datenlizenzen und Hinweise

© OpenStreetMap contributors, OpenFreeMap, Mapzen/AWS and elevation data providers, Esri and imagery providers, Open-Meteo, Wikimedia contributors, Three.js authors.

Vor einer kommerziellen Veröffentlichung müssen besonders Satellitenbilder, Kartendienste und ADS-B-Daten hinsichtlich Lizenzbedingungen und zulässiger Nutzung geprüft werden.
