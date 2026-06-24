import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PenLine, RefreshCw, Search, Trash2 } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const AdminCharteSignatures = () => {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchSignatures = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/charte-signatures`);
      setSignatures(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching charte signatures:', error);
      toast.error('Erreur lors du chargement des chartes signées');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignatures();
  }, []);

  const openDeleteDialog = (signature) => {
    setDeleteTarget(signature);
    setDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await axios.delete(`${API}/admin/charte-signatures/${deleteTarget.id}`);
      toast.success('Signature supprimée');
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchSignatures();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error.response?.data?.detail || 'Erreur lors de la suppression');
    } finally {
      setSubmitting(false);
    }
  };

  const total = signatures.length;

  const filtered = signatures.filter((s) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (s.user_name || '').toLowerCase().includes(term)
      || (s.user_id || '').toLowerCase().includes(term);
  });

  return (
    <Card className="card-dark border-neon" data-testid="admin-charte-signatures-card">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <PenLine className="w-6 h-6 text-purple-400" />
              Chartes signées
            </CardTitle>
            <CardDescription className="text-gray-400">
              Signatures de la charte d&apos;engagement des instructeurs
            </CardDescription>
          </div>
          <Button
            onClick={fetchSignatures}
            disabled={loading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:border-purple-500 hover:text-purple-400"
            data-testid="refresh-charte-signatures-button"
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
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom ou identifiant..."
              className="input-dark pl-9"
              data-testid="charte-signatures-search-input"
            />
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <p className="text-gray-400 text-center py-8" data-testid="no-charte-signatures">
            {total === 0 ? 'Aucune charte signée' : 'Aucun résultat pour ces critères'}
          </p>
        ) : (
          <div className="max-h-[60vh] overflow-auto rounded-lg border border-gray-700">
            <Table>
              <TableHeader>
                <TableRow className="border-gray-700 hover:bg-transparent">
                  <TableHead className="text-gray-300 sticky top-0 z-20 bg-[#160a18]">Instructeur</TableHead>
                  <TableHead className="text-gray-300 sticky top-0 z-20 bg-[#160a18]">Signature</TableHead>
                  <TableHead className="text-gray-300 sticky top-0 z-20 bg-[#160a18]">Version</TableHead>
                  <TableHead className="text-gray-300 sticky top-0 z-20 bg-[#160a18]">Date</TableHead>
                  <TableHead className="text-gray-300 sticky top-0 z-20 bg-[#160a18]">Statut</TableHead>
                  <TableHead className="text-gray-300 sticky top-0 z-20 bg-[#160a18] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow
                    key={s.id}
                    className="border-gray-800 hover:bg-gray-800/40"
                    data-testid={`charte-signature-row-${s.id}`}
                  >
                    <TableCell>
                      <p className="text-white font-medium">{s.user_name || '—'}</p>
                      <p className="text-gray-500 text-xs">{s.user_id}</p>
                    </TableCell>
                    <TableCell>
                      {s.signature_type === 'drawn' && s.signature_data ? (
                        <img
                          src={s.signature_data}
                          alt="Signature"
                          className="h-8 max-w-[140px] object-contain bg-white/90 rounded px-1"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      ) : s.signature_type === 'typed' && s.signature_data ? (
                        <span
                          className="text-gray-200 italic text-lg"
                          style={{ fontFamily: 'cursive' }}
                        >
                          {s.signature_data}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-gray-300">{s.version || '—'}</TableCell>
                    <TableCell className="text-gray-400 text-sm">{formatDate(s.signed_at)}</TableCell>
                    <TableCell>
                      <Badge className="bg-green-500/20 text-green-400 border border-green-500">
                        Signée
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-end flex-wrap">
                        <Button
                          onClick={() => openDeleteDialog(s)}
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 border-red-600 text-red-400 hover:bg-red-600/20"
                          data-testid={`delete-charte-signature-${s.id}`}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Supprimer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="card-dark border-neon">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-red-400" />
              Supprimer cette signature ?
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {deleteTarget ? `Instructeur : ${deleteTarget.user_name || deleteTarget.user_id}.` : ''}
              {' '}Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-gray-600 text-gray-300"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Annuler
            </Button>
            <Button
              onClick={handleDelete}
              disabled={submitting}
              variant="destructive"
              data-testid="confirm-delete-charte-signature-button"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminCharteSignatures;
