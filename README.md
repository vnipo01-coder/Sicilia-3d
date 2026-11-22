# SICILIA 3D — Professional Edition (v1.0)

Mobile-first 3D map prototype using MapLibre GL JS, OpenFreeMap and OpenStreetMap-based vector tiles.

## Start

1. Upload `index.html`, `style.css`, and `app.js` to the same directory in a static web host (e.g. a Replit HTML/CSS/JS project).
2. Serve the folder over HTTPS. For local desktop testing: `python -m http.server 8000` then open `http://localhost:8000`.
3. Internet access is required to load MapLibre and the map tiles.

## Features

- 9 destinations in Sicily
- Zoom, rotation, pitch and navigation
- 3D building extrusions based on OpenStreetMap-derived vector tiles
- Click buildings for available attributes
- Island overview, 3D and perspective toggles
- Responsive mobile interface and connection error message

## Data limitations

The 3D building geometry is an extrusion of mapped footprints, not a photorealistic mesh. Heights are used if supplied by the tiles, otherwise a floor-count heuristic or a generic fallback is used. The terrain is **not** a true 3D elevation model. Business data, real-time transport and weather are **not** included. Tile providers may change schemas, limits or availability; verify the live integration before deployment.

## Next milestones

1. Add terrain DEM (raster-dem) and hillshade.
2. Add building-detail API / OSM Overpass requests with caching and attribution.
3. Add layers for transport, weather and historic imagery with proper source licensing.
4. Move to Vite + TypeScript, automated tests and deployment.

## Credits

MapLibre GL JS; OpenFreeMap; © OpenStreetMap contributors. Follow the respective services' usage terms.
