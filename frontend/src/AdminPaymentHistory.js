import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  CreditCard, RefreshCw, CheckCircle, XCircle, 
  Clock, Filter, ExternalLink, DollarSign 
} from 'lucide-react';
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
  { id: 'level-1', name: 'Level 1' },
  { id: 'level-2', name: 'Level 2' },
  { id: 'level-3', name: 'Level 3' },
  { id: 'level-4', name: 'Level 4' },
  { id: 'level-5', name: 'Level 5' }
];

const STATUS_COLORS = {
  completed: 'bg-green-500/20 text-green-400 border-green-500',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
  failed: 'bg-red-500/20 text-red-400 border-red-500',
  refunded: 'bg-purple-500/20 text-purple-400 border-purple-500'
};

const STATUS_LABELS = {
  completed: 'Complété',
  pending: 'En attente',
  failed: 'Échoué',
  refunded: 'Remboursé'
};

const PAYMENT_METHOD_LABELS = {
  stripe: '💳 Stripe',
  twint_api: '🔷 TWINT API',
  twint_link: '🔗 TWINT Lien',
  mobile_money_mtn: '📱 MTN MoMo',
  mobile_money_orange: '🍊 Orange Money',
  mobile_money_airtel: '📶 Airtel Money',
  aggregator_paystack: '🔄 Paystack',
  aggregator_flutterwave: '🦋 Flutterwave',
  aggregator_cinetpay: '🎬 CinetPay',
  manual: '✍️ Manuel'
};

const CURRENCY_FLAGS = {
  CHF: '🇨🇭',
  EUR: '🇪🇺',
  XAF: '🇨🇲',
  XOF: '🇸🇳',
  NGN: '🇳🇬',
  GHS: '🇬🇭',
  KES: '🇰🇪',
  USD: '🇺🇸'
};

const AdminPaymentHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMethod, setFilterMethod] = useState('all');
  const [searchUser, setSearchUser] = useState('');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/payments/history`);
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      toast.error('Erreur lors du chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleCompletePayment = async (transactionId) => {
    if (!confirm('Confirmer ce paiement manuellement ?')) return;

    try {
      await axios.post(`${API}/payments/${transactionId}/complete`);
      toast.success('Paiement confirmé et accès créé');
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la confirmation');
    }
  };

  // Filter transactions
  const filteredList = transactions.filter(tx => {
    if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
    if (filterMethod !== 'all' && tx.payment_method !== filterMethod) return false;
    if (searchUser && !tx.user_id.toLowerCase().includes(searchUser.toLowerCase())) return false;
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

  const formatAmount = (amount, currency) => {
    const flag = CURRENCY_FLAGS[currency] || '';
    return `${flag} ${amount?.toFixed(2) || '0.00'} ${currency}`;
  };

  // Calculate stats
  const stats = {
    total: transactions.length,
    completed: transactions.filter(t => t.status === 'completed').length,
    pending: transactions.filter(t => t.status === 'pending').length,
    totalAmount: transactions
      .filter(t => t.status === 'completed')
      .reduce((sum, t) => sum + (t.amount || 0), 0)
  };

  return (
    <Card className="card-dark border-neon" data-testid="admin-payment-history-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <CreditCard className="w-6 h-6 text-purple-400" />
              Historique des Paiements
            </CardTitle>
            <CardDescription className="text-gray-400">
              Transactions Stripe, TWINT, Mobile Money et autres
            </CardDescription>
          </div>
          <Button 
            onClick={fetchTransactions} 
            variant="outline"
            className="border-purple-500 text-purple-400"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
            <p className="text-3xl font-bold text-white">{stats.total}</p>
            <p className="text-sm text-gray-400">Total transactions</p>
          </div>
          <div className="p-4 bg-green-500/10 rounded-lg border border-green-500">
            <p className="text-3xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-sm text-green-400">Complétées</p>
          </div>
          <div className="p-4 bg-yellow-500/10 rounded-lg border border-yellow-500">
            <p className="text-3xl font-bold text-yellow-400">{stats.pending}</p>
            <p className="text-sm text-yellow-400">En attente</p>
          </div>
          <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500">
            <p className="text-3xl font-bold text-purple-400">
              {stats.totalAmount.toFixed(0)}
            </p>
            <p className="text-sm text-purple-400">Revenus totaux</p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-800/30 rounded-lg">
          <div>
            <Label className="text-gray-300 mb-2 block">Rechercher utilisateur</Label>
            <Input
              placeholder="ID utilisateur..."
              value={searchUser}
              onChange={(e) => setSearchUser(e.target.value)}
              className="input-dark"
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
                <SelectItem value="completed">Complété</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="failed">Échoué</SelectItem>
                <SelectItem value="refunded">Remboursé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300 mb-2 block">Méthode</Label>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger className="input-dark">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="twint_api">TWINT API</SelectItem>
                <SelectItem value="twint_link">TWINT Lien</SelectItem>
                <SelectItem value="mobile_money_mtn">MTN MoMo</SelectItem>
                <SelectItem value="mobile_money_orange">Orange Money</SelectItem>
                <SelectItem value="mobile_money_airtel">Airtel Money</SelectItem>
                <SelectItem value="manual">Manuel</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setFilterStatus('all');
                setFilterMethod('all');
                setSearchUser('');
              }}
              className="border-gray-500 text-gray-400 w-full"
            >
              Réinitialiser
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Référence</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Utilisateur</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Niveau</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Montant</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Méthode</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Statut</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Date</th>
                <th className="text-right py-3 px-4 text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-400">
                    Aucune transaction trouvée
                  </td>
                </tr>
              ) : (
                filteredList.map(tx => (
                  <tr key={tx.id} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-3 px-4">
                      <span className="text-purple-400 font-mono text-sm">
                        {tx.external_reference || tx.id.substring(0, 8)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white">{tx.user_id}</td>
                    <td className="py-3 px-4 text-gray-300">
                      {LEVELS.find(l => l.id === tx.level_id)?.name || tx.level_id}
                    </td>
                    <td className="py-3 px-4 text-white font-medium">
                      {formatAmount(tx.amount, tx.currency)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm">
                        {PAYMENT_METHOD_LABELS[tx.payment_method] || tx.payment_method}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs border ${STATUS_COLORS[tx.status]}`}>
                        {STATUS_LABELS[tx.status] || tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-400 text-sm">
                      {formatDate(tx.created_at)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2 justify-end">
                        {tx.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleCompletePayment(tx.id)}
                            className="bg-green-600 hover:bg-green-700"
                            data-testid={`complete-payment-${tx.id}`}
                          >
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Confirmer
                          </Button>
                        )}
                        {tx.provider_transaction_id && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-600 text-gray-400"
                            title={`Provider ID: ${tx.provider_transaction_id}`}
                          >
                            <ExternalLink className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Payment Methods Legend */}
        <div className="p-4 bg-gray-800/30 rounded-lg">
          <p className="text-gray-400 text-sm mb-3">Méthodes de paiement supportées:</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="text-sm">
              <span className="text-white">🇪🇺 Europe:</span>
              <span className="text-gray-400"> Stripe, Carte</span>
            </div>
            <div className="text-sm">
              <span className="text-white">🇨🇭 Suisse:</span>
              <span className="text-gray-400"> TWINT</span>
            </div>
            <div className="text-sm">
              <span className="text-white">🌍 Afrique:</span>
              <span className="text-gray-400"> MTN, Orange, Airtel</span>
            </div>
            <div className="text-sm">
              <span className="text-white">🔄 Agrégateurs:</span>
              <span className="text-gray-400"> Paystack, Flutterwave</span>
            </div>
            <div className="text-sm">
              <span className="text-white">✍️ Autre:</span>
              <span className="text-gray-400"> Manuel</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminPaymentHistory;
