import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle, XCircle } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminAccessManager = () => {
  const [allProgress, setAllProgress] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllProgress();
  }, []);

  const fetchAllProgress = async () => {
    try {
      const response = await axios.get(`${API}/level-progress/admin/all`);
      
      // Safe normalization - handle different response shapes
      let progressData = [];
      
      if (Array.isArray(response)) {
        progressData = response;
      } else if (Array.isArray(response?.data)) {
        progressData = response.data;
      } else if (response?.data && typeof response.data === 'object') {
        // Check common wrapper keys
        if (Array.isArray(response.data.data)) {
          progressData = response.data.data;
        } else if (Array.isArray(response.data.results)) {
          progressData = response.data.results;
        } else if (Array.isArray(response.data.progress)) {
          progressData = response.data.progress;
        }
      }
      
      setAllProgress(progressData);
    } catch (error) {
      console.error('Error fetching progress:', error);
      setAllProgress([]); // Fallback to empty array on error
    }
  };

  const handleValidateAccess = async (userId, levelId, type) => {
    setLoading(true);
    try {
      await axios.post(`${API}/level-access/validate`, {
        user_id: userId,
        level_id: levelId,
        type: type
      });
      toast.success('Accès validé!');
      fetchAllProgress();
    } catch (error) {
      toast.error('Erreur lors de la validation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="card-dark border-neon" data-testid="admin-access-card">
      <CardHeader>
        <CardTitle className="text-2xl text-white">Gestion des Accès</CardTitle>
        <CardDescription className="text-gray-400">
          Valider les demandes de paiement et bénévolat
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!Array.isArray(allProgress) || allProgress.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Aucune demande en attente</p>
        ) : (
          <div className="space-y-4">
            {allProgress
              .filter(p => 
                p && 
                !p.access_granted && 
                (p.payment_status === 'pending' || p.volunteer_status === 'pending')
              )
              .map((progress) => {
                if (!progress?.user_id || !progress?.level_id) return null;
                
                return (
                  <div 
                    key={`${progress.user_id}-${progress.level_id}`}
                    className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">
                          User: {progress.user_id} - Level: {progress.level_id}
                        </p>
                        <div className="mt-2 space-y-1">
                          {progress.payment_status === 'pending' && (
                            <p className="text-yellow-500 text-sm">💳 Paiement en attente</p>
                          )}
                          {progress.volunteer_status === 'pending' && (
                            <p className="text-blue-500 text-sm">🤝 Bénévolat en attente</p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {progress.payment_status === 'pending' && (
                          <Button
                            onClick={() => handleValidateAccess(progress.user_id, progress.level_id, 'payment')}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Valider paiement
                          </Button>
                        )}
                        {progress.volunteer_status === 'pending' && (
                          <Button
                            onClick={() => handleValidateAccess(progress.user_id, progress.level_id, 'volunteer')}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Valider bénévolat
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
              .filter(Boolean) // Remove null entries
            }
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminAccessManager;
