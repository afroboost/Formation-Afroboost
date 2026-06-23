const MAP_URL = `${process.env.PUBLIC_URL || ''}/visuals/africa-styled.svg`;

const STYLES = [
  { n: 1, country: 'Nigeria', style: 'Afrobeat / Afrobeats' },
  { n: 2, country: 'Afrique du Sud', style: 'Amapiano' },
  { n: 3, country: "Côte d'Ivoire", style: 'Coupé-Décalé' },
  { n: 4, country: 'Congo (RDC)', style: 'Ndombolo' },
  { n: 5, country: 'Ghana', style: 'Azonto' },
  { n: 6, country: 'Cameroun', style: 'Makossa' },
];

export default function AfricaStylesMap() {
  return (
    <div className="grid md:grid-cols-3 gap-6 items-center">
      <div className="md:col-span-2 rounded-2xl bg-[#160a18] p-3 border border-purple-500/20">
        <img src={MAP_URL} loading="lazy"
          alt="Carte d'Afrique : origines des 6 styles Afroboost"
          className="w-full h-auto select-none" />
      </div>
      <ul className="space-y-2">
        {STYLES.map((s) => (
          <li key={s.n} className="flex items-center gap-3 p-2 rounded-lg bg-purple-500/5">
            <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#8a2be2,#ff00ff)' }}>{s.n}</span>
            <span><span className="text-white font-semibold">{s.country}</span>
              <span className="text-gray-400"> — {s.style}</span></span>
          </li>
        ))}
      </ul>
    </div>
  );
}
