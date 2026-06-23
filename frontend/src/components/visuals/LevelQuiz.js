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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  ClipboardCheck,
  Lock,
  Loader2,
  RefreshCw,
  Unlock,
} from 'lucide-react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

/**
 * LevelQuiz
 *
 * Server-side scored validation quiz for a formation level.
 * Questions never include correct answers (scored on the backend).
 *
 * Props:
 *  - levelId   : string  (e.g. "level-1")
 *  - quiz      : { pass_score: number, questions: [{ id, q, options: string[] }] }
 *  - userId    : string  (afroboost_user_id)
 *  - onPassed  : () => void  (optional, called when the quiz is passed)
 *
 * Submit payload (POST `${API}/quiz/submit`):
 *  { user_id, level_id, answers: number[] }   // selected option index per question, in order
 */
const LevelQuiz = ({ levelId, quiz, userId, onPassed }) => {
  const questions = quiz?.questions || [];
  const passScore = quiz?.pass_score ?? 0;
  const hasQuiz = questions.length > 0;

  // selected option index per question id
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrior, setLoadingPrior] = useState(true);
  const [priorResult, setPriorResult] = useState(null); // { attempted, passed, best_percent }
  const [result, setResult] = useState(null); // last submit response
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

  const handleSelect = (questionId, optionIndex) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const allAnswered =
    hasQuiz && questions.every((q) => answers[q.id] !== undefined);

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('Identifiez-vous pour passer le quiz');
      return;
    }
    if (!allAnswered || submitting) return;

    // answers array in question order
    const orderedAnswers = questions.map((q) => answers[q.id]);

    setSubmitting(true);
    try {
      const res = await axios.post(`${API}/quiz/submit`, {
        user_id: userId,
        level_id: levelId,
        answers: orderedAnswers,
      });
      const data = res.data;
      setResult(data);

      if (data.passed) {
        toast.success(`Quiz réussi — ${data.percent}%`);
        if (typeof onPassed === 'function') onPassed();
        // refresh prior result banner
        fetchPriorResult();
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
  const gradientBtn =
    'w-full text-white font-semibold bg-gradient-to-r from-[#8a2be2] to-[#ff00ff] ' +
    'hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed';

  const alreadyPassed = priorResult?.passed;
  // When already passed, hide the quiz form behind a toggle (unless retaking)
  const showQuizForm = !alreadyPassed || showQuizAfterPass;

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
                setShowQuizAfterPass((v) => !v);
                setResult(null);
              }}
              data-testid="quiz-retake-toggle"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              {showQuizAfterPass ? 'Masquer le quiz' : 'Refaire le quiz'}
            </Button>
          </div>
        )}

        {/* Submit result state (post-submit) */}
        {result && result.passed && (
          <div
            className="flex flex-col gap-1 p-4 rounded-lg border border-green-500/60 bg-green-500/10"
            data-testid="quiz-result-passed"
          >
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
              <span className="text-green-300 font-semibold">
                Quiz réussi — {result.percent}% · Niveau validé
              </span>
            </div>
            {result.next_unlocked && (
              <div className="flex items-center gap-2 text-sm text-green-200/90 pl-7">
                <Unlock className="w-4 h-4 flex-shrink-0" />
                Niveau suivant débloqué
              </div>
            )}
          </div>
        )}

        {result && !result.passed && (
          <div
            className="flex items-center gap-2 p-4 rounded-lg border border-amber-500/60 bg-amber-500/10"
            data-testid="quiz-result-failed"
          >
            <XCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <span className="text-amber-200 font-semibold">
              Score insuffisant : {result.percent}% (minimum{' '}
              {result.pass_score}%). Réessayez.
            </span>
          </div>
        )}

        {/* Quiz form */}
        {showQuizForm && (
          <div className="space-y-6" data-testid="quiz-form">
            {questions.map((question, qIndex) => (
              <div
                key={question.id}
                className="rounded-lg border border-white/10 bg-black/20 p-4"
                data-testid={`quiz-question-${qIndex}`}
              >
                <p className="text-white font-medium mb-3">
                  <span className={`font-bold ${gradientText} mr-1`}>
                    {qIndex + 1}.
                  </span>
                  {question.q}
                </p>
                <RadioGroup
                  value={
                    answers[question.id] !== undefined
                      ? String(answers[question.id])
                      : undefined
                  }
                  onValueChange={(val) =>
                    handleSelect(question.id, parseInt(val, 10))
                  }
                  className="gap-2"
                >
                  {question.options.map((option, oIndex) => {
                    const inputId = `q-${question.id}-opt-${oIndex}`;
                    const selected = answers[question.id] === oIndex;
                    return (
                      <Label
                        key={oIndex}
                        htmlFor={inputId}
                        className={`flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors ${
                          selected
                            ? 'border-purple-500 bg-purple-500/10'
                            : 'border-white/10 hover:border-purple-500/50 hover:bg-white/5'
                        }`}
                        data-testid={`quiz-option-${qIndex}-${oIndex}`}
                      >
                        <RadioGroupItem
                          value={String(oIndex)}
                          id={inputId}
                          className="border-purple-400 text-purple-400"
                        />
                        <span className="text-gray-200 text-sm leading-snug">
                          {option}
                        </span>
                      </Label>
                    );
                  })}
                </RadioGroup>
              </div>
            ))}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting || !userId}
              className={`btn-neon ${gradientBtn}`}
              data-testid="quiz-submit"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Validation...
                </>
              ) : (
                'Valider le quiz'
              )}
            </Button>

            {!allAnswered && (
              <p className="text-xs text-gray-500 text-center">
                Répondez à toutes les questions pour valider.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LevelQuiz;
