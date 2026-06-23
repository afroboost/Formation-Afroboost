import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  ClipboardCheck,
  Lock,
  Loader2,
  RefreshCw,
  Unlock,
  ArrowRight,
  Trophy,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * LevelQuiz
 *
 * Server-side scored validation quiz for a formation level, shown ONE
 * QUESTION AT A TIME. Questions never include correct answers (the backend
 * reveals the correct option index per question via `/quiz/check`).
 *
 * Props:
 *  - levelId   : string  (e.g. "level-1")
 *  - quiz      : { pass_score: number, questions: [{ id, q, options: string[], scenario? }] }
 *  - userId    : string  (afroboost_user_id)
 *  - onPassed  : () => void  (optional, called when the quiz is passed)
 *
 * State machine (per quiz run):
 *  - currentIndex : 0-based index of the question on screen
 *  - selected     : option index chosen for the current question (or null)
 *  - revealed     : { correct, correct_index } for the current question after
 *                   "Valider", or null while still answering
 *  - answers      : accumulated chosen option index per question, in order
 *
 * Per-question flow:
 *   pick option (selected) -> "Valider" -> POST /quiz/check -> revealed
 *   -> "Suivant" / "Voir le résultat" -> advance, reset selected & revealed
 *   On the last question, advancing instead POSTs /quiz/submit and shows the
 *   final result screen.
 */
