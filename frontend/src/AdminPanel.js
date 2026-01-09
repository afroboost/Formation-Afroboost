import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Trash2, Calendar, Users, CheckCircle, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import AdminContentManager from '@/AdminContentManager';
import AdminAccessComplete from '@/AdminAccessComplete';
import AdminPaymentConfig from '@/AdminPaymentConfig';
import AdminPaymentHistory from '@/AdminPaymentHistory';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdminPanel = () => {
  const navigate = useNavigate();
  const [examDates, setExamDates] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [newDate, setNewDate] = useState({
    date: '',
    time: '',
    meeting_link: '',
    available_slots: 10
  });

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

  const handleCreateDate = async () => {
    if (!newDate.date || !newDate.time) {
      toast.error('Date et heure sont requis');
      return;
    }

    try {
      await axios.post(`${API}/exam-dates`, newDate);
      toast.success('Date d\'examen créée!');
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
          <p className="text-gray-400">Gestion des examens et certifications</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <Card className="card-dark border-neon" data-testid="create-exam-date-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Créer une Date d'Examen</CardTitle>
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

        <Card className="card-dark border-neon" data-testid="bookings-card">
          <CardHeader>
            <CardTitle className="text-2xl text-white">Réservations & Résultats</CardTitle>
            <CardDescription className="text-gray-400">Valider les examens</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bookings.length === 0 ? (
                <p className="text-gray-400 text-center py-8" data-testid="no-bookings">Aucune réservation</p>
              ) : (
                bookings.map((booking) => (
                  <div
                    key={booking.id}
                    data-testid={`admin-booking-${booking.id}`}
                    className="p-4 bg-gray-800/50 rounded-lg border border-gray-700"
                  >
                    <div className="grid md:grid-cols-3 gap-4 items-center">
                      <div>
                        <p className="text-white font-semibold">{booking.student_name}</p>
                        <p className="text-gray-400 text-sm">{booking.student_email}</p>
                        <p className="text-gray-400 text-sm">{booking.exam_date} à {booking.exam_time}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-gray-400">Statut</p>
                        <p className={`font-semibold ${
                          booking.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                        }`}>
                          {booking.status}
                        </p>
                        {booking.result && (
                          <p className={`text-sm ${
                            booking.result === 'passed' ? 'text-green-400' : 'text-red-400'
                          }`}>
                            Résultat: {booking.result}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 justify-end">
                        {booking.status === 'booked' && (
                          <>
                            <Button
                              onClick={() => handleUpdateResult(booking.id, 'passed')}
                              className="bg-green-600 hover:bg-green-700"
                              size="sm"
                              data-testid={`pass-exam-${booking.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Réussi
                            </Button>
                            <Button
                              onClick={() => handleUpdateResult(booking.id, 'failed')}
                              variant="destructive"
                              size="sm"
                              data-testid={`fail-exam-${booking.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Échoué
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {booking.result === 'passed' && (
                      <div className="mt-4 pt-4 border-t border-gray-700">
                        <p className="text-sm text-gray-400 mb-2">Créer un certificat additionnel:</p>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleCreateCertificate(booking.student_id, booking.student_name, 'in-person')}
                            size="sm"
                            variant="outline"
                            className="border-purple-500 text-purple-400"
                            data-testid={`create-inperson-cert-${booking.id}`}
                          >
                            Présentiel
                          </Button>
                          <Button
                            onClick={() => handleCreateCertificate(booking.student_id, booking.student_name, 'hybrid')}
                            size="sm"
                            variant="outline"
                            className="border-purple-500 text-purple-400"
                            data-testid={`create-hybrid-cert-${booking.id}`}
                          >
                            Hybride
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <AdminPaymentConfig />

        <AdminAccessManager />

        <AdminContentManager />

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
