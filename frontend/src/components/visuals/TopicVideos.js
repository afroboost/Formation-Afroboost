import { Film, Video } from 'lucide-react';
import YouTubeMedia from './YouTubeMedia';

/**
 * TopicVideos — premium responsive grid of topic videos.
 *
 * props:
 *   videos = array of { id, title, youtube_url }
 *
 * Returns null when there is nothing to show. Each card renders the title
 * and the video via <YouTubeMedia />. When a card has no usable URL,
 * YouTubeMedia returns null and we show a muted "Vidéo à venir" placeholder.
 */
export default function TopicVideos({ videos }) {
  const list = Array.isArray(videos) ? videos : [];
  if (!list.length) return null;

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
      {list.map((item, i) => {
        const hasUrl =
          item && typeof item.youtube_url === 'string' && item.youtube_url.trim() !== '';
        return (
          <div
            key={item?.id ?? i}
            className="group flex flex-col gap-3 rounded-2xl border border-purple-500/20 bg-[#160a18] p-4 shadow-lg shadow-black/30 transition-all duration-300 hover:-translate-y-1 hover:border-[#ff00ff]/50 hover:shadow-xl hover:shadow-purple-900/30"
          >
            <div className="flex items-center gap-2">
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
                style={{
                  background: 'linear-gradient(135deg,#8a2be2,#ff00ff)',
                  boxShadow: '0 0 12px rgba(255,0,255,0.35)',
                }}
              >
                <Film className="h-4 w-4" />
              </span>
              <h3 className="min-w-0 flex-1 text-base font-bold leading-snug text-white">
                {item?.title || 'Vidéo'}
              </h3>
            </div>

            {hasUrl ? (
              <YouTubeMedia url={item.youtube_url} title={item.title} />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-purple-500/20 bg-purple-500/5 px-4 py-8 text-center">
                <Video className="h-6 w-6 text-purple-500/40" />
                <p className="text-xs font-medium text-gray-400">Vidéo à venir</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
