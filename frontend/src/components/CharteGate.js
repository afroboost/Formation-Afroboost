import { useState, useEffect } from 'react';
import axios from 'axios';
import { ScrollText, Loader2 } from 'lucide-react';
import CharteSignForm from '@/components/CharteSignForm';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/**
 * CharteGate — porte bloquante : le participant doit SIGNER la Charte d'engagement
 * (apres avoir accepte les conditions) avant d'acceder aux niveaux.
 *
 * Flux :
 *  - GET /api/charte/status/{userId} : si deja signee (version courante) -> onSigned() + null.
 *  - Sinon GET /api/pages/charte -> affiche le texte + le formulaire de signature.
 *  - A la signature (CharteSignForm.onSigned) -> onSigned().
 */
const renderText = (text) => {
  if (!text || !text.trim()) return <p className="text-gray-400">Charte à venir.</p>;
  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" aria-hidden="true" />;
    if (/^\d+\.\s/.test(t)) {
      return <h3 key={i} className="text-lg font-bold text-white mt-5 mb-2">{t}</h3>;
    }
    if (t.startsWith('• ')) {
      return <p key={i} className="text-gray-300 leading-relaxed mb-1 pl-5 -indent-3 text-sm">{t}</p>;
    }
    return <p key={i} className="text-gray-300 leading-relaxed mb-2 text-sm">{t}</p>;
  });
};

export default function CharteGate({ userId, userName, onSigned }) {
  const [loading, setLoading] = useState(true);
  const [charte, setCharte] = useState(null); // { text, version, title }

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const st = await axios.get(`${API}/charte/status/${userId}`);
        if (st.data?.signed === true) {
          if (active) onSigned?.();
          return; // deja signee -> pas de gate
        }
      } catch (e) {
        // statut indisponible : on affiche quand meme la charte a signer
      }
      try {
        const pg = await axios.get(`${API}/pages/charte`);
        if (active) setCharte(pg.data);
      } catch (e) {
        if (active) setCharte({ text: '', version: '', title: "Charte d'engagement" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!userId) return null;

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <Loader2 className="w-8 h-8 text-fuchsia-400 animate-spin" />
      </div>
    );
  }

  if (!charte) return null; // deja signee (onSigned appele) ou rien a afficher

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Signature de la charte d'engagement"
    >
      <div className="card-dark border-neon rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        <div className="flex items-center gap-3 p-5 border-b border-purple-500/20">
          <span
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-white flex-shrink-0"
            style={{ backgroundImage: BRAND_GRADIENT }}
            aria-hidden="true"
          >
            <ScrollText className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white leading-tight">
              {charte.title || "Charte d'engagement de l'instructeur"}
            </h2>
            <p className="text-xs text-gray-400">
              Signature obligatoire pour accéder à la Formation{charte.version ? ` · Version ${charte.version}` : ''}
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          <div className="mb-6">{renderText(charte.text)}</div>
          <CharteSignForm version={charte.version} onSigned={onSigned} />
        </div>
      </div>
    </div>
  );
}
