import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Download, CheckCircle, GraduationCap, Award, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import ConditionsGate from '@/components/ConditionsGate';
import CharteGate from '@/components/CharteGate';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Predefined levels with skills
const AVAILABLE_LEVELS = [
  {
    name: 'Level 1 – Afroboost DNA',
    skills: [
      'Maîtrise des mouvements de base Afrobeat',
      'Compréhension du rythme et de la musicalité',
      'Technique de isolation corporelle',
      'Coordination bras-jambes fondamentale'
    ]
  },
  {
    name: 'Level 2 – Rhythm Foundation',
    skills: [
      'Maîtrise des variations rythmiques complexes',
      'Transitions fluides entre mouvements',
      'Expression corporelle et énergie',
      'Synchronisation musicale avancée'
    ]
  },
  {
    name: 'Level 3 – Style & Flow',
    skills: [
      'Développement du style personnel',
      'Improvisation et créativité',
      'Maîtrise des enchaînements chorégraphiques',
      'Performance scénique et présence'
    ]
  },
  {
    name: 'Level 4 – Teaching Fundamentals',
    skills: [
      'Pédagogie de la danse Afrobeat',
      'Communication et démonstration',
      'Correction et adaptation aux élèves',
      'Structuration d\'une classe complète'
    ]
  },
  {
    name: 'Level 5 – Master Instructor',
    skills: [
      'Création de chorégraphies originales',
      'Animation de classes avancées',
      'Formation et mentorat d\'instructeurs',
      'Leadership et gestion de communauté'
    ]
  }
];

