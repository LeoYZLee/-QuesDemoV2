import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { API_BASE } from '../lib/questionUtils.js';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import Button from '../components/ui/Button.jsx';
import ProgressBar from '../components/ui/ProgressBar.jsx';
import QuestionCard from '../components/runner/QuestionCard.jsx';

const UserPage = ({ questions, goBack }) => {
  const location = useLocation();
  const params = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const uuid = params.get('uuid');
  const [displayName, setDisplayName] = useState('您好');
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [animateRef] = useAutoAnimate();

  useEffect(() => {
    const nameParam = params.get('name');
    if (nameParam && nameParam.trim()) {
      setDisplayName(`${nameParam.trim()} 您好`);
      return;
    }

    if (!uuid) {
      setDisplayName('您好');
      return;
    }

    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/profile?uuid=${encodeURIComponent(uuid)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const text = await res.text();
        const data = JSON.parse(text);
        if (data?.name) setDisplayName(`${data.name} 您好`);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('fetch profile by uuid failed', err);
        }
      }
    };
    loadProfile();
    return () => controller.abort();
  }, [params, uuid]);

  const totalSteps = Math.max(questions.length, 1);
  const progress = ((currentQIndex + 1) / totalSteps) * 100;
  const currentQuestion = questions[currentQIndex];

  const isCurrentQuestionValid = () => {
    if (!currentQuestion || !currentQuestion.isRequired) return true;
    const val = answers[currentQuestion.id];
    if (Array.isArray(val)) return val.length > 0;
    return val !== undefined && val !== '';
  };

  const handleNext = () => {
    if (currentQIndex < questions.length - 1) {
      if (!isCurrentQuestionValid()) {
        alert('此問題為必填，請先作答');
        return;
      }
      setCurrentQIndex((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDFA] flex flex-col font-sans w-full">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-[#F0FDFA]/95 pt-2 pb-2 mb-4 backdrop-blur-sm shadow-sm border-b border-teal-100/50">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex justify-between items-center mb-2 mt-1">
            <h1 className="text-base font-bold text-teal-900 tracking-tight">問卷填寫</h1>
            <Button variant="outline" size="sm" onClick={goBack} className="text-[10px] text-teal-600 bg-white border border-teal-200 px-2 py-1 rounded-full shadow-sm hover:bg-teal-50">返回設定</Button>
          </div>
          <div className="text-[13px] font-semibold text-teal-800 mb-1">{displayName}</div>
          <div className="flex justify-between text-[10px] font-bold text-teal-700 mb-1 uppercase tracking-wide">
            <span>Question {currentQIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Completed</span>
          </div>
          <ProgressBar progress={progress} />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 w-full max-w-xl mx-auto px-4 pb-32" ref={animateRef}>
        {questions.length === 0 ? (
          <div className="text-center py-20 text-teal-600">尚未設定問題</div>
        ) : (
          <div key={currentQuestion.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <QuestionCard
              q={currentQuestion}
              index={currentQIndex}
              answers={answers}
              onAnswerChange={(qId, val) => setAnswers((prev) => ({ ...prev, [qId]: val }))}
              level={0}
              isSubQuestion={false}
            />
          </div>
        )}
      </div>

      {/* Bottom Bar */}
      {questions.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-teal-100 p-4 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-xl mx-auto flex gap-3">
            <Button
              onClick={handlePrev}
              disabled={currentQIndex === 0}
              variant="outline"
              className={`flex-1 py-3 rounded-xl font-bold text-sm border-2 transition ${currentQIndex === 0 ? 'opacity-0 pointer-events-none' : 'bg-white border-teal-200 text-teal-700 hover:bg-teal-50'}`}
            >
              Back
            </Button>

            {currentQIndex === questions.length - 1 ? (
              <Button
                className="flex-[2] py-3 bg-orange-100 border border-orange-200 text-orange-700 rounded-xl font-bold text-sm shadow-sm hover:bg-orange-200 transition transform active:scale-[0.98]"
                onClick={() => {
                  if (!isCurrentQuestionValid()) {
                    alert('此問題為必填，請先作答');
                    return;
                  }
                  alert("問卷已送出（answers 存的是 optionId）\n" + JSON.stringify(answers, null, 2));
                }}
              >
                Submit ✅
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-[2] py-3 bg-teal-100 border border-teal-200 text-teal-700 rounded-xl font-bold text-sm shadow-sm hover:bg-teal-200 transition transform active:scale-[0.98]"
              >
                Next Step
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserPage;
