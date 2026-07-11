// TexasMap.jsx — the interactive board: a stylized early-Texas map with five
// clickable regions. Pure SVG (crisp at any size, keyboard accessible, no
// alignment drift). Markers and claim tints render from server state only.

const NATION_COLOR = { spain: '#a3262a', france: '#26479e' };

// Region shapes tile a stylized Texas silhouette (viewBox 0 0 400 420).
const REGION_SHAPES = {
  west: {
    d: 'M95,15 L175,15 L175,110 L150,225 L126,300 L98,278 L56,240 L24,213 L95,213 Z',
    label: [96, 150], anchor: 'middle',
  },
  sanAntonio: {
    d: 'M175,110 L235,118 L248,150 L258,205 L272,262 L240,288 L202,300 L150,225 Z',
    label: [212, 205], anchor: 'middle',
  },
  eastTx: {
    d: 'M235,118 L298,104 L336,120 L344,172 L354,222 L337,258 L299,290 L272,262 L258,205 L248,150 Z',
    label: [300, 175], anchor: 'middle',
  },
  gulf: {
    d: 'M272,262 L299,290 L257,316 L227,340 L207,330 L240,288 Z',
    label: [268, 322], anchor: 'middle',
  },
  rioGrande: {
    d: 'M150,225 L202,300 L240,288 L207,330 L227,340 L207,388 L170,350 L126,300 Z',
    label: [172, 330], anchor: 'middle',
  },
};

const OUTLINE =
  'M95,15 L175,15 L175,110 L235,118 L298,104 L336,120 L344,172 L354,222 ' +
  'L337,258 L299,290 L257,316 L227,340 L207,388 L170,350 L126,300 L98,278 ' +
  'L56,240 L24,213 L95,213 Z';

// Small hand-drawn glyphs for the three marker types (20×20 box, drawn at origin).
function MarkerGlyph({ marker, color }) {
  if (marker === 'mission') {
    return (
      <g>
        <rect x="4" y="9" width="12" height="9" rx="1" fill={color} stroke="#fff" strokeWidth="1.2" />
        <path d="M4,9 L10,3.5 L16,9 Z" fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M10,0.5 V3.5 M8.6,2 H11.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
      </g>
    );
  }
  if (marker === 'presidio') {
    return (
      <g>
        <path d="M3,18 V7 h3 v-3 h3 v3 h2 v-3 h3 v3 h3 v11 Z" fill={color} stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
        <rect x="8.4" y="12" width="3.2" height="6" fill="#fff" opacity="0.85" />
      </g>
    );
  }
  return (
    <g>
      <path d="M5,19 V2" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6.2,3 L17,5.5 L6.2,9.5 Z" fill={color} stroke="#fff" strokeWidth="1.1" strokeLinejoin="round" />
    </g>
  );
}

// Spread marker chips inside a region without overlapping the label.
const MARKER_SLOTS = {
  west:       [[80, 175], [104, 190], [66, 205], [92, 222], [116, 165], [70, 240]],
  sanAntonio: [[192, 232], [216, 244], [180, 256], [206, 268], [230, 222], [168, 236]],
  eastTx:     [[288, 196], [312, 208], [276, 220], [300, 232], [322, 186], [264, 200]],
  gulf:       [[250, 288], [268, 298], [237, 302], [256, 312], [277, 285], [227, 315]],
  rioGrande:  [[160, 292], [184, 306], [148, 318], [172, 330], [196, 292], [140, 300]],
};

export default function TexasMap({
  meta,               // { regions: { id: { name, sub } }, nations: {...} }
  map,                // { regions: { id: { markers: [{side, marker}] } } }
  owners,             // { id: 'spain' | 'france' | 'contested' | null }
  selectable = false, // highlight + allow clicks
  selected = null,    // region id currently picked
  onSelect,
  mySide = null,
}) {
  const regionsMeta = meta?.regions || {};

  return (
    <svg
      className={`texas-map ${selectable ? 'selectable' : ''}`}
      viewBox="0 0 400 420"
      role="group"
      aria-label="Map of early Texas with five regions"
    >
      <defs>
        <pattern id="contestedHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="8" fill="none" />
          <line x1="0" y1="0" x2="0" y2="8" stroke="#8c5a2b" strokeWidth="2.5" opacity="0.35" />
        </pattern>
        <filter id="mapShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="#5f3c1a" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* silhouette base */}
      <path d={OUTLINE} className="map-base" filter="url(#mapShadow)" />

      {Object.entries(REGION_SHAPES).map(([id, shape]) => {
        const owner = owners?.[id];
        const info = regionsMeta[id] || { name: id };
        const markers = map?.regions?.[id]?.markers || [];
        const ownerName =
          owner === 'contested' ? 'contested'
          : owner ? `claimed by ${meta?.nations?.[owner]?.name || owner}`
          : 'unclaimed';
        const tint = owner && owner !== 'contested' ? NATION_COLOR[owner] : null;

        return (
          <g key={id} className="region-group">
            <path
              d={shape.d}
              className={`region ${selectable ? 'clickable' : ''} ${selected === id ? 'selected' : ''}`}
              role={selectable ? 'button' : 'img'}
              tabIndex={selectable ? 0 : -1}
              aria-label={`${info.name} (${info.sub || ''}) — ${ownerName}${selectable ? '. Press Enter to choose this region.' : ''}`}
              onClick={selectable ? () => onSelect?.(id) : undefined}
              onKeyDown={
                selectable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelect?.(id);
                      }
                    }
                  : undefined
              }
            />
            {tint && <path d={shape.d} className="region-tint" style={{ fill: tint }} />}
            {owner === 'contested' && <path d={shape.d} className="region-tint" fill="url(#contestedHatch)" />}

            <text x={shape.label[0]} y={shape.label[1]} textAnchor={shape.anchor} className="region-label">
              {info.name}
            </text>
            {info.sub && (
              <text x={shape.label[0]} y={shape.label[1] + 13} textAnchor={shape.anchor} className="region-sublabel">
                {info.sub}
              </text>
            )}

            {markers.slice(0, 6).map((m, i) => {
              const slot = MARKER_SLOTS[id][i] || shape.label;
              return (
                <g
                  key={i}
                  transform={`translate(${slot[0] - 10}, ${slot[1] - 10})`}
                  className={`marker ${m.side === mySide ? 'mine' : ''}`}
                  aria-hidden="true"
                >
                  <circle cx="10" cy="10" r="12" className="marker-halo" />
                  <MarkerGlyph marker={m.marker} color={NATION_COLOR[m.side]} />
                </g>
              );
            })}
            {markers.length > 6 && (
              <text x={shape.label[0]} y={shape.label[1] + 26} textAnchor="middle" className="region-sublabel">
                +{markers.length - 6} more
              </text>
            )}
          </g>
        );
      })}

      {/* compass + sea flourish */}
      <text x="330" y="392" className="map-flourish" textAnchor="middle">Gulf of Mexico</text>
      <g transform="translate(38,44)" className="map-compass" aria-hidden="true">
        <circle r="14" />
        <path d="M0,-11 L3,0 L0,11 L-3,0 Z" />
        <text y="-18" textAnchor="middle">N</text>
      </g>
    </svg>
  );
}

export { MarkerGlyph, NATION_COLOR };
