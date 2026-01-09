import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  CheckCircle, XCircle, Trash2, Edit, Plus, 
  Shield, Clock, Ban, Users, Filter 
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LEVELS = [
  { id: 'level-1', name: 'Level 1 – Afroboost DNA' },
  { id: 'level-2', name: 'Level 2 – Rhythm Foundation' },
  { id: 'level-3', name: 'Level 3 – Style & Flow' },
  { id: 'level-4', name: 'Level 4 – Teaching Fundamentals' },
  { id: 'level-5', name: 'Level 5 – Master Instructor' }
];

const STATUS_COLORS = {
  active: 'bg-green-500/20 text-green-400 border-green-500',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  expired: 'bg-orange-500/20 text-orange-400 border-orange-500',
  revoked: 'bg-red-500/20 text-red-400 border-red-500'
};

const STATUS_LABELS = {
  active: 'Actif',
  pending: 'En attente',
  expired: 'Expiré',
  revoked: 'Révoqué'
};

const ACCESS_TYPE_LABELS = {
  payment: 'Paiement',
  volunteer: 'Bénévolat',
  admin_grant: 'Admin'
};

const AdminAccessComplete = () => {
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all');
  const [searchUser, setSearchUser] = useState('');
  
  // Dialog states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [selectedAccess, setSelectedAccess] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    user_id: '',
    level_id: '',
    access_type: 'admin_grant',
    status: 'active',
    expires_at: ''
  });
  const [revokeReason, setRevokeReason] = useState('');

  useEffect(() => {
    fetchAccessList();
  }, []);

  const fetchAccessList = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/access`);
      setAccessList(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching access list:', error);
      toast.error('Erreur lors du chargement des accès');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.user_id || !formData.level_id) {
      toast.error('ID utilisateur et niveau sont requis');
      return;
    }

    try {
      await axios.post(`${API}/access`, {
        ...formData,
        expires_at: formData.expires_at || null
      });
      toast.success('Accès créé avec succès');
      setShowCreateDialog(false);
      resetForm();
      fetchAccessList();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const handleUpdate = async () => {
    if (!selectedAccess) return;

    try {
      await axios.put(`${API}/access/${selectedAccess.id}`, {
        status: formData.status,
        access_type: formData.access_type,
        expires_at: formData.expires_at || null
      });
      toast.success('Accès mis à jour');
      setShowEditDialog(false);
      fetchAccessList();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleRevoke = async () => {
    if (!selectedAccess) return;

    try {
      await axios.post(`${API}/access/${selectedAccess.id}/revoke`, {
        reason: revokeReason,
        revoked_by: 'admin'
      });
      toast.success('Accès révoqué');
      setShowRevokeDialog(false);
      setRevokeReason('');
      fetchAccessList();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la révocation');
    }
  };

  const handleDelete = async (accessId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet accès ?')) return;

    try {
      await axios.delete(`${API}/access/${accessId}`);
      toast.success('Accès supprimé');
      fetchAccessList();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const openEditDialog = (access) => {
    setSelectedAccess(access);
    setFormData({
      user_id: access.user_id,
      level_id: access.level_id,
      access_type: access.access_type,
      status: access.status,
      expires_at: access.expires_at ? access.expires_at.split('T')[0] : ''
    });
    setShowEditDialog(true);
  };

  const openRevokeDialog = (access) => {
    setSelectedAccess(access);
    setShowRevokeDialog(true);
  };

  const resetForm = () => {
    setFormData({
      user_id: '',
      level_id: '',
      access_type: 'admin_grant',
      status: 'active',
      expires_at: ''
    });
  };

  // Filter access list
  const filteredList = accessList.filter(access => {
    if (filterStatus !== 'all' && access.status !== filterStatus) return false;
    if (filterLevel !== 'all' && access.level_id !== filterLevel) return false;
    if (searchUser && !access.user_id.toLowerCase().includes(searchUser.toLowerCase())) return false;
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="card-dark border-neon" data-testid="admin-access-complete-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-400" />
              Gestion Complète des Accès
            </CardTitle>
            <CardDescription className="text-gray-400">
              Créer, modifier, révoquer et supprimer les accès utilisateurs
            </CardDescription>
          </div>
          <Button 
            onClick={() => setShowCreateDialog(true)} 
            className="btn-neon"
            data-testid="create-access-button"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouvel Accès
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-800/30 rounded-lg">
          <div>
            <Label className="text-gray-300 mb-2 block">Rechercher utilisateur</Label>
            <Input
              placeholder="ID utilisateur..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="input-dark"
              data-testid="search-user-input"
            />
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">Statut</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="input-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="active">Actif</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="expired">Expiré</SelectItem>
                <SelectItem value="revoked">Révoqué</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">Niveau</Label>
            <Select value={filterLevel} onValueChange={setFilterLevel}>
              <SelectTrigger className="input-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {LEVELS.map(level => (
                  <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={fetchAccessList}
              className="border-purple-500 text-purple-400 w-full"
            >
              <Filter className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {['active', 'pending', 'expired', 'revoked'].map(status => (
            <div key={status} className={`p-3 rounded-lg border ${STATUS_COLORS[status]}`}>
              <p className="text-2xl font-bold">
                {accessList.filter(a => a.status === status).length}
              </p>
              <p className="text-sm">{STATUS_LABELS[status]}</p>
            </div>
          ))}
        </div>

        {/* Access Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Utilisateur</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Niveau</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Type</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Accordé le</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Expire le</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-400">
                    Aucun accès trouvé
                  </td>
                </tr>
              ) : (
                filteredList.map(access => (
                  <tr key={access.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-3 px-4 text-white font-medium">{access.user_id}</td>
                    <td className="py-3 px-4 text-gray-300">
                      {LEVELS.find(l => l.id === access.level_id)?.name || access.level_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-purple-400 text-sm">
                        {ACCESS_TYPE_LABELS[access.access_type] || access.access_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[access.status]}`}>
                        {STATUS_LABELS[access.status] || access.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(access.granted_at)}
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {access.expires_at ? formatDate(access.expires_at) : 'Permanent'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(access)}
                          className="border-blue-500 text-blue-400"
                          data-testid={`edit-access-${access.id}`}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                        {access.status === 'active' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openRevokeDialog(access)}
                            className="border-orange-500 text-orange-400"
                            data-testid={`revoke-access-${access.id}`}
                          >
                            <Ban className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(access.id)}
                          data-testid={`delete-access-${access.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Créer un nouvel accès</DialogTitle>
            <DialogDescription className="text-gray-400">
              Accordez un accès à un utilisateur pour un niveau spécifique
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">ID Utilisateur</Label>
              <Input
                value={formData.user_id}
                onChange={(e) => setFormData({...formData, user_id: e.target.value})}
                placeholder="ex: user-123"
                className="input-dark"
              />
            </div>
            <div>
              <Label className="text-gray-300">Niveau</Label>
              <Select 
                value={formData.level_id} 
                onValueChange={(v) => setFormData({...formData, level_id: v})}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Sélectionner un niveau" />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map(level => (
                    <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Type d'accès</Label>
              <Select 
                value={formData.access_type} 
                onValueChange={(v) => setFormData({...formData, access_type: v})}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_grant">Admin (gratuit)</SelectItem>
                  <SelectItem value="payment">Paiement</SelectItem>
                  <SelectItem value="volunteer">Bénévolat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Statut initial</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Date d'expiration (optionnel)</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                className="input-dark"
              />
              <p className="text-xs text-gray-500 mt-1">Laisser vide pour un accès permanent</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate} className="btn-neon">
              <Plus className="w-4 h-4 mr-2" />
              Créer l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier l'accès</DialogTitle>
            <DialogDescription className="text-gray-400">
              Utilisateur: {selectedAccess?.user_id} - {LEVELS.find(l => l.id === selectedAccess?.level_id)?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Statut</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({...formData, status: v})}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actif</SelectItem>
                  <SelectItem value="pending">En attente</SelectItem>
                  <SelectItem value="expired">Expiré</SelectItem>
                  <SelectItem value="revoked">Révoqué</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Type d'accès</Label>
              <Select 
                value={formData.access_type} 
                onValueChange={(v) => setFormData({...formData, access_type: v})}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_grant">Admin</SelectItem>
                  <SelectItem value="payment">Paiement</SelectItem>
                  <SelectItem value="volunteer">Bénévolat</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Date d'expiration</Label>
              <Input
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({...formData, expires_at: e.target.value})}
                className="input-dark"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleUpdate} className="btn-neon">
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Dialog */}
      <Dialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Ban className="w-5 h-5 text-orange-400" />
              Révoquer l'accès
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Cette action désactivera immédiatement l'accès de l'utilisateur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500">
              <p className="text-white">
                <strong>Utilisateur:</strong> {selectedAccess?.user_id}
              </p>
              <p className="text-gray-300">
                <strong>Niveau:</strong> {LEVELS.find(l => l.id === selectedAccess?.level_id)?.name}
              </p>
            </div>
            <div>
              <Label className="text-gray-300">Raison de la révocation (optionnel)</Label>
              <Textarea
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                placeholder="Ex: Non-respect des conditions, demande utilisateur..."
                className="input-dark"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRevokeDialog(false)}>
              Annuler
            </Button>
            <Button onClick={handleRevoke} className="bg-orange-600 hover:bg-orange-700">
              <Ban className="w-4 h-4 mr-2" />
              Révoquer l'accès
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default AdminAccessComplete;
