import { useMemo } from 'react';
import './MapCanvas.css';

const SVG_SIZE = 800;
const PADDING = 20;

// Map highway type to stroke width
const STROKE_WIDTHS = {
  motorway: 3.5,
  trunk: 3,
  primary: 2.5,
  secondary: 2,
  tertiary: 1.5,
  unclassified: 1,
  residential: 0.8,
  motorway_link: 2,
  trunk_link: 1.8,
  primary_link: 1.5,
  secondary_link: 1.2,
  tertiary_link: 1.2,
  service: 0.5,
  living_street: 0.7,
  pedestrian: 0.6,
};

// Map highway type to opacity
const OPACITY = {
  motorway: 1,
  trunk: 1,
  primary: 0.95,
  secondary: 0.9,
  tertiary: 0.85,
  unclassified: 0.75,
  residential: 0.65,
  motorway_link: 0.9,
  trunk_link: 0.9,
  primary_link: 0.85,
  secondary_link: 0.8,
  tertiary_link: 0.8,
  service: 0.5,
  living_street: 0.6,
  pedestrian: 0.55,
};

function MapCanvas({ data, svgRef }) {
  const { roads, bounds, city } = data;

  const paths = useMemo(() => {
    const { minLat, maxLat, minLon, maxLon } = bounds;

    const latRange = maxLat - minLat;
    const lonRange = maxLon - minLon;

    if (latRange === 0 || lonRange === 0) return [];

    const drawableSize = SVG_SIZE - PADDING * 2;

    // Keep aspect ratio
    const scaleX = drawableSize / lonRange;
    const scaleY = drawableSize / latRange;
    const scale = Math.min(scaleX, scaleY);

    const offsetX = PADDING + (drawableSize - lonRange * scale) / 2;
    const offsetY = PADDING + (drawableSize - latRange * scale) / 2;

    const toX = (lon) => offsetX + (lon - minLon) * scale;
    // Flip Y: lat increases upward, SVG y increases downward
    const toY = (lat) => offsetY + (maxLat - lat) * scale;

    return roads.map((road, idx) => {
      const points = road.coords.map(({ lat, lon }) => `${toX(lon).toFixed(2)},${toY(lat).toFixed(2)}`);
      const d = 'M' + points.join('L');
      return {
        key: idx,
        d,
        highway: road.highway,
        strokeWidth: STROKE_WIDTHS[road.highway] ?? 1,
        opacity: OPACITY[road.highway] ?? 0.7,
      };
    });
  }, [roads, bounds]);

  // Sort so major roads render on top
  const sorted = useMemo(() => {
    const order = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary'];
    return [...paths].sort((a, b) => {
      const aIdx = order.indexOf(a.highway);
      const bIdx = order.indexOf(b.highway);
      return (aIdx === -1 ? 99 : aIdx) - (bIdx === -1 ? 99 : bIdx);
    }).reverse();
  }, [paths]);

  return (
    <div className="map-canvas-container">
      <p className="map-title">{city}</p>
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`0 0 ${SVG_SIZE} ${SVG_SIZE}`}
        xmlns="http://www.w3.org/2000/svg"
        width={SVG_SIZE}
        height={SVG_SIZE}
      >
        {/* Background */}
        <rect width={SVG_SIZE} height={SVG_SIZE} fill="#0f0f1a" />

        {/* Roads */}
        <g>
          {sorted.map(({ key, d, strokeWidth, opacity }) => (
            <path
              key={key}
              d={d}
              stroke="white"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={opacity}
            />
          ))}
        </g>

        {/* City label */}
        <text
          x={SVG_SIZE / 2}
          y={SVG_SIZE - 8}
          textAnchor="middle"
          fill="rgba(255,255,255,0.3)"
          fontSize="11"
          fontFamily="sans-serif"
          letterSpacing="2"
        >
          {city.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}

export default MapCanvas;
