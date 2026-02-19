const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

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

const HIGHWAY_FILTER =
  'motorway|trunk|primary|secondary|tertiary|unclassified|residential|' +
  'motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|service|living_street|pedestrian';

// Use Nominatim to resolve a city name to an OSM relation ID + bounding box
async function lookupCity(cityName) {
  const url =
    `${NOMINATIM_URL}?q=${encodeURIComponent(cityName)}&format=json&limit=10&addressdetails=0`;
  const response = await fetch(url, {
    headers: { 'User-Agent': 'CityRoadsApp/1.0 (educational project)' },
  });
  if (!response.ok) throw new Error(`Nominatim error: ${response.status}`);

  const results = await response.json();
  if (!results.length) return null;

  // Prefer relation results (cities/admin boundaries) over nodes/ways
  const relation = results.find(
    (r) => r.osm_type === 'relation' && ['city', 'town', 'municipality', 'administrative', 'village'].includes(r.type)
  ) || results.find((r) => r.osm_type === 'relation') || results[0];

  const [s, n, w, e] = relation.boundingbox.map(Number);
  return {
    osmType: relation.osm_type,
    osmId: parseInt(relation.osm_id, 10),
    displayName: relation.display_name,
    bbox: { minLat: s, maxLat: n, minLon: w, maxLon: e },
  };
}

// Build Overpass query using area ID (from OSM relation)
function buildAreaQuery(areaId) {
  return `
    [out:json][timeout:90];
    area(${areaId})->.searchArea;
    (
      way["highway"~"^(${HIGHWAY_FILTER})$"](area.searchArea);
    );
    out body;
    >;
    out skel qt;
  `;
}

// Fallback: build Overpass query using bounding box
function buildBboxQuery(bbox) {
  const { minLat, minLon, maxLat, maxLon } = bbox;
  return `
    [out:json][timeout:90][bbox:${minLat},${minLon},${maxLat},${maxLon}];
    (
      way["highway"~"^(${HIGHWAY_FILTER})$"];
    );
    out body;
    >;
    out skel qt;
  `;
}

function processOverpassData(data, cityName) {
  const nodes = {};
  const ways = [];

  data.elements.forEach((el) => {
    if (el.type === 'node') {
      nodes[el.id] = { lat: el.lat, lon: el.lon };
    } else if (el.type === 'way' && el.nodes) {
      ways.push({
        nodes: el.nodes,
        highway: el.tags?.highway || 'unclassified',
      });
    }
  });

  const roads = ways
    .filter((w) => ROAD_TYPES[w.highway]?.include)
    .map((w) => ({
      highway: w.highway,
      weight: ROAD_TYPES[w.highway]?.weight || 1,
      coords: w.nodes.filter((id) => nodes[id]).map((id) => nodes[id]),
    }))
    .filter((r) => r.coords.length >= 2);

  if (roads.length === 0) return null;

  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  roads.forEach(({ coords }) =>
    coords.forEach(({ lat, lon }) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    })
  );

  return { city: cityName, roads, bounds: { minLat, maxLat, minLon, maxLon } };
}

async function queryOverpass(query) {
  const response = await fetch(OVERPASS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!response.ok) throw new Error(`Overpass API error: ${response.status}`);
  return response.json();
}

app.get('/api/city-roads', async (req, res) => {
  const { city } = req.query;
  if (!city || !city.trim()) {
    return res.status(400).json({ error: 'City name is required' });
  }

  const cityName = city.trim();

  try {
    // Step 1: Resolve city via Nominatim
    const cityInfo = await lookupCity(cityName);
    if (!cityInfo) {
      return res.status(404).json({
        error: `City "${cityName}" not found. Check the spelling or try adding the country (e.g. "Paris, France").`,
      });
    }

    console.log(`Resolved "${cityName}" → ${cityInfo.displayName} (osm ${cityInfo.osmType}/${cityInfo.osmId})`);

    // Step 2: Query Overpass — prefer area query for relations, bbox fallback otherwise
    let data;
    if (cityInfo.osmType === 'relation') {
      // Overpass area IDs for relations = relation OSM ID + 3,600,000,000
      const areaId = 3600000000 + cityInfo.osmId;
      console.log(`Using area query with area ID ${areaId}`);
      data = await queryOverpass(buildAreaQuery(areaId));
    } else {
      console.log(`Using bbox fallback for non-relation result`);
      data = await queryOverpass(buildBboxQuery(cityInfo.bbox));
    }

    if (!data.elements || data.elements.length === 0) {
      return res.status(404).json({
        error: `No road data found for "${cityName}". Try a different spelling or add the country name.`,
      });
    }

    // Step 3: Process into road segments
    const result = processOverpassData(data, cityName);
    if (!result) {
      return res.status(404).json({ error: `No roads could be rendered for "${cityName}".` });
    }

    res.json(result);
  } catch (err) {
    console.error('Error:', err.message);
    if (err.message.includes('429') || err.message.includes('503')) {
      return res.status(503).json({ error: 'The map data service is busy. Please try again in a moment.' });
    }
    res.status(500).json({ error: 'Failed to fetch road data. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`City Roads backend running on http://localhost:${PORT}`);
});
