const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Overpass API endpoint
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

// Road type hierarchy for filtering/styling
const ROAD_TYPES = {
  motorway: { weight: 4, include: true },
  trunk: { weight: 3.5, include: true },
  primary: { weight: 3, include: true },
  secondary: { weight: 2.5, include: true },
  tertiary: { weight: 2, include: true },
  unclassified: { weight: 1.5, include: true },
  residential: { weight: 1, include: true },
  motorway_link: { weight: 2.5, include: true },
  trunk_link: { weight: 2, include: true },
  primary_link: { weight: 2, include: true },
  secondary_link: { weight: 1.5, include: true },
  tertiary_link: { weight: 1.5, include: true },
  service: { weight: 0.5, include: true },
  living_street: { weight: 0.8, include: true },
  pedestrian: { weight: 0.5, include: true },
  footway: { weight: 0.3, include: false },
  path: { weight: 0.3, include: false },
  cycleway: { weight: 0.3, include: false },
};

app.get('/api/city-roads', async (req, res) => {
  const { city } = req.query;

  if (!city || city.trim().length === 0) {
    return res.status(400).json({ error: 'City name is required' });
  }

  const cityName = city.trim();

  // Build Overpass QL query to get roads within the city boundary
  const query = `
    [out:json][timeout:60];
    (
      relation["name"="${cityName}"]["boundary"="administrative"]["admin_level"~"^[4-8]$"];
      node["name"="${cityName}"]["place"~"^(city|town|village|municipality)$"];
    )->.area;
    area.area->.searchArea;
    (
      way["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|service|living_street|pedestrian)$"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.elements || data.elements.length === 0) {
      return res.status(404).json({ error: `No road data found for "${cityName}". Try a different spelling or a nearby major city.` });
    }

    // Separate nodes and ways
    const nodes = {};
    const ways = [];

    data.elements.forEach((el) => {
      if (el.type === 'node') {
        nodes[el.id] = { lat: el.lat, lon: el.lon };
      } else if (el.type === 'way' && el.nodes) {
        ways.push({
          id: el.id,
          nodes: el.nodes,
          highway: el.tags?.highway || 'unclassified',
          name: el.tags?.name || '',
        });
      }
    });

    // Build road segments with coordinates
    const roads = ways
      .filter((way) => {
        const info = ROAD_TYPES[way.highway];
        return info && info.include;
      })
      .map((way) => {
        const coords = way.nodes
          .filter((nid) => nodes[nid])
          .map((nid) => ({ lat: nodes[nid].lat, lon: nodes[nid].lon }));
        return {
          highway: way.highway,
          weight: ROAD_TYPES[way.highway]?.weight || 1,
          coords,
        };
      })
      .filter((road) => road.coords.length >= 2);

    if (roads.length === 0) {
      return res.status(404).json({ error: `No roads could be rendered for "${cityName}".` });
    }

    // Compute bounding box
    let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
    roads.forEach((road) => {
      road.coords.forEach(({ lat, lon }) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon) minLon = lon;
        if (lon > maxLon) maxLon = lon;
      });
    });

    res.json({
      city: cityName,
      roads,
      bounds: { minLat, maxLat, minLon, maxLon },
    });
  } catch (err) {
    console.error('Error fetching road data:', err.message);
    if (err.message.includes('timeout') || err.message.includes('429')) {
      return res.status(503).json({ error: 'The map data service is busy. Please try again in a moment.' });
    }
    res.status(500).json({ error: 'Failed to fetch road data. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`City Roads backend running on http://localhost:${PORT}`);
});
