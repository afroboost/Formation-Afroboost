import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  HandHeart, RefreshCw, CheckCircle, XCircle, PlusCircle, Search
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EVENT_TYPES = [
  { value: 'montage', label: 'Montage du matériel' },
  { value: 'demontage', label: 'Démontage' },
  { value: 'nettoyage', label: 'Nettoyage' },
  { value: 'rangement', label: 'Rangement' },
  { value: 'distribution_flyers', label: 'Distribution de flyers' },
  { value: 'publications_reseaux', label: 'Publications réseaux sociaux' },
  { value: 'remplacement_formateur', label: 'Remplacement du formateur' }
];

const STATUS_META = {
  pending: { label: 'En attente', className: 'bg-orange-500/20 text-orange-400 border border-orange-500' },
  validated: { label: 'Validé', className: 'bg-green-500/20 text-green-400 border border-green-500' },
  revoked: { label: 'Révoqué', className: 'bg-red-500/20 text-red-400 border border-red-500' }
};

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const AdminEngagementTracking = () => {
  const [charters, setCharters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mark event dialog state
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [eventTarget, setEventTarget] = useState(null);
  const [eventType, setEventType] = useState('montage');
  const [eventDate, setEventDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Revoke dialog state
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [revokeReason, setRevokeReason] = useState('');

  const fetchCharters = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/engagement/admin/all`);
      setCharters(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching engagements:', error);
      toast.error('Erreur lors du chargement des engagements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCharters();
  }, []);

  const handleValidate = async (charter) => {
    try {
      await axios.post(`${API}/engagement/${charter.id}/validate`);
      toast.success('Engagement validé, accès accordé');
      fetchCharters();
    } catch (error) {
      console.error('Validate error:', error);
      toast.error('Erreur lors de la validation');
    }
  };

  const openEventDialog = (charter) => {
    setEventTarget(charter);
    setEventType('montage');
    setEventDate('');
    setEventDialogOpen(true);
  };

  const handleMarkEvent = async () => {
    if (!eventTarget) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/engagement/${eventTarget.id}/mark-event`, {
        type: eventType,
        date: eventDate || null
      });
      toast.success('Événement enregistré');
      setEventDialogOpen(false);
      setEventTarget(null);
      fetchCharters();
    } catch (error) {
      console.error('Mark event error:', error);
      toast.error('Erreur lors de l\'enregistrement de l\'événement');
    } finally {
      setSubmitting(false);
    }
  };

  const openRevokeDialog = (charter) => {
    setRevokeTarget(charter);
    setRevokeReason('');
    setRevokeDialogOpen(true);
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setSubmitting(true);
    try {
      await axios.post(`${API}/engagement/${revokeTarget.id}/revoke`, {
        reason: revokeReason
      });
      toast.success('Engagement révoqué');
      setRevokeDialogOpen(false);
      setRevokeTarget(null);
      fetchCharters();
    } catch (error) {
      console.error('Revoke error:', error);
      toast.error('Erreur lors de la révocation');
    } finally {
      setSubmitting(false);
    }
  };

  const total = charters.length;
  const pendingCount = charters.filter(c => c.status === 'pending').length;
  const validatedCount = charters.filter(c => c.status === 'validated').length;

  const filtered = charters.filter((c) => {
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const term = search.trim().toLowerCase();
    const matchesSearch = !term
      || (c.user_name || '').toLowerCase().includes(term)
      || (c.user_id || '').toLowerCase().includes(term);
    return matchesStatus && matchesSearch;
  });

  return (
    <Card className="card-dark border-neon" data-testid="admin-engagement-tracking-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <HandHeart className="w-6 h-6 text-purple-400" />
              Suivi des Engagements
            </CardTitle>
            <CardDescription className="text-gray-400">
              Validation des chartes et suivi des événements bénévoles
            </CardDescription>
          </div>
          <Button
            onClick={fetchCharters}
            disabled={loading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:border-purple-500 hover:text-purple-400"
            data-testid="refresh-engagements-button"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Rafraîchir
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Stat chips */}
        <div className="flex flex-wrap gap-3">
          <div className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700">
            <span className="text-gray-400 text-sm">Total</span>
            <span className="text-white font-bold ml-2">{total}</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-orange-500/10 border border-orange-500/40">
            <span className="text-orange-300 text-sm">En attente</span>
            <span className="text-orange-300 font-bold ml-2">{pendingCount}</span>
          </div>
          <div className="px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/40">
            <span className="text-green-300 text-sm">Validés</span>
            <span className="text-green-300 font-bold ml-2">{validatedCount}</span>
          </div>
        </div>

        {/* Search + filter */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou identifiant..."
              className="input-dark pl-9"
              data-testid="engagement-search-input"
            />
          </div>
          <div className="w-full md:w-56">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="input-dark" data-testid="engagement-status-filter">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="validated">Validés</SelectItem>
                <SelectItem value="revoked">Révoqués</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8" data-testid="no-engagements">
            {total === 0 ? 'Aucun engagement enregistré' : 'Aucun résultat pour ces critères'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-300">Participant</TableHead>
                  <TableHead className="text-gray-300">Niveau</TableHead>
                  <TableHead className="text-gray-300">Signé le</TableHead>
                  <TableHead className="text-gray-300">Engagement</TableHead>
                  <TableHead className="text-gray-300">Statut</TableHead>
                  <TableHead className="text-gray-300 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => {
                  const meta = STATUS_META[c.status] || STATUS_META.pending;
                  const done = Array.isArray(c.events_done) ? c.events_done.length : 0;
                  const promised = c.events_promised != null ? c.events_promised : 0;
                  return (
                    <TableRow
                      key={c.id}
                      className="border-gray-800 hover:bg-gray-800/40"
                      data-testid={`engagement-row-${c.id}`}
                    >
                      <TableCell>
                        <p className="text-white font-medium">{c.user_name || '—'}</p>
                        <p className="text-gray-500 text-xs">{c.user_id}</p>
                      </TableCell>
                      <TableCell className="text-gray-300">{c.level_id || '—'}</TableCell>
                      <TableCell className="text-gray-400 text-sm">{formatDate(c.accepted_at)}</TableCell>
                      <TableCell className="text-gray-300">
                        <span className={done >= promised && promised > 0 ? 'text-green-400 font-semibold' : ''}>
                          {done} / {promised}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={meta.className}>{meta.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-end flex-wrap">
                          {c.status === 'pending' && (
                            <Button
                              onClick={() => handleValidate(c)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 h-8 px-3"
                              data-testid={`validate-engagement-${c.id}`}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Valider
                            </Button>
                          )}
                          {c.status !== 'revoked' && (
                            <Button
                              onClick={() => openEventDialog(c)}
                              size="sm"
                              variant="outline"
                              className="border-purple-500 text-purple-400 h-8 px-3 text-xs"
                              data-testid={`mark-event-${c.id}`}
                            >
                              <PlusCircle className="w-3 h-3 mr-1" />
                              Marquer un événement
                            </Button>
                          )}
                          {c.status === 'validated' && (
                            <Button
                              onClick={() => openRevokeDialog(c)}
                              size="sm"
                              variant="destructive"
                              className="h-8 px-3"
                              data-testid={`revoke-engagement-${c.id}`}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Révoquer
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Mark event dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="card-dark border-neon">
          <DialogHeader>
            <DialogTitle className="text-white">Marquer un événement</DialogTitle>
            <DialogDescription className="text-gray-400">
              {eventTarget ? `Pour ${eventTarget.user_name || eventTarget.user_id}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300 mb-2 block">Type d&apos;événement</Label>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="input-dark" data-testid="event-type-select">
                  <SelectValue placeholder="Type d'événement" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300 mb-2 block">Date (optionnel)</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="input-dark"
                data-testid="event-date-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={() => setEventDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleMarkEvent}
              disabled={submitting}
              className="btn-neon"
              data-testid="confirm-mark-event-button"
            >
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent className="card-dark border-neon">
          <DialogHeader>
            <DialogTitle className="text-white">Révoquer l&apos;engagement</DialogTitle>
            <DialogDescription className="text-gray-400">
              {revokeTarget ? `Pour ${revokeTarget.user_name || revokeTarget.user_id}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-300 mb-2 block">Motif de la révocation</Label>
              <Input
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Raison..."
                className="input-dark"
                data-testid="revoke-reason-input"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={() => setRevokeDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRevoke}
              disabled={submitting}
              variant="destructive"
              data-testid="confirm-revoke-button"
            >
              Révoquer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminEngagementTracking;
