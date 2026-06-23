import { useState } from 'react';
import { MapPin, List, Eye, Map as MapIcon } from 'lucide-react';
import YouTubeMedia from './YouTubeMedia';

const MAP_URL = `${process.env.PUBLIC_URL || ''}/visuals/africa-base.svg`;
const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/** A single expanded style detail: title, history, video. */
function StyleDetail({ marker, index }) {
  return (
    <div className="animate-in rounded-2xl border border-purple-500/20 bg-[#160a18] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: BRAND_GRADIENT, boxShadow: '0 0 12px rgba(255,0,255,0.45)' }}
        >
          {index + 1}
        </span>
        <h3 className="text-base font-bold text-white">
          {marker.style_name}
          {marker.country && (
            <span className="font-normal text-gray-400"> — {marker.country}</span>
          )}
        </h3>
      </div>
      {marker.history && (
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
          {marker.history}
        </p>
      )}
      {marker.youtube_url && (
        <YouTubeMedia url={marker.youtube_url} title={marker.style_name} />
      )}
    </div>
  );
}

export default function InteractiveStyleMap({ markers }) {
  const list = Array.isArray(markers) ? markers : [];
  const [selectedId, setSelectedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  if (!list.length) {
    return (
      <div className="rounded-2xl border border-dashed border-purple-500/20 bg-[#160a18] p-8 text-center">
        <MapIcon className="mx-auto mb-3 h-8 w-8 text-purple-500/40" />
        <p className="text-sm text-gray-400">
          Aucun style à afficher pour le moment.
        </p>
      </div>
    );
  }

  const selected = list.find((m) => m.id === selectedId) || null;
  const selectedIndex = selected ? list.findIndex((m) => m.id === selectedId) : -1;

  const handleSelect = (marker) => {
    setSelectedId((prev) => (prev === marker.id ? null : marker.id));
  };

  return (
    <div className="space-y-6">
      {/* Header + "Tout voir" toggle */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          {showAll
            ? 'Tous les styles déployés'
            : 'Cliquez un repère ou un style pour en savoir plus'}
        </p>
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          aria-pressed={showAll}
          className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200 hover:border-[#ff00ff] hover:bg-purple-500/10"
        >
          {showAll ? <Eye className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
          {showAll ? 'Vue simple' : 'Tout voir'}
        </button>
      </div>

      {showAll ? (
        /* ---- "Tout voir" : every style expanded as a vertical list ---- */
        <div className="space-y-4">
          {list.map((marker, i) => (
            <StyleDetail key={marker.id ?? i} marker={marker} index={i} />
          ))}
        </div>
      ) : (
        /* ---- Light view : map + list, single click-to-reveal detail ---- */
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT : interactive map */}
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-[#160a18] p-3">
            <div className="relative w-full">
              <img
                src={MAP_URL}
                loading="lazy"
                alt="Carte d'Afrique : origines des styles"
                className="h-auto w-full select-none"
              />
              {list.map((marker, i) => {
                const isActive = marker.id === selectedId;
                return (
                  <button
                    key={marker.id ?? i}
                    type="button"
                    onClick={() => handleSelect(marker)}
                    title={marker.style_name}
                    aria-label={`${marker.style_name}${marker.country ? ` — ${marker.country}` : ''}`}
                    className={`absolute flex items-center justify-center rounded-full text-xs font-bold text-white transition-all duration-200 hover:scale-125 ${
                      isActive ? 'scale-125 ring-2 ring-white/80' : ''
                    }`}
                    style={{
                      left: `${marker.x}%`,
                      top: `${marker.y}%`,
                      transform: 'translate(-50%,-50%)',
                      width: '1.75rem',
                      height: '1.75rem',
                      background: BRAND_GRADIENT,
                      boxShadow: isActive
                        ? '0 0 18px rgba(255,0,255,0.85)'
                        : '0 0 10px rgba(255,0,255,0.5)',
                    }}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT : list + detail panel */}
          <div className="space-y-4">
            <ul className="space-y-2">
              {list.map((marker, i) => {
                const isActive = marker.id === selectedId;
                return (
                  <li key={marker.id ?? i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(marker)}
                      aria-pressed={isActive}
                      className={`flex w-full items-center gap-3 rounded-lg p-2 text-left transition-all duration-200 ${
                        isActive
                          ? 'bg-purple-500/15 ring-1 ring-[#ff00ff]/50'
                          : 'bg-purple-500/5 hover:bg-purple-500/10'
                      }`}
                    >
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ background: BRAND_GRADIENT }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-white">
                          {marker.style_name}
                        </span>
                        {marker.country && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{marker.country}</span>
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Detail panel for the selected style (desktop: right column) */}
            {selected && (
              <div className="hidden md:block">
                <StyleDetail marker={selected} index={selectedIndex} />
              </div>
            )}
          </div>

          {/* Detail panel on mobile: below the map, full width */}
          {selected && (
            <div className="md:hidden">
              <StyleDetail marker={selected} index={selectedIndex} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
