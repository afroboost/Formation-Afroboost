import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  ShieldCheck,
  CheckCircle,
  Clock,
  ArrowLeft,
  Loader2,
  PenLine
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const setMetaDescription = (content) => {
  let tag = document.querySelector('meta[name="description"]');
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute('name', 'description');
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
};

const formatLevelId = (levelId) => {
  if (!levelId) return '';
  const match = levelId.match(/level-?(\d+)/i);
  if (match) return `Niveau ${match[1]}`;
  return levelId;
};

const ENGAGEMENT_TASKS = [
  'Montage du matériel',
  'Démontage',
  'Nettoyage',
  'Rangement',
  'Distribution de flyers',
  'Publications réseaux sociaux',
  'Remplacement du formateur'
];

const CharterAcceptance = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [levelName, setLevelName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState('');

  const timestamp = useMemo(() => new Date(), []);

  useEffect(() => {
    document.title = "Charte d'engagement — Formation Afroboost";
    setMetaDescription(
      "Acceptez la charte d'engagement bénévole pour accéder gratuitement à votre niveau de formation Afroboost."
    );
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem('afroboost_user_id');
    const storedName = localStorage.getItem('afroboost_user_name') || '';
    if (!storedId) {
      toast.error("Veuillez d'abord entrer votre ID étudiant.");
      navigate('/levels');
      return;
    }
    setUserId(storedId);
    setUserName(storedName);
    setSignature(storedName);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, contentRes] = await Promise.all([
        axios.get(`${API}/level-payment-config/${levelId}`).catch(() => ({ data: {} })),
        axios.get(`${API}/level-content`).catch(() => ({ data: [] }))
      ]);
      setConfig(cfgRes.data || {});
      const list = Array.isArray(contentRes.data) ? contentRes.data : [];
      const found = list.find((l) => l.level_id === levelId);
      setLevelName(found?.level_name || formatLevelId(levelId));
    } catch (error) {
      console.error('Error loading charter config:', error);
      setLevelName(formatLevelId(levelId));
    } finally {
      setLoading(false);
    }
  };

  const minEvents = config?.engagement_min_events ?? 3;
  const charterText = config?.engagement_charter_text || '';
  const canSubmit = accepted && signature.trim().length > 0 && !submitting;

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('Veuillez entrer votre ID étudiant');
      navigate('/levels');
      return;
    }
    if (!accepted) {
      toast.error("Vous devez accepter la charte d'engagement.");
      return;
    }
    const trimmedSignature = signature.trim();
    if (!trimmedSignature) {
      toast.error('Veuillez signer avec votre nom complet.');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/engagement/charter`, {
        user_id: userId,
        user_name: userName,
        level_id: levelId,
        signature_name: trimmedSignature,
        checkbox_accepted: true
      });
      setSubmitted(true);
      toast.success('Engagement enregistré');
    } catch (error) {
      console.error('Charter submit error:', error);
      const msg = error.response?.data?.detail || "Erreur lors de l'enregistrement de l'engagement.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span>Chargement de la charte...</span>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ background: '#1a0a1a' }}>
        <div className="max-w-xl w-full">
          <Card className="card-dark border-neon text-center" style={{ background: '#2a1a2a' }} data-testid="charter-success-card">
            <CardHeader>
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-20 h-20 text-green-500" />
              </div>
              <CardTitle className="text-3xl text-white">Engagement enregistré</CardTitle>
              <CardDescription className="text-lg text-gray-300 mt-2">
                En attente de validation par l'admin.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/levels">
                <Button className="btn-neon" data-testid="charter-back-to-levels">
                  Retour aux niveaux
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#1a0a1a' }}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link
            to={`/access-mode/${levelId}`}
            className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors"
            data-testid="back-to-access-mode-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour au choix d'accès
          </Link>
        </div>

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{ background: 'linear-gradient(135deg, #8a2be2, #ff00ff)' }}>
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 neon-glow" data-testid="charter-title">
            Charte d'engagement
          </h1>
          <p className="text-lg text-gray-300">{levelName}</p>
        </div>

        <Card className="card-dark border-neon mb-6" style={{ background: '#2a1a2a' }} data-testid="charter-content-card">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-purple-300" />
              Mon engagement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="py-3 px-4 rounded-xl border border-purple-500/40 bg-purple-500/10">
              <p className="text-white font-semibold">
                Je m'engage à participer à {minEvents} événement{minEvents > 1 ? 's' : ''}.
              </p>
            </div>

            {charterText && (
              <p className="text-sm text-gray-300 whitespace-pre-line">{charterText}</p>
            )}

            <div>
              <p className="text-sm text-gray-300 mb-2 font-semibold">Tâches possibles :</p>
              <ul className="space-y-1.5">
                {ENGAGEMENT_TASKS.map((task, i) => (
                  <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-purple-400 mt-0.5 flex-shrink-0" />
                    <span>{task}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="card-dark border-neon" style={{ background: '#2a1a2a' }} data-testid="charter-form-card">
          <CardHeader>
            <CardTitle className="text-xl text-white">Acceptation &amp; signature</CardTitle>
            <CardDescription className="text-gray-400">
              Confirmez votre engagement pour finaliser votre demande.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-start gap-3 p-4 rounded-xl border border-gray-700 bg-gray-800/40">
              <Checkbox
                id="charter-accept"
                checked={accepted}
                onCheckedChange={(v) => setAccepted(v === true)}
                className="mt-0.5 border-purple-400"
                data-testid="charter-accept-checkbox"
              />
              <Label htmlFor="charter-accept" className="text-gray-200 cursor-pointer leading-relaxed">
                J'accepte la charte d'engagement
              </Label>
            </div>

            <div>
              <Label htmlFor="charter-signature" className="text-gray-300 flex items-center gap-2 mb-1">
                <PenLine className="w-4 h-4 text-purple-300" />
                Signature (nom complet)
              </Label>
              <Input
                id="charter-signature"
                className="input-dark"
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                placeholder="Votre nom complet"
                data-testid="charter-signature-input"
              />
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-400" data-testid="charter-timestamp">
              <Clock className="w-4 h-4 text-purple-300" />
              <span>Date et heure : {timestamp.toLocaleString('fr-FR')}</span>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="w-full btn-neon"
              data-testid="charter-submit-button"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 mr-2" />
                  Confirmer mon engagement
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CharterAcceptance;
