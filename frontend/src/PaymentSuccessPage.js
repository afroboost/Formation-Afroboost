import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Loader2, Clock, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const PaymentSuccessPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking, success, pending, failed
  const [transactionId, setTransactionId] = useState(null);
  const [error, setError] = useState(null);
  const [pollCount, setPollCount] = useState(0);

  const sessionId = searchParams.get('session_id');
  const txId = searchParams.get('transaction_id');

  useEffect(() => {
    if (sessionId) {
      checkPaymentStatus();
    } else {
      setStatus('failed');
      setError('Session de paiement non trouvée');
    }
  }, [sessionId]);

  const checkPaymentStatus = async () => {
    if (pollCount >= 5) {
      setStatus('pending');
      return;
    }

    try {
      const response = await axios.get(`${API}/stripe/checkout-status/${sessionId}`);
      const data = response.data;

      setTransactionId(data.transaction_id);

      if (data.payment_status === 'paid' || data.status === 'completed') {
        setStatus('success');
      } else if (data.status === 'expired') {
        setStatus('failed');
        setError('La session de paiement a expiré');
      } else {
        // Continue polling
        setPollCount(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      }
    } catch (err) {
      console.error('Error checking payment status:', err);
      if (pollCount < 3) {
        setPollCount(prev => prev + 1);
        setTimeout(checkPaymentStatus, 2000);
      } else {
        setStatus('failed');
        setError('Erreur lors de la vérification du paiement');
      }
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 flex items-center justify-center">
      <Card className="card-dark border-neon max-w-lg w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl text-white">
            {status === 'checking' && 'Vérification du paiement...'}
            {status === 'success' && 'Paiement Réussi!'}
            {status === 'pending' && 'Paiement en cours de traitement'}
            {status === 'failed' && 'Échec du paiement'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          {/* Status Icon */}
          <div className="flex justify-center">
            {status === 'checking' && (
              <Loader2 className="w-20 h-20 text-purple-400 animate-spin" />
            )}
            {status === 'success' && (
              <CheckCircle className="w-20 h-20 text-green-500" />
            )}
            {status === 'pending' && (
              <Clock className="w-20 h-20 text-yellow-500" />
            )}
            {status === 'failed' && (
              <XCircle className="w-20 h-20 text-red-500" />
            )}
          </div>

          {/* Status Message */}
          {status === 'checking' && (
            <p className="text-gray-400">
              Veuillez patienter pendant que nous vérifions votre paiement...
            </p>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <p className="text-green-400 text-lg">
                Votre paiement a été reçu avec succès!
              </p>
              <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500">
                <p className="text-yellow-400 text-sm">
                  <Clock className="w-4 h-4 inline mr-2" />
                  Votre accès est en attente de validation par l'administrateur.
                </p>
                <p className="text-gray-400 text-xs mt-2">
                  Vous recevrez une notification une fois votre accès activé.
                </p>
              </div>
              {transactionId && (
                <p className="text-gray-500 text-xs">
                  Référence: {transactionId.substring(0, 8).toUpperCase()}
                </p>
              )}
            </div>
          )}

          {status === 'pending' && (
            <div className="space-y-4">
              <p className="text-yellow-400">
                Votre paiement est en cours de traitement.
              </p>
              <p className="text-gray-400 text-sm">
                Si le paiement a été effectué, il sera validé sous peu.
              </p>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <p className="text-red-400">
                {error || 'Une erreur est survenue lors du paiement.'}
              </p>
              <p className="text-gray-400 text-sm">
                Veuillez réessayer ou contacter le support.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 space-y-3">
            <Button 
              onClick={() => navigate('/levels')}
              className="w-full btn-neon"
              data-testid="return-to-levels"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux niveaux
            </Button>
            
            {status === 'failed' && (
              <Button 
                onClick={() => navigate('/levels')}
                variant="outline"
                className="w-full border-purple-500 text-purple-400"
              >
                Réessayer le paiement
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;
