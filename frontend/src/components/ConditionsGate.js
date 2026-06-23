import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ShieldCheck, ExternalLink, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/**
 * ConditionsGate — blocking legal gate shown before a participant can reach
 * the Formation Afroboost levels.
 *
 * Flow:
 *  - On mount (and whenever `userId` changes) we ask the backend whether this
 *    user has already accepted the CURRENT conditions version:
 *      GET /api/conditions/status/{userId}
 *    If `accepted === true`, we call `onAccepted()` and render nothing — the
 *    gate is invisible and the parent proceeds.
 *  - Otherwise we fetch the conditions text:
 *      GET /api/conditions  ->  { text, version, privacy_url, charte_url }
 *    and show a mandatory full-screen overlay. The user must tick a checkbox
 *    and click "Accepter et accéder à la Formation", which POSTs:
 *      POST /api/conditions/accept
 *        { user_id, user_name, version }
 *    On success we call `onAccepted()`.
 *
 * @param {Object}   props
 * @param {string}   props.userId      Identity of the participant (required to show the gate)
 * @param {string}   props.userName    Display name recorded with the acceptance
 * @param {Function} props.onAccepted  Called once the user has accepted (or already had)
 */
export default function ConditionsGate({ userId, userName, onAccepted }) {
  const [loading, setLoading] = useState(true);
  const [conditions, setConditions] = useState(null); // { text, version, privacy_url, charte_url }
  const [checked, setChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const cardRef = useRef(null);

  useEffect(() => {
    // No identity yet: stay in loading and render nothing. The parent is
    // expected to only mount this component once a user id exists.
    if (!userId) {
      setLoading(true);
      return;
    }

    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);
      setChecked(false);

      try {
        // 1) Has this user already accepted the current version?
        const statusRes = await axios.get(`${API}/conditions/status/${userId}`);
        if (cancelled) return;

        if (statusRes.data && statusRes.data.accepted === true) {
          // Already accepted — let the parent through, no gate to show.
          onAccepted?.();
          setConditions(null);
          setLoading(false);
          return;
        }

        // 2) Not accepted yet — fetch the conditions to display.
        const condRes = await axios.get(`${API}/conditions`);
        if (cancelled) return;

        const data = condRes.data || {};
        setConditions({
          text: data.text || '',
          version: data.version || '',
          privacy_url: data.privacy_url || '',
          charte_url: data.charte_url || '',
        });
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error('ConditionsGate load error:', err);
        const detail =
          err.response?.data?.detail ||
          'Impossible de charger les conditions de participation.';
        setError(detail);
        setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Move focus to the dialog once it is shown.
  useEffect(() => {
    if (!loading && conditions && cardRef.current) {
      cardRef.current.focus();
    }
  }, [loading, conditions]);

  const handleAccept = async () => {
    if (!checked || submitting || !conditions) return;

    setSubmitting(true);
    try {
      await axios.post(`${API}/conditions/accept`, {
        user_id: userId,
        user_name: userName,
        version: conditions.version,
      });
      toast.success('Conditions acceptées');
      onAccepted?.();
    } catch (err) {
      console.error('ConditionsGate accept error:', err);
      const detail =
        err.response?.data?.detail ||
        "Une erreur est survenue lors de l'enregistrement.";
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // No identity, or the status check / conditions fetch is in flight.
  if (!userId || loading) {
    if (!userId) return null;
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-8 w-8 animate-spin text-[#ff00ff]" />
        <span className="sr-only">Chargement des conditions…</span>
      </div>
    );
  }

  // Already accepted (conditions cleared) — render nothing, parent proceeds.
  if (!conditions) return null;

  const privacyUrl = conditions.privacy_url || '#';
  const charteUrl = conditions.charte_url || '#';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="conditions-gate-title"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        className="card-dark border-neon flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl p-0 outline-none focus-visible:ring-2 focus-visible:ring-[#ff00ff]/50"
      >
        {/* Header (fixed) */}
        <div className="flex items-start gap-3 border-b border-purple-500/20 p-5 sm:p-6">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: BRAND_GRADIENT, boxShadow: '0 0 14px rgba(255,0,255,0.5)' }}
          >
            <ShieldCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="conditions-gate-title"
              className="text-lg font-bold leading-tight text-white sm:text-xl"
            >
              Conditions de participation
            </h2>
            {conditions.version ? (
              <p className="mt-1 text-xs text-gray-400 sm:text-sm">
                Version {conditions.version}
              </p>
            ) : null}
          </div>
        </div>

        {/* Body (scrollable) */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pr-2 sm:px-6">
          {error ? (
            <p className="py-6 text-sm text-red-400">{error}</p>
          ) : conditions.text ? (
            <p className="whitespace-pre-wrap py-4 text-sm leading-relaxed text-gray-200 sm:text-base">
              {conditions.text}
            </p>
          ) : (
            <p className="py-6 text-sm italic text-gray-500">Conditions à venir</p>
          )}

          {/* Legal links */}
          <div className="mt-2 flex flex-col gap-2 border-t border-purple-500/15 pt-4 sm:flex-row sm:gap-6">
            <a
              href={privacyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-purple-300 transition-colors hover:text-[#ff00ff]"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Politique de confidentialité
            </a>
            <a
              href={charteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-purple-300 transition-colors hover:text-[#ff00ff]"
            >
              <ExternalLink className="h-4 w-4 shrink-0" />
              Charte d'engagement (option gratuite)
            </a>
          </div>
        </div>

        {/* Footer (fixed) */}
        <div className="space-y-4 border-t border-purple-500/20 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <Checkbox
              id="conditions-accept-checkbox"
              checked={checked}
              onCheckedChange={(value) => setChecked(value === true)}
              disabled={submitting}
              className="mt-0.5 border-purple-400 data-[state=checked]:border-[#ff00ff] data-[state=checked]:bg-[#ff00ff]"
            />
            <Label
              htmlFor="conditions-accept-checkbox"
              className="cursor-pointer text-sm leading-relaxed text-gray-200"
            >
              J'ai lu et j'accepte les conditions de participation à la Formation
              Afroboost
            </Label>
          </div>

          <Button
            type="button"
            onClick={handleAccept}
            disabled={!checked || submitting}
            className="btn-neon w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enregistrement…
              </>
            ) : (
              'Accepter et accéder à la Formation'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
