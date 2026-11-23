# SICILIA 3D v10.1 – erste separate Vorschau
Stand: 23. November 2026

## Direkt öffnen
- Kartenatlas: https://vnipo01-coder.github.io/Sicilia-3d/v10/
- Begehbarer Pilotort: https://vnipo01-coder.github.io/Sicilia-3d/v10/walk.html
- Casalvecchio Siculo direkt: https://vnipo01-coder.github.io/Sicilia-3d/v10/walk.html?lat=37.95736&lng=15.32230&name=Casalvecchio%20Siculo
- Die weiterhin bestehende Version 9.2: https://vnipo01-coder.github.io/Sicilia-3d/


## Reparatur vom 23. November 2026 (v10.1 Hotfix)

**Ursache der leeren Atlas-Ansicht:** HTML hatte eine MapLibre-6-UMD-Datei \`dist/maplibre-gl.js\` eingebunden, obwohl dieser Dateipfad seit v6 nicht mehr bereitgestellt wird. Die Karte konnte deshalb überhaupt nicht initialisieren. Das Atlas-HTML verwendet jetzt wieder die zuvor verwendete MapLibre GL JS 5.6.2 UMD-Datei.

**Zusätzliche Sicherungen:**
- Initialer Kartenausschnitt zeigt ganz Sizilien statt einer potenziell leeren Nahansicht.
- Wenn der OpenFreeMap-Stil nicht ankommt oder die Kacheln stehen bleiben, schaltet der Atlas auf einen reinen Esri-Raster-Satellitenstil um.
- Die Atlas-Oberfläche hat eine direkte Rückkehr zur weiterhin existierenden v9-Karte und zeigt Ladefehler statt einer leeren Oberfläche.
- Der v10-Walk lädt Three.js über jsDelivr mit einem zweiten CDN als Ausweichquelle und meldet Ladefehler.
- Der Walk überlagert nun optional Esri-Luftbilder entlang des vorhandenen DEM statt auf Gebäudedaten zu warten. Scheitern OSM-Aufrufe, bleibt der Hintergrund benutzbar.
- Auf beiden Seiten gibt es bei Problemen einen einfachen Link zur bisherigen Version.
- Alle JS-Dateien wurden erneut auf Syntax geprüft, und die referenzierten HTML-IDs sind vorhanden. **Ein echter Browser-/Netzwerk-End-to-End-Test ist weiterhin erforderlich.**

**Testlinks:**
- https://vnipo01-coder.github.io/Sicilia-3d/v10/?repair=20261123
- https://vnipo01-coder.github.io/Sicilia-3d/v10/walk.html?lat=37.95736&lng=15.32230&name=Casalvecchio%20Siculo&repair=20261123

Bei alten Bildschirmständen: Seite mit Ctrl+Shift+R neu laden. Wenn die v10-Seite nicht funktioniert, die bewährte v9-Karte unter https://vnipo01-coder.github.io/Sicilia-3d/ öffnen.

## Tatsächlich geändert
- Neue eigenständige v10-Oberfläche und 3D-Walk im Unterordner \`/v10/\`.
- Eine gemeinsame Geodaten-Bibliothek (\`geo.js\`) verarbeitet geografische Koordinaten, Terrarium-Höhen und OSM-Daten.
- Terrarium-Höhenkacheln werden dekodiert, bilinear abgefragt und als Quelle angezeigt. Es gibt keine erfundene Höhenangabe.
- Das 3D-Gelände wird **nicht mehr absichtlich um die Startposition abgeflacht**.
- OSM-Strassen werden entlang der DEM-Oberfläche in kurze Segmente aufgeteilt.
- Gebäude-Wandunterkanten werden pro etwa 3 m neu am DEM abgetastet. Dächer bleiben momentan geometrisch vereinfacht.
- Echte Gebäudegrundrisse werden nur bei vorhandenen OSM-Daten verwendet. Bei fehlenden Quellen werden keine scheinbar realen Gebäude erfunden.
- OpenStreetMap/Overpass über die aktuelle Instanz \`overpass.private.coffee\` mit \`overpass-api.de\` als Reserve. Browser-Cache für gültige OSM-Antworten (24 Stunden, begrenzte Grösse).
- Frei wählbare Koordinaten auf Sizilien, freie Kamera, WASD, Sprint, variable Geschwindigkeit, einfache Gebäude-Kollision, erste/dritte Person.
- Vereinfachte Karte mit Relief, Satellit, Kamerasteuerung und Objektwissen.
- Wikipedia-Artikel werden nicht ohne geografische Plausibilitätsprüfung mit einem Objekt gleichgesetzt.
- Gipfelpunkte standardmässig ausgeblendet.
- Der bestehende Flugradar der Version 9 bleibt erreichbar; v10 AIR kommt erst in einer späteren Ausbaustufe.

## Grenzen
**Dies ist eine technische Pilotversion und noch keine fotorealistische Digitalisierung der ganzen Insel.**
- Basis-Terrarium DEM z14 ist nicht identisch mit hochauflösendem regionalem 1m-/2m-LiDAR. Diese Daten müssen gesondert aufbereitet und lizenziert werden.
- Fenster, Fassaden, Dachmaterialien und fehlende Gebäudehöhen bleiben aus Darstellungsgründen vereinfacht.
- OSM deckt nicht jedes Gebäude vollständig ab. Bei API-Ausfall bleibt nur die Geländeansicht verfügbar; das ist absichtlich transparent.
- Die Strassenoberfläche folgt DEM-Punkten, enthält aber noch keine realen Treppenmodelle und keine aufwendig geformten Stützmauern.
- Der schmale Kartenausschnitt im Walk ist aus Performance-Gründen lokal begrenzt.
- Kein echtes Spiel-/Physiksystem: weder präzise Treppen-/Geländekollisionen noch frei betretbare Gebäude.
- Direkte Anfragen an öffentliche Overpass-Dienste sind nur ein **begrenzter Preview-Ansatz**. Für dauerhaften öffentlichen Betrieb sind gecachte Auszüge / ein Backend erforderlich.

## Testing & Kontrollen
- \`npm run check\` im Verzeichnis \`v10/\` prüft JavaScript-Syntax und führt 8 Node-Tests zu Geokoordinaten, DEM-Dekodierung, fehlenden Höhen und Architektur-Metadaten aus.
- Der GitHub-Actions-Workflow unter \`.github/workflows/sicilia-v10-checks.yml\` soll die Tests bei Änderungen automatisch ausführen.
- Externe Dienste, das browserseitige Rendering, Maussteuerung, FPS und mobile Touch-Funktionen benötigen zusätzlich einen **realen Browser-End-to-End-Test**. Der Quellcode-/Unit-Test beweist nicht, dass alle Datenquellen aktuell verfügbar sind.

## Bedienung
**Atlas**: Auf einen Ort klicken oder suchen → «Hier in 3D laufen». Mit rechter Maustaste drehen/neigen, Shift + Mausrad neigen, normales Rad zoomt. Separater Kamera-Regler rechts.

**Walk**: Mit Maus ziehen oder Pointer Lock («Maus übernehmen») umsehen. WASD/Touch-Tasten bewegen. Shift sprintet. Geschwindigkeit über Regler. Ein Klick auf ein OSM-Gebäude zeigt dessen Tag-Daten und einen Original-Link. Mit «Kirche finden» zur nächstgelegenen als Kirche erfassten OSM-Geometrie wechseln.

## Nächste Arbeit (v10.2)
1. Casalvecchio-Ortskern anhand regionaler hochauflösender Daten ausrichten.
2. Kirche Sant’Onofrio als überprüftes Landmark-Modell; Mauern, Treppen und Gassen präziser auf DEM legen.
3. Die veröffentlichten 3D-Kacheln über eine wiederverwendbare Geodatenpipeline erzeugen.
4. Browser-Praxisprüfung und FPS-Optimierung.
5. v10.3: Flughafen und Flugradar mit Caching-Backend und echten Daten.
