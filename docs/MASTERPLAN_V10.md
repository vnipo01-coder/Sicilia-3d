# SICILIA 3D v10 — Professioneller Umbauplan
**Stand: 23. November 2026 · Projektstatus: Architektur- und Datenplanung · Basis: Version 9.2**

## 0. Leitentscheidung

SICILIA 3D wird von einem statischen Demonstrator zu einer modularen 3D-Geoplattform. Wir erweitern die bisherige GitHub-Pages-App nicht durch immer neue, ungeprüfte Skripte. Vor einem produktiven Umbau wird Version 9.2 als funktionsfähige Referenz erhalten. Neue Komponenten kommen auf einen separaten Entwicklungszweig, werden mit automatisierten Tests geprüft und erst nach einem Browser-Test in die Hauptversion integriert.

**Produktversprechen:** Die Insel aus der Luft verstehen, an jedem Ort eine datenbasierte 3D-Ansicht öffnen und ausgewählte historische Ortskerne besonders realistisch zu Fuss erkunden. Aktuelle Flugzeuge und Wetterdaten sind zusätzliche, sauber zeitgestempelte Datenebenen.

**Nicht versprechen:** Vollständig fotorealistische Fassaden aller Gebäude, Live-Kameras in jedem Fahrzeug, zuverlässige Echtzeitposition jedes Flugzeugs oder exakte Baujahre ohne Belege.

## 1. Benutzererlebnis (Produktdesign)

Drei Hauptmodi, die eine gemeinsame geografische Auswahl und einen einheitlichen Zustand verwenden:

1. **ISLAND — Inselatlas**: Relief, Luftbilder, Orte, Gebäude, Höhen, Wetter, Luftverkehr, Quellen; frei drehbare und neigbare Kamera; kein überfülltes Bedienfeld.
2. **WALK — Ortsansicht**: Kamera auf Augenhöhe; reale Strassen- und Gebäudegrundrisse, reales Gelände soweit verfügbar; laufbare Wege, Kollisionen, Geschwindigkeitswahl; erste und dritte Person; spezielle Landmarken-Assets.
3. **AIR — Flughafen und Luftraum**: Flughafen auf echter Georeferenz; Terminal, Vorfeld, Rollwege, Startbahn; 3D-Luftfahrzeuge nur mit klar ausgewiesener Datenlage: gemeldete ADS-B-Position, kurz extrapolierte Position oder Simulation.

**Eine gemeinsame Interaktion:** Ort oder Objekt auswählen → schmale Objektkarte → dokumentierte Fakten, geschätzte Attribute, Quellen und Datum → «Hier in 3D erkunden» oder «In 3D aus der Luft ansehen».

**Bedienung am PC:** Mausrad standardmässig Zoom, Shift + Mausrad Neigung, rechte Maustaste + Ziehen für Neigen/Drehen; optionaler Modus «Mausrad neigt». Im WALK-Modus Maussteuerung (Pointer Lock), WASD, Shift/Sprint, Geschwindigkeitsregler, Sprung zu Sehenswürdigkeiten. Alle Tasten erhalten sichtbares Feedback.

## 2. Architekturentscheidung

**Ausgangspunkt:** Version 9.2 besteht aus atlas.js / atlas.css / index.html, walk.js / walk.html und airport.js / airport.html. Sie verwendet MapLibre, Three.js sowie viele direkte Browser-Abfragen externer Dienste. Diese Abfragen sind ein Hauptrisiko für Zuverlässigkeit und Performance.

### Zielarchitektur

