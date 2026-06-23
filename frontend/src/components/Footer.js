import { Link } from 'react-router-dom';

const Footer = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-purple-500/20 bg-[#1a0a1a]/80 mt-16">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-white font-extrabold"
                style={{ backgroundImage: 'linear-gradient(135deg,#8a2be2,#ff00ff)' }}
                aria-hidden="true"
              >A</span>
              <span className="text-lg font-extrabold gradient-text">Formation Afroboost</span>
            </div>
            <p className="text-sm text-gray-400 max-w-xs">
              Devenez instructeur certifié de danse Afrobeat. Formation progressive,
              examen en direct et certificats officiels vérifiables.
            </p>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Navigation</h2>
            <ul className="space-y-2 text-sm">
              <li><Link to="/levels" className="text-gray-400 hover:text-fuchsia-400 transition-colors">Niveaux</Link></li>
              <li><Link to="/exam" className="text-gray-400 hover:text-fuchsia-400 transition-colors">Réserver un examen</Link></li>
              <li><Link to="/diplomas" className="text-gray-400 hover:text-fuchsia-400 transition-colors">Mes diplômes</Link></li>
              <li><Link to="/verify-certificate" className="text-gray-400 hover:text-fuchsia-400 transition-colors">Vérifier un certificat</Link></li>
            </ul>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white mb-3">Afroboosteur</h2>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="https://www.afroboosteur.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-fuchsia-400 transition-colors">
                  Association Afroboosteur ↗
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-purple-500/10 text-center text-xs text-gray-500">
          © {year} Afroboost — Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
