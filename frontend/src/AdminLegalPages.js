import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Save } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminLegalPages = () => {
  const [loading, setLoading] = useState(false);

  const [privacyTitle, setPrivacyTitle] = useState('');
  const [privacyText, setPrivacyText] = useState('');
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  const [charteTitle, setCharteTitle] = useState('');
  const [charteText, setCharteText] = useState('');
  const [charteVersion, setCharteVersion] = useState('');
  const [savingCharte, setSavingCharte] = useState(false);

  const loadPage = async (key) => {
    try {
      const response = await axios.get(`${API}/admin/pages/${key}`);
      const data = response.data || {};
      if (key === 'privacy') {
        setPrivacyTitle(data.title || '');
        setPrivacyText(data.text || '');
      } else {
        setCharteTitle(data.title || '');
        setCharteText(data.text || '');
        setCharteVersion(data.version || '');
      }
    } catch (error) {
      console.error(`Error loading page ${key}:`, error);
    }
  };

  const loadPages = async () => {
    setLoading(true);
    try {
      await Promise.all([loadPage('privacy'), loadPage('charte')]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, []);

  const handleSavePrivacy = async () => {
    setSavingPrivacy(true);
    try {
      await axios.post(`${API}/admin/pages/privacy`, {
        title: privacyTitle,
        text: privacyText
      });
      toast.success('Page enregistrée');
      loadPage('privacy');
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la page");
    } finally {
      setSavingPrivacy(false);
    }
  };

  const handleSaveCharte = async () => {
    setSavingCharte(true);
    try {
      await axios.post(`${API}/admin/pages/charte`, {
        title: charteTitle,
        text: charteText,
        version: charteVersion
      });
      toast.success('Page enregistrée');
      loadPage('charte');
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement de la page");
    } finally {
      setSavingCharte(false);
    }
  };

  return (
    <Card className="card-dark border-neon" data-testid="admin-legal-pages-card">
      <CardHeader>
        <CardTitle className="text-2xl text-white flex items-center gap-2">
          <FileText className="w-6 h-6 text-purple-400" />
          Pages légales (Confidentialité &amp; Charte)
        </CardTitle>
        <CardDescription className="text-gray-400">
          Textes publiés sur /confidentialite et /charte, et liés dans la modale d&apos;acceptation
          et le pied de page.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Politique de confidentialité */}
        <div className="p-4 rounded-lg border border-gray-700">
          <Label className="text-gray-300 text-lg mb-4 block">
            Politique de confidentialité (/confidentialite)
          </Label>

          <div className="mb-4">
            <Label htmlFor="privacy-title" className="text-gray-300 mb-2 block">Titre</Label>
            <Input
              id="privacy-title"
              placeholder="Politique de confidentialité"
              value={privacyTitle}
              onChange={(e) => setPrivacyTitle(e.target.value)}
              className="input-dark"
              data-testid="privacy-title-input"
            />
          </div>

          <div className="mb-2">
            <Label htmlFor="privacy-text" className="text-gray-300 mb-2 block">Texte</Label>
            <Textarea
              id="privacy-text"
              rows={14}
              placeholder="Saisissez ici le texte de la politique de confidentialité…"
              value={privacyText}
              onChange={(e) => setPrivacyText(e.target.value)}
              className="input-dark whitespace-pre-wrap min-h-[320px]"
              data-testid="privacy-text-input"
            />
          </div>

          <Label className="text-gray-400 text-sm mb-4 block">
            Les retours à la ligne sont préservés. Les lignes de la forme «&nbsp;N. Titre&nbsp;»
            deviennent des sous-titres et les lignes commençant par «&nbsp;•&nbsp;» deviennent des
            puces.
          </Label>

          <Button
            onClick={handleSavePrivacy}
            disabled={savingPrivacy || loading}
            className="btn-neon w-full md:w-auto"
            data-testid="save-privacy-button"
          >
            {savingPrivacy ? (
              <>
                <span className="spinner"></span>
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer la confidentialité
              </>
            )}
          </Button>
        </div>

        {/* Charte d'engagement */}
        <div className="p-4 rounded-lg border border-gray-700">
          <Label className="text-gray-300 text-lg mb-4 block">
            Charte d&apos;engagement (/charte)
          </Label>

          <div className="mb-4">
            <Label htmlFor="charte-title" className="text-gray-300 mb-2 block">Titre</Label>
            <Input
              id="charte-title"
              placeholder="Charte d'engagement"
              value={charteTitle}
              onChange={(e) => setCharteTitle(e.target.value)}
              className="input-dark"
              data-testid="charte-title-input"
            />
          </div>

          <div className="mb-4">
            <Label htmlFor="charte-version" className="text-gray-300 mb-2 block">Version</Label>
            <Input
              id="charte-version"
              placeholder="v1-2026-06"
              value={charteVersion}
              onChange={(e) => setCharteVersion(e.target.value)}
              className="input-dark"
              data-testid="charte-version-input"
            />
            <Label className="text-gray-400 text-sm mt-1 block">
              Changez la version pour redemander la signature de la charte à tous les instructeurs.
            </Label>
          </div>

          <div className="mb-2">
            <Label htmlFor="charte-text" className="text-gray-300 mb-2 block">Texte</Label>
            <Textarea
              id="charte-text"
              rows={14}
              placeholder="Saisissez ici le texte de la charte d'engagement…"
              value={charteText}
              onChange={(e) => setCharteText(e.target.value)}
              className="input-dark whitespace-pre-wrap min-h-[320px]"
              data-testid="charte-text-input"
            />
          </div>

          <Label className="text-gray-400 text-sm mb-4 block">
            Les retours à la ligne sont préservés. Les lignes de la forme «&nbsp;N. Titre&nbsp;»
            deviennent des sous-titres et les lignes commençant par «&nbsp;•&nbsp;» deviennent des
            puces.
          </Label>

          <Button
            onClick={handleSaveCharte}
            disabled={savingCharte || loading}
            className="btn-neon w-full md:w-auto"
            data-testid="save-charte-button"
          >
            {savingCharte ? (
              <>
                <span className="spinner"></span>
                Enregistrement…
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Enregistrer la charte
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminLegalPages;
