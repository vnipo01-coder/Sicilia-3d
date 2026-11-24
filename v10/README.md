# SICILIA 3D v10.6 – Atlas & Stadtwissen

## Die eine aktive Anwendung
- https://vnipo01-coder.github.io/Sicilia-3d/
- https://vnipo01-coder.github.io/Sicilia-3d/v10/?release=120
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
