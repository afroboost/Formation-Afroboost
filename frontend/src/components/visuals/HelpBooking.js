import { useState } from 'react';
import axios from 'axios';
import { CalendarClock, ExternalLink, HelpingHand, Loader2, Send, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;
const BRAND_GRADIENT = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

/**
 * HelpBooking — premium call-to-action to book 30 min with an instructor.
 *
 * props:
 *   help     = { enabled, title?, booking_url?, allow_request }
 *   levelId  = current level id (sent with a help request)
 *   userId   = current user id   (afroboost_user_id)
 *   userName = current user name (afroboost_user_name)
 *
 * Behavior:
 *  - booking_url set  -> button is an external link (new tab).
 *  - else allow_request -> button opens a request modal -> POST /help-request.
 *  - else (enabled only) -> disabled button + "bientôt disponible" note.
 */
export default function HelpBooking({ help, levelId, userId, userName }) {
  const [open, setOpen] = useState(false);
  const [preferred, setPreferred] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  if (!help || !help.enabled) return null;

  const label = help.title || "Besoin d'aide ? Réserver 30 min avec un instructeur";
  const hasBookingUrl =
    typeof help.booking_url === 'string' && help.booking_url.trim() !== '';
  const canRequest = !!help.allow_request;
  const canSubmit = preferred.trim() !== '' || message.trim() !== '';

  const resetForm = () => {
    setPreferred('');
    setMessage('');
    setSent(false);
    setSubmitting(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/help-request`, {
        user_id: userId,
        user_name: userName,
        level_id: levelId,
        preferred,
        message,
      });
      setSent(true);
      toast.success('Demande envoyée — un instructeur vous recontactera.');
      // brief success state, then close
      setTimeout(() => {
        setOpen(false);
        resetForm();
      }, 1600);
    } catch (err) {
      const detail =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        "Une erreur est survenue. Veuillez réessayer.";
      toast.error(typeof detail === 'string' ? detail : "Une erreur est survenue.");
      setSubmitting(false);
    }
  };

  // ----- Shell : premium gradient-bordered block -----
  const Shell = ({ children }) => (
    <div
      className="rounded-2xl p-[1.5px]"
      style={{ background: BRAND_GRADIENT }}
    >
      <div className="flex flex-col items-start gap-4 rounded-2xl bg-[#160a18] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
            style={{ background: BRAND_GRADIENT, boxShadow: '0 0 16px rgba(255,0,255,0.4)' }}
          >
            <HelpingHand className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold leading-snug text-white sm:text-base">
              {label}
            </p>
            <p className="mt-0.5 text-xs text-gray-400">
              30 minutes en visio avec un instructeur Afroboost.
            </p>
          </div>
        </div>
        <div className="w-full shrink-0 sm:w-auto">{children}</div>
      </div>
    </div>
  );

  // ----- Case 1 : external booking link -----
  if (hasBookingUrl) {
    return (
      <Shell>
        <a
          href={help.booking_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-[1.03] sm:w-auto"
          style={{ background: BRAND_GRADIENT, boxShadow: '0 0 18px rgba(255,0,255,0.35)' }}
        >
          <CalendarClock className="h-4 w-4" />
          Réserver
          <ExternalLink className="h-4 w-4" />
        </a>
      </Shell>
    );
  }

  // ----- Case 2 : in-app request modal -----
  if (canRequest) {
    return (
      <>
        <Shell>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-[1.03] sm:w-auto"
            style={{ background: BRAND_GRADIENT, boxShadow: '0 0 18px rgba(255,0,255,0.35)' }}
          >
            <CalendarClock className="h-4 w-4" />
            Réserver
          </button>
        </Shell>

        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) resetForm();
          }}
        >
          <DialogContent className="border-purple-500/20 bg-[#160a18] text-white sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CalendarClock className="h-5 w-5 text-[#ff00ff]" />
                Réserver 30 min avec un instructeur
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Indiquez vos disponibilités, un instructeur vous recontactera.
              </DialogDescription>
            </DialogHeader>

            {sent ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                <p className="text-sm font-medium text-white">
                  Demande envoyée — un instructeur vous recontactera.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="hb-preferred" className="text-gray-300">
                    Créneau souhaité
                  </Label>
                  <Input
                    id="hb-preferred"
                    value={preferred}
                    onChange={(e) => setPreferred(e.target.value)}
                    placeholder="ex. mardi 18h, ou « en soirée cette semaine »"
                    className="border-purple-500/30 bg-[#1f0f22] text-white placeholder:text-gray-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="hb-message" className="text-gray-300">
                    Message (optionnel)
                  </Label>
                  <Textarea
                    id="hb-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Sur quoi avez-vous besoin d'aide ?"
                    rows={4}
                    className="border-purple-500/30 bg-[#1f0f22] text-white placeholder:text-gray-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className="w-full gap-2 text-white shadow-lg disabled:opacity-50"
                  style={{ background: BRAND_GRADIENT }}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Envoyer la demande
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ----- Case 3 : enabled but no link and no request -> disabled -----
  return (
    <Shell>
      <div className="flex w-full flex-col items-stretch gap-1 sm:w-auto sm:items-end">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-purple-500/20 bg-purple-500/10 px-5 py-2.5 text-sm font-semibold text-gray-400 sm:w-auto"
        >
          <CalendarClock className="h-4 w-4" />
          Réserver
        </button>
        <p className="text-center text-xs text-gray-500 sm:text-right">
          Réservation bientôt disponible.
        </p>
      </div>
    </Shell>
  );
}
