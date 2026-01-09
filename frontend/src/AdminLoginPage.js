import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, Mail } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLoginPage = () => {
  const [adminId, setAdminId] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!adminId.trim()) {
      toast.error('Veuillez entrer votre ID administrateur');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/auth`, {
        admin_secret_id: adminId
      });
      
      if (response.data.success) {
        localStorage.setItem('afroboost_admin_session', adminId);
        toast.success('Connexion réussie');
        navigate('/admin');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('ID administrateur invalide.');
      } else {
        toast.error('Une erreur est survenue. Veuillez réessayer.');
      }
      console.error('Admin login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e.preventDefault();
    
    if (!recoveryEmail.trim()) {
      toast.error('Veuillez entrer votre email');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/admin/recovery`, {
        email: recoveryEmail
      });
      
      toast.success('Votre demande a été envoyée. Vous recevrez votre nouvel ID par email.');
      setShowRecovery(false);
      setRecoveryEmail('');
    } catch (error) {
      toast.error('Une erreur est survenue. Veuillez réessayer.');
      console.error('Recovery error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <Card className="card-dark border-neon max-w-md w-full" data-testid="admin-login-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="w-16 h-16 text-purple-400" />
          </div>
          <CardTitle className="text-3xl text-white">
            Accès Administrateur Afroboost
          </CardTitle>
          <CardDescription className="text-gray-400">
            Authentification sécurisée
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!showRecovery ? (
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <Label htmlFor="admin_id" className="text-gray-300 mb-2 block">
                  ID Administrateur
                </Label>
                <Input
                  id="admin_id"
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="AFRO-ADMIN-XXXX"
                  className="input-dark"
                  data-testid="admin-id-input"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-neon"
                disabled={loading}
                data-testid="admin-login-button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Connexion...
                  </>
                ) : (
                  'Accéder au tableau de bord'
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowRecovery(true)}
                  className="text-purple-400 text-sm hover:underline"
                  data-testid="forgot-id-link"
                >
                  ID oublié ?
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleRecovery} className="space-y-6">
              <div>
                <Label htmlFor="recovery_email" className="text-gray-300 mb-2 block">
                  Email administrateur
                </Label>
                <Input
                  id="recovery_email"
                  type="email"
                  value={recoveryEmail}
                  onChange={(e) => setRecoveryEmail(e.target.value)}
                  placeholder="votre@email.com"
                  className="input-dark"
                  data-testid="recovery-email-input"
                  disabled={loading}
                />
              </div>

              <Button
                type="submit"
                className="w-full btn-neon"
                disabled={loading}
                data-testid="recovery-submit-button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Envoi...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Envoyer la demande
                  </>
                )}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setShowRecovery(false)}
                  className="text-gray-400 text-sm hover:underline"
                  data-testid="back-to-login-link"
                >
                  Retour à la connexion
                </button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLoginPage;
