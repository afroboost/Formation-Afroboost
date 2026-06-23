export default function StyleGallery({ images }) {
  if (!images || !images.length) return null;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((img, i) => (
        <figure key={i} className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-[#160a18]">
          <img src={img.url} alt={img.caption || ''} loading="lazy"
            className="w-full h-44 object-cover transition-transform duration-500 group-hover:scale-105" />
          <figcaption className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 to-transparent">
            <span className="text-white font-semibold text-sm">{img.caption}</span>
            {img.credit && <span className="block text-[10px] text-gray-400 mt-0.5 truncate" title={img.credit}>{img.credit}</span>}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
