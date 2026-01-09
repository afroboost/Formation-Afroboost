import { useState } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Search, CheckCircle, XCircle, Shield, Calendar, User, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const VerifyCertificatePage = () => {
  const [certificateId, setCertificateId] = useState('');
  const [verificationResult, setVerificationResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleVerify = async () => {
    if (!certificateId.trim()) {
      toast.error('Veuillez entrer un ID de certificat');
      return;
    }

    setIsLoading(true);
    setNotFound(false);
    setVerificationResult(null);

    try {
      const response = await axios.get(`${API}/certificates/verify/${certificateId.trim()}`);
      setVerificationResult(response.data);
      toast.success('Certificat vérifié avec succès');
    } catch (error) {
      if (error.response?.status === 404) {
        setNotFound(true);
        toast.error('Certificat introuvable');
      } else {
        toast.error('Erreur lors de la vérification');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerify();
    }
  };

  const certificateTypes = {
    online: {
      label: 'EN LIGNE',
      icon: '🌐',
      description: 'Autorisé à enseigner Afroboost en ligne'
    },
    'in-person': {
      label: 'PRÉSENTIEL',
      icon: '🏢',
      description: 'Autorisé à enseigner Afroboost en présentiel'
    },
    hybrid: {
      label: 'HYBRIDE',
      icon: '🌟',
      description: 'Autorisé à enseigner Afroboost en ligne et en présentiel'
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Shield className="w-20 h-20 text-purple-400 mx-auto mb-6" data-testid="shield-icon" />
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 neon-glow" data-testid="verify-title">
            AFROBOOST
          </h1>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white" data-testid="verify-subtitle">
            Vérification de Certificat
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Vérifiez l'authenticité d'un certificat d'instructeur Afroboost en entrant son ID unique
          </p>
        </div>

        <Card className="card-dark border-neon mb-8" data-testid="search-card">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Rechercher un Certificat</CardTitle>
            <CardDescription className="text-gray-400">
              Entrez l'ID du certificat à vérifier (format: AFRO-XXXXXXXX)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="certificate_id" className="text-gray-300 mb-2 block">
                  ID du Certificat
                </Label>
                <Input
                  id="certificate_id"
                  data-testid="certificate-id-input"
                  className="input-dark text-lg"
                  value={certificateId}
                  onChange={(e) => setCertificateId(e.target.value.toUpperCase())}
                  onKeyPress={handleKeyPress}
                  placeholder="AFRO-12345678"
                  maxLength={20}
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleVerify}
                  className="btn-neon h-12 px-8"
                  disabled={isLoading}
                  data-testid="verify-button"
                >
                  {isLoading ? (
                    <>
                      <span className="spinner"></span>
                      Vérification...
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5 mr-2" />
                      Vérifier
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {verificationResult && (
          <Card className="card-dark border-neon border-green-500 animate-in success-glow" data-testid="result-valid-card">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-12 h-12 text-green-500" data-testid="valid-icon" />
                </div>
              </div>
              <CardTitle className="text-3xl text-white mb-2">Certificat Valide</CardTitle>
              <CardDescription className="text-green-400 text-lg font-semibold">
                ✓ STATUT: {verificationResult.status}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3 mb-2">
                    <User className="w-5 h-5 text-purple-400" />
                    <p className="text-gray-400 text-sm font-semibold">INSTRUCTEUR</p>
                  </div>
                  <p className="text-white text-xl font-bold" data-testid="instructor-name">
                    {verificationResult.student_name}
                  </p>
                </div>

                <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-5 h-5 text-purple-400" />
                    <p className="text-gray-400 text-sm font-semibold">DATE D'ÉMISSION</p>
                  </div>
                  <p className="text-white text-xl font-bold" data-testid="issue-date">
                    {verificationResult.issued_at}
                  </p>
                </div>
              </div>

              <div className="p-6 bg-purple-500/10 rounded-lg border-2 border-purple-500">
                <div className="flex items-center gap-3 mb-3">
                  <Award className="w-6 h-6 text-purple-400" />
                  <p className="text-purple-400 text-sm font-semibold">TYPE DE CERTIFICATION</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-4xl">
                    {certificateTypes[verificationResult.certificate_type]?.icon || '📜'}
                  </span>
                  <div>
                    <p className="text-white text-2xl font-bold mb-1" data-testid="certificate-type">
                      CERTIFICATION {certificateTypes[verificationResult.certificate_type]?.label || verificationResult.certificate_type.toUpperCase()}
                    </p>
                    <p className="text-gray-300 text-sm">
                      {certificateTypes[verificationResult.certificate_type]?.description || 'Certification Afroboost'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                <div className="flex items-center gap-3 mb-2">
                  <Shield className="w-5 h-5 text-purple-400" />
                  <p className="text-gray-400 text-sm font-semibold">ID CERTIFICAT</p>
                </div>
                <p className="text-purple-400 text-lg font-mono" data-testid="certificate-id-display">
                  {verificationResult.certificate_id}
                </p>
              </div>

              <div className="text-center pt-4">
                <p className="text-gray-400 text-sm">
                  Ce certificat a été vérifié et est authentique.
                </p>
                <p className="text-gray-500 text-xs mt-2">
                  Certification officielle Afroboost
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {notFound && (
          <Card className="card-dark border-neon border-red-500 animate-in fade-in duration-500" data-testid="result-invalid-card">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-500" data-testid="invalid-icon" />
                </div>
              </div>
              <CardTitle className="text-3xl text-white mb-2">Certificat Introuvable</CardTitle>
              <CardDescription className="text-red-400 text-lg">
                ✗ STATUT: INVALIDE
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-6 bg-red-500/10 rounded-lg border border-red-500 text-center">
                <p className="text-white text-lg mb-3" data-testid="not-found-message">
                  Certificat introuvable ou invalide.
                </p>
                <p className="text-gray-300 text-sm">
                  Veuillez vérifier l'ID du certificat et réessayer.
                </p>
                <p className="text-gray-400 text-xs mt-4">
                  Si vous pensez qu'il s'agit d'une erreur, veuillez contacter le support Afroboost.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-12 space-y-4">
          <p className="text-gray-400">Vous cherchez autre chose ?</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/">
              <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary" data-testid="go-home-link">
                Accueil
              </Button>
            </Link>
            <Link to="/levels">
              <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary" data-testid="go-levels-link">
                Parcours de Formation
              </Button>
            </Link>
            <Link to="/exam">
              <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary" data-testid="go-exam-link">
                Passer l'Examen
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyCertificatePage;
