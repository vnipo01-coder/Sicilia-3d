# SICILIA 3D – 3D-Atlas, Architektur & Wetterwelt (v10.7)

**Öffnen:** https://vnipo01-coder.github.io/Sicilia-3d/

Die GitHub-Pages-Startseite leitet automatisch zur aktuellen, einzigen Hauptanwendung unter \`/v10/\` weiter. Die Karte zeigt Sizilien mit 3D-Gebäuden, Geländemodell, Relief, Satellit, Stadtinformationen, Wetter und Bushaltestellen.

## Was es jetzt gibt

- **Neu v10.7:** lebendigere Topografie, drei kartografische 3D-Gebäudefarbstile, zusätzliche OSM-Dachmerkmale und Konturlinien bei grossem Zoom.
- **Architekturwissen:** zwölf quellenorientierte Fachprofile über Baugeschichte und Stadtmorphologie, unter anderem für Santa Teresa, Noto, Ragusa, Palermo, Taormina, Siracusa und Agrigento.
- **Wetterwelt:** animierte Wolkendarstellung aus Open-Meteo-Windrichtung und Modellbewölkung, jederzeit abschaltbar; ausdrücklich gekennzeichneter Demomodus bei klarem Himmel. Die Wolkenpositionen sind illustrativ, nicht beobachtet.
- **Inselrundflug:** geführte Kameraansicht über elf Orte, mit variablem Tempo und jederzeitiger Unterbrechung.
- **Eine 3D-Karte statt drei fehleranfälliger Spezialansichten.** Die separat entwickelten Walking-, Küsten- und Flughafen-Explorer wurden auf ausdrücklichen Wunsch aus der öffentlichen Website und dem aktuellen Main-Branch gelöscht. Der frühere Stand ist im Zweig \`archive-pre-v10-6-walk-air\` erhalten.
- **Schnelle Ortsnavigation:** Städte direkt auswählen oder suchen. Standardansicht ist Santa Teresa di Riva, über «Insel» die Übersicht.
- **3D-Kamera:** Mausrad zoomt oder lässt sich per Schalter auf Neigen umstellen; Shift kehrt die Funktion um. Mit der rechten Maustaste ziehen, separate Dreh- und Neigebuttons, sowie «Bodennahe 3D-Ansicht» für hohen Pitch und Nahzoom.
- **Strukturierte Wissensansicht:** Überblick, Geschichte, Quellen, Alltag. Stadtübersicht direkt aus einer Sehenswürdigkeit oder einem Objekt öffnen.
- **Direkte Stadthomepages:** Statt lediglich Suchergebnisse zu zeigen, öffnen sichtbare Links den Wikipedia-Stadtartikel und – wo geprüft – die offizielle Gemeindewebsite. Ein Stadtprofil wird nur nach geografisch plausibler Zuordnung angeboten.
- **Belegte Quellen:** Einzelne aufklappbare Originalquellen; amtliche und Wikipedia-/Wikidata-Informationen klar getrennt. Baujahre und Höhen werden nicht als sichere Fakten erfunden.
- **Wetter und Verkehr:** Open-Meteo-Modellwerte mit Zeitstempel und Sechs-Stunden-Trend; Santa-Teresa-Haltestellen mit Betreiberlinks. Keine ungesicherten Live-Buszeiten.

## Genauigkeit und Grenzen

Die **3D-Gebäude sind GIS-Volumenmodelle** aus OSM-/OpenMapTiles-Daten, keine vollständigen fotorealistischen Fassadenaufnahmen. Eine bodennahe Kartenperspektive ist deshalb nicht Google Street View. Wo Daten fehlen, bleibt die Information ausdrücklich offen.

Die statische Website nutzt externe Karten- und Wissensdienste. Wenn diese langsam oder blockiert sind, kann sich der betreffende Datenbereich verzögern; die restliche Anwendung soll benutzbar bleiben. Verlässliche öffentliche Skalierung würde ein eigenes Datenbackend und Caching benötigen.

## Entwicklung und Tests

Code unter \`v10/\`, Tests mit \`cd v10 && npm run check\` (Node.js 22).
Der Workflow \`.github/workflows/sicilia-v10-checks.yml\` kontrolliert die Syntax und die Unit-Tests. Browser-Rendering und tatsächlich erreichbare öffentliche Datenendpunkte müssen zusätzlich praktisch getestet werden.

**Geprüfte Quellen** für Stadtprofile und Architektur:
- https://www.comune.santateresadiriva.me.it/
- https://www.comune.palermo.it/
- https://www.comune.catania.it/
- https://www.comune.taormina.me.it/
- https://it.wikipedia.org/wiki/Santa_Teresa_di_Riva
- https://www.wikidata.org/wiki/Q498938
- https://open-meteo.com/en/docs

Mehr technische Details: [v10/README.md](v10/README.md).