const LevelQuiz = ({ levelId, quiz, userId, onPassed }) => {
  const questions = quiz?.questions || [];
  const passScore = quiz?.pass_score ?? 0;
  const hasQuiz = questions.length > 0;
  const total = questions.length;

  // --- one-question-at-a-time run state ---
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selected, setSelected] = useState(null); // option index for current question
  const [revealed, setRevealed] = useState(null); // { correct, correct_index } | null
  const [answers, setAnswers] = useState([]); // chosen option index per question, in order

  const [checking, setChecking] = useState(false); // POST /quiz/check in flight
  const [submitting, setSubmitting] = useState(false); // POST /quiz/submit in flight

  // --- prior result / final result state ---
  const [loadingPrior, setLoadingPrior] = useState(true);
  const [priorResult, setPriorResult] = useState(null); // { attempted, passed, best_percent }
  const [result, setResult] = useState(null); // final submit response
  const [showQuizAfterPass, setShowQuizAfterPass] = useState(false);

  // Fetch prior result on mount / when identity or level changes
  const fetchPriorResult = useCallback(async () => {
    if (!hasQuiz || !userId) {
      setLoadingPrior(false);
      return;
    }
    setLoadingPrior(true);
    try {
      const res = await axios.get(`${API}/quiz/result/${userId}/${levelId}`);
      setPriorResult(res.data);
    } catch (error) {
      // No prior result is a normal state, not an error to surface
      setPriorResult(null);
    } finally {
      setLoadingPrior(false);
    }
  }, [hasQuiz, userId, levelId]);

  useEffect(() => {
    fetchPriorResult();
  }, [fetchPriorResult]);

  // Reset the whole run back to question 1
  const resetRun = useCallback(() => {
    setCurrentIndex(0);
    setSelected(null);
    setRevealed(null);
    setAnswers([]);
    setResult(null);
  }, []);

  const question = questions[currentIndex];
  const isLast = currentIndex === total - 1;
  // Progress = fully answered questions; current counts once revealed
  const progress = total > 0 ? (currentIndex + (revealed ? 1 : 0)) / total : 0;

  // --- "Valider" : check the current answer server-side ---
  const handleValidate = async () => {
    if (selected === null || revealed || checking) return;
    if (!userId) {
      toast.error('Identifiez-vous pour passer le quiz');
      return;
    }
    setChecking(true);
    try {
      const res = await axios.post(`${API}/quiz/check`, {
        level_id: levelId,
        question_id: question.id,
        question_index: currentIndex,
        answer: selected,
      });
      const data = res.data; // { correct, correct_index }
      setRevealed(data);
      // Lock the chosen answer into the accumulated array, in order
      setAnswers((prev) => {
        const next = [...prev];
        next[currentIndex] = selected;
        return next;
      });
    } catch (error) {
      const msg =
        error.response?.data?.detail ||
        'Erreur lors de la vérification de la réponse';
      toast.error(msg);
    } finally {
      setChecking(false);
    }
  };

  // --- final submit (last question, after reveal) ---
  const handleSubmit = async () => {
    if (!userId) {
      toast.error('Identifiez-vous pour passer le quiz');
      return;
    }
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/quiz/submit`, {
        user_id: userId,
        level_id: levelId,
        answers, // accumulated chosen indices, in question order
      });
      const data = res.data; // { passed, score, total, percent, pass_score }
      setResult(data);

      if (data.passed) {
        toast.success(`Quiz réussi — ${data.percent}%`);
        if (typeof onPassed === 'function') onPassed();
        fetchPriorResult(); // refresh banner
      } else {
        toast.error(
          `Score insuffisant : ${data.percent}% (minimum ${data.pass_score}%)`
        );
      }
    } catch (error) {
      const msg =
        error.response?.data?.detail || 'Erreur lors de la soumission du quiz';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- "Suivant" / "Voir le résultat" ---
  const handleNext = () => {
    if (!revealed) return;
    if (isLast) {
      handleSubmit();
      return;
    }
    setCurrentIndex((i) => i + 1);
    setSelected(null);
    setRevealed(null);
  };

  // --- Empty state: no quiz for this level ---
  if (!hasQuiz) {
    return (
      <p className="text-sm text-gray-500 italic" data-testid="quiz-empty">
        Aucun quiz pour ce niveau
      </p>
    );
  }

  const gradientText =
    'bg-gradient-to-r from-[#8a2be2] to-[#ff00ff] bg-clip-text text-transparent';
  const gradientBg = 'linear-gradient(135deg,#8a2be2,#ff00ff)';

  const alreadyPassed = priorResult?.passed;
  // When already passed, hide the quiz behind a toggle (unless retaking)
  const showQuizFlow = !alreadyPassed || showQuizAfterPass;
  const showResultScreen = !!result;

  return (
    <Card
      className="card-dark border-neon"
      style={{ backgroundColor: '#160a18' }}
      data-testid="level-quiz"
    >
      <CardHeader>
        <CardTitle className="text-2xl text-white flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-purple-400" />
          Test de validation
        </CardTitle>
        <CardDescription className="text-gray-400">
          Score minimum requis :{' '}
          <span className={`font-semibold ${gradientText}`}>{passScore}%</span>
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Loading prior result */}
        {loadingPrior && (
          <div
            className="flex items-center gap-2 text-gray-400 text-sm"
            data-testid="quiz-loading"
          >
            <Loader2 className="w-4 h-4 animate-spin" />
            Chargement de votre progression...
          </div>
        )}

        {/* No identity guard */}
        {!userId && (
          <div
            className="flex items-center gap-2 p-3 rounded-lg border border-yellow-500/60 bg-yellow-500/10"
            data-testid="quiz-no-user"
          >
            <Lock className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <span className="text-yellow-300 text-sm">
              Identifiez-vous pour passer le quiz
            </span>
          </div>
        )}

        {/* Already-passed success banner */}
        {!loadingPrior && alreadyPassed && (
          <div
            className="flex flex-col gap-3 p-4 rounded-lg border border-green-500/60 bg-green-500/10"
            data-testid="quiz-already-passed"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-green-300 font-semibold">
                Niveau validé (meilleur score {priorResult.best_percent}%)
              </span>
            </div>
            <Button
              type="button"
              variant="outline"
              className="self-start border-purple-500/70 text-purple-300 hover:bg-purple-500/10"
              onClick={() => {
                setShowQuizAfterPass((v) => {
                  const next = !v;
                  if (next) resetRun(); // start the one-at-a-time flow from Q1
                  return next;
                });
              }}
              data-testid="quiz-retake-toggle"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {showQuizAfterPass ? 'Masquer le quiz' : 'Refaire le quiz'}
            </Button>
          </div>
        )}

        {/* ---------- FINAL RESULT SCREEN ---------- */}
        {userId && showQuizFlow && showResultScreen && (
          <div className="space-y-5" data-testid="quiz-result">
            {/* Big score badge */}
            <div className="flex flex-col items-center text-center gap-3">
              <div
                className="flex flex-col items-center justify-center w-32 h-32 rounded-full text-white shadow-lg"
                style={{ background: gradientBg }}
                data-testid="quiz-score-badge"
              >
                <span className="text-4xl font-extrabold leading-none">
                  {result.percent}%
                </span>
                <span className="text-[11px] mt-1 opacity-90 tracking-wide">
                  {result.score}/{result.total} bonnes réponses
                </span>
              </div>

              {result.passed ? (
                <div
                  className="w-full flex flex-col gap-1 p-4 rounded-lg border border-green-500/60 bg-green-500/10"
                  data-testid="quiz-result-passed"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <span className="text-green-300 font-semibold">
                      Quiz réussi — {result.percent}% · Niveau validé
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-green-200/90">
                    <Unlock className="w-4 h-4 flex-shrink-0" />
                    Niveau suivant débloqué
                  </div>
                </div>
              ) : (
                <div
                  className="w-full flex flex-col items-center gap-3 p-4 rounded-lg border border-amber-500/60 bg-amber-500/10"
                  data-testid="quiz-result-failed"
                >
                  <div className="flex items-center justify-center gap-2">
                    <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                    <span className="text-amber-200 font-semibold text-center">
                      Score insuffisant : {result.percent}% (minimum{' '}
                      {result.pass_score}%)
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={resetRun}
                    className="btn-neon"
                    data-testid="quiz-restart"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Recommencer le quiz
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ---------- ONE-QUESTION-AT-A-TIME FLOW ---------- */}
        {userId && showQuizFlow && !showResultScreen && question && (
          <div className="space-y-5" data-testid="quiz-flow">
            {/* Progress */}
            <div className="space-y-2" data-testid="quiz-progress">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300 font-medium">
                  Question {currentIndex + 1} / {total}
                </span>
                <span className={`font-semibold ${gradientText}`}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${progress * 100}%`,
                    background: gradientBg,
                  }}
                  data-testid="quiz-progress-bar"
                />
              </div>
            </div>

            {/* Question card */}
            <div
              className="rounded-lg border border-white/10 bg-black/20 p-4"
              data-testid={`quiz-question-${currentIndex}`}
            >
              {question.scenario && (
                <span
                  className="inline-flex items-center mb-2 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white"
                  style={{ background: gradientBg }}
                >
                  Mise en situation
                </span>
              )}
              <p className="text-white font-medium mb-4">
                <span className={`font-bold ${gradientText} mr-1`}>
                  {currentIndex + 1}.
                </span>
                {question.q}
              </p>

              {/* Options — single choice, locked once revealed */}
              <div
                className="flex flex-col gap-2"
                role="radiogroup"
                aria-label={`Réponses pour la question ${currentIndex + 1}`}
              >
                {question.options.map((option, oIndex) => {
                  const isChosen = selected === oIndex;
                  const isCorrectOption =
                    revealed && revealed.correct_index === oIndex;
                  const isWrongChoice =
                    revealed && isChosen && !revealed.correct;

                  // Visual state after reveal
                  let stateClasses =
                    'border-white/10 hover:border-purple-500/50 hover:bg-white/5';
                  if (!revealed && isChosen) {
                    stateClasses = 'border-purple-500 bg-purple-500/10';
                  } else if (revealed && isCorrectOption) {
                    stateClasses =
                      'border-green-500 ring-2 ring-green-500/60 bg-green-500/10';
                  } else if (revealed && isWrongChoice) {
                    stateClasses =
                      'border-red-500 ring-2 ring-red-500/60 bg-red-500/10';
                  } else if (revealed) {
                    stateClasses = 'border-white/10 opacity-60';
                  }

                  return (
                    <button
                      type="button"
                      key={oIndex}
                      role="radio"
                      aria-checked={isChosen}
                      disabled={!!revealed}
                      onClick={() => {
                        if (!revealed) setSelected(oIndex);
                      }}
                      className={`flex items-center justify-between gap-3 text-left rounded-md border p-3 transition-all ${stateClasses} ${
                        revealed ? 'cursor-default' : 'cursor-pointer'
                      }`}
                      data-testid={`quiz-option-${currentIndex}-${oIndex}`}
                    >
                      <span className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex-shrink-0 w-4 h-4 rounded-full border ${
                            isChosen
                              ? 'border-purple-400 bg-purple-400'
                              : 'border-purple-400/60'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="text-gray-200 text-sm leading-snug">
                          {option}
                        </span>
                      </span>

                      {/* Reveal icons / labels */}
                      {revealed && isCorrectOption && (
                        <span className="flex items-center gap-1 flex-shrink-0">
                          {!revealed.correct && (
                            <span className="text-[11px] font-semibold text-green-300">
                              Bonne réponse
                            </span>
                          )}
                          <CheckCircle className="w-5 h-5 text-green-400" />
                        </span>
                      )}
                      {revealed && isWrongChoice && (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Reveal message */}
              {revealed && (
                <div
                  className={`mt-4 flex items-center gap-2 text-sm font-medium ${
                    revealed.correct ? 'text-green-300' : 'text-amber-300'
                  }`}
                  data-testid="quiz-reveal-message"
                >
                  {revealed.correct ? (
                    <>
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      Bonne réponse !
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 flex-shrink-0" />
                      Pas tout à fait — voici la bonne réponse.
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions */}
            {!revealed ? (
              <Button
                type="button"
                onClick={handleValidate}
                disabled={selected === null || checking}
                className="btn-neon w-full"
                data-testid="quiz-validate"
              >
                {checking ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  'Valider'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                disabled={submitting}
                className="btn-neon w-full"
                data-testid="quiz-next"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Calcul du résultat...
                  </>
                ) : isLast ? (
                  <>
                    <Trophy className="w-4 h-4 mr-2" />
                    Voir le résultat
                  </>
                ) : (
                  <>
                    Suivant
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LevelQuiz;
