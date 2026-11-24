# SICILIA 3D · Cesium Lab (Pilot 0.1)

## Starten
**Live:** https://vnipo01-coder.github.io/Sicilia-3d/cesium/

**Code:** https://github.com/vnipo01-coder/Sicilia-3d/tree/main/cesium

Die bislang funktionierende MapLibre-Karte unter \`/v10/\` bleibt unverändert aktiv. Das Cesium Lab ist eine **zusätzliche, separat testbare Referenzwelt**. Es wird erst später zum Standard, wenn die grafischen Qualitätskriterien nachweisbar erfüllt sind.

## Die erste Umsetzung (tatsächlich im Code)

| Komponente | Umsetzung | Nachweis / Grenze |
|---|---|---|
| Globus | CesiumJS 1.146, WebGL, freies Kameradrehen/-neigen | echte 3D-Engine |
| Luftbild | Esri World Imagery (XYZ-Kacheln) | Datierung und lokale Auflösung nicht geprüft |
| Küstenort | Santa Teresa di Riva, vier Kamerapunkte | echte Koordinaten, einzelne Beschriftungen ungefähr |
| Häuser | OpenStreetMap-Grundrisse als Cesium-3D-Extrusionen | echte Grundrisse, aber KEINE authentischen Fassaden |
| Gebäudehöhen | OSM height bevorzugt; Geschosszahl × 3,1 m oder Standardhöhe als markierte Schätzung | aufklappbare Quellen- und Dateneigenschaft |
| Strassen | Kartierte OSM-Weggeometrien | Linien, noch keine begehbaren Gehwege/Bordsteine |
| Haltestellen | Einzelne OSM-highway=bus_stop-Knoten | noch keine API für echte Abfahrtszeiten |
| Geländehöhen | Ohne Schlüssel Ellipsoid (flach auf der Erdoberfläche) | keine echten Höheneffekte! |
| Echtes 3D-Gelände | Optional Cesium World Terrain über Cesium ion | gültiger Client-Token mit ausreichenden Rechten erforderlich |
| Weltweite Gebäude-3D-Tiles | Optional Cesium OSM Buildings über Cesium ion | Qualität und lokaler Datenstand nicht vorab verifiziert |
| Fotorealistische 3D Tiles | Optional Google Photorealistic 3D Tiles über Cesium ion | Abdeckung, Tarife, Zugang und Lizenz vorher prüfen |
| Architekturwissen | Quellenorientierte Fachprofile aus dem bestehenden v10-Atlas auf dokumentierten OSM-Gebäuden | nur bei fachlich plausibler Objektzuordnung |
| Wetter | Aktuelle Open-Meteo-Modellwerte in einem separaten Badge | kein Sensor direkt am Haus, keine 3D-Wolkenrekonstruktion |
| Tests | Node-Tests, Quellcodeprüfung, GitHub Actions und manueller Playwright-Browserlauf | öffentlicher Live-Browser noch nicht verifiziert |

**Nicht enthalten:** Nachgebildete authentische Balkone, Fenster, Kanten, reale Fassadentexturen, ein lückenloser begehbarer Küstenweg, eine simulierte historische Stadt oder eine Echtzeit-Busabfahrt. Diese dürfen nicht aus fehlenden Daten frei erfunden werden.

## Cesium ion aktivieren – optional

1. Registriere dich unter https://ion.cesium.com/ und prüfe die aktuellen Nutzungsbedingungen.
2. Erstelle unter https://ion.cesium.com/tokens einen **eingeschränkten Zugriffstoken** für die zulässigen 3D-Assets. Der Token sollte so wenig Rechte wie möglich haben und für die Website/Budgets kontrolliert werden.
3. Öffne \`/cesium/\`, klicke auf **«Hochwertige 3D-Daten verbinden»**, füge den Token ein und aktiviere zuerst **«Echtes Gelände»**.
4. Danach kannst du **«Cesium OSM 3D Tiles»** oder (bei vorhandenen Berechtigungen und Abdeckung) **«Photorealistische 3D Tiles»** testen.
5. Der Token wird **nicht in GitHub, localStorage oder sessionStorage** geschrieben. Er bleibt für die laufende Seite im JavaScript-Speicher und ist in Netzwerkrequests sichtbar. **Client-Token sind keine geheimen Server-Schlüssel.**

Für photorealistische Google-3D-Tiles können zusätzliche Cesium-ion/Google Maps Platform-Bedingungen, Nutzungsgrenzen und Kosten gelten. Nicht einschalten, bevor du sie geprüft hast.

## Datenprüfung Santa Teresa: verbindlicher nächster Arbeitsschritt

Die zwei nationalen LiDAR-Datensätze sind **als Metadaten nachgewiesen, aber noch NICHT auf lokale Abdeckung, Aufnahmedatum, Datenverfügbarkeit oder Download-Lizenz für den Pilotabschnitt geprüft**:

- DTM LiDAR 1 Meter (Sicilia): https://www.dati.gov.it/node/view-dataset/dataset?id=ffad6512-1854-4e4d-bfec-bd867d8b18dc
- DTM LiDAR 2 Meter (Sicilia): https://www.dati.gov.it/node/view-dataset/dataset?id=92dda1ec-a252-466d-9f1e-4bb6c0fff2ef
- Geoportale Regione Siciliana: https://www.sitr.regione.sicilia.it/geoportale
- Comune Santa Teresa di Riva: https://www.comune.santateresadiriva.me.it/

Das GitHub-Projekt enthält **keine** heruntergeladenen LiDAR-/Photogrammetriedaten. Die technische nächste Stufe wäre, für genau das Pilotgebiet einen tatsächlich verfügbaren DEM-/DSM-Ausschnitt und überprüfte Baugeometrien zu beschaffen, in Cesium Terrain/3D Tiles zu konvertieren und mit Quellen-/Lizenzprotokoll zu hosten.

## Akzeptanzkriterien für «wesentlich besser»

1. **Datennachweis:** Rohquelle, Aufnahmejahr, Lizenz, Gebietsabdeckung und Auflösung der verwendeten Terrains/Bauwerke dokumentiert.
2. **Sichtbarkeit:** Erste Szene zeigt Satellit, Gebäudekörper und Startkamera, ohne endloses Laden. Versagt der OSM-Dienst, bleibt die Karte sichtbar.
3. **Geometrie:** Ortsbasierte Vergleiche ausgewählter Gebäude mit einem zulässigen Referenzfoto; mindestens drei bewusst überprüfte Landmarken im Pilotgebiet.
4. **Bewegung:** Nahansicht flüssig, intuitiv und ohne unbeabsichtigtes Durchdringen von Boden oder Gebäuden. Das ist gegenwärtig **noch nicht umgesetzt**.
5. **Leistung:** Messung realer Ladezeiten und Bildrate auf Desktop und Mobilgerät; keine pauschalen FPS-Versprechen.
6. **Verlässlichkeit:** Jede sichtbare architektonische Behauptung ist belegt oder als Schätzung/Illustration markiert.
7. **Veröffentlichung:** CI-Prozess + Browser-Smoketest vor dem Umstellen der bestehenden Hauptseite.

## Architektur

\`\`\`
cesium/
  index.html          # Cesium 1.146 Viewer und Qualitätsmodi
  style.css           # UI: Kartenkamera, Datenstatus, Quellen
  core.js             # OSM-Parser, GIS-Geometrie, Datenregeln (pure)
  app.js              # Globus, OSM-Entities, Ion-3D-Tiles-Modi
  data-audit.json     # Dokumentierte vs noch ungeklärte Quellen
  tests/core.test.mjs # Prüfungen zur Herkunft und Kartenlogik
  package.json        # npm run check
\`\`\`

Tests: \`cd cesium && npm run check\` (Node 22; keine zusätzlichen Pakete).

**Cesium-Quellen:** https://cesium.com/learn/cesiumjs-learn/cesiumjs-quickstart/ · https://cesium.com/learn/cesiumjs-learn/cesiumjs-terrain/ · https://cesium.com/learn/cesiumjs-learn/cesiumjs-photorealistic-3d-tiles/

**3D Tiles:** https://www.ogc.org/standard/3dtiles/

**OSM:** https://www.openstreetmap.org/copyright

**Esri Imagery:** Nutzungsbedingungen, Kartenzitate und Bilddatenanbieter beachten: https://www.esri.com/en-us/legal/terms/full-master-agreement