- **Frontend:** TypeScript + Vite; MapLibre GL JS für den zentralen GIS-Atlas; Three.js für Walking und Spezialobjekte. CesiumJS wird zuerst anhand einer eigenen Testszene für 3D Tiles und hochauflösende Terrains evaluiert, nicht vorschnell als zweite komplette Kartenwelt parallel eingesetzt.
- **3D-Welt:** Gemeinsamer Geokoordinatenkern, einheitliches Höhenbezugssystem, lokale Ursprungstransformation, Gelände-/Objekt-Snap, LOD (Level of Detail), Octree bzw. räumliche Indexierung, Frustum Culling, Instancing, asset caching.
- **Geodaten-Pipeline:** GDAL/QGIS + Python für DSM/DTM/Orthofotos; OpenStreetMap-Auszug über Geofabrik/osmium oder osm2pgsql statt laufender massenhafter Overpass-Requests; PMTiles/MapLibre-Vektortiles für die Karte; glTF/3D Tiles für modellierte Stadtteile, wo sinnvoll.
- **Backend:** FastAPI oder Node (eine Wahl nach Prototypvergleich); PostgreSQL + PostGIS für Orte, Gebäude, Quellen, Datenqualität und räumliche Abfragen; Redis oder vergleichbares Caching nur, wenn nötig.
- **API-Proxy:** /api/places, /api/buildings/:id, /api/terrain, /api/weather, /api/aircraft. Schlüssel bleiben serverseitig. Jede Antwort trägt Herkunft, Originalzeitstempel, Abrufzeit und Datenstatus.
- **Deployment:** GitHub Pages darf während der Planung die bestehende 9.2 ausliefern. Die v10-Vorschau wird erst nach Tests als separate Vorschau bereitgestellt. Statisches Hosting ist für den Atlas weiterhin möglich; dynamische Daten und Schlüssel werden durch das Backend geliefert.
- **Qualität:** GitHub Actions für Lint, Typecheck, Unit- und Browser-Smoke-Tests; Playwright für die UI, kleine reproduzierbare GIS-Testdaten; Fehlerprotokollierung und API-Healthchecks.

### Datenfluss

Quelle (Geodaten/Modell/ADS-B) → Import & Lizenzkontrolle → Validierung & Quellen-Metadaten → PostGIS/Objekt-Storage → Tile-Builder/API-Cache → MapLibre/Three.js → Objekt-Infokarte.

## 3. Quellen und Prioritäten

| Priorität | Daten | Quelle | Umgang |
|---|---|---|---|
| P0 | Strassen, Gebäude, OSM-IDs, Namen, Nutzungen | OpenStreetMap; lokaler Extrakt | Vorverarbeiten, nicht pro Klick aus Overpass laden; ODbL/Attribution beachten |
| P0 | Relief ganz Siziliens | DEM-Kacheln als Startbasis | Korrekte Koordinaten, Höhenbezug und Kachelkanten prüfen |
| P0/P1 | Hochpräzises Terrain im Pilotort | LiDAR 1-/2-m-DTM, regionale/ nationale Geodienste | Verfügbarkeit im Zielgebiet, Download und Lizenz ausdrücklich vor Verwendung bestätigen |
| P1 | Luftbilder des Pilotorts | SITR: ortofoto_2022_20cm_sicilia und weitere Dienste | Originalauflösung/aktuelle Abdeckung/Weiterverwendung prüfen; später georeferenziert kacheln |
| P1 | Historie/Architektur | Offizielle Gemeindeseiten, regionale Kulturarchive, Wikimedia | Nur konkrete Quelle dem Objekt zuordnen; Artikelidentität kontrollieren |
| P1 | Wetter | Open-Meteo | Zeitgestempelte Modellwerte; keine Sensor- oder Satelliten-Live-Behauptung |
| P2 | Flugzeugpositionen | FlyItalyADSB | Nutzungsbedingungen und Schlüssel, Caching, Zeitstempel, Abdeckung prüfen |
| P2 | Flughafen-Abmessungen und Flächen | Aeronautische Publikationen/amtliche Geodaten und OSM | Bahn, Vorfeld, Terminal geometrisch ausrichten, keine freie Annäherung als exakte Flughafenkarte |
| P3 | Fotorealistische Gebäude | genehmigte Photogrammetrie, lizenzierte Fassadenfotos, manuell modellierte Landmarken | Nur für ausgewählte Orte, Rechte dokumentieren |

**Konkrete verifizierte Ausgangspunkte:**
- Regionales SITR-Downloadportal: https://www.sitr.regione.sicilia.it/download/
- ArcGIS-Bilddienste (u. a. 2022, 20 cm): https://map.sitr.regione.sicilia.it/gis/rest/services/ortofoto
- Offizielle 1-m-LiDAR-DTM-Metadaten: https://www.dati.gov.it/node/view-dataset/dataset?id=ffad6512-1854-4e4d-bfec-bd867d8b18dc
- Offizielle 2-m-LiDAR-DTM-Metadaten: https://www.dati.gov.it/node/view-dataset/dataset?id=92dda1ec-a252-466d-9f1e-4bb6c0fff2ef
- Offizielle Casalvecchio-Kirchen: https://comune.casalvecchiosiculo.me.it/tipi_luogo/chiesa/
- ADS-B-API und Limitierung: https://flyitalyadsb.com/data/api/docs/ und https://flyitalyadsb.com/faq/
- Open-Meteo: https://open-meteo.com/en/docs

