import anterior from '@/assets/muscles-anterior.png';
import posterior from '@/assets/muscles-posterior.png';

const ANT = [{ n: 1, top: '37%', left: '50%' }, { n: 2, top: '59%', left: '43%' }];
const POST = [{ n: 3, top: '27%', left: '50%' }, { n: 4, top: '50%', left: '50%' },
              { n: 5, top: '63%', left: '44%' }, { n: 6, top: '80%', left: '45%' }];
const LEGEND = [
  { n: 1, m: 'Abdominaux (core)' }, { n: 2, m: 'Quadriceps' },
  { n: 3, m: 'Deltoïdes / dos' }, { n: 4, m: 'Fessiers' },
  { n: 5, m: 'Ischio-jambiers' }, { n: 6, m: 'Mollets' },
];

function Figure({ src, marks, label }) {
  return (
    <div className="relative inline-block">
      <img src={src} alt={label} loading="lazy" className="h-[420px] w-auto mx-auto select-none" />
      {marks.map((m) => (
        <span key={m.n}
          className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-fuchsia-500 bg-[#160a18]"
          style={{ top: m.top, left: m.left, boxShadow: '0 0 8px #ff00ff' }}>{m.n}</span>
      ))}
      <p className="text-center text-gray-400 text-sm mt-2">{label}</p>
    </div>
  );
}

export default function AnatomyDiagram() {
  return (
    <div className="grid md:grid-cols-3 gap-6 items-start">
      <div className="md:col-span-2 flex flex-wrap justify-center gap-8 bg-[#160a18] rounded-2xl p-4 border border-purple-500/20">
        <Figure src={anterior} marks={ANT} label="Vue antérieure" />
        <Figure src={posterior} marks={POST} label="Vue postérieure" />
      </div>
      <ul className="space-y-2">
        {LEGEND.map((l) => (
          <li key={l.n} className="flex items-center gap-3 p-2 rounded-lg bg-purple-500/5">
            <span className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#8a2be2,#ff00ff)' }}>{l.n}</span>
            <span className="text-white">{l.m}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
