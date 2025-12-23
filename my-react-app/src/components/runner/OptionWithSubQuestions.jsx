import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import QuestionRenderer from './QuestionRenderer.jsx';

const OptionWithSubQuestions = ({ option, type, isChecked, onToggle, subQs, answers, onAnswerChange, level }) => {
  const [containerRef] = useAutoAnimate();
  const showSubQs = isChecked && subQs && subQs.length > 0;

  return (
    <div ref={containerRef} className="flex flex-col w-full relative group">
      <label className={`
          flex items-center gap-3 cursor-pointer p-3 border rounded-xl transition-all duration-200 mb-2 relative z-10 min-h-[50px]
          ${isChecked
            ? 'bg-teal-50 border-teal-300 shadow-[0_2px_8px_rgba(20,184,166,0.15)] ring-1 ring-teal-200'
            : 'bg-white border-gray-200 hover:bg-gray-50 shadow-sm'
          }
      `}>
        <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0
            ${isChecked ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-300 bg-white'}
        `}>
          {isChecked && <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>

        <input type={type} checked={isChecked} onChange={onToggle} className="hidden" />
        <span className={`text-sm font-bold flex-1 ${isChecked ? 'text-teal-800' : 'text-gray-600'}`}>{option.label}</span>
      </label>

      {showSubQs && (
        <div className="relative pl-0 mt-[-15px] pt-6 pb-2 mb-2 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="absolute left-5 top-0 bottom-4 w-0.5 bg-teal-200 -z-0"></div>

          <div className="relative bg-white/80 rounded-xl p-4 border border-teal-100 shadow-sm ml-2 md:ml-4">
            <div className="absolute -top-2 left-3 w-4 h-4 bg-white border-t border-l border-teal-100 transform rotate-45"></div>

            <div className="flex items-center gap-2 mb-3">
              <span className="bg-teal-100 text-teal-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Details</span>
              <span className="text-xs text-teal-600 font-bold">請補充細節</span>
            </div>

            <QuestionRenderer
              questions={subQs}
              answers={answers}
              onAnswerChange={onAnswerChange}
              level={level + 1}
              isSubQuestion={true}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default OptionWithSubQuestions;
