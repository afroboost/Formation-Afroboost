import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { 
  Trash2, Calendar, Users, CheckCircle, XCircle, 
  ChevronDown, ChevronUp, Eye, Clock, Award 
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AdminContentManager from '@/AdminContentManager';
import AdminAccessComplete from '@/AdminAccessComplete';
import AdminPaymentConfig from '@/AdminPaymentConfig';
import AdminPaymentHistory from '@/AdminPaymentHistory';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Maximum items to show in quick view
const QUICK_VIEW_LIMIT = 5;

const AdminPanel = () => {
  const navigate = useNavigate();
  const [examDates, setExamDates] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showAllBookings, setShowAllBookings] = useState(false);
  const [newDate, setNewDate] = useState({
    date: '',
    time: '',
    meeting_link: '',
    available_slots: 10
  });

  const fetchExamDates = async () => {
    try {
      const response = await axios.get(`${API}/exam-dates`);
      setExamDates(response.data);
    } catch (error) {
      console.error('Error fetching exam dates:', error);
    }
  };

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/exam-bookings`);
      setBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  useEffect(() => {
    // Check admin session
    const adminSession = localStorage.getItem('afroboost_admin_session');
    if (!adminSession) {
      navigate('/admin-login');
      return;
    }
    
    fetchExamDates();
    fetchBookings();
  }, [navigate]);

  const handleCreateDate = async () => {
    if (!newDate.date || !newDate.time) {
      toast.error('Date et heure sont requis');
      return;
    }

    try {
      await axios.post(`${API}/exam-dates`, newDate);
      toast.success('Date créée avec succès!');
      fetchExamDates();
      setNewDate({ date: '', time: '', meeting_link: '', available_slots: 10 });
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const handleDeleteDate = async (dateId) => {
    try {
      await axios.delete(`${API}/exam-dates/${dateId}`);
      toast.success('Date supprimée!');
      fetchExamDates();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleUpdateResult = async (bookingId, result) => {
    try {
      await axios.put(`${API}/exam-bookings/${bookingId}/result`, { 
        booking_id: bookingId, 
        result 
      });
      toast.success(`Résultat enregistré: ${result}`);
      fetchBookings();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleCreateCertificate = async (studentId, studentName, certType) => {
    try {
      await axios.post(`${API}/certificates`, {
        student_id: studentId,
        student_name: studentName,
        certificate_type: certType
      });
      toast.success('Certificat créé!');
    } catch (error) {
      toast.error('Erreur lors de la création du certificat');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 neon-glow" data-testid="admin-title">
            ADMIN PANEL
          </h1>
          <p className="text-gray-400">Gestion des examens et certifications Afroboost</p>
        </div>

        {/* ==================== */}
        {/* SECTION 1: CRÉATION DATES D'EXAMEN */}
        {/* ==================== */}
        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          <Card className="card-dark border-neon" data-testid="create-exam-date-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Créer une Date d&apos;Examen</CardTitle>
              <CardDescription className="text-gray-400">Ajouter une nouvelle session</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="date" className="text-gray-300">Date</Label>
                <Input
                  id="date"
                  data-testid="admin-date-input"
                  type="date"
                  className="input-dark"
                  value={newDate.date}
                  onChange={(e) => setNewDate({ ...newDate, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="time" className="text-gray-300">Heure</Label>
                <Input
                  id="time"
                  data-testid="admin-time-input"
                  type="time"
                  className="input-dark"
                  value={newDate.time}
                  onChange={(e) => setNewDate({ ...newDate, time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="meeting_link" className="text-gray-300">Lien de Réunion</Label>
                <Input
                  id="meeting_link"
                  data-testid="admin-meeting-link-input"
                  className="input-dark"
                  value={newDate.meeting_link}
                  onChange={(e) => setNewDate({ ...newDate, meeting_link: e.target.value })}
                  placeholder="https://meet.google.com/..."
                />
              </div>
              <div>
                <Label htmlFor="slots" className="text-gray-300">Places Disponibles</Label>
                <Input
                  id="slots"
                  data-testid="admin-slots-input"
                  type="number"
                  className="input-dark"
                  value={newDate.available_slots}
                  onChange={(e) => setNewDate({ ...newDate, available_slots: parseInt(e.target.value) })}
                />
              </div>
              <Button onClick={handleCreateDate} className="w-full btn-neon" data-testid="create-exam-date-button">
                Créer la Date
              </Button>
            </CardContent>
          </Card>

          <Card className="card-dark border-neon" data-testid="exam-dates-list-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Dates Planifiées</CardTitle>
              <CardDescription className="text-gray-400">Gérer les sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {examDates.length === 0 ? (
                  <p className="text-gray-400 text-center py-4" data-testid="no-exam-dates">Aucune date créée</p>
                ) : (
                  examDates.map((date) => (
                    <div
                      key={date.id}
                      data-testid={`admin-exam-date-${date.id}`}
                      className="p-4 bg-gray-800/50 rounded-lg border border-gray-700 flex items-center justify-between"
                    >
                      <div>
                        <p className="text-white font-semibold flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {date.date} à {date.time}
                        </p>
                        <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                          <Users className="w-3 h-3" />
                          {date.booked_slots}/{date.available_slots} réservés
                        </p>
                      </div>
                      <Button
                        onClick={() => handleDeleteDate(date.id)}
                        variant="destructive"
                        size="sm"
                        data-testid={`delete-exam-date-${date.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ==================== */}
        {/* SECTION 2: RÉSERVATIONS & RÉSULTATS (APERÇU RAPIDE) */}
        {/* ==================== */}
        <Card className="card-dark border-neon mb-8" data-testid="bookings-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-400" />
                  Réservations & Résultats
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Aperçu rapide des examens récents
                </CardDescription>
              </div>
              {bookings.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-400">
                    {bookings.filter(b => b.status === 'booked').length} en attente
                  </span>
                  <span className="text-sm text-green-400">
                    {bookings.filter(b => b.result === 'passed').length} réussis
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {bookings.length === 0 ? (
              <p className="text-gray-400 text-center py-6" data-testid="no-bookings">
                Aucune réservation
              </p>
            ) : (
              <>
                {/* Quick view - Limited items */}
                <div className="space-y-3">
                  {(showAllBookings ? bookings : bookings.slice(0, QUICK_VIEW_LIMIT)).map((booking) => (
                    <div
                      key={booking.id}
                      data-testid={`admin-booking-${booking.id}`}
                      className="p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Student info - compact */}
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium truncate">{booking.student_name}</p>
                          <p className="text-gray-400 text-xs">{booking.exam_date} à {booking.exam_time}</p>
                        </div>
                        
                        {/* Status badge */}
                        <div className="flex-shrink-0">
                          {booking.result ? (
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              booking.result === 'passed' 
                                ? 'bg-green-500/20 text-green-400 border border-green-500' 
                                : 'bg-red-500/20 text-red-400 border border-red-500'
                            }`}>
                              {booking.result === 'passed' ? 'Réussi' : 'Échoué'}
                            </span>
                          ) : (
                            <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 border border-yellow-500">
                              En attente
                            </span>
                          )}
                        </div>
                        
                        {/* Actions - only for pending */}
                        {booking.status === 'booked' && !booking.result && (
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              onClick={() => handleUpdateResult(booking.id, 'passed')}
                              className="bg-green-600 hover:bg-green-700 h-8 px-3"
                              size="sm"
                              data-testid={`pass-exam-${booking.id}`}
                            >
                              <CheckCircle className="w-3 h-3 mr-1" />
                              Réussi
                            </Button>
                            <Button
                              onClick={() => handleUpdateResult(booking.id, 'failed')}
                              variant="destructive"
                              size="sm"
                              className="h-8 px-3"
                              data-testid={`fail-exam-${booking.id}`}
                            >
                              <XCircle className="w-3 h-3 mr-1" />
                              Échoué
                            </Button>
                          </div>
                        )}
                        
                        {/* Certificate button for passed */}
                        {booking.result === 'passed' && (
                          <div className="flex gap-1 flex-shrink-0">
                            <Button
                              onClick={() => handleCreateCertificate(booking.student_id, booking.student_name, 'in-person')}
                              size="sm"
                              variant="outline"
                              className="border-purple-500 text-purple-400 h-8 px-2 text-xs"
                              data-testid={`create-inperson-cert-${booking.id}`}
                            >
                              <Award className="w-3 h-3 mr-1" />
                              Cert.
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Show more/less button */}
                {bookings.length > QUICK_VIEW_LIMIT && (
                  <div className="mt-4 text-center">
                    <Button
                      onClick={() => setShowAllBookings(!showAllBookings)}
                      variant="outline"
                      className="border-gray-600 text-gray-400 hover:border-purple-500 hover:text-purple-400"
                      data-testid="toggle-all-bookings"
                    >
                      {showAllBookings ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-2" />
                          Réduire ({QUICK_VIEW_LIMIT} affichés)
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Voir tout ({bookings.length} réservations)
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* ==================== */}
        {/* SECTION 3: GESTION COMPLÈTE DES ACCÈS (CRUD PRINCIPAL) */}
        {/* ==================== */}
        <div className="mb-8">
          <AdminAccessComplete />
        </div>

        {/* ==================== */}
        {/* SECTION 4: HISTORIQUE DES PAIEMENTS */}
        {/* ==================== */}
        <div className="mb-8">
          <AdminPaymentHistory />
        </div>

        {/* ==================== */}
        {/* SECTION 5: CONFIGURATION DES PAIEMENTS */}
        {/* ==================== */}
        <div className="mb-8">
          <AdminPaymentConfig />
        </div>

        {/* ==================== */}
        {/* SECTION 6: CONTENU DE FORMATION */}
        {/* ==================== */}
        <div className="mb-8">
          <AdminContentManager />
        </div>

        <div className="text-center mt-12 space-x-4">
          <Link to="/levels">
            <Button variant="outline" className="border-purple-500 text-purple-400" data-testid="go-to-levels-admin">
              Voir Page Niveaux
            </Button>
          </Link>
          <Link to="/exam">
            <Button variant="outline" className="border-purple-500 text-purple-400" data-testid="back-to-exam-admin">
              Voir Page Étudiants
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
