import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { ShieldCheck, Save, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminConditions = () => {
  const [text, setText] = useState('');
  const [version, setVersion] = useState('');
  const [privacyUrl, setPrivacyUrl] = useState('');
  const [charteUrl, setCharteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [acceptances, setAcceptances] = useState([]);
  const [showAcceptances, setShowAcceptances] = useState(false);

  const loadConditions = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/admin/conditions`);
      const data = response.data || {};
      setText(data.text || '');
      setVersion(data.version || '');
      setPrivacyUrl(data.privacy_url || '');
      setCharteUrl(data.charte_url || '');
    } catch (error) {
      console.error('Error loading conditions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAcceptances = async () => {
    try {
      const response = await axios.get(`${API}/admin/condition-acceptances`);
      setAcceptances(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error loading acceptances:', error);
    }
  };

  useEffect(() => {
    loadConditions();
    loadAcceptances();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/admin/conditions`, {
        text,
        version,
        privacy_url: privacyUrl,
        charte_url: charteUrl
      });
      toast.success('Conditions enregistrées');
      loadConditions();
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement des conditions");
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';
    const d = new Date(value);
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('fr-FR');
  };

  return (
    <Card className="card-dark border-neon" data-testid="admin-conditions-card">
      <CardHeader>
        <CardTitle className="text-2xl text-white flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-purple-400" />
          Conditions de participation
        </CardTitle>
        <CardDescription className="text-gray-400">
          Texte affiché au participant avant d&apos;accéder aux niveaux. Changez la VERSION pour
          redemander l&apos;acceptation à tous.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Version */}
        <div>
          <Label htmlFor="conditions-version" className="text-gray-300 mb-2 block">Version</Label>
          <Input
            id="conditions-version"
            placeholder="v1-2026-06"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            className="input-dark"
            data-testid="conditions-version-input"
          />
          <Label className="text-gray-400 text-sm mt-1 block">
            Modifiez la version à chaque changement important pour forcer une nouvelle acceptation.
          </Label>
        </div>

        {/* Texte des conditions */}
        <div>
          <Label htmlFor="conditions-text" className="text-gray-300 mb-2 block">Texte des conditions</Label>
          <Textarea
            id="conditions-text"
            rows={16}
            placeholder="Saisissez ici le texte des conditions de participation…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="input-dark whitespace-pre-wrap min-h-[360px]"
            data-testid="conditions-text-input"
          />
        </div>

        {/* Liens */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="conditions-privacy" className="text-gray-300 mb-2 block">
              Lien Politique de confidentialité (URL)
            </Label>
            <Input
              id="conditions-privacy"
              placeholder="https://…"
              value={privacyUrl}
              onChange={(e) => setPrivacyUrl(e.target.value)}
              className="input-dark"
              data-testid="conditions-privacy-input"
            />
          </div>
          <div>
            <Label htmlFor="conditions-charte" className="text-gray-300 mb-2 block">
              Lien Charte d&apos;engagement (option gratuite) (URL)
            </Label>
            <Input
              id="conditions-charte"
              placeholder="https://…"
              value={charteUrl}
              onChange={(e) => setCharteUrl(e.target.value)}
              className="input-dark"
              data-testid="conditions-charte-input"
            />
          </div>
        </div>

        {/* Enregistrer */}
        <div>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="btn-neon w-full md:w-auto"
            data-testid="save-conditions-button"
          >
            {saving ? (
              <>
                <span className="spinner"></span>
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer les conditions
              </>
            )}
          </Button>
        </div>

        {/* Acceptations enregistrées */}
        <div className="pt-2 border-t border-gray-700">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <Label className="text-gray-300 text-lg">
              Acceptations enregistrées ({acceptances.length})
            </Label>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowAcceptances(!showAcceptances)}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-400"
                data-testid="toggle-acceptances"
              >
                {showAcceptances ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Masquer
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Afficher
                  </>
                )}
              </Button>
              <Button
                onClick={loadAcceptances}
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-400"
                data-testid="refresh-acceptances"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Rafraîchir
              </Button>
            </div>
          </div>

          {showAcceptances && (
            acceptances.length === 0 ? (
              <p className="text-gray-400 text-center py-6" data-testid="no-acceptances">
                Aucune acceptation pour le moment.
              </p>
            ) : (
              <>
                {/* Table (desktop) */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-gray-700">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-800/70 text-gray-300 text-left">
                        <th className="px-4 py-3 font-medium">Participant</th>
                        <th className="px-4 py-3 font-medium">Version</th>
                        <th className="px-4 py-3 font-medium">Date</th>
                        <th className="px-4 py-3 font-medium">IP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {acceptances.map((a, index) => (
                        <tr
                          key={`${a.user_id || 'u'}-${a.version || 'v'}-${index}`}
                          className="border-t border-gray-700 hover:bg-gray-800/40"
                        >
                          <td className="px-4 py-3">
                            <p className="text-white font-medium">{a.user_name || '—'}</p>
                            <p className="text-gray-500 text-xs">{a.user_id || '—'}</p>
                          </td>
                          <td className="px-4 py-3 text-gray-300">{a.version || '—'}</td>
                          <td className="px-4 py-3 text-gray-300">{formatDate(a.accepted_at)}</td>
                          <td className="px-4 py-3 text-gray-400">{a.ip || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards (mobile) */}
                <div className="md:hidden space-y-3">
                  {acceptances.map((a, index) => (
                    <div
                      key={`${a.user_id || 'u'}-${a.version || 'v'}-${index}`}
                      className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <p className="text-white font-medium">{a.user_name || '—'}</p>
                      <p className="text-gray-500 text-xs mb-2">{a.user_id || '—'}</p>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-gray-500 text-xs">Version</p>
                          <p className="text-gray-300">{a.version || '—'}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs">IP</p>
                          <p className="text-gray-400">{a.ip || '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-gray-500 text-xs">Date</p>
                          <p className="text-gray-300">{formatDate(a.accepted_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminConditions;
