import { Link } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Accueil' },
  { to: '/levels', label: 'Niveaux' },
  { to: '/exam', label: 'Examen' },
  { to: '/diplomas', label: 'Diplômes' },
  { to: '/verify-certificate', label: 'Vérifier' },
];

const Header = () => (
  <header className="sticky top-0 z-50 border-b border-purple-500/20 bg-[#1a0a1a]/85 backdrop-blur-xl">
    <nav className="max-w-7xl mx-auto px-4 sm:px-6" aria-label="Navigation principale">
      <div className="flex items-center justify-between gap-3 py-3">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="Accueil Formation Afroboost">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-white font-extrabold text-lg"
            style={{ backgroundImage: 'linear-gradient(135deg,#8a2be2,#ff00ff)' }}
            aria-hidden="true"
          >A</span>
          <span className="text-xl sm:text-2xl font-extrabold tracking-tight gradient-text">Afroboost</span>
        </Link>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="whitespace-nowrap px-3 py-2 text-sm font-medium text-gray-200 rounded-lg hover:text-white hover:bg-purple-500/10 transition-colors"
            >{n.label}</Link>
          ))}
        </div>
        <a
          href="https://afroboosteur.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden lg:inline-flex shrink-0 px-3 py-2 text-sm font-semibold text-purple-300 hover:text-white transition-colors"
        >afroboosteur.com ↗</a>
      </div>
    </nav>
  </header>
);

export default Header;
