import { useState } from 'react';
import { Play, ExternalLink } from 'lucide-react';

const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/**
 * Extracts the YouTube video id from any common URL form:
 *  - https://www.youtube.com/watch?v=ID (with extra params)
 *  - https://youtu.be/ID
 *  - https://www.youtube.com/embed/ID
 *  - https://www.youtube.com/shorts/ID
 * Returns null if no valid 11-char id is found.
 */
function parseYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,        // watch?v=ID
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,    // youtu.be/ID
    /\/embed\/([a-zA-Z0-9_-]{11})/,      // /embed/ID
    /\/shorts\/([a-zA-Z0-9_-]{11})/,     // /shorts/ID
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m && m[1]) return m[1];
  }
  return null;
}

export default function YouTubeMedia({ url, title, className = '' }) {
  const id = parseYouTubeId(url);
  const [playing, setPlaying] = useState(false);
  const [thumbHi, setThumbHi] = useState(true); // try hqdefault first, fall back to mqdefault

  if (!id) return null;

  const watchUrl = `https://www.youtube.com/watch?v=${id}`;
  const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&rel=0`;
  const thumbUrl = `https://img.youtube.com/vi/${id}/${thumbHi ? 'hqdefault' : 'mqdefault'}.jpg`;

  return (
    <div className={`w-full ${className}`}>
      <div className="overflow-hidden rounded-2xl border border-purple-500/20 bg-[#160a18] shadow-lg shadow-black/30">
        {/* 16:9 responsive media container */}
        <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
          {playing ? (
            <iframe
              src={embedUrl}
              title={title || 'Vidéo YouTube'}
              className="absolute inset-0 h-full w-full rounded-t-2xl"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              onClick={() => setPlaying(true)}
              aria-label={title ? `Lire la vidéo : ${title}` : 'Lire la vidéo'}
              className="group absolute inset-0 h-full w-full cursor-pointer overflow-hidden"
            >
              <img
                src={thumbUrl}
                alt={title || 'Aperçu de la vidéo'}
                loading="lazy"
                onError={() => thumbHi && setThumbHi(false)}
                className="absolute inset-0 h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {/* dark overlay for contrast */}
              <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20 transition-opacity duration-300 group-hover:from-black/60" />
              {/* centered gradient play button */}
              <span className="absolute inset-0 flex items-center justify-center">
                <span
                  className="flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-300 group-hover:scale-110"
                  style={{ background: BRAND_GRADIENT, boxShadow: '0 0 24px rgba(255,0,255,0.45)' }}
                >
                  <Play className="ml-0.5 h-7 w-7 fill-white" />
                </span>
              </span>
              {/* title overlaid at bottom */}
              {title && (
                <span className="absolute inset-x-0 bottom-0 p-3 text-left">
                  <span className="line-clamp-2 text-sm font-semibold text-white drop-shadow">
                    {title}
                  </span>
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Always-visible "Voir sur YouTube" link */}
      <a
        href={watchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-gray-400 transition-colors duration-200 hover:text-[#ff00ff]"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Voir sur YouTube
      </a>
    </div>
  );
}