**Wichtige Einschränkung:** Eine Metadatenkarte oder ein sichtbarer WMS-Layer beweist noch keinen frei herunterladbaren Rohdatensatz; Lizenz, Exportfunktion, räumliche Abdeckung und vertikales Datum werden separat geprüft.

## 4. Pilotgebiet: Casalvecchio Siculo

**Warum zuerst:** Stark bewegtes Gelände, enger historischer Ortskern, spezifische Kirchen und ein bereits vorhandenes Testprojekt. So können wir den Qualitätsgewinn im Vergleich zur aktuellen «flachen Hauskulisse» direkt messen.

### Pilotobjekte
- Piazza Chiesa und angrenzende Gassen: exakte Platz- und Wegegeometrie verifizieren.
- Chiesa di Sant’Onofrio: reale Lage/Grundriss/Architektur anhand Gemeinde- und Denkmalquellen; eine manuell erstellte 3D-Landmarke statt generischem Kirchturm.
- Häuser am Platz: Grundriss und Eingänge aus OSM/geeigneten Katasterdaten, realistische Dachneigung und Materialbibliothek; keine erfundenen Baujahre.
- Hügellandschaft: echtes Geländemesh, Hanglage, Strassensteigung, Bebauung auf Terrain ausgerichtet, Sichtweiten und Vegetation ohne schwebende oder einsinkende Objekte.

### WALK-Definition
- Strassen und Wege sind begehbar, nicht die gesamte Landschaft als unkontrollierte Fläche.
- Charakter bewegt sich an Mauern entlang, kann die Kamera um 360° drehen und auf Augenhöhe schauen.
- Untergrundhöhe und Kollisionsgeometrie stimmen zusammen; auf einer sichtbaren Treppe steht die Figur nicht in der Luft.
- Ein Druck auf Kirche/Platz/Gebäude öffnet die zugehörige Wissenskarte mit Herkunft und Datum.
- Bei fehlenden Daten steht sichtbar «schematisch modelliert» statt einer erfundenen historischen Rekonstruktion.

### Erfolgskriterium
Ein Testbesucher findet die Piazza, läuft über mindestens zwei reale Strassenabschnitte zur Kirche, erkennt die Hanglage und kann die Quellen zu einer Kirche und drei Gebäuden öffnen. Es gibt keine flächigen Höhenartefakte, schwebenden Häuser oder blockierenden Pop-ups.

## 5. Pilotgebiet: Flughafen Catania-Fontanarossa

**Warum dieser Flughafen:** Im Projekt bereits 3D-Szene und erste ADS-B-Verbindung vorhanden; grosse visuelle Diskrepanz zwischen Luftbild und modellierten Objekten.

### Reihenfolge
1. Echte Startbahngeometrie und Flughafenkontur aus OSM plus amtlicher Luftfahrtquelle einmessen; keine frei platzierte Runway über dem Bild.
2. Vorfeld, Rollwege, Terminal und Parkstände aus echtem Kartenmaterial/Grundrissen verorten.
3. Einfache, gute 3D-Assets für Terminal, Tower, Flugsteige und Flugzeuge mit performantem LOD aufbauen.
4. Zwei Kameramodi: «Flughafen komplett» und «Anflug / Luftfahrzeug verfolgen».
5. Flugdatenschicht: gemeldete ADS-B-Position, Höhe, Geschwindigkeit, Kurs, letzte Meldung, Quellenname.
6. Bis maximal ca. 20 Sekunden Positionsfortschreibung zwischen Meldungen; danach «veraltet» und nicht weiterbewegen.
7. Landevorhersage aus Kurs, Entfernung und Sinkrate **nur** als «Annäherung möglich» markieren. Eine Landung darf nicht ohne bestätigende Quelle behauptet werden.
8. Fahrplan- und Flugstatusdaten getrennt von gemessenen Positionen anzeigen.

### Modellstatus (immer sichtbar)
- **LIVE / EMPFANGEN:** vom Datenanbieter gemeldet, mit Zeitstempel.
- **BERECHNET:** aus gemeldeten Daten auf wenige Sekunden extrapoliert, mit Zeitstempel der Ursprungslage.
- **SIMULATION:** frei modellierte Flugbewegung (kein echter Flug).

