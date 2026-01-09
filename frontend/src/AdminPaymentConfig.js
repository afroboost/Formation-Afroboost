import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Save, DollarSign } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LEVELS = [
  { id: 'level-1', name: 'Level 1 – Afroboost DNA' },
  { id: 'level-2', name: 'Level 2 – Rhythm Foundation' },
  { id: 'level-3', name: 'Level 3 – Style & Flow' },
  { id: 'level-4', name: 'Level 4 – Teaching Fundamentals' },
  { id: 'level-5', name: 'Level 5 – Master Instructor' }
];

const PAYMENT_METHODS = [
  { id: 'twint', label: 'TWINT' },
  { id: 'stripe', label: 'Stripe' },
  { id: 'orange_money', label: 'Orange Money' },
  { id: 'mtn_money', label: 'MTN Money' }
];

const AdminPaymentConfig = () => {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [paymentMode, setPaymentMode] = useState('both');
  const [price, setPrice] = useState('');
  const [currency, setCurrency] = useState('CHF');
  const [enabledMethods, setEnabledMethods] = useState([]);
  const [instructions, setInstructions] = useState({});
  const [volunteerDesc, setVolunteerDesc] = useState('');
  const [loading, setLoading] = useState(false);

  const loadConfig = async (levelId) => {
    try {
      const response = await axios.get(`${API}/level-payment-config/${levelId}`);
      const config = response.data;
      
      setPaymentMode(config.payment_mode || 'both');
      setPrice(config.price || '');
      setCurrency(config.currency || 'CHF');
      setEnabledMethods(config.enabled_payment_methods || []);
      setInstructions(config.payment_instructions || {});
      setVolunteerDesc(config.volunteer_description || '');
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    loadConfig(level.id);
  };

  const toggleMethod = (methodId) => {
    if (enabledMethods.includes(methodId)) {
      setEnabledMethods(enabledMethods.filter(m => m !== methodId));
    } else {
      setEnabledMethods([...enabledMethods, methodId]);
    }
  };

  const updateInstruction = (methodId, value) => {
    setInstructions({ ...instructions, [methodId]: value });
  };

  const handleSave = async () => {
    if (!selectedLevel) {
      toast.error('Veuillez sélectionner un niveau');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/level-payment-config`, {
        level_id: selectedLevel.id,
        payment_mode: paymentMode,
        price: price ? parseFloat(price) : null,
        currency: currency,
        enabled_payment_methods: enabledMethods,
        payment_instructions: instructions,
        volunteer_description: volunteerDesc
      });
      
      toast.success('Configuration sauvegardée!');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const showMoneyFields = paymentMode === 'money' || paymentMode === 'both';
  const showVolunteerFields = paymentMode === 'volunteer' || paymentMode === 'both';

  return (
    <Card className="card-dark border-neon" data-testid="admin-payment-config-card">
      <CardHeader>
        <CardTitle className="text-2xl text-white flex items-center gap-2">
          <DollarSign className="w-6 h-6 text-purple-400" />
          Configuration des Paiements
        </CardTitle>
        <CardDescription className="text-gray-400">
          Configurer les modes de paiement et bénévolat pour chaque niveau
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Level Selection */}
        <div>
          <Label className="text-gray-300 mb-2 block">Sélectionner un niveau</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {LEVELS.map((level) => (
              <Button
                key={level.id}
                onClick={() => handleLevelSelect(level)}
                variant={selectedLevel?.id === level.id ? 'default' : 'outline'}
                className={selectedLevel?.id === level.id ? 'btn-neon' : 'border-gray-600 text-gray-300 btn-secondary'}
                data-testid={`select-payment-${level.id}`}
              >
                Level {level.id.split('-')[1]}
              </Button>
            ))}
          </div>
        </div>

        {selectedLevel && (
          <div className="space-y-6">
            <h3 className="text-xl text-white font-bold">{selectedLevel.name}</h3>

            {/* Payment Mode */}
            <div>
              <Label className="text-gray-300 mb-3 block text-lg">Mode de paiement</Label>
              <RadioGroup value={paymentMode} onValueChange={setPaymentMode}>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="money" id="mode-money" />
                  <Label htmlFor="mode-money" className="text-gray-300 cursor-pointer">
                    Paiement en argent
                  </Label>
                </div>
                <div className="flex items-center space-x-2 mb-2">
                  <RadioGroupItem value="volunteer" id="mode-volunteer" />
                  <Label htmlFor="mode-volunteer" className="text-gray-300 cursor-pointer">
                    Paiement par bénévolat (Artboost)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="both" id="mode-both" />
                  <Label htmlFor="mode-both" className="text-gray-300 cursor-pointer">
                    Les deux (au choix du participant)
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Money Payment Fields */}
            {showMoneyFields && (
              <div className="space-y-4 p-4 bg-gray-800/30 rounded-lg border border-gray-700">
                <h4 className="text-white font-semibold">Configuration paiement argent</h4>
                
                {/* Price & Currency */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300 mb-2 block">Prix</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="100"
                      className="input-dark"
                      data-testid="price-input"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300 mb-2 block">Devise</Label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="input-dark w-full p-2 rounded"
                      data-testid="currency-select"
                    >
                      <option value="CHF">CHF</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                {/* Payment Methods */}
                <div>
                  <Label className="text-gray-300 mb-3 block">Méthodes de paiement actives</Label>
                  <div className="space-y-3">
                    {PAYMENT_METHODS.map((method) => (
                      <div key={method.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id={`method-${method.id}`}
                            checked={enabledMethods.includes(method.id)}
                            onCheckedChange={() => toggleMethod(method.id)}
                          />
                          <Label htmlFor={`method-${method.id}`} className="text-gray-300 cursor-pointer">
                            {method.label}
                          </Label>
                        </div>
                        
                        {enabledMethods.includes(method.id) && (
                          <Input
                            placeholder={`Lien ou instructions ${method.label}`}
                            value={instructions[method.id] || ''}
                            onChange={(e) => updateInstruction(method.id, e.target.value)}
                            className="input-dark ml-6"
                            data-testid={`instruction-${method.id}`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Volunteer Fields */}
            {showVolunteerFields && (
              <div className="space-y-4 p-4 bg-blue-900/20 rounded-lg border border-blue-700">
                <h4 className="text-white font-semibold">Configuration bénévolat Artboost</h4>
                
                <div>
                  <Label className="text-gray-300 mb-2 block">
                    Description du bénévolat pour ce niveau
                  </Label>
                  <Textarea
                    value={volunteerDesc}
                    onChange={(e) => setVolunteerDesc(e.target.value)}
                    placeholder="Type de mission, durée indicative, etc."
                    className="input-dark min-h-[100px]"
                    data-testid="volunteer-desc-input"
                  />
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="pt-4">
              <Button
                onClick={handleSave}
                disabled={loading}
                className="btn-neon w-full md:w-auto"
                data-testid="save-payment-config-button"
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Sauvegarde...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder la configuration
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPaymentConfig;
