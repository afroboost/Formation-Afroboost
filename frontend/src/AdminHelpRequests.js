import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Trash2, CalendarClock, CheckCircle, RefreshCw } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const StatusBadge = ({ status }) => {
  const handled = status === 'handled';
  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium border ${
        handled
          ? 'bg-green-500/20 text-green-400 border-green-500'
          : 'bg-orange-500/20 text-orange-400 border-orange-500'
      }`}
    >
      {handled ? 'Traité' : 'En attente'}
    </span>
  );
};

const AdminHelpRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/help-requests`);
      setRequests(response.data || []);
    } catch (error) {
      console.error('Error fetching help requests:', error);
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleMarkHandled = async (id) => {
    try {
      await axios.post(`${API}/help-requests/${id}/handle`);
      toast.success('Demande marquée comme traitée');
      fetchRequests();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API}/help-requests/${id}`);
      toast.success('Demande supprimée');
      fetchRequests();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <Card className="card-dark border-neon" data-testid="help-requests-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <CalendarClock className="w-6 h-6 text-purple-400" />
              Demandes d&apos;aide (réservations)
            </CardTitle>
            <CardDescription className="text-gray-400">
              Demandes de créneau envoyées par les participants
            </CardDescription>
          </div>
          <Button
            onClick={fetchRequests}
            disabled={loading}
            size="sm"
            variant="outline"
            className="border-gray-600 text-gray-300 hover:border-purple-500 hover:text-purple-400"
            data-testid="refresh-help-requests"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <p className="text-gray-400 text-center py-6" data-testid="no-help-requests">
            Aucune demande d&apos;aide
          </p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-700">
                    <th className="py-2 pr-3 font-medium">Participant</th>
                    <th className="py-2 pr-3 font-medium">Niveau</th>
                    <th className="py-2 pr-3 font-medium">Créneau souhaité</th>
                    <th className="py-2 pr-3 font-medium">Message</th>
                    <th className="py-2 pr-3 font-medium">Date</th>
                    <th className="py-2 pr-3 font-medium">Statut</th>
                    <th className="py-2 pr-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((req) => (
                    <tr
                      key={req.id}
                      className="border-b border-gray-800 align-top"
                      data-testid={`help-request-${req.id}`}
                    >
                      <td className="py-3 pr-3">
                        <p className="text-white font-medium">{req.user_name || '—'}</p>
                        <p className="text-gray-500 text-xs">{req.user_id}</p>
                      </td>
                      <td className="py-3 pr-3 text-gray-300">{req.level_id || '—'}</td>
                      <td className="py-3 pr-3 text-gray-300">{req.preferred || '—'}</td>
                      <td className="py-3 pr-3 text-gray-300 max-w-xs">
                        <span className="whitespace-pre-wrap break-words">{req.message || '—'}</span>
                      </td>
                      <td className="py-3 pr-3 text-gray-400 whitespace-nowrap">{formatDate(req.created_at)}</td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={req.status} />
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex gap-2 justify-end">
                          {req.status !== 'handled' && (
                            <Button
                              onClick={() => handleMarkHandled(req.id)}
                              className="bg-green-600 hover:bg-green-700 h-8 px-3"
                              size="sm"
                              data-testid={`handle-help-request-${req.id}`}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Traité
                            </Button>
                          )}
                          <Button
                            onClick={() => handleDelete(req.id)}
                            variant="destructive"
                            size="sm"
                            className="h-8 px-3"
                            data-testid={`delete-help-request-${req.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile list */}
            <div className="md:hidden space-y-3">
              {requests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                  data-testid={`help-request-mobile-${req.id}`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">{req.user_name || '—'}</p>
                      <p className="text-gray-500 text-xs truncate">{req.user_id}</p>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-gray-300">
                      <span className="text-gray-500">Niveau :</span> {req.level_id || '—'}
                    </p>
                    <p className="text-gray-300">
                      <span className="text-gray-500">Créneau souhaité :</span> {req.preferred || '—'}
                    </p>
                    {req.message && (
                      <p className="text-gray-300 whitespace-pre-wrap break-words">
                        <span className="text-gray-500">Message :</span> {req.message}
                      </p>
                    )}
                    <p className="text-gray-400">
                      <span className="text-gray-500">Date :</span> {formatDate(req.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end mt-3">
                    {req.status !== 'handled' && (
                      <Button
                        onClick={() => handleMarkHandled(req.id)}
                        className="bg-green-600 hover:bg-green-700 h-8 px-3"
                        size="sm"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Traité
                      </Button>
                    )}
                    <Button
                      onClick={() => handleDelete(req.id)}
                      variant="destructive"
                      size="sm"
                      className="h-8 px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminHelpRequests;
