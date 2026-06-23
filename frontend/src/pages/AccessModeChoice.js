import { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import {
  CreditCard,
  Smartphone,
  HandHeart,
  Lock,
  CheckCircle,
  ShieldCheck,
  ArrowLeft,
  Loader2
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

const AccessModeChoice = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();

  const [config, setConfig] = useState(null);
  const [levelName, setLevelName] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    document.title = 'Choisir mon accès — Formation Afroboost';
    setMetaDescription(
      "Choisissez votre mode d'accès au niveau : paiement par carte / TWINT ou accès gratuit avec engagement bénévole."
    );
  }, []);

  useEffect(() => {
    const storedId = localStorage.getItem('afroboost_user_id');
    if (!storedId) {
      toast.error("Veuillez d'abord entrer votre ID étudiant.");
      navigate('/levels');
      return;
    }
    setUserId(storedId);
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levelId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfgRes, contentRes] = await Promise.all([
        axios.get(`${API}/level-payment-config/${levelId}`),
        axios.get(`${API}/level-content`).catch(() => ({ data: [] }))
      ]);
      setConfig(cfgRes.data || {});
      const list = Array.isArray(contentRes.data) ? contentRes.data : [];
      const found = list.find((l) => l.level_id === levelId);
      setLevelName(found?.level_name || formatLevelId(levelId));
    } catch (error) {
      console.error('Error loading access config:', error);
      const msg = error.response?.data?.detail || "Impossible de charger les options d'accès.";
      toast.error(msg);
      setLevelName(formatLevelId(levelId));
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    if (!userId) {
      toast.error('Veuillez entrer votre ID étudiant');
      return;
    }
    setSubmitting(true);
    try {
      toast.loading('Redirection vers le paiement...');
      const response = await axios.post(`${API}/stripe/create-checkout`, {
        user_id: userId,
        level_id: levelId,
        origin_url: window.location.origin
      });
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.dismiss();
        toast.error('Erreur: URL de paiement non reçue');
        setSubmitting(false);
      }
    } catch (error) {
      toast.dismiss();
      console.error('Stripe payment error:', error);
      const msg = error.response?.data?.detail || 'Erreur lors de la création du paiement';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  const handleTwintPayment = async () => {
    if (!userId) {
      toast.error('Veuillez entrer votre ID étudiant');
      return;
    }
    setSubmitting(true);
    try {
      await axios.post(`${API}/payrexx/create-payment`, {
        user_id: userId,
        level_id: levelId,
        payment_method: 'twint_api'
      });
      toast.success('Demande TWINT enregistrée — validation par l\'admin');
      navigate('/levels');
    } catch (error) {
      console.error('TWINT payment error:', error);
      const msg = error.response?.data?.detail || 'Erreur lors de la demande TWINT';
      toast.error(msg);
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex items-center gap-3 text-gray-300">
          <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
          <span>Chargement des options d'accès...</span>
        </div>
      </div>
    );
  }

  const paymentMode = config?.payment_mode || 'both';
  const showMoney = paymentMode === 'money' || paymentMode === 'both';
  const showVolunteer = paymentMode === 'volunteer' || paymentMode === 'both';
  const price = config?.price;
  const currency = config?.currency || 'CHF';
  const methods = config?.enabled_payment_methods || [];
  const showStripe = methods.includes('stripe');
  const showTwint = methods.includes('twint_api') || methods.includes('twint_link') || methods.includes('twint');
  const minEvents = config?.engagement_min_events ?? 3;
  const volunteerDescription = config?.volunteer_description || '';

  const ENGAGEMENT_TASKS = [
    'Montage du matériel',
    'Démontage',
    'Nettoyage',
    'Rangement',
    'Distribution de flyers',
    'Publications réseaux sociaux',
    'Remplacement du formateur'
  ];

  return (
    <div className="min-h-screen py-12 px-4" style={{ background: '#1a0a1a' }}>
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            to="/levels"
            className="inline-flex items-center gap-2 text-sm text-purple-300 hover:text-purple-200 transition-colors"
            data-testid="back-to-levels-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour aux niveaux
          </Link>
        </div>

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
            style={{ background: 'linear-gradient(135deg, #8a2be2, #ff00ff)' }}>
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 neon-glow" data-testid="access-mode-title">
            Choisir mon accès
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {levelName} — sélectionnez la manière dont vous souhaitez débloquer ce niveau.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 items-stretch">
          {showMoney && (
            <Card
              className="card-dark border-neon flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/30"
              style={{ background: '#2a1a2a' }}
              data-testid="access-option-money"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #8a2be2, #ff00ff)' }}>
                    <CreditCard className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white">Accès payant</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Débloquez ce niveau immédiatement par paiement.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-5">
                <div className="text-center py-4 rounded-xl border border-purple-500/40 bg-purple-500/10">
                  {price != null ? (
                    <p className="text-3xl font-bold text-white" data-testid="access-price">
                      {price} <span className="text-xl text-purple-300">{currency}</span>
                    </p>
                  ) : (
                    <p className="text-lg text-gray-300">Tarif communiqué à la validation</p>
                  )}
                </div>

                <div className="mt-auto space-y-3">
                  {showStripe && (
                    <Button
                      onClick={handleStripePayment}
                      disabled={submitting}
                      className="w-full btn-neon"
                      data-testid="pay-card-button"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Payer par carte
                    </Button>
                  )}
                  {showTwint && (
                    <Button
                      onClick={handleTwintPayment}
                      disabled={submitting}
                      variant="outline"
                      className="w-full border-purple-500 text-purple-300 hover:bg-purple-500/10"
                      data-testid="pay-twint-button"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Payer par TWINT
                    </Button>
                  )}
                  {!showStripe && !showTwint && (
                    <p className="text-sm text-center text-gray-400">
                      Aucun moyen de paiement n'est actuellement configuré.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {showVolunteer && (
            <Card
              className="card-dark border-neon flex flex-col transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/30"
              style={{ background: '#2a1a2a' }}
              data-testid="access-option-volunteer"
            >
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #8a2be2, #ff00ff)' }}>
                    <HandHeart className="w-5 h-5 text-white" />
                  </div>
                  <CardTitle className="text-2xl text-white">Gratuit avec engagement</CardTitle>
                </div>
                <CardDescription className="text-gray-400">
                  Accès offert en échange de votre participation bénévole.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-5">
                <div className="py-3 px-4 rounded-xl border border-purple-500/40 bg-purple-500/10">
                  <p className="text-white font-semibold flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-purple-300 flex-shrink-0" />
                    Je m'engage à participer à {minEvents} événement{minEvents > 1 ? 's' : ''}
                  </p>
                  {volunteerDescription && (
                    <p className="text-sm text-gray-400 mt-2">{volunteerDescription}</p>
                  )}
                </div>

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

                <div className="mt-auto">
                  <Button
                    onClick={() => navigate(`/charter/${levelId}`)}
                    className="w-full btn-neon"
                    data-testid="choose-engagement-button"
                  >
                    <HandHeart className="w-4 h-4 mr-2" />
                    Choisir l'engagement
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {!showMoney && !showVolunteer && (
          <div className="text-center mt-10 p-6 rounded-xl border border-gray-700 bg-gray-800/40">
            <p className="text-gray-300">Aucune option d'accès n'est disponible pour ce niveau actuellement.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccessModeChoice;