### Erfolgskriterium
Flugzeuge sind aus der Weitansicht sichtbar; Auswahl zeigt Details; «Folgen» richtet die Kamera korrekt aus; tatsächliche Positionen erscheinen nur bei gültiger API-Antwort; bei Ausfall der API bleibt der Flughafen benutzbar und meldet den Ausfall.

## 6. Drei Ausbaustufen

### Stufe 1 — V10.1 Solide Inselbasis

**Ziel:** technisch stabile Karte statt Patch-Kette.

- Neues TypeScript-Projekt mit reproduzierbaren Builds, automatischen Checks, zentralen Zustands- und Datenmodellen.
- Verifizierte Reliefkacheln, bessere Höhenfarben und klare Layer-Schalter.
- Orts- und Gebäudeauswahl mit Quellenkennzeichnung; Gipfelpunkte standardmässig nur kontextuell.
- Saubere Bedienung am Desktop: Zoom, Neigen, Drehen, Tastatur, Responsive Design.
- Testbetrieb einer gecachten OSM-/Wetterdaten-Schnittstelle.

**Abnahme:** Karte startet wiederholbar auf Desktop und Mobilgerät, alle Ansichten sind erreichbar, keine JavaScript-Laufzeitfehler in den festgelegten Smoke-Tests.

### Stufe 2 — V10.2 Casalvecchio: hochwertiger Walk

**Ziel:** ein realitätsnaher Referenzort auf Augenhöhe.

- Geodaten-Import für Ortszentrum (Strassen, Gebäude, Terrain).
- Reale Geländehöhen durchgängig auf Strassen und Bauobjekte anwenden.
- Kirche Sant’Onofrio als eigene Landmarke nach verifizierten Quellen.
- Materialbibliothek für ortstypische Fassaden und Dächer, mit Genauigkeitsanzeige.
- Laufsteuerung, Kollision, freie Kamera, Übersicht, Sprung zu Sehenswürdigkeiten.
- Wissenskarten und Quellen pro Objekt.

**Abnahme:** Begehbare Piazza und Kirchweg ohne Geometriefehler; Testperson kann mindestens drei spezifische Objekte und ihre Quellen identifizieren. Die Beispielszene ist gut genug, um auf weitere Orte ausgerollt zu werden.

### Stufe 3 — V10.3 AIR + Skalierung

**Ziel:** zuverlässiger Flughafen und Wiederverwendung des Town-Explorers.

- Luftbild und 3D-Flughafen geometrisch deckungsgleich.
- ADS-B über Backend mit Schutz des API-Schlüssels, Caching und Zeitstempeln.
- Echte Flugzeugdetails und kurze, klar markierte Positionsfortschreibung.
- Modellierte Anflugsequenz als separater Demonstrationsmodus.
- Standard-3D-Walk für weitere Orte und detaillierte Modelle für ausgewählte Referenzorte (zuerst Taormina, danach Catania Altstadt).
- Monitoring, Ladezeit-/FPS-Messung und Lizenzdokumentation.

**Abnahme:** Keine falschen Live-Aussagen; Flugzeuge sichtbar, wenn Meldungen verfügbar; Town-Explorer lässt sich anhand derselben Datenpipeline in einer zweiten Gemeinde erzeugen.

## 7. Technische Arbeitspakete und Reihenfolge

**Sprint A: GIS-Audit und Reparatur der Fundamentdaten**
- 3D-Terrain-Höhenwerte an Kontrollpunkten prüfen (nicht «0 m» bei realem Hügelort).
- Höhenmodell-Sampling, Koordinatenumrechnung, Rastertile-Index, Vertex-Snap und Materialmapping prüfen.
- Den aktuellen Fehler dokumentieren, bei dem sichtbare Hausgrundrisse oder Fusswege nicht zur Terrain-Geometrie passen.
- Quelle, Lizenz und Abdeckung des 2022er Orthofoto-Dienstes im Pilotgebiet prüfen.
- OSM-PBF-Pipeline oder geeigneten kleinen lokalen Extrakt vorbereiten.

**Sprint B: modulare Atlas-UI**
- Bestehende Karte als Referenz behalten, neue UI im Entwicklungszweig.
- Reaktive Panels, Objektauswahl, Quellen-Statuschips, Tastatursteuerung und klarer Moduswechsel.
- Kartenkamera in Testfällen per Koordinaten/Pitch/Bearing reproduzieren.
- Gipfel-Einblendung nur bei gewähltem Layer und passendem Zoom.

