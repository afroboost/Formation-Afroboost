import { useState, useEffect } from 'react';
import '@/App.css';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Calendar, Download, CheckCircle, XCircle, Video, Clock, Users } from 'lucide-react';
import AdminPanel from '@/AdminPanel';
import LevelsPage from '@/LevelsPage';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ExamPage = () => {
  const [examDates, setExamDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [studentInfo, setStudentInfo] = useState({
    student_id: '',
    student_name: '',
    student_email: ''
  });
  const [myBookings, setMyBookings] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExamDates();
  }, []);

  const fetchExamDates = async () => {
    try {
      const response = await axios.get(`${API}/exam-dates`);
      setExamDates(response.data);
    } catch (error) {
      console.error('Error fetching exam dates:', error);
    }
  };

  const fetchMyBookings = async (studentId) => {
    try {
      const response = await axios.get(`${API}/exam-bookings/student/${studentId}`);
      setMyBookings(response.data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const handleBookExam = async () => {
    if (!selectedDate || !studentInfo.student_id || !studentInfo.student_name || !studentInfo.student_email) {
      toast.error('Veuillez remplir tous les champs et sélectionner une date');
      return;
    }

    try {
      await axios.post(`${API}/exam-bookings`, {
        ...studentInfo,
        exam_date_id: selectedDate.id
      });
      toast.success('Examen réservé avec succès!');
      fetchExamDates();
      fetchMyBookings(studentInfo.student_id);
      setSelectedDate(null);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erreur lors de la réservation');
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 neon-glow" data-testid="exam-title">
            AFROBOOST
          </h1>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white" data-testid="exam-subtitle">
            Examen de Certification
          </h2>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto" data-testid="exam-description">
            Vous êtes sur le point de passer votre examen en ligne en direct.
            Cet examen valide votre technique, votre pédagogie et votre énergie.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          <Card className="card-dark border-neon" data-testid="student-info-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Vos Informations</CardTitle>
              <CardDescription className="text-gray-400">Remplissez vos coordonnées</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="student_id" className="text-gray-300">ID Étudiant</Label>
                <Input
                  id="student_id"
                  data-testid="student-id-input"
                  className="input-dark"
                  value={studentInfo.student_id}
                  onChange={(e) => {
                    setStudentInfo({ ...studentInfo, student_id: e.target.value });
                    if (e.target.value) fetchMyBookings(e.target.value);
                  }}
                  placeholder="Entrez votre ID étudiant"
                />
              </div>
              <div>
                <Label htmlFor="student_name" className="text-gray-300">Nom Complet</Label>
                <Input
                  id="student_name"
                  data-testid="student-name-input"
                  className="input-dark"
                  value={studentInfo.student_name}
                  onChange={(e) => setStudentInfo({ ...studentInfo, student_name: e.target.value })}
                  placeholder="Votre nom"
                />
              </div>
              <div>
                <Label htmlFor="student_email" className="text-gray-300">Email</Label>
                <Input
                  id="student_email"
                  data-testid="student-email-input"
                  type="email"
                  className="input-dark"
                  value={studentInfo.student_email}
                  onChange={(e) => setStudentInfo({ ...studentInfo, student_email: e.target.value })}
                  placeholder="votre@email.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="card-dark border-neon" data-testid="available-dates-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Dates Disponibles</CardTitle>
              <CardDescription className="text-gray-400">Sélectionnez une date d'examen</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {examDates.length === 0 ? (
                  <p className="text-gray-400 text-center py-8" data-testid="no-dates-message">Aucune date disponible pour le moment</p>
                ) : (
                  examDates.map((date) => (
                    <div
                      key={date.id}
                      data-testid={`exam-date-${date.id}`}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        selectedDate?.id === date.id
                          ? 'border-purple-500 bg-purple-500/10'
                          : 'border-gray-700 hover:border-purple-400 bg-gray-800/50'
                      }`}
                      onClick={() => setSelectedDate(date)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            {date.date}
                          </p>
                          <p className="text-gray-400 text-sm flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3" />
                            {date.time}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-purple-400 text-sm flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {date.available_slots - date.booked_slots} places
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mb-12">
          <Button
            data-testid="book-exam-button"
            onClick={handleBookExam}
            className="btn-neon text-lg px-8 py-6"
            disabled={!selectedDate}
          >
            Réserver ma Date d'Examen
          </Button>
        </div>

        {myBookings.length > 0 && (
          <Card className="card-dark border-neon" data-testid="my-bookings-card">
            <CardHeader>
              <CardTitle className="text-2xl text-white">Mes Réservations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myBookings.map((booking) => (
                  <div key={booking.id} data-testid={`booking-${booking.id}`} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white font-semibold">{booking.exam_date} à {booking.exam_time}</p>
                        <p className="text-gray-400 text-sm">Statut: {booking.status}</p>
                        {booking.meeting_link && (
                          <a
                            href={booking.meeting_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-purple-400 text-sm flex items-center gap-1 mt-2 hover:underline"
                            data-testid={`meeting-link-${booking.id}`}
                          >
                            <Video className="w-4 h-4" />
                            Rejoindre l'examen
                          </a>
                        )}
                      </div>
                      {booking.result && (
                        <Button
                          onClick={() => navigate(`/results/${booking.id}`)}
                          variant="outline"
                          className="border-purple-500 text-purple-400"
                          data-testid={`view-result-${booking.id}`}
                        >
                          Voir Résultat
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-12">
          <Link to="/diplomas">
            <Button variant="outline" className="border-purple-500 text-purple-400" data-testid="view-diplomas-link">
              Voir Mes Diplômes
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

const ResultsPage = () => {
  const [booking, setBooking] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const bookingId = window.location.pathname.split('/').pop();
    fetchBooking(bookingId);
  }, []);

  const fetchBooking = async (bookingId) => {
    try {
      const response = await axios.get(`${API}/exam-bookings`);
      const found = response.data.find(b => b.id === bookingId);
      setBooking(found);
    } catch (error) {
      console.error('Error fetching booking:', error);
    }
  };

  if (!booking) {
    return <div className="min-h-screen flex items-center justify-center">
      <p className="text-white">Chargement...</p>
    </div>;
  }

  const isPassed = booking.result === 'passed';

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="card-dark border-neon max-w-2xl w-full" data-testid="result-card">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-6">
            {isPassed ? (
              <CheckCircle className="w-24 h-24 text-green-500" data-testid="success-icon" />
            ) : (
              <XCircle className="w-24 h-24 text-red-500" data-testid="fail-icon" />
            )}
          </div>
          <CardTitle className="text-4xl text-white mb-4" data-testid="result-title">
            {isPassed ? 'Félicitations!' : 'Presque là.'}
          </CardTitle>
          <CardDescription className="text-xl text-gray-300" data-testid="result-message">
            {isPassed
              ? 'Vous êtes maintenant un Instructeur Certifié Afroboost.'
              : 'Continuez à vous entraîner et réservez un nouvel examen.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {isPassed ? (
            <Button
              onClick={() => navigate('/diplomas')}
              className="btn-neon"
              data-testid="view-certificate-button"
            >
              Voir Mon Certificat
            </Button>
          ) : (
            <Button
              onClick={() => navigate('/exam')}
              className="btn-neon"
              data-testid="book-new-exam-button"
            >
              Réserver un Nouvel Examen
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const DiplomasPage = () => {
  const [certificates, setCertificates] = useState([]);
  const [studentId, setStudentId] = useState('');

  const fetchCertificates = async () => {
    if (!studentId) {
      toast.error('Veuillez entrer votre ID étudiant');
      return;
    }

    try {
      const response = await axios.get(`${API}/certificates/student/${studentId}`);
      setCertificates(response.data);
      if (response.data.length === 0) {
        toast.info('Aucun certificat trouvé');
      }
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Erreur lors de la récupération des certificats');
    }
  };

  const downloadPDF = async (certId) => {
    try {
      const response = await axios.get(`${API}/certificates/${certId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `afroboost_certificate_${certId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Certificat téléchargé!');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement');
    }
  };

  const certificateInfo = {
    online: {
      title: 'CERTIFICAT EN LIGNE',
      description: 'Autorisé à enseigner Afroboost en ligne.',
      icon: '🌐'
    },
    'in-person': {
      title: 'CERTIFICAT EN PRÉSENTIEL',
      description: 'Autorisé à enseigner Afroboost en présentiel.',
      icon: '🏢'
    },
    hybrid: {
      title: 'CERTIFICAT HYBRIDE',
      description: 'Autorisé à enseigner Afroboost en ligne et en présentiel.',
      icon: '🌟'
    }
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-5xl sm:text-6xl font-bold mb-6 neon-glow" data-testid="diplomas-title">
            AFROBOOST
          </h1>
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 text-white" data-testid="diplomas-subtitle">
            Mes Diplômes
          </h2>
        </div>

        <Card className="card-dark border-neon mb-12" data-testid="search-card">
          <CardContent className="pt-6">
            <div className="flex gap-4">
              <Input
                data-testid="student-id-search-input"
                placeholder="Entrez votre ID étudiant"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="input-dark"
              />
              <Button onClick={fetchCertificates} className="btn-neon" data-testid="search-certificates-button">
                Rechercher
              </Button>
            </div>
          </CardContent>
        </Card>

        {certificates.length > 0 && (
          <div className="grid md:grid-cols-3 gap-8">
            {certificates.map((cert) => {
              const info = certificateInfo[cert.certificate_type] || certificateInfo.online;
              const issuedDate = new Date(cert.issued_at);
              
              return (
                <Card key={cert.id} className="card-dark border-neon hover:border-purple-400 transition-all" data-testid={`certificate-${cert.id}`}>
                  <CardHeader>
                    <div className="text-5xl text-center mb-4">{info.icon}</div>
                    <CardTitle className="text-xl text-white text-center">{info.title}</CardTitle>
                    <CardDescription className="text-gray-400 text-center">{info.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-300"><span className="text-purple-400 font-semibold">Instructeur:</span> {cert.student_name}</p>
                      <p className="text-gray-300"><span className="text-purple-400 font-semibold">ID:</span> {cert.certificate_id}</p>
                      <p className="text-gray-300"><span className="text-purple-400 font-semibold">Date:</span> {issuedDate.toLocaleDateString('fr-FR')}</p>
                    </div>
                    <Button
                      onClick={() => downloadPDF(cert.id)}
                      className="w-full btn-neon"
                      data-testid={`download-pdf-${cert.id}`}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Télécharger PDF
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center mt-12">
          <Link to="/exam">
            <Button variant="outline" className="border-purple-500 text-purple-400" data-testid="back-to-exam-link">
              Retour aux Examens
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<ExamPage />} />
          <Route path="/exam" element={<ExamPage />} />
          <Route path="/results/:bookingId" element={<ResultsPage />} />
          <Route path="/diplomas" element={<DiplomasPage />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </div>
  );
}

export default App;
