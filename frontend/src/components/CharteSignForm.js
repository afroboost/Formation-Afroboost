import { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { PenLine, Check, Eraser, Loader2, Type, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/**
 * CharteSignForm — signature form for the instructor to fill in and SIGN the
 * "Charte d'engagement". Rendered BELOW the charte text on the /charte page.
 *
 * Flow:
 *  - On mount we read the identity from localStorage:
 *      afroboost_user_id   -> userId   (links the signature to the account)
 *      afroboost_user_name -> prefills the "Nom et prénom" field
 *  - If a userId exists we ask the backend whether the charte is already signed:
 *      GET /api/charte/status/{userId}
 *    If `signed === true` AND `signed_version === current_version`, we show an
 *    "already signed" success panel with a "Re-signer" button.
 *  - The form supports two signature modes:
 *      "Taper"   -> the user types their signature (cursive input)
 *      "Dessiner"-> the user draws on a <canvas> (mouse + touch via pointer
 *                   events) and we export it with canvas.toDataURL('image/png')
 *  - On submit we POST /api/charte/sign with:
 *      { user_id, user_name, version, signature_type, signature_data }
 *    On success we flip to the "already signed" success panel.
 *
 * @param {Object} props
 * @param {string} props.version  Current charte version label to record/display
 */
export default function CharteSignForm({ version }) {
  const [userId, setUserId] = useState('');
  const [name, setName] = useState('');

  const [checkingStatus, setCheckingStatus] = useState(false);
  const [alreadySigned, setAlreadySigned] = useState(false);
  const [signedInfo, setSignedInfo] = useState(null); // { date, version }

  const [accepted, setAccepted] = useState(false);
  const [mode, setMode] = useState('type'); // 'type' | 'draw'
  const [typedSignature, setTypedSignature] = useState('');
  const [hasDrawn, setHasDrawn] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const today = new Date().toLocaleDateString('fr-FR');

  // 1) Read identity from localStorage on mount.
  useEffect(() => {
    try {
      const storedId = localStorage.getItem('afroboost_user_id') || '';
      const storedName = localStorage.getItem('afroboost_user_name') || '';
      setUserId(storedId);
      if (storedName) setName(storedName);
    } catch (err) {
      // localStorage may be unavailable (private mode) — keep going unsigned.
      console.error('CharteSignForm localStorage read error:', err);
    }
  }, []);

  // 2) If we have an id, check whether the current version is already signed.
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    const run = async () => {
      setCheckingStatus(true);
      try {
        const res = await axios.get(`${API}/charte/status/${userId}`);
        if (cancelled) return;

        const data = res.data || {};
        const currentVersion = data.current_version ?? version;

        if (data.signed === true && data.signed_version === currentVersion) {
          setSignedInfo({
            date: data.signed_at
              ? new Date(data.signed_at).toLocaleDateString('fr-FR')
              : today,
            version: data.signed_version || currentVersion,
          });
          setAlreadySigned(true);
        }
      } catch (err) {
        // A failed status check should not block signing — just show the form.
        if (!cancelled) console.error('CharteSignForm status error:', err);
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ---- Canvas drawing (mouse + touch via pointer events) -----------------

  const getCanvasPoint = (canvas, evt) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvas.width / rect.width),
      y: (evt.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handlePointerDown = useCallback((evt) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    evt.preventDefault(); // stop touch scrolling while drawing
    drawingRef.current = true;
    lastPointRef.current = getCanvasPoint(canvas, evt);
    if (canvas.setPointerCapture && evt.pointerId != null) {
      try {
        canvas.setPointerCapture(evt.pointerId);
      } catch (_) {
        /* ignore */
      }
    }
  }, []);

  const handlePointerMove = useCallback((evt) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    evt.preventDefault();
    const ctx = canvas.getContext('2d');
    const point = getCanvasPoint(canvas, evt);
    const last = lastPointRef.current || point;

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#160a18';
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    lastPointRef.current = point;
    if (!hasDrawn) setHasDrawn(true);
  }, [hasDrawn]);

  const handlePointerUp = useCallback(() => {
    drawingRef.current = false;
    lastPointRef.current = null;
  }, []);

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }, []);

  // Reset drawing state when switching modes so validation stays correct.
  const switchMode = (next) => {
    if (next === mode) return;
    setMode(next);
    if (next === 'draw') {
      // give the canvas a fresh start
      setHasDrawn(false);
    }
  };

  const signatureProvided =
    mode === 'draw' ? hasDrawn : typedSignature.trim().length > 0;

  const canSubmit =
    name.trim().length > 0 && accepted && signatureProvided && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    let signatureData = '';
    if (mode === 'draw') {
      const canvas = canvasRef.current;
      signatureData = canvas ? canvas.toDataURL('image/png') : '';
    } else {
      signatureData = typedSignature.trim();
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/charte/sign`, {
        user_id: userId,
        user_name: name.trim(),
        version,
        signature_type: mode === 'draw' ? 'drawn' : 'typed',
        signature_data: signatureData,
      });
      toast.success('Charte signée');
      setSignedInfo({ date: today, version });
      setAlreadySigned(true);
    } catch (err) {
      console.error('CharteSignForm sign error:', err);
      const detail =
        err.response?.data?.detail ||
        "Une erreur est survenue lors de l'enregistrement de la signature.";
      toast.error(detail);
    } finally {
      setSubmitting(false);
    }
  };

  // Reveal the form again for a re-signature.
  const handleResign = () => {
    setAlreadySigned(false);
    setAccepted(false);
    setTypedSignature('');
    setHasDrawn(false);
    clearCanvas();
  };

  // ---- Already-signed success panel --------------------------------------

  if (alreadySigned && signedInfo) {
    return (
      <section
        className="card-dark border-neon mx-auto mt-8 w-full max-w-2xl rounded-2xl p-5 sm:p-6"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: BRAND_GRADIENT, boxShadow: '0 0 14px rgba(255,0,255,0.5)' }}
          >
            <BadgeCheck className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-bold leading-tight text-white sm:text-xl">
              Charte déjà signée
            </h3>
            <p className="mt-1 text-sm text-gray-300">
              Charte déjà signée le {signedInfo.date} — version {signedInfo.version}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResign}
              className="mt-4 border-purple-400/60 bg-transparent text-purple-200 hover:bg-purple-500/10 hover:text-white"
            >
              <PenLine className="mr-2 h-4 w-4" />
              Re-signer
            </Button>
          </div>
        </div>
      </section>
    );
  }

  // ---- Signature form -----------------------------------------------------

  return (
    <section className="card-dark border-neon mx-auto mt-8 w-full max-w-2xl rounded-2xl p-5 sm:p-6">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-purple-500/20 pb-5">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: BRAND_GRADIENT, boxShadow: '0 0 14px rgba(255,0,255,0.5)' }}
        >
          <PenLine className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-bold leading-tight text-white sm:text-xl">
            Signer la Charte d'engagement
          </h3>
          <p className="mt-1 text-xs text-gray-400 sm:text-sm">Version {version}</p>
        </div>
        {checkingStatus ? (
          <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-[#ff00ff]" />
        ) : null}
      </div>

      {/* Body */}
      <div className="space-y-5 pt-5">
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="charte-name" className="text-gray-200">
            Nom et prénom
          </Label>
          <Input
            id="charte-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Votre nom complet"
            required
            disabled={submitting}
            className="border-purple-500/30 bg-black/30 text-white placeholder:text-gray-500 focus-visible:ring-[#ff00ff]/50"
          />
        </div>

        {/* Date (read-only) */}
        <div className="space-y-1.5">
          <Label htmlFor="charte-date" className="text-gray-200">
            Date
          </Label>
          <Input
            id="charte-date"
            value={today}
            readOnly
            tabIndex={-1}
            className="cursor-default border-purple-500/20 bg-black/20 text-gray-300"
          />
        </div>

        {/* Signature */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Label className="text-gray-200">Signature</Label>
            <div
              className="inline-flex w-full overflow-hidden rounded-md border border-purple-500/30 sm:w-auto"
              role="group"
              aria-label="Mode de signature"
            >
              <button
                type="button"
                onClick={() => switchMode('type')}
                aria-pressed={mode === 'type'}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                  mode === 'type'
                    ? 'bg-[#ff00ff]/20 text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Type className="h-4 w-4" />
                Taper
              </button>
              <button
                type="button"
                onClick={() => switchMode('draw')}
                aria-pressed={mode === 'draw'}
                className={`inline-flex flex-1 items-center justify-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors sm:flex-none ${
                  mode === 'draw'
                    ? 'bg-[#ff00ff]/20 text-white'
                    : 'bg-transparent text-gray-400 hover:text-white'
                }`}
              >
                <PenLine className="h-4 w-4" />
                Dessiner
              </button>
            </div>
          </div>

          {mode === 'type' ? (
            <Input
              id="charte-signature-typed"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Tapez votre signature"
              disabled={submitting}
              aria-label="Signature tapée"
              style={{ fontFamily: 'cursive' }}
              className="h-12 border-purple-500/30 bg-black/30 text-lg text-white placeholder:text-gray-500 focus-visible:ring-[#ff00ff]/50"
            />
          ) : (
            <div className="space-y-2">
              <canvas
                ref={canvasRef}
                width={640}
                height={160}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label="Zone de signature à dessiner"
                className="w-full touch-none rounded-lg border border-purple-500/30"
                style={{ height: '160px', backgroundColor: '#f8f5fb' }}
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Dessinez votre signature ci-dessus
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearCanvas}
                  disabled={!hasDrawn || submitting}
                  className="text-gray-300 hover:text-white"
                >
                  <Eraser className="mr-1.5 h-4 w-4" />
                  Effacer
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* No-identity hint */}
        {!userId ? (
          <p className="text-xs italic text-gray-500">
            Astuce : identifiez-vous sur la page Niveaux pour lier la signature à
            votre compte.
          </p>
        ) : null}

        {/* Acceptance checkbox */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="charte-accept-checkbox"
            checked={accepted}
            onCheckedChange={(value) => setAccepted(value === true)}
            disabled={submitting}
            className="mt-0.5 border-purple-400 data-[state=checked]:border-[#ff00ff] data-[state=checked]:bg-[#ff00ff]"
          />
          <Label
            htmlFor="charte-accept-checkbox"
            className="cursor-pointer text-sm leading-relaxed text-gray-200"
          >
            J'ai lu et j'accepte la Charte d'engagement
          </Label>
        </div>

        {/* Submit */}
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="btn-neon w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enregistrement…
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Signer la charte
            </>
          )}
        </Button>
      </div>
    </section>
  );
}
