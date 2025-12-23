import React from 'react';
import BinaryQuestion from './BinaryQuestion.jsx';
import OptionWithSubQuestions from './OptionWithSubQuestions.jsx';
import QuestionRenderer from './QuestionRenderer.jsx';

const QuestionCard = ({ q, index, answers, onAnswerChange, level, isSubQuestion }) => {
  const currentVal = answers[q.id];

  const getSubQsByAnswer = (answerVal) => {
    if (!q?.subQuestions) return [];
    if (typeof answerVal === 'string') return q.subQuestions[answerVal] || [];
    return [];
  };

  return (
    <div
      className={`
        transition-all duration-300
        ${isSubQuestion
          ? 'bg-transparent border-b border-teal-200/50 last:border-0 pb-4 mb-2 pt-2'
          : 'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-5'
        }
      `}
    >
      <div className="mb-3">
        <label className="block text-sm md:text-base font-bold text-gray-800 flex items-start gap-2 leading-tight">
          {isSubQuestion ? (
            <span className="text-teal-400 mt-1 text-xs"></span>
          ) : (
            q.icon && <span className="text-lg filter drop-shadow-sm mt-0.5">{q.icon}</span>
          )}

          <div className="flex-1">
            <span>{level === 0 && !isSubQuestion ? `${index + 1}. ` : ''}{q.title}</span>
            {q.isRequired && <span className="text-[10px] text-red-500 ml-2 bg-red-50 px-1.5 py-0.5 rounded font-bold whitespace-nowrap align-middle">* 必填</span>}
          </div>
        </label>
      </div>

      <div>
        {q.type === 'text' && (
          <input
            type="text"
            className="w-full p-3 text-sm border-2 border-gray-100 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-400 outline-none bg-gray-50/50 text-gray-800 transition-all placeholder-gray-400"
            placeholder="請輸入內容..."
            value={currentVal || ''}
            onChange={(e) => onAnswerChange(q.id, e.target.value)}
          />
        )}

        {q.type === 'binary' && (
          <div>
            <BinaryQuestion
              options={q.options || []}
              currentValue={currentVal}
              onChange={(optionId) => onAnswerChange(q.id, optionId)}
            />
            {currentVal && getSubQsByAnswer(currentVal).length > 0 && (
              <div className="relative pl-0 mt-3 pt-2">
                <div className="absolute left-1/4 top-0 h-4 w-0.5 bg-teal-200"></div>
                <div className="bg-white/80 rounded-xl p-4 border border-teal-100 mt-2">
                  <QuestionRenderer
                    questions={getSubQsByAnswer(currentVal)}
                    answers={answers}
                    onAnswerChange={onAnswerChange}
                    level={level + 1}
                    isSubQuestion={true}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {(q.type === 'radio' || q.type === 'checkbox') && (
          <div className="flex flex-col">
            {(q.options || []).map((opt, i) => {
              const isChecked = q.type === 'radio'
                ? currentVal === opt.id
                : Array.isArray(currentVal) && currentVal.includes(opt.id);

              const subQs = q.subQuestions?.[opt.id] || [];

              return (
                <OptionWithSubQuestions
                  key={opt.id || i}
                  option={opt}
                  type={q.type}
                  isChecked={isChecked}
                  onToggle={() => {
                    if (q.type === 'radio') {
                      onAnswerChange(q.id, opt.id);
                    } else {
                      const oldArr = Array.isArray(currentVal) ? currentVal : [];
                      const newArr = isChecked ? oldArr.filter((x) => x !== opt.id) : [...oldArr, opt.id];
                      onAnswerChange(q.id, newArr);
                    }
                  }}
                  subQs={subQs}
                  answers={answers}
                  onAnswerChange={onAnswerChange}
                  level={level}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
