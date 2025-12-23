import React from 'react';
import { CheckCircleIcon } from '../ui/Icons.jsx';

const BinaryQuestion = ({ options, currentValue, onChange }) => {
  const isSelected = (optionId) => currentValue === optionId;

  return (
    <div className="grid grid-cols-2 gap-3 h-12">
      {options.map((opt, i) => {
        const selected = isSelected(opt.id);
        const isPositive = opt.id === 'yes' || opt.label.includes('是') || opt.label.toLowerCase() === 'yes';

        return (
          <button
            key={opt.id || i}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`
              p-2 rounded-lg text-sm font-bold border transition-all active:scale-95 shadow-sm flex items-center justify-center gap-2 w-full h-full
              ${selected
                ? isPositive
                  ? 'bg-teal-50 border-teal-300 text-teal-700 shadow-md ring-2 ring-teal-100'
                  : 'bg-red-50 border-red-300 text-red-700 shadow-md ring-2 ring-red-100'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }
            `}
          >
            {selected && <CheckCircleIcon className="w-4 h-4" />}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default BinaryQuestion;
