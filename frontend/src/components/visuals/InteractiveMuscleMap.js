import { useState } from 'react';
import { Activity, List, Eye } from 'lucide-react';
import YouTubeMedia from './YouTubeMedia';
import anteriorImg from '@/assets/muscles-anterior.png';
import posteriorImg from '@/assets/muscles-posterior.png';

const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

const VIEWS = [
  { key: 'anterior', src: anteriorImg, label: 'Vue antérieure' },
  { key: 'posterior', src: posteriorImg, label: 'Vue postérieure' },
];

/** A single expanded muscle detail: name, description, video. */
function MuscleDetail({ marker, index }) {
  return (
    <div className="animate-in rounded-2xl border border-purple-500/20 bg-[#160a18] p-4">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: BRAND_GRADIENT, boxShadow: '0 0 12px rgba(255,0,255,0.45)' }}
        >
          {index + 1}
        </span>
        <h3 className="text-base font-bold text-transparent bg-clip-text"
          style={{ backgroundImage: BRAND_GRADIENT }}>
          {marker.name}
        </h3>
      </div>
      {marker.description && (
        <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
          {marker.description}
        </p>
      )}
      {marker.youtube_url && (
        <YouTubeMedia url={marker.youtube_url} title={marker.name} />
      )}
    </div>
  );
}

export default function InteractiveMuscleMap({ markers }) {
  const list = Array.isArray(markers) ? markers : [];
  const [selectedId, setSelectedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

  if (!list.length) {
    return (
      <div className="rounded-2xl border border-dashed border-purple-500/20 bg-[#160a18] p-8 text-center">
        <Activity className="mx-auto mb-3 h-8 w-8 text-purple-500/40" />
        <p className="text-sm text-gray-400">
          Aucun muscle à afficher pour le moment.
        </p>
      </div>
    );
  }

  // 1-based index per marker id, continuous across both views (matches list order).
  const indexById = new Map(list.map((m, i) => [m.id, i]));

  const selected = list.find((m) => m.id === selectedId) || null;
  const selectedIndex = selected ? indexById.get(selected.id) : -1;

  const handleSelect = (marker) => {
    setSelectedId((prev) => (prev === marker.id ? null : marker.id));
  };

  return (
    <div className="space-y-6">
      {/* Header + "Tout voir" toggle */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-400">
          {showAll
            ? 'Tous les muscles déployés'
            : 'Cliquez un repère ou un muscle pour en savoir plus'}
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
        /* ---- "Tout voir" : every muscle expanded as a vertical list ---- */
        <div className="space-y-4">
          {list.map((marker, i) => (
            <MuscleDetail key={marker.id ?? i} marker={marker} index={i} />
          ))}
        </div>
      ) : (
        /* ---- Light view : anatomy figures + list, single click-to-reveal detail ---- */
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT : the two interactive anatomy figures */}
          <div className="overflow-hidden rounded-2xl border border-purple-500/20 bg-[#160a18] p-3">
            <div className="flex flex-wrap justify-center gap-6">
              {VIEWS.map((view) => (
                <div key={view.key} className="relative inline-block">
                  <div className="relative">
                    <img
                      src={view.src}
                      loading="lazy"
                      alt={view.label}
                      className="mx-auto h-[420px] w-auto select-none md:h-[460px]"
                    />
                    {list.map((marker) => {
                      if (marker.view !== view.key) return null;
                      const i = indexById.get(marker.id);
                      const isActive = marker.id === selectedId;
                      return (
                        <button
                          key={marker.id ?? i}
                          type="button"
                          onClick={() => handleSelect(marker)}
                          title={marker.name}
                          aria-label={marker.name}
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
                  <p className="mt-2 text-center text-sm text-gray-400">{view.label}</p>
                </div>
              ))}
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
                          {marker.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {marker.view === 'posterior' ? 'Postérieur' : 'Antérieur'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Detail panel for the selected muscle (desktop: right column) */}
            {selected && (
              <div className="hidden md:block">
                <MuscleDetail marker={selected} index={selectedIndex} />
              </div>
            )}
          </div>

          {/* Detail panel on mobile: below the figures, full width */}
          {selected && (
            <div className="md:hidden">
              <MuscleDetail marker={selected} index={selectedIndex} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
