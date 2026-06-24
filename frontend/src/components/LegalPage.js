import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

/**
 * Page legale publique (Politique de confidentialite, Charte d'engagement).
 * Le texte est edite en admin (collection formation_pages) et rendu lisiblement :
 * les lignes "N. Titre" deviennent des sous-titres, "• " des puces.
 */
const LegalPage = ({ pageKey, fallbackTitle }) => {
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    axios
      .get(`${API}/pages/${pageKey}`)
      .then((r) => { if (active) setPage(r.data); })
      .catch(() => { if (active) setPage({ title: fallbackTitle, text: '' }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [pageKey, fallbackTitle]);

  const renderText = (text) => {
    if (!text || !text.trim()) {
      return <p className="text-gray-400">Contenu à venir.</p>;
    }
    return text.split('\n').map((line, i) => {
      const t = line.trim();
      if (!t) return <div key={i} className="h-3" aria-hidden="true" />;
      if (/^\d+\.\s/.test(t)) {
        return (
          <h2 key={i} className="text-xl sm:text-2xl font-bold text-white mt-8 mb-3">
            {t}
          </h2>
        );
      }
      if (t.startsWith('• ')) {
        return (
          <p key={i} className="text-gray-300 leading-relaxed mb-1 pl-5 -indent-3">
            {t}
          </p>
        );
      }
      return (
        <p key={i} className="text-gray-300 leading-relaxed mb-2">
          {t}
        </p>
      );
    });
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        <Link to="/levels">
          <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
        </Link>

        <h1 className="text-3xl sm:text-4xl font-bold mb-8 neon-glow" data-testid="legal-title">
          {page?.title || fallbackTitle}
        </h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="spinner"></div>
          </div>
        ) : (
          <div className="card-dark border-neon rounded-2xl p-6 sm:p-10" data-testid="legal-content">
            {renderText(page?.text)}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalPage;
