import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PlayCircle, FileText, Video, CheckCircle, Lock, Calendar, Users, ArrowLeft } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LevelTrainingPage = () => {
  const { levelId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('videos');
  const [content, setContent] = useState(null);
  const [progress, setProgress] = useState(null);
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('afroboost_user_id');
    const storedUserName = localStorage.getItem('afroboost_user_name');
    
    if (storedUserId) {
      setUserId(storedUserId);
      setUserName(storedUserName || '');
      fetchData(storedUserId);
    } else {
      setLoading(false);
    }
  }, [levelId]);

  const fetchData = async (uid) => {
    try {
      const [contentRes, progressRes] = await Promise.all([
        axios.get(`${API}/level-content/${levelId}`),
        axios.get(`${API}/level-progress/${uid}/${levelId}`)
      ]);
      
      setContent(contentRes.data);
      setProgress(progressRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoComplete = async (videoId) => {
    try {
      const res = await axios.post(`${API}/level-progress`, {
        user_id: userId,
        level_id: levelId,
        video_id: videoId
      });
      setProgress(res.data);
      toast.success('Vidéo marquée comme terminée!');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleTextConfirm = async () => {
    try {
      const res = await axios.post(`${API}/level-progress`, {
        user_id: userId,
        level_id: levelId,
        text_confirmed: true
      });
      setProgress(res.data);
      toast.success('Contenu texte validé!');
    } catch (error) {
      toast.error('Erreur lors de la validation');
    }
  };

  const handleLiveAttended = async (sessionId) => {
    try {
      const res = await axios.post(`${API}/level-progress`, {
        user_id: userId,
        level_id: levelId,
        live_booked_id: sessionId,
        live_attended: true
      });
      setProgress(res.data);
      toast.success('Session live confirmée!');
    } catch (error) {
      toast.error('Erreur lors de la confirmation');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="card-dark border-neon max-w-md">
          <CardHeader>
            <CardTitle className="text-white">Identification requise</CardTitle>
            <CardDescription className="text-gray-400">
              Veuillez vous identifier pour accéder à la formation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/levels">
              <Button className="btn-neon w-full">Retour aux niveaux</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const videosCompleted = progress?.videos_completed?.length || 0;
  const totalVideos = content?.videos?.length || 0;
  const textConfirmed = progress?.text_confirmed || false;
  const liveRequired = content?.live_required || false;
  const liveAttended = progress?.live_attended || false;

  const videosProgress = totalVideos > 0 ? (videosCompleted / totalVideos) * 100 : 100;
  const textProgress = textConfirmed ? 100 : 0;
  const liveProgress = !liveRequired || liveAttended ? 100 : 0;

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link to="/levels">
            <Button variant="outline" className="border-purple-500 text-purple-400 btn-secondary mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour aux niveaux
            </Button>
          </Link>
          
          <h1 className="text-4xl sm:text-5xl font-bold mb-4 neon-glow" data-testid="training-title">
            {content?.level_name || levelId}
          </h1>
          <p className="text-gray-300">Apprenant: {userName}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <button
            onClick={() => setActiveTab('videos')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'videos'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            data-testid="tab-videos"
          >
            <PlayCircle className="w-5 h-5 inline mr-2" />
            Vidéos ({videosCompleted}/{totalVideos})
          </button>
          
          <button
            onClick={() => setActiveTab('text')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'text'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            data-testid="tab-text"
          >
            <FileText className="w-5 h-5 inline mr-2" />
            Cours écrit {textConfirmed && '✓'}
          </button>
          
          <button
            onClick={() => setActiveTab('live')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'live'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            data-testid="tab-live"
          >
            <Video className="w-5 h-5 inline mr-2" />
            Live {liveRequired && '*'} {liveAttended && '✓'}
          </button>
        </div>

        {/* Progress Overview */}
        <Card className="card-dark border-neon mb-8" data-testid="progress-card">
          <CardHeader>
            <CardTitle className="text-white">Progression globale</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-300">Vidéos</span>
                <span className="text-purple-400">{videosCompleted}/{totalVideos}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="progress-bar h-2" style={{width: `${videosProgress}%`}}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-300">Cours écrit</span>
                <span className={textConfirmed ? 'text-green-500' : 'text-gray-400'}>
                  {textConfirmed ? 'Validé' : 'Non validé'}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="progress-bar h-2" style={{width: `${textProgress}%`}}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-300">
                  Session live {liveRequired && <span className="text-red-400">*Requis</span>}
                </span>
                <span className={liveAttended ? 'text-green-500' : 'text-gray-400'}>
                  {liveAttended ? 'Complété' : liveRequired ? 'Requis' : 'Optionnel'}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="progress-bar h-2" style={{width: `${liveProgress}%`}}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Content */}
        {activeTab === 'videos' && (
          <Card className="card-dark border-neon" data-testid="videos-content">
            <CardHeader>
              <CardTitle className="text-white">Vidéos de formation</CardTitle>
              <CardDescription className="text-gray-400">
                Regardez toutes les vidéos et marquez-les comme terminées
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalVideos === 0 ? (
                <p className="text-gray-400 text-center py-8">Aucune vidéo disponible pour ce niveau</p>
              ) : (
                <div className="space-y-4">
                  {content.videos.map((video, index) => {
                    const isCompleted = progress?.videos_completed?.includes(video.id);
                    
                    return (
                      <div key={video.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-white font-semibold mb-1">{video.title}</h4>
                            {video.duration && (
                              <p className="text-gray-400 text-sm">Durée: {video.duration}</p>
                            )}
                            {video.url && (
                              <a
                                href={video.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-400 text-sm hover:underline mt-2 inline-block"
                              >
                                Ouvrir la vidéo →
                              </a>
                            )}
                          </div>
                          
                          {isCompleted ? (
                            <div className="flex items-center gap-2 text-green-500">
                              <CheckCircle className="w-5 h-5" />
                              <span className="text-sm font-semibold">Terminé</span>
                            </div>
                          ) : (
                            <Button
                              onClick={() => handleVideoComplete(video.id)}
                              className="btn-neon"
                              data-testid={`complete-video-${index}`}
                            >
                              Marquer terminé
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'text' && (
          <Card className="card-dark border-neon" data-testid="text-content">
            <CardHeader>
              <CardTitle className="text-white">Cours écrit</CardTitle>
              <CardDescription className="text-gray-400">
                Lisez attentivement le contenu de formation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!content?.text_content ? (
                <p className="text-gray-400 text-center py-8">Aucun contenu texte disponible</p>
              ) : (
                <>
                  <div className="prose prose-invert max-w-none mb-6 p-4 bg-gray-800/30 rounded-lg max-h-96 overflow-y-auto">
                    <div className="text-gray-300 whitespace-pre-wrap">{content.text_content}</div>
                  </div>
                  
                  {!textConfirmed && (
                    <div className="flex items-center gap-3 p-4 bg-purple-500/10 rounded-lg border border-purple-500">
                      <Checkbox
                        id="text-confirm"
                        onCheckedChange={(checked) => {
                          if (checked) handleTextConfirm();
                        }}
                      />
                      <Label htmlFor="text-confirm" className="text-white cursor-pointer">
                        ✅ J'ai lu et compris ce contenu
                      </Label>
                    </div>
                  )}
                  
                  {textConfirmed && (
                    <div className="flex items-center gap-2 text-green-500 justify-center p-4">
                      <CheckCircle className="w-6 h-6" />
                      <span className="font-semibold">Contenu validé!</span>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'live' && (
          <Card className="card-dark border-neon" data-testid="live-content">
            <CardHeader>
              <CardTitle className="text-white">
                Sessions live {liveRequired && <span className="text-red-400">*Requis</span>}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {liveRequired 
                  ? 'Vous devez participer à une session live pour valider ce niveau'
                  : 'Optionnel : vous pouvez réserver une session live pour accélérer vos progrès'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(!content?.live_sessions || content.live_sessions.length === 0) ? (
                <p className="text-gray-400 text-center py-8">Aucune session live disponible pour le moment</p>
              ) : (
                <div className="space-y-4">
                  {content.live_sessions.map((session) => (
                    <div key={session.id} className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 text-white font-semibold mb-2">
                            <Calendar className="w-4 h-4" />
                            {session.date} à {session.time}
                          </div>
                          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
                            <Users className="w-4 h-4" />
                            {session.available_slots - session.booked_count} places disponibles
                          </div>
                          {session.meeting_link && (
                            <a
                              href={session.meeting_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-purple-400 text-sm hover:underline"
                            >
                              Lien de réunion →
                            </a>
                          )}
                        </div>
                        
                        {progress?.live_booked_id === session.id && liveAttended ? (
                          <div className="flex items-center gap-2 text-green-500">
                            <CheckCircle className="w-5 h-5" />
                            <span className="text-sm font-semibold">Assisté</span>
                          </div>
                        ) : (
                          <Button
                            onClick={() => handleLiveAttended(session.id)}
                            className="btn-neon"
                          >
                            Marquer comme assisté
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LevelTrainingPage;
