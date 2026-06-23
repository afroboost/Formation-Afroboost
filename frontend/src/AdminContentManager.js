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
  const [diagramUrl, setDiagramUrl] = useState('');
  const [images, setImages] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [mapMarkers, setMapMarkers] = useState([]);
  const [muscleMarkers, setMuscleMarkers] = useState([]);
  const [quiz, setQuiz] = useState({ pass_score: 80, questions: [] });
  const [faq, setFaq] = useState([]);
  const [contentModes, setContentModes] = useState({ videos: true, text: true, live: true });
  const [loading, setLoading] = useState(false);

  const loadLevelContent = async (levelId) => {
    try {
      const response = await axios.get(`${API}/admin/level-content/${levelId}`);
      const data = response.data;

      setContent(data);
      setVideos(data.videos || []);
      setTextContent(data.text_content || '');
      setLiveRequired(data.live_required || false);
      setLiveSessions(data.live_sessions || []);
      setDiagramUrl(data.diagram_url || '');
      setImages(data.images || []);
      setYoutubeUrl(data.youtube_url || '');
      setMapMarkers(data.map_markers || []);
      setMuscleMarkers(data.muscle_markers || []);
      setQuiz(data.quiz && data.quiz.questions ? data.quiz : { pass_score: 80, questions: [] });
      setFaq(data.faq || []);
      const cm = data.content_modes && Object.keys(data.content_modes).length ? data.content_modes : { videos: true, text: true, live: true };
      setContentModes({ videos: cm.videos !== false, text: cm.text !== false, live: cm.live !== false });
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

  const addImage = () => setImages([...images, { url: '', caption: '', credit: '' }]);
  const updateImage = (index, field, value) => {
    const updated = [...images];
    updated[index][field] = value;
    setImages(updated);
  };
  const removeImage = (index) => setImages(images.filter((_, i) => i !== index));

  // Map markers helpers
  const addMarker = () => setMapMarkers([...mapMarkers, { country: '', x: 50, y: 50, style_name: '', youtube_url: '', history: '' }]);
  const updateMarker = (index, field, value) => {
    const updated = [...mapMarkers];
    updated[index] = { ...updated[index], [field]: value };
    setMapMarkers(updated);
  };
  const removeMarker = (index) => setMapMarkers(mapMarkers.filter((_, i) => i !== index));

  // Muscle markers helpers (Niveau 2 anatomie)
  const addMuscle = () => setMuscleMarkers([...muscleMarkers, { id: `mu-${Date.now()}`, name: '', description: '', youtube_url: '', x: 50, y: 50, view: 'anterior' }]);
  const updateMuscle = (index, field, value) => {
    const updated = [...muscleMarkers];
    updated[index] = { ...updated[index], [field]: value };
    setMuscleMarkers(updated);
  };
  const removeMuscle = (index) => setMuscleMarkers(muscleMarkers.filter((_, i) => i !== index));

  // Quiz helpers (immutable)
  const updateQuizField = (field, value) => {
    setQuiz({ ...quiz, [field]: value });
  };
  const addQuestion = () => {
    setQuiz({ ...quiz, questions: [...(quiz.questions || []), { q: '', options: ['', ''], correct_index: 0 }] });
  };
  const updateQuestion = (qIndex, value) => {
    const questions = (quiz.questions || []).map((question, i) =>
      i === qIndex ? { ...question, q: value } : question
    );
    setQuiz({ ...quiz, questions });
  };
  const removeQuestion = (qIndex) => {
    setQuiz({ ...quiz, questions: (quiz.questions || []).filter((_, i) => i !== qIndex) });
  };
  const addOption = (qIndex) => {
    const questions = (quiz.questions || []).map((question, i) =>
      i === qIndex ? { ...question, options: [...(question.options || []), ''] } : question
    );
    setQuiz({ ...quiz, questions });
  };
  const updateOption = (qIndex, oIndex, value) => {
    const questions = (quiz.questions || []).map((question, i) => {
      if (i !== qIndex) return question;
      const options = (question.options || []).map((opt, j) => (j === oIndex ? value : opt));
      return { ...question, options };
    });
    setQuiz({ ...quiz, questions });
  };
  const removeOption = (qIndex, oIndex) => {
    const questions = (quiz.questions || []).map((question, i) => {
      if (i !== qIndex) return question;
      const options = (question.options || []).filter((_, j) => j !== oIndex);
      // Keep correct_index valid after removal
      let correct = typeof question.correct_index === 'number' ? question.correct_index : 0;
      if (oIndex < correct) {
        correct = correct - 1;
      } else if (oIndex === correct) {
        correct = 0;
      }
      if (correct > options.length - 1) correct = options.length > 0 ? options.length - 1 : 0;
      if (correct < 0) correct = 0;
      return { ...question, options, correct_index: correct };
    });
    setQuiz({ ...quiz, questions });
  };
  const setCorrect = (qIndex, oIndex) => {
    const questions = (quiz.questions || []).map((question, i) =>
      i === qIndex ? { ...question, correct_index: oIndex } : question
    );
    setQuiz({ ...quiz, questions });
  };
  const setScenario = (qIndex, checked) => {
    setQuiz({
      ...quiz,
      questions: (quiz.questions || []).map((qq, i) =>
        i === qIndex ? { ...qq, scenario: !!checked } : qq
      )
    });
  };

  // FAQ helpers (immutable)
  const addFaq = () => setFaq([...faq, { id: `faq-${Date.now()}`, q: '', a: '' }]);
  const updateFaq = (index, field, value) => {
    const updated = [...faq];
    updated[index] = { ...updated[index], [field]: value };
    setFaq(updated);
  };
  const removeFaq = (index) => setFaq(faq.filter((_, i) => i !== index));

  // Content modes helper (immutable)
  const setMode = (key, checked) => setContentModes((m) => ({ ...m, [key]: !!checked }));

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
        live_sessions: liveSessions,
        diagram_url: diagramUrl,
        images,
        youtube_url: youtubeUrl,
        map_markers: mapMarkers,
        muscle_markers: muscleMarkers,
        quiz,
        faq,
        content_modes: contentModes
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

              {/* Modes de contenu visibles par le participant */}
              <div>
                <Label className="text-gray-300 text-lg mb-2 block">
                  Modes de contenu visibles par le participant
                </Label>
                <Label className="text-gray-400 text-sm mb-3 block">
                  Les onglets décochés sont MASQUÉS pour le participant (pas seulement grisés).
                </Label>
                <div className="flex flex-wrap gap-6">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mode-videos"
                      checked={contentModes.videos}
                      onCheckedChange={(c) => setMode('videos', c)}
                    />
                    <Label htmlFor="mode-videos" className="text-gray-300 cursor-pointer">
                      Vidéos
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mode-text"
                      checked={contentModes.text}
                      onCheckedChange={(c) => setMode('text', c)}
                    />
                    <Label htmlFor="mode-text" className="text-gray-300 cursor-pointer">
                      Cours écrit
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="mode-live"
                      checked={contentModes.live}
                      onCheckedChange={(c) => setMode('live', c)}
                    />
                    <Label htmlFor="mode-live" className="text-gray-300 cursor-pointer">
                      Live
                    </Label>
                  </div>
                </div>
              </div>

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

              {/* Questions des participants (FAQ) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-gray-300 text-lg">Questions des participants (FAQ)</Label>
                  <Button onClick={addFaq} size="sm" className="btn-neon" data-testid="add-faq">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une question
                  </Button>
                </div>
                <div className="space-y-3">
                  {faq.map((item, index) => (
                    <div key={item.id || index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <Input
                        placeholder="Question du participant"
                        value={item.q || ''}
                        onChange={(e) => updateFaq(index, 'q', e.target.value)}
                        className="input-dark mb-2"
                      />
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Réponse (ton simple, bienveillant ; orienter vers un professionnel pour la santé)"
                          value={item.a || ''}
                          onChange={(e) => updateFaq(index, 'a', e.target.value)}
                          className="input-dark flex-1"
                        />
                        <Button onClick={() => removeFaq(index)} variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visuels (remplaçables) */}
              <div>
                <Label className="text-gray-300 text-lg mb-2 block">Visuels</Label>
                <div className="mb-4">
                  <Label className="text-gray-400 text-sm mb-1 block">
                    Image / diagramme (URL) — remplace le visuel intégré (carte, anatomie). Laisser vide pour garder le visuel d'origine.
                  </Label>
                  <Input
                    placeholder="https://…"
                    value={diagramUrl}
                    onChange={(e) => setDiagramUrl(e.target.value)}
                    className="input-dark"
                  />
                </div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-400 text-sm">Galerie d'images</Label>
                  <Button onClick={addImage} size="sm" className="btn-neon">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter image
                  </Button>
                </div>
                <div className="space-y-3">
                  {images.map((img, index) => (
                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="grid md:grid-cols-3 gap-2">
                        <Input placeholder="URL image" value={img.url || ''}
                          onChange={(e) => updateImage(index, 'url', e.target.value)} className="input-dark" />
                        <Input placeholder="Légende (nom du style…)" value={img.caption || ''}
                          onChange={(e) => updateImage(index, 'caption', e.target.value)} className="input-dark" />
                        <div className="flex gap-2">
                          <Input placeholder="Crédit / licence" value={img.credit || ''}
                            onChange={(e) => updateImage(index, 'credit', e.target.value)} className="input-dark" />
                          <Button onClick={() => removeImage(index)} variant="destructive" size="sm">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vidéo principale (YouTube) */}
              <div>
                <Label className="text-gray-300 text-lg mb-2 block">Vidéo principale (YouTube)</Label>
                <Input
                  placeholder="https://www.youtube.com/watch?v=…"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="input-dark"
                  data-testid="youtube-url-input"
                />
                <Label className="text-gray-400 text-sm mt-1 block">
                  L'admin peut basculer image ↔ vidéo en remplissant ou vidant ce champ.
                </Label>
              </div>

              {/* Carte interactive (styles & pays) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-300 text-lg">Carte interactive (styles &amp; pays)</Label>
                  <Button onClick={addMarker} size="sm" className="btn-neon" data-testid="add-marker">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un pays/style
                  </Button>
                </div>
                <Label className="text-gray-400 text-sm mb-3 block">
                  Surtout pour le Niveau 1.
                </Label>
                <div className="space-y-3">
                  {mapMarkers.map((marker, index) => (
                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="grid md:grid-cols-2 gap-2 mb-2">
                        <Input
                          placeholder="Pays"
                          value={marker.country || ''}
                          onChange={(e) => updateMarker(index, 'country', e.target.value)}
                          className="input-dark"
                        />
                        <Input
                          placeholder="Nom du style"
                          value={marker.style_name || ''}
                          onChange={(e) => updateMarker(index, 'style_name', e.target.value)}
                          className="input-dark"
                        />
                      </div>
                      <div className="grid md:grid-cols-3 gap-2 mb-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Position X %"
                          value={marker.x}
                          onChange={(e) => updateMarker(index, 'x', parseFloat(e.target.value))}
                          className="input-dark"
                        />
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          placeholder="Position Y %"
                          value={marker.y}
                          onChange={(e) => updateMarker(index, 'y', parseFloat(e.target.value))}
                          className="input-dark"
                        />
                        <Input
                          placeholder="Lien vidéo YouTube"
                          value={marker.youtube_url || ''}
                          onChange={(e) => updateMarker(index, 'youtube_url', e.target.value)}
                          className="input-dark"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Textarea
                          placeholder="Histoire courte"
                          value={marker.history || ''}
                          onChange={(e) => updateMarker(index, 'history', e.target.value)}
                          className="input-dark flex-1"
                        />
                        <Button onClick={() => removeMarker(index)} variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Muscles (Niveau 2 anatomie interactive) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-300 text-lg">Muscles (anatomie interactive)</Label>
                  <Button onClick={addMuscle} size="sm" className="btn-neon" data-testid="add-muscle">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter un muscle
                  </Button>
                </div>
                <Label className="text-gray-400 text-sm mb-3 block">
                  Surtout pour le Niveau 2. La position X/Y est en % de l'illustration de la vue choisie.
                </Label>
                <div className="space-y-3">
                  {muscleMarkers.map((m, index) => (
                    <div key={index} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="grid md:grid-cols-2 gap-2 mb-2">
                        <Input placeholder="Nom du muscle" value={m.name || ''}
                          onChange={(e) => updateMuscle(index, 'name', e.target.value)} className="input-dark" />
                        <select value={m.view || 'anterior'}
                          onChange={(e) => updateMuscle(index, 'view', e.target.value)}
                          className="input-dark rounded-md px-3 py-2">
                          <option value="anterior">Vue antérieure (avant)</option>
                          <option value="posterior">Vue postérieure (arrière)</option>
                        </select>
                      </div>
                      <Textarea placeholder="Description (rôle au quotidien + exemples)" value={m.description || ''}
                        onChange={(e) => updateMuscle(index, 'description', e.target.value)} className="input-dark mb-2" />
                      <div className="grid md:grid-cols-3 gap-2 mb-2">
                        <Input type="number" min="0" max="100" placeholder="Position X %" value={m.x}
                          onChange={(e) => updateMuscle(index, 'x', parseFloat(e.target.value))} className="input-dark" />
                        <Input type="number" min="0" max="100" placeholder="Position Y %" value={m.y}
                          onChange={(e) => updateMuscle(index, 'y', parseFloat(e.target.value))} className="input-dark" />
                        <Input placeholder="Lien vidéo YouTube" value={m.youtube_url || ''}
                          onChange={(e) => updateMuscle(index, 'youtube_url', e.target.value)} className="input-dark" />
                      </div>
                      <div className="flex justify-end">
                        <Button onClick={() => removeMuscle(index)} variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quiz du niveau (test de validation) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-300 text-lg">Quiz du niveau (test de validation)</Label>
                  <Button onClick={addQuestion} size="sm" className="btn-neon" data-testid="add-question">
                    <Plus className="w-4 h-4 mr-1" />
                    Ajouter une question
                  </Button>
                </div>
                <div className="mb-4 max-w-xs">
                  <Label className="text-gray-400 text-sm mb-1 block">Score minimum (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="80"
                    value={quiz.pass_score}
                    onChange={(e) => updateQuizField('pass_score', parseInt(e.target.value))}
                    className="input-dark"
                    data-testid="quiz-pass-score"
                  />
                </div>
                <div className="space-y-3">
                  {(quiz.questions || []).map((question, qIndex) => (
                    <div key={qIndex} className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                      <div className="flex gap-2 mb-3">
                        <Textarea
                          placeholder={`Question ${qIndex + 1}`}
                          value={question.q || ''}
                          onChange={(e) => updateQuestion(qIndex, e.target.value)}
                          className="input-dark flex-1"
                        />
                        <Button onClick={() => removeQuestion(qIndex)} variant="destructive" size="sm">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mb-3">
                        <Checkbox
                          id={`scenario-${qIndex}`}
                          checked={!!question.scenario}
                          onCheckedChange={(c) => setScenario(qIndex, c)}
                        />
                        <Label htmlFor={`scenario-${qIndex}`} className="text-gray-400 text-sm cursor-pointer">
                          Mise en situation
                        </Label>
                      </div>
                      <Label className="text-gray-400 text-sm mb-2 block">
                        Réponses (cocher la bonne)
                      </Label>
                      <div className="space-y-2">
                        {(question.options || []).map((option, oIndex) => (
                          <div key={oIndex} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIndex}`}
                              checked={question.correct_index === oIndex}
                              onChange={() => setCorrect(qIndex, oIndex)}
                              className="accent-purple-500"
                              aria-label={`Marquer l'option ${oIndex + 1} comme correcte`}
                            />
                            <Input
                              placeholder={`Option ${oIndex + 1}`}
                              value={option}
                              onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                              className="input-dark flex-1"
                            />
                            <Button onClick={() => removeOption(qIndex, oIndex)} variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <Button onClick={() => addOption(qIndex)} size="sm" className="btn-neon mt-2">
                        <Plus className="w-4 h-4 mr-1" />
                        Ajouter une option
                      </Button>
                    </div>
                  ))}
                </div>
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