const LevelsPage = () => {
  const [studentId, setStudentId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [conditionsOK, setConditionsOK] = useState(false);
  const [charteOK, setCharteOK] = useState(false);
  const [myDocuments, setMyDocuments] = useState([]);
  const [showValidationForm, setShowValidationForm] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelUnlockStatus, setLevelUnlockStatus] = useState({});
  const [paymentConfigs, setPaymentConfigs] = useState({});

  useEffect(() => {
    // Load from localStorage
    const storedId = localStorage.getItem('afroboost_user_id');
    const storedName = localStorage.getItem('afroboost_user_name');
    if (storedId) {
      setStudentId(storedId);
      setStudentName(storedName || '');
      fetchMyDocuments(storedId);
      checkAllLevelsUnlock(storedId);
    }
    
    // Load payment configs
    fetchPaymentConfigs();
  }, []);

  const fetchPaymentConfigs = async () => {
    try {
      const response = await axios.get(`${API}/level-payment-config`);
      const configs = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(config => {
          configs[config.level_id] = config;
        });
      }
      setPaymentConfigs(configs);
    } catch (error) {
      console.error('Error fetching payment configs:', error);
    }
  };

  const checkAllLevelsUnlock = async (uid) => {
    const statuses = {};
    for (let i = 0; i < AVAILABLE_LEVELS.length; i++) {
      const levelId = `level-${i + 1}`;
      try {
        const response = await axios.get(`${API}/level-progress/check-unlock/${uid}/${levelId}`);
        statuses[levelId] = response.data;
      } catch (error) {
        statuses[levelId] = { unlocked: false };
      }
    }
    setLevelUnlockStatus(statuses);
  };

  const saveUserInfo = (id, name) => {
    localStorage.setItem('afroboost_user_id', id);
    localStorage.setItem('afroboost_user_name', name);
  };

  const fetchMyDocuments = async (id) => {
    if (!id) return;
    
    try {
      const response = await axios.get(`${API}/level-documents/student/${id}`);
      setMyDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleStripePayment = async (levelId) => {
    if (!studentId) {
      toast.error('Veuillez entrer votre ID étudiant');
      return;
    }

    try {
      toast.loading('Redirection vers le paiement...');
      
      const response = await axios.post(`${API}/stripe/create-checkout`, {
        user_id: studentId,
        level_id: levelId,
        origin_url: window.location.origin
      });
      
      // Redirect to Stripe Checkout
      if (response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      } else {
        toast.dismiss();
        toast.error('Erreur: URL de paiement non reçue');
      }
    } catch (error) {
      toast.dismiss();
      console.error('Stripe payment error:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de la création du paiement';
      toast.error(errorMsg);
    }
  };

  const handleRequestAccess = async (levelId, requestType, paymentMethod) => {
    if (!studentId) {
      toast.error('Veuillez entrer votre ID étudiant');
      return;
    }

    // If Stripe payment, use real checkout
    if (requestType === 'payment' && paymentMethod === 'stripe') {
      return handleStripePayment(levelId);
    }

    // For volunteer or other payment methods (TWINT, Mobile Money) - create pending transaction
    try {
      let endpoint = `${API}/level-access/request`;
      let payload = {
        user_id: studentId,
        level_id: levelId,
        request_type: requestType
      };

      // For non-Stripe payments, use specific endpoints
      if (requestType === 'payment') {
        if (paymentMethod === 'twint_api' || paymentMethod === 'twint_link') {
          endpoint = `${API}/payrexx/create-payment`;
          payload = {
            user_id: studentId,
            level_id: levelId,
            payment_method: paymentMethod
          };
        } else if (paymentMethod?.startsWith('mobile_money')) {
          endpoint = `${API}/flutterwave/create-payment`;
          payload = {
            user_id: studentId,
            level_id: levelId,
            payment_method: paymentMethod
          };
        }
      }
      
      console.log('Submitting request:', endpoint, payload);
      
      const response = await axios.post(endpoint, payload);
      
      console.log('Response:', response.data);
      
      if (requestType === 'payment') {
        if (response.data.action === 'manual_validation_required') {
          toast.success('Transaction créée! En attente de validation admin.');
        } else {
          toast.success('Demande de paiement soumise');
        }
      } else {
        toast.success('Demande de bénévolat soumise! En attente de validation.');
      }
      
      checkAllLevelsUnlock(studentId);
    } catch (error) {
      console.error('Access request error:', error);
      const errorMsg = error.response?.data?.detail || 'Une erreur est survenue.';
      toast.error(errorMsg);
    }
  };

  const handleValidateLevel = async (level, levelId) => {
    if (!studentId || !studentName) {
      toast.error('Veuillez entrer votre ID et nom');
      return;
    }

    // Check unlock status first
    try {
      const unlockRes = await axios.get(`${API}/level-progress/check-unlock/${studentId}/${levelId}`);
      
      if (!unlockRes.data.unlocked) {
        toast.error('Vous devez compléter la formation avant de valider ce niveau.');
        return;
      }

      // Proceed with validation
      await axios.post(`${API}/level-documents`, {
        student_id: studentId,
        student_name: studentName,
        level_name: level.name,
        skills: level.skills
      });
      toast.success('Niveau validé! Document généré.');
      fetchMyDocuments(studentId);
      checkAllLevelsUnlock(studentId);
      setShowValidationForm(false);
      setSelectedLevel(null);
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  const downloadPDF = async (docId) => {
    try {
      const response = await axios.get(`${API}/level-documents/${docId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `afroboost_level_${docId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Document téléchargé!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const downloadTrainingSummary = async () => {
    try {
      const response = await axios.get(`${API}/training-summary/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'afroboost_training_summary.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Résumé de formation téléchargé!');
    } catch (error) {
      console.error('Error downloading training summary:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const isLevelValidated = (levelName) => {
    return myDocuments.some(doc => doc.level_name === levelName);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      {/* Acceptation obligatoire des conditions avant d'acceder aux niveaux */}
      {studentId && !conditionsOK && (
        <ConditionsGate
          userId={studentId}
          userName={studentName}
          onAccepted={() => setConditionsOK(true)}
        />
      )}
      {/* Puis signature OBLIGATOIRE de la charte d'engagement */}
      {studentId && conditionsOK && !charteOK && (
        <CharteGate
          userId={studentId}
          userName={studentName}
          onSigned={() => setCharteOK(true)}
        />
      )}
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 neon-glow" data-testid="levels-title">
            AFROBOOST
          </h1>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white" data-testid="levels-subtitle">
            Parcours de Formation
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-6">
            Validez vos niveaux et téléchargez vos documents de progression
          </p>
          <Button
            onClick={downloadTrainingSummary}
            variant="outline"
            className="border-purple-500 text-purple-400 hover:bg-purple-500/10"
            data-testid="download-training-summary-button"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger le Résumé de Formation (PDF)
          </Button>
        </div>

        <Card className="card-dark border-neon mb-12" data-testid="student-profile-card">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Mon Profil</CardTitle>
            <CardDescription className="text-gray-400">Accédez à vos documents de formation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="profile_student_id" className="text-gray-300">ID Étudiant</Label>
                <Input
                  id="profile_student_id"
                  data-testid="profile-student-id-input"
                  className="input-dark"
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value);
                    saveUserInfo(e.target.value, studentName);
                    if (e.target.value) {
                      fetchMyDocuments(e.target.value);
                      checkAllLevelsUnlock(e.target.value);
                    }
                  }}
                  placeholder="Votre ID étudiant"
                />
              </div>
              <div>
                <Label htmlFor="profile_student_name" className="text-gray-300">Nom Complet</Label>
                <Input
                  id="profile_student_name"
                  data-testid="profile-student-name-input"
                  className="input-dark"
                  value={studentName}
                  onChange={(e) => {
                    setStudentName(e.target.value);
                    saveUserInfo(studentId, e.target.value);
                  }}
                  placeholder="Votre nom"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2" data-testid="available-levels-title">
            <GraduationCap className="w-6 h-6 text-purple-400" />
            Niveaux Disponibles
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {AVAILABLE_LEVELS.map((level, index) => {
              const validated = isLevelValidated(level.name);
              const levelId = `level-${index + 1}`;
              const unlockStatus = levelUnlockStatus[levelId] || { 
                unlocked: false, 
                access_granted: false,
                payment_status: 'pending',
                volunteer_status: 'pending'
              };
              
              const accessGranted = unlockStatus.access_granted;
              const paymentStatus = unlockStatus.payment_status || 'pending';
              const volunteerStatus = unlockStatus.volunteer_status || 'pending';
              // Gating sequentiel (option c) : quiz du niveau precedent reussi ?
              const prerequisiteMet = unlockStatus.prerequisite_met !== false;
              const prereqNum = unlockStatus.prereq_level ? unlockStatus.prereq_level.replace('level-', '') : '';

              // Get payment config for this level
              const paymentConfig = paymentConfigs[levelId] || {
                payment_mode: 'both',
                price: null,
                enabled_payment_methods: [],
                volunteer_description: ''
              };
              
              const showMoneyOption = paymentConfig.payment_mode === 'money' || paymentConfig.payment_mode === 'both';
              const showVolunteerOption = paymentConfig.payment_mode === 'volunteer' || paymentConfig.payment_mode === 'both';
              
              return (
                <Card 
                  key={index} 
                  className={`card-dark border-neon ${validated ? 'border-green-500' : ''}`}
                  data-testid={`level-card-${index}`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <CardTitle className="text-lg text-white">{level.name}</CardTitle>
                      {validated && <CheckCircle className="w-6 h-6 text-green-500" data-testid={`validated-icon-${index}`} />}
                    </div>
                    <CardDescription className="text-gray-400">
                      {level.skills.length} compétences
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {level.skills.slice(0, 2).map((skill, skillIndex) => (
                        <p key={skillIndex} className="text-sm text-gray-300">• {skill}</p>
                      ))}
                      {level.skills.length > 2 && (
                        <p className="text-sm text-purple-400">+ {level.skills.length - 2} autres...</p>
                      )}
                    </div>
                    
                    {validated ? (
                      <div className="flex items-center justify-center gap-2 p-2 bg-green-500/10 rounded-lg border border-green-500">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <span className="text-green-500 text-sm font-semibold">Niveau validé ✅</span>
                      </div>
                    ) : !accessGranted ? (
                      <div className="space-y-2">
                        {/* Payment validated state */}
                        {!prerequisiteMet ? (
                          <div className="text-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/40" data-testid={`prereq-locked-${index}`}>
                            <p className="text-purple-300 text-sm font-semibold">Réussissez le quiz du Niveau {prereqNum} pour débloquer ce niveau</p>
                          </div>
                        ) : paymentStatus === 'validated' ? (
                          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500">
                            <p className="text-green-500 text-sm font-semibold">Paiement validé ✓</p>
                          </div>
                        ) : volunteerStatus === 'validated' ? (
                          <div className="text-center p-3 bg-green-500/10 rounded-lg border border-green-500">
                            <p className="text-green-500 text-sm font-semibold">Bénévolat validé ✓</p>
                          </div>
                        ) : (paymentStatus !== 'pending') ? (
                          <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500">
                            <p className="text-yellow-500 text-sm font-semibold">Paiement en attente de validation...</p>
                          </div>
                        ) : (volunteerStatus !== 'pending') ? (
                          <div className="text-center p-3 bg-yellow-500/10 rounded-lg border border-yellow-500">
                            <p className="text-yellow-500 text-sm font-semibold">Demande de bénévolat en attente...</p>
                          </div>
                        ) : (paymentConfig.price || paymentConfig.volunteer_description || paymentConfig.enabled_payment_methods?.length > 0 || showMoneyOption || showVolunteerOption) ? (
                          <Link to={`/access-mode/${levelId}`}>
                            <Button
                              className="w-full btn-neon"
                              data-testid={`choose-access-${index}`}
                            >
                              Choisir mon accès
                            </Button>
                          </Link>
                        ) : (
                          /* Level not configured by admin - show nothing actionable */
                          <div className="text-center p-3 bg-gray-700/30 rounded-lg border border-gray-600">
                            <p className="text-gray-400 text-sm">Niveau non disponible actuellement</p>
                          </div>
                        )}
                        <div className="flex items-center justify-center gap-2 text-xs text-red-400">
                          <Lock className="w-3 h-3" />
                          <span>Accès verrouillé</span>
                        </div>
                      </div>
                    ) : unlockStatus.unlocked ? (
                      <Button
                        onClick={() => {
                          setSelectedLevel({ ...level, levelId });
                          setShowValidationForm(true);
                        }}
                        className="w-full btn-neon"
                        data-testid={`validate-level-${index}`}
                      >
                        Valider ce Niveau
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <Link to={`/levels/${levelId}`}>
                          <Button
                            className="w-full btn-neon"
                            data-testid={`start-level-${index}`}
                          >
                            Commencer / Continuer
                          </Button>
                        </Link>
                        <div className="flex items-center justify-center gap-2 text-xs text-yellow-500">
                          <Lock className="w-3 h-3" />
                          <span>Formation en cours</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {showValidationForm && selectedLevel && (
          <Card className="card-dark border-neon border-purple-400 mb-12" data-testid="validation-form-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Validation de Niveau</CardTitle>
              <CardDescription className="text-gray-400">{selectedLevel.name}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-purple-500/10 rounded-lg border border-purple-500">
                <p className="text-white mb-3 font-semibold">Compétences à valider:</p>
                <ul className="space-y-2">
                  {selectedLevel.skills.map((skill, index) => (
                    <li key={index} className="text-gray-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-purple-400 mt-1 flex-shrink-0" />
                      <span>{skill}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="flex gap-4">
                <Button
                  onClick={() => handleValidateLevel(selectedLevel, selectedLevel.levelId)}
                  className="flex-1 btn-neon"
                  data-testid="confirm-validation-button"
                >
                  Confirmer la Validation
                </Button>
                <Button
                  onClick={() => {
                    setShowValidationForm(false);
                    setSelectedLevel(null);
                  }}
                  variant="outline"
                  className="flex-1 border-gray-500 text-gray-300"
                  data-testid="cancel-validation-button"
                >
                  Annuler
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {myDocuments.length > 0 && (
          <Card className="card-dark border-neon" data-testid="my-documents-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white flex items-center gap-2">
                <Award className="w-6 h-6 text-purple-400" />
                Mes Documents de Formation
              </CardTitle>
              <CardDescription className="text-gray-400">
                Documents imprimables et vérifiables
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myDocuments.map((doc) => {
                  const validatedDate = new Date(doc.validated_at);
                  
                  return (
                    <div 
                      key={doc.id} 
                      data-testid={`document-${doc.id}`}
                      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 hover:border-purple-500 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="text-white font-semibold text-lg mb-1">{doc.level_name}</h4>
                          <p className="text-gray-400 text-sm mb-2">
                            Validé le {validatedDate.toLocaleDateString('fr-FR')}
                          </p>
                          <p className="text-purple-400 text-sm font-mono">
                            Document ID: {doc.document_id}
                          </p>
                        </div>
                        <Button
                          onClick={() => downloadPDF(doc.id)}
                          className="btn-neon"
                          data-testid={`download-document-${doc.id}`}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Télécharger & Imprimer
                        </Button>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-400 mb-2">Compétences validées:</p>
                        <div className="grid md:grid-cols-2 gap-2">
                          {doc.skills.map((skill, index) => (
                            <div key={index} className="text-sm text-gray-300 flex items-start gap-2">
                              <CheckCircle className="w-3 h-3 text-green-500 mt-1 flex-shrink-0" />
                              <span>{skill}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-12 space-x-4">
          <Link to="/exam">
            <Button variant="outline" className="border-purple-500 text-purple-400" data-testid="go-to-exam-link">
              Passer l'Examen de Certification
            </Button>
          </Link>
          <Link to="/diplomas">
            <Button variant="outline" className="border-purple-500 text-purple-400" data-testid="go-to-diplomas-link">
              Voir Mes Diplômes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LevelsPage;
