import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield, Mail, LogIn } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { setSecretHeader, setBearer } from '@/lib/adminAuth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [supLoading, setSupLoading] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- Connexion unifiee via Supabase (meme compte que afroboosteur.com) ---
  const handleSupabaseLogin = async (e) => {
    e.preventDefault();
    if (!supabase) {
      toast.error("La connexion Afroboosteur n'est pas configuree ici.");
      return;
    }
    if (!email.trim() || !password) {
      toast.error('Email et mot de passe requis');
      return;
    }
    setSupLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        toast.error(
          error.message === 'Invalid login credentials'
            ? 'Email ou mot de passe incorrect'
            : error.message
        );
        return;
      }
      if (data?.session?.access_token) setBearer(data.session.access_token);
      toast.success('Connexion Afroboosteur reussie');
      navigate('/admin');
    } catch (err) {
      toast.error('Une erreur est survenue. Veuillez reessayer.');
      console.error('Supabase login error:', err);
    } finally {
      setSupLoading(false);
    }
  };

  // --- Connexion legacy par secret administrateur (transition) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    if (!adminId.trim()) {
      toast.error('Veuillez entrer votre ID administrateur');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API}/admin/auth`, {
        admin_secret_id: adminId,
      });
      if (response.data.success) {
        localStorage.setItem('afroboost_admin_session', adminId);
        setSecretHeader(adminId);
        toast.success('Connexion reussie');
        navigate('/admin');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error('ID administrateur invalide.');
      } else {
        toast.error('Une erreur est survenue. Veuillez reessayer.');
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
      await axios.post(`${API}/admin/recovery`, { email: recoveryEmail });
      toast.success('Votre demande a ete envoyee. Vous recevrez votre nouvel ID par email.');
      setShowRecovery(false);
      setRecoveryEmail('');
    } catch (error) {
      toast.error('Une erreur est survenue. Veuillez reessayer.');
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
          <CardTitle className="text-3xl text-white">Acces Administrateur Afroboost</CardTitle>
          <CardDescription className="text-gray-400">Authentification securisee</CardDescription>
        </CardHeader>
        <CardContent>
          {!showRecovery ? (
            <>
              {/* Connexion unifiee Afroboosteur (Supabase) */}
              <form onSubmit={handleSupabaseLogin} className="space-y-4" data-testid="supabase-login-form">
                <div>
                  <Label htmlFor="admin_email" className="text-gray-300 mb-2 block">
                    Email Afroboosteur
                  </Label>
                  <Input
                    id="admin_email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="contact@afroboosteur.com"
                    className="input-dark"
                    data-testid="admin-email-input"
                    disabled={supLoading}
                    autoComplete="email"
                  />
                </div>
                <div>
                  <Label htmlFor="admin_password" className="text-gray-300 mb-2 block">
                    Mot de passe
                  </Label>
                  <Input
                    id="admin_password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="input-dark"
                    data-testid="admin-password-input"
                    disabled={supLoading}
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full btn-neon"
                  disabled={supLoading}
                  data-testid="supabase-login-button"
                >
                  {supLoading ? (
                    <>
                      <span className="spinner"></span>
                      Connexion...
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Se connecter
                    </>
                  )}
                </Button>
              </form>

              {/* Separateur */}
              <div className="flex items-center gap-3 my-6">
                <div className="h-px flex-1 bg-purple-500/30" />
                <span className="text-xs text-gray-500">ou ID administrateur</span>
                <div className="h-px flex-1 bg-purple-500/30" />
              </div>

              {/* Connexion legacy par secret */}
              <form onSubmit={handleLogin} className="space-y-4">
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
                  variant="outline"
                  className="w-full border-purple-500 text-purple-300"
                  disabled={loading}
                  data-testid="admin-login-button"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Connexion...
                    </>
                  ) : (
                    'Acceder avec un ID administrateur'
                  )}
                </Button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setShowRecovery(true)}
                    className="text-purple-400 text-sm hover:underline"
                    data-testid="forgot-id-link"
                  >
                    ID oublie ?
                  </button>
                </div>
              </form>
            </>
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
                  Retour a la connexion
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
