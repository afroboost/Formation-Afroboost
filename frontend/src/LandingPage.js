import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, GraduationCap, Award, Video, FileText, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import ShareButton from '@/components/ShareButton';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LandingPage = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadTrainingSummary = async () => {
    setIsDownloading(true);
    try {
      const response = await axios.get(`${API}/training-summary/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'afroboost_training_summary.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Résumé de formation téléchargé!');
    } catch (error) {
      console.error('Error downloading training summary:', error);
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <h1 className="text-6xl sm:text-7xl font-bold mb-8 neon-glow" data-testid="landing-title">
            AFROBOOST
          </h1>
          <h2 className="text-3xl sm:text-4xl font-bold mb-6 text-white" data-testid="landing-subtitle">
            Devenez Instructeur Certifié
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-10">
            Maîtrisez la danse Afrobeat énergique et obtenez votre certification officielle
            pour enseigner en ligne ou en présentiel.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              onClick={downloadTrainingSummary}
              className="btn-neon text-lg px-8 py-6"
              disabled={isDownloading}
              data-testid="hero-download-summary-button"
            >
              {isDownloading ? (
                <>
                  <span className="spinner"></span>
                  Téléchargement...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Télécharger le Programme Complet (PDF)
                </>
              )}
            </Button>
            <Link to="/levels">
              <Button
                variant="outline"
                className="border-purple-500 text-purple-400 btn-secondary text-lg px-8 py-6"
                data-testid="hero-start-training-button"
              >
                Commencer la Formation
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>

          {/* Visuel premium : plateforme web + mobile */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div
              className="relative rounded-2xl overflow-hidden border border-purple-500/30"
              style={{ boxShadow: '0 0 60px rgba(138,43,226,0.25)' }}
            >
              <img
                src="/visuals/materiel/plateforme.jpg"
                alt="Plateforme de formation Afroboost sur ordinateur et mobile"
                className="w-full h-auto"
                loading="lazy"
              />
            </div>
            <p className="text-gray-400 text-sm mt-3">
              Votre plateforme de formation premium, sur ordinateur et mobile.
            </p>
          </div>
        </div>

        {/* Section événementielle : tente Afroboost en festival */}
        <div className="mb-20">
          <div className="relative rounded-2xl overflow-hidden border border-purple-500/30">
            <img
              src="/visuals/materiel/tente.jpg"
              alt="Tente Afroboost Spider 7x7 en festival"
              className="w-full h-[260px] sm:h-[440px] object-cover"
              loading="lazy"
            />
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, #160a18 0%, rgba(22,10,24,0.25) 45%, transparent 75%)' }}
            ></div>
            <div className="absolute bottom-0 left-0 p-6 sm:p-10">
              <h3 className="text-2xl sm:text-4xl font-bold text-white mb-2">Du studio au festival</h3>
              <p className="text-gray-200 max-w-xl">
                Animez des événements Silent en plein air avec la tente Afroboost Spider 7×7 — montage en 15 minutes.
              </p>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          <Card className="card-dark border-neon" data-testid="feature-training-card">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <GraduationCap className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-2xl text-white text-center">Formation Progressive</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                5 niveaux structurés avec validation de compétences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Level 1: Afroboost DNA (fondamentaux)</li>
                <li>• Level 2: Rhythm Foundation</li>
                <li>• Level 3: Style & Flow</li>
                <li>• Level 4: Teaching Fundamentals</li>
                <li>• Level 5: Master Instructor</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="card-dark border-neon" data-testid="feature-certification-card">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Award className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-2xl text-white text-center">3 Certifications</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Choisissez votre parcours d'enseignement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>🌐 Certification En Ligne</li>
                <li>🏢 Certification Présentiel</li>
                <li>🌟 Certification Hybride (Online + Présentiel)</li>
              </ul>
              <p className="text-purple-400 text-sm mt-4 text-center">
                Diplômes officiels imprimables et vérifiables
              </p>
            </CardContent>
          </Card>

          <Card className="card-dark border-neon" data-testid="feature-exam-card">
            <CardHeader>
              <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                <Video className="w-8 h-8 text-purple-400" />
              </div>
              <CardTitle className="text-2xl text-white text-center">Examen en Direct</CardTitle>
              <CardDescription className="text-gray-400 text-center">
                Validation par session vidéo live
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-gray-300 text-sm">
                <li>• Évaluation de votre technique</li>
                <li>• Test de pédagogie</li>
                <li>• Validation de l'énergie et présence</li>
                <li>• Feedback personnalisé</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* CTA Section */}
        <Card className="card-dark border-neon" data-testid="cta-card">
          <CardContent className="py-12 text-center">
            <FileText className="w-16 h-16 text-purple-400 mx-auto mb-6" />
            <h3 className="text-3xl font-bold text-white mb-4">
              Découvrez le Programme Complet
            </h3>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Téléchargez gratuitement le résumé détaillé de la formation Afroboost:
              objectifs, modules, parcours de certification et droits après obtention du diplôme.
            </p>
            <Button
              onClick={downloadTrainingSummary}
              className="btn-neon text-lg px-10 py-6"
              disabled={isDownloading}
              data-testid="cta-download-summary-button"
            >
              {isDownloading ? (
                <>
                  <span className="spinner"></span>
                  Téléchargement...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Télécharger le Résumé de Formation (PDF)
                </>
              )}
            </Button>
            <p className="text-gray-400 text-sm mt-4">
              ✅ Gratuit • Aucune inscription requise • Document officiel imprimable
            </p>
          </CardContent>
        </Card>

        {/* Share Section */}
        <Card className="card-dark border-neon mt-12" data-testid="share-section">
          <CardContent className="py-10 text-center">
            <h3 className="text-2xl font-bold text-white mb-4">
              Partagez la Formation Afroboost
            </h3>
            <p className="text-gray-300 mb-6">
              Aidez vos amis à découvrir la certification d'instructeur Afroboost
            </p>
            <ShareButton
              shareText="Découvre la formation Afroboost - Deviens Instructeur Certifié de danse Afrobeat! 💜🔥"
              shareUrl={window.location.origin}
              buttonText="Partager sur les Réseaux Sociaux"
              variant="default"
            />
            <p className="text-gray-400 text-xs mt-4">
              Partagez sur Instagram, WhatsApp, Facebook et plus
            </p>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="text-center mt-12 space-y-4">
          <p className="text-gray-400">Prêt à commencer ?</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/levels">
              <Button className="btn-neon" data-testid="start-levels-button">
                Commencer les Niveaux
              </Button>
            </Link>
            <Link to="/exam">
              <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary" data-testid="book-exam-button">
                Réserver un Examen
              </Button>
            </Link>
            <Link to="/diplomas">
              <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary" data-testid="view-diplomas-button">
                Voir les Diplômes
              </Button>
            </Link>
            <Link to="/verify-certificate">
              <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary" data-testid="verify-certificate-button">
                Vérifier un Certificat
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
