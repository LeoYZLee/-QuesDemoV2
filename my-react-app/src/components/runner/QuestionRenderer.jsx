import React from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';
import QuestionCard from './QuestionCard.jsx';

const QuestionRenderer = ({ questions, answers, onAnswerChange, level = 0, isSubQuestion = false }) => {
  const [parentRef] = useAutoAnimate();
  return (
    <div ref={parentRef} className={isSubQuestion ? 'space-y-2' : 'space-y-4'}>
      {questions.map((q, index) => (
        <QuestionCard
          key={q.id}
          q={q}
          index={index}
          answers={answers}
          onAnswerChange={onAnswerChange}
          level={level}
          isSubQuestion={isSubQuestion}
        />
      ))}
    </div>
  );
};

export default QuestionRenderer;