**Sprint C: Pilot-Walk**
- Orts-Geometrie und lokale Terrain-Kachel-Cache-Grenzen.
- Strassen-Mesh nach DEM, Kollision und realistische Stufen/Steigungen.
- Landmarke Kirche, 10–30 gezielt geprüfte Bauobjekte statt Hunderte zufällige Häuser.
- Belastungstest auf Desktop und Mobilgerät.

**Sprint D: Flight Explorer**
- Flughafen-Survey-Overlay mit Quellen und richtiger Lage.
- ADS-B-Proxy mit Status «live / geschätzt / offline», API-Key im Secret Store.
- Kamera-Presets, Flugspuren, Flugzeugtyp-Assets, Verfolgung.
- Ausfallszenario ohne erfundene Flugzeuge.

**Sprint E: Wiederverwendbarkeit**
- Konfigurationsdatei für Ortszentren, Datenkacheln, Landmarken und Qualitätsstufen.
- Zweites Pilotgebiet vollständig über dieselbe Pipeline generieren.

## 8. Messbare Qualitätsziele

Die Werte sind **Zielwerte für Tests**, keine bereits erreichten Ergebnisse.

| Merkmal | Soll |
|---|---|
| Start | Atlas zeigt in normaler Desktop-Breitbandumgebung innerhalb von 5 Sekunden eine nutzbare Karte; späte Layer blockieren die Bedienung nicht |
| Walk | In einem vorbereiteten Pilotgebiet innerhalb von 10 Sekunden spielbar, sofern Assets bereits bereitstehen |
| Bildrate | Ziel 60 FPS auf mittelstarkem Desktop, 30 FPS als mobile Mindestzielmarke |
| Höhenmodell | Kontrollpunkte mit bekannter Ortshöhe dokumentieren; keine unbegründete Nullhöhe |
| Gebäude | Mindestens 20 dokumentierte Objekte im Pilot, jedes mit Quellen- oder «unbekannt»-Status |
| Interaktion | 360° drehbar, frei neigbar, Collision Sliding, variable Geschwindigkeit |
| Live-Flüge | Meldungszeit, Empfangszeit, Abdeckung und Status sichtbar; bei >20 s ohne Update keine stillschweigende Fortschreibung |
| Robustheit | Browser-Smoke-Tests für Map, Walk, Air, fehlende API und fehlende Terrain-Kacheln |
| Datenethik | Keine geratenen Baujahre als Fakten; Simulation nicht als gemessene Gegenwart ausgeben |

## 9. Die nächsten drei konkreten Aufgaben

1. **Einen Entwicklungszweig und ein neues v10-Grundgerüst erstellen**, ohne die laufende Version 9.2 zu überschreiben.
2. **Casalvecchio-GIS-Datenkontrolle starten:** reale Ortshöhe, DTM-Kachelverfügbarkeit, OSM-Gebäude und Kirchenobjekt nachweisen; Geo-Testdatei anlegen.
3. **Eine erste saubere v10-Terrain- und Walk-Demo nur für Casalvecchio bauen**, deren Höhen und Gebäudekonturen korrekt sind, bevor zusätzliche Designs oder Flugfunktionen hinzukommen.

## 10. Aufwand und Kosten

Eine kleine private Demo kann mit Open-Source-Komponenten und kostenlosen Kontingenten beginnen. Ein öffentlich skalierbares Produkt benötigt aber voraussichtlich Kosten für Backend/Hosting, Speicherung und Bereitstellung von 3D-Kacheln, API-Zugänge sowie gegebenenfalls die manuelle 3D-Modellierung. Die grösste Ressource wird zunächst die Datenprüfung und Geometrieaufbereitung sein, nicht der Kauf eines bestimmten KI-Modells. Erst nach dem Daten-Audit sind seriöse Kosten- und Zeitschätzungen möglich.

**Prioritätsentscheidung:** Zuerst Casalvecchio als Vorzeigeort korrekt bauen, dann Catania Airport technisch und visuell stabilisieren, anschliessend auf Taormina und weitere sizilianische Orte skalieren.

---
*Dieser Plan ist eine Entwicklungsgrundlage. Er belegt keine bereits implementierte v10-Funktion und ersetzt nicht die Prüfung von Geodatenlizenzen, API-Bedingungen und tatsächlichen Browser-Ergebnissen.*
