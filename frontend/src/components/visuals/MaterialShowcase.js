import { useState } from 'react';
import { Package, Image as ImageIcon, List, Eye } from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/** Material image with a premium placeholder fallback when no image_url. */
function MaterialImage({ src, alt }) {
  if (src) {
    return (
      <img
        src={src}
        loading="lazy"
        alt={alt}
        className="h-56 w-full select-none rounded-xl object-cover md:h-64"
      />
    );
  }
  return (
    <div
      className="flex h-56 w-full flex-col items-center justify-center gap-2 rounded-xl border border-purple-500/20 md:h-64"
      style={{ background: 'linear-gradient(135deg,rgba(138,43,226,0.18),rgba(255,0,255,0.12))' }}
    >
      <ImageIcon className="h-8 w-8 text-purple-300/60" />
      <span className="text-xs font-medium text-gray-400">Image à venir</span>
    </div>
  );
}

/** A single expanded material detail: image, name, description. */
function MaterialDetail({ material, index }) {
  return (
    <div className="animate-in rounded-2xl border border-purple-500/20 bg-[#160a18] p-4">
      <MaterialImage src={material.image_url} alt={material.name} />
      <div className="mb-2 mt-4 flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
          style={{ background: BRAND_GRADIENT, boxShadow: '0 0 12px rgba(255,0,255,0.45)' }}
        >
          {index + 1}
        </span>
        <h3
          className="text-base font-bold text-transparent bg-clip-text"
          style={{ backgroundImage: BRAND_GRADIENT }}
        >
          {material.name}
        </h3>
      </div>
      {material.description && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
          {material.description}
        </p>
      )}
    </div>
  );
}

export default function MaterialShowcase({ materials }) {
  const list = Array.isArray(materials) ? materials : [];
  // Auto-select the first material so the detail panel is never empty/premium.
  const [selectedId, setSelectedId] = useState(() => (list.length ? list[0].id : null));
  const [showAll, setShowAll] = useState(false);

  if (!list.length) return null;

  const selected = list.find((m) => m.id === selectedId) || null;
  const selectedIndex = selected ? list.findIndex((m) => m.id === selected.id) : -1;

  const handleSelect = (material) => setSelectedId(material.id);

  return (
    <div className="space-y-6">
      {/* Header + "Tout voir" toggle */}
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-gray-400">
          <Package className="h-4 w-4 text-purple-400" />
          {showAll
            ? 'Tout le matériel affiché'
            : 'Cliquez un matériel pour voir l’image et la description'}
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
        /* ---- "Tout voir" : every material expanded with its image ---- */
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((material, i) => (
            <MaterialDetail key={material.id ?? i} material={material} index={i} />
          ))}
        </div>
      ) : (
        /* ---- Light view : list + single click-to-reveal detail ---- */
        <div className="grid gap-6 md:grid-cols-2">
          {/* LEFT : clickable list of material names */}
          <div className="space-y-4">
            <ul className="space-y-2">
              {list.map((material, i) => {
                const isActive = material.id === selectedId;
                return (
                  <li key={material.id ?? i}>
                    <button
                      type="button"
                      onClick={() => handleSelect(material)}
                      aria-pressed={isActive}
                      aria-selected={isActive}
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
                          {material.name}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* RIGHT : detail panel for the selected material (desktop) */}
          <div className="hidden md:block">
            {selected ? (
              <MaterialDetail material={selected} index={selectedIndex} />
            ) : (
              <div className="rounded-2xl border border-dashed border-purple-500/20 bg-[#160a18] p-8 text-center text-sm text-gray-400">
                Cliquez un matériel pour voir l&rsquo;image et la description
              </div>
            )}
          </div>

          {/* Detail panel on mobile: below the list, full width */}
          {selected && (
            <div className="md:hidden">
              <MaterialDetail material={selected} index={selectedIndex} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
