import { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Trash2, Save } from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LEVELS = [
  { id: 'level-1', name: 'Level 1 – Afroboost DNA' },
  { id: 'level-2', name: 'Level 2 – Rhythm Foundation' },
  { id: 'level-3', name: 'Level 3 – Style & Flow' },
  { id: 'level-4', name: 'Level 4 – Teaching Fundamentals' },
  { id: 'level-5', name: 'Level 5 – Master Instructor' }
];

const AdminContentManager = () => {
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [content, setContent] = useState(null);
  const [videos, setVideos] = useState([]);
  const [textContent, setTextContent] = useState('');
  const [liveRequired, setLiveRequired] = useState(false);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadLevelContent = async (levelId) => {
    try {
      const response = await axios.get(`${API}/level-content/${levelId}`);
      const data = response.data;
      
      setContent(data);
      setVideos(data.videos || []);
      setTextContent(data.text_content || '');
      setLiveRequired(data.live_required || false);
      setLiveSessions(data.live_sessions || []);
    } catch (error) {
      console.error('Error loading content:', error);
    }
  };

  const handleLevelSelect = (level) => {
    setSelectedLevel(level);
    loadLevelContent(level.id);
  };

  const addVideo = () => {
    setVideos([...videos, { id: `video-${Date.now()}`, title: '', url: '', duration: '' }]);
  };

  const updateVideo = (index, field, value) => {
    const updated = [...videos];
    updated[index][field] = value;
    setVideos(updated);
  };

  const removeVideo = (index) => {
    setVideos(videos.filter((_, i) => i !== index));
  };

  const addLiveSession = () => {
    setLiveSessions([...liveSessions, {
      id: `session-${Date.now()}`,
      date: '',
      time: '',
      meeting_link: '',
      available_slots: 10,
      booked_count: 0
    }]);
  };

  const updateLiveSession = (index, field, value) => {
    const updated = [...liveSessions];
    updated[index][field] = value;
    setLiveSessions(updated);
  };

  const removeLiveSession = (index) => {
    setLiveSessions(liveSessions.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedLevel) return;

    setLoading(true);
    try {
      await axios.post(`${API}/level-content`, {
        level_id: selectedLevel.id,
        level_name: selectedLevel.name,
        videos,
        text_content: textContent,
        live_required: liveRequired,
        live_sessions: liveSessions
      });
      toast.success('Contenu sauvegardé!');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card className="card-dark border-neon" data-testid="admin-content-card">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Contenu de Formation</CardTitle>
          <CardDescription className="text-gray-400">
            Gérer les vidéos, textes et sessions live pour chaque niveau
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label className="text-gray-300 mb-2 block">Sélectionner un niveau</Label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {LEVELS.map((level) => (
                <Button
                  key={level.id}
                  onClick={() => handleLevelSelect(level)}
                  variant={selectedLevel?.id === level.id ? 'default' : 'outline'}
                  className={selectedLevel?.id === level.id ? 'btn-neon' : 'border-gray-600 text-gray-300 btn-secondary'}
                  data-testid={`select-${level.id}`}
                >
                  Level {level.id.split('-')[1]}
                </Button>
              ))}
            </div>
          </div>

          {selectedLevel && (
            <div className="space-y-6">
              <h3 className="text-xl text-white font-bold">{selectedLevel.name}</h3>

              {/* Videos Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-300 text-lg">Vidéos</Label>
                  <Button onClick={addVideo} size="sm" className="btn-neon" data-testid="add-video">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter vidéo
                  </Button>
                </div>
                <div className="space-y-3">
                  {videos.map((video, index) => (
                    <div key={video.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="grid md:grid-cols-4 gap-2">
                        <Input
                          placeholder="Titre"
                          value={video.title}
                          onChange={(e) => updateVideo(index, 'title', e.target.value)}
                          className="input-dark"
                        />
                        <Input
                          placeholder="URL"
                          value={video.url}
                          onChange={(e) => updateVideo(index, 'url', e.target.value)}
                          className="input-dark col-span-2"
                        />
                        <div className="flex gap-2">
                          <Input
                            placeholder="Durée"
                            value={video.duration || ''}
                            onChange={(e) => updateVideo(index, 'duration', e.target.value)}
                            className="input-dark"
                          />
                          <Button onClick={() => removeVideo(index)} variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Text Content */}
              <div>
                <Label className="text-gray-300 text-lg mb-2 block">Cours écrit</Label>
                <Textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Contenu du cours en texte..."
                  className="input-dark min-h-[200px]"
                  data-testid="text-content-input"
                />
              </div>

              {/* Live Sessions */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="space-y-2">
                    <Label className="text-gray-300 text-lg">Sessions live</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="live-required"
                        checked={liveRequired}
                        onCheckedChange={setLiveRequired}
                      />
                      <Label htmlFor="live-required" className="text-gray-400 cursor-pointer">
                        Session live requise pour validation
                      </Label>
                    </div>
                  </div>
                  <Button onClick={addLiveSession} size="sm" className="btn-neon" data-testid="add-session">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter session
                  </Button>
                </div>
                <div className="space-y-3">
                  {liveSessions.map((session, index) => (
                    <div key={session.id} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="grid md:grid-cols-5 gap-2">
                        <Input
                          type="date"
                          value={session.date}
                          onChange={(e) => updateLiveSession(index, 'date', e.target.value)}
                          className="input-dark"
                        />
                        <Input
                          type="time"
                          value={session.time}
                          onChange={(e) => updateLiveSession(index, 'time', e.target.value)}
                          className="input-dark"
                        />
                        <Input
                          placeholder="Lien réunion"
                          value={session.meeting_link}
                          onChange={(e) => updateLiveSession(index, 'meeting_link', e.target.value)}
                          className="input-dark col-span-2"
                        />
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            placeholder="Places"
                            value={session.available_slots}
                            onChange={(e) => updateLiveSession(index, 'available_slots', parseInt(e.target.value))}
                            className="input-dark"
                          />
                          <Button onClick={() => removeLiveSession(index)} variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="pt-4">
                <Button
                  onClick={handleSave}
                  disabled={loading}
                  className="btn-neon w-full md:w-auto"
                  data-testid="save-content-button"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Sauvegarde...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Sauvegarder le contenu
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminContentManager;
