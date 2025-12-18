import React, { useState, useEffect } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

/**
 * Full optionId refactor for:
 * - Admin question editor (nested subQuestions)
 * - User answering flow (step-based)
 * - Server load/save with backward compatible normalization
 *
 * Contract:
 * - radio/binary: answers[q.id] = option.id (string)
 * - checkbox: answers[q.id] = option.id[] (string[])
 * - subQuestions keyed by option.id (NOT label)
 */

// ==========================================
// 0) Icons + UI primitives
// ==========================================

const TrashIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456-1.22L17.66 3.66a2.25 2.25 0 0 0-2.114-1.637l-6.385-.029a2.25 2.25 0 0 0-2.114 1.637L5.735 5.797m14.456-1.22l-4.07.67M5.735 5.797l4.07-.67M9.26 9l-.337 2m7.373-1.834-.337 2M9.842 13.5l-.346 5.5m6.265-5.5.346 5.5" />
  </svg>
);

const CheckCircleIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
  </svg>
);

const ArrowUpIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
  </svg>
);

const ArrowDownIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const Button = ({ children, onClick, className = '', variant = 'primary', size = 'md', disabled = false, title = '' }) => {
  const baseStyle = "inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700",
    secondary: "bg-white text-teal-700 border-2 border-teal-100 hover:bg-teal-50",
    outline: "bg-transparent border-2 border-teal-200 text-teal-600 hover:bg-teal-50",
    ghost: "bg-transparent hover:bg-gray-100 text-gray-600",
  };
  const sizes = {
    xs: "px-2 py-1 text-xs rounded",
    sm: "px-3 py-1.5 text-xs rounded-lg",
    md: "px-4 py-2 text-sm rounded-xl",
    lg: "px-6 py-3 text-sm rounded-xl",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      title={title}
    >
      {children}
    </button>
  );
};

// ==========================================
// 1) API endpoints (kept compatible)
// ==========================================

const _KNOWN_CONTEXTS = ['/QuestionnaireApp', '/questionnaire'];
const _ctxFromPath = (typeof window !== 'undefined' && window.location && window.location.pathname)
  ? _KNOWN_CONTEXTS.find(c => window.location.pathname.startsWith(c)) || ''
  : '';
const API_BASE = import.meta.env && import.meta.env.VITE_API_BASE
  ? import.meta.env.VITE_API_BASE
  : (_ctxFromPath || '/questionnaire');
const API_URL = `${API_BASE}/api/questions`;

// ==========================================
// 2) optionId schema helpers (backward compatible)
// ==========================================

const uid = (prefix = 'id') => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  } catch {}
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const slugify = (s) => String(s || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_\u4e00-\u9fff-]/g, '')
  .replace(/_+/g, '_')
  .slice(0, 40) || `opt_${Math.random().toString(16).slice(2, 8)}`;

const ensureBinaryOptions = (q) => {
  const opts = Array.isArray(q.options) ? q.options : [];
  if (opts.length >= 2) {
    const o0 = opts[0];
    const o1 = opts[1];
    const l0 = typeof o0 === 'string' ? o0 : o0?.label;
    const l1 = typeof o1 === 'string' ? o1 : o1?.label;
    return [
      { id: 'yes', label: l0 || '是' },
      { id: 'no', label: l1 || '否' },
    ];
  }
  return [{ id: 'yes', label: '是' }, { id: 'no', label: '否' }];
};

const normalizeOptions = (q) => {
  const labelToId = {};
  const raw = Array.isArray(q.options) ? q.options : [];

  if (q.type === 'binary') {
    const options = ensureBinaryOptions(q);
    options.forEach(o => { labelToId[o.label] = o.id; });
    return { options, labelToId };
  }

  const options = raw.map((o, idx) => {
    if (typeof o === 'string') {
      const id = slugify(o) || `opt_${idx + 1}`;
      labelToId[o] = id;
      return { id, label: o };
    }
    if (o && typeof o === 'object') {
      const id = o.id ? String(o.id) : (slugify(o.label) || `opt_${idx + 1}`);
      const label = o.label != null ? String(o.label) : '';
      labelToId[label] = id;
      return { id, label };
    }
    const id = `opt_${idx + 1}`;
    labelToId[String(o)] = id;
    return { id, label: String(o ?? '') };
  });

  const used = new Set();
  const fixed = options.map((o, idx) => {
    let id = o.id || `opt_${idx + 1}`;
    if (used.has(id)) id = `${id}_${idx + 1}`;
    used.add(id);
    return { ...o, id };
  });

  return { options: fixed, labelToId };
};

const remapSubQuestionsKeys = (subQuestions, options, labelToId) => {
  if (!subQuestions || typeof subQuestions !== 'object') return undefined;

  const optionIds = new Set((options || []).map(o => o.id));
  const out = {};

  Object.keys(subQuestions).forEach((k) => {
    const list = subQuestions[k];
    const asId = optionIds.has(k) ? k : (labelToId?.[k] || k);
    out[asId] = normalizeQuestions(Array.isArray(list) ? list : []);
  });

  return out;
};

const normalizeQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.map((rawQ) => {
    const q = { ...rawQ };
    q.id = q.id != null ? String(q.id) : uid('q');

    const { options, labelToId } = normalizeOptions(q);

    if (q.type === 'binary' || q.type === 'radio' || q.type === 'checkbox') {
      q.options = options;
    } else {
      q.options = q.options || [];
    }

    q.subQuestions = remapSubQuestionsKeys(q.subQuestions, options, labelToId);
    return q;
  });
};

// ==========================================
// 3) Default questions (optionId-based)
// ==========================================

const DEFAULT_QUESTIONS = normalizeQuestions([
  {
    id: "height_weight",
    title: '身高 / 體重',
    type: 'text',
    options: [],
    icon: '📏',
    isRequired: true
  },
  {
    id: "heart_disease",
    title: '目前是否患有心臟疾病？',
    type: 'binary',
    options: [
      { id: 'yes', label: '是' },
      { id: 'no', label: '否' }
    ],
    icon: '❤️',
    isRequired: true,
    subQuestions: {
      yes: [
        {
          id: "heart_disease_type",
          title: '請問是哪一種類型？',
          type: 'radio',
          options: [
            { id: 'htn', label: '高血壓' },
            { id: 'arrhythmia', label: '心律不整' },
            { id: 'other', label: '其他' },
          ],
          icon: '🩺',
          isRequired: true,
          subQuestions: {
            other: [
              { id: "heart_other_desc", title: '請補充說明', type: 'text', options: [], icon: '✏️', isRequired: true }
            ]
          }
        }
      ]
    }
  },
  {
    id: "past_history",
    title: '過往病史 (多選測試)',
    type: 'checkbox',
    options: [
      { id: 'dm', label: '糖尿病' },
      { id: 'asthma', label: '氣喘' },
      { id: 'none', label: '無' },
    ],
    icon: '💊',
    isRequired: false,
    subQuestions: {
      dm: [
        { id: "dm_meds", title: '是否定期服用藥物？', type: 'binary', options: [{ id: 'yes', label: '是' }, { id: 'no', label: '否' }], icon: '💉' }
      ],
      asthma: [
        { id: "asthma_last", title: '最近一次發作是什麼時候？', type: 'text', options: [], icon: '📅' }
      ]
    }
  }
]);

// ==========================================
// 4) Shared UI components
// ==========================================

const ProgressBar = ({ progress }) => {
  const width = Math.min(100, Math.max(0, progress));
  return (
    <div className="w-full h-1.5 bg-teal-100 rounded-full mb-4 overflow-hidden">
      <div
        className="h-full bg-orange-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(249,115,22,0.5)]"
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

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
              <span className="text-xs text-teal-600 font-bold">請補充細節：</span>
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
                      const newArr = isChecked ? oldArr.filter(x => x !== opt.id) : [...oldArr, opt.id];
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

const QuestionRenderer = ({ questions, answers, onAnswerChange, level = 0, isSubQuestion = false }) => {
  const [parentRef] = useAutoAnimate();
  return (
    <div ref={parentRef} className={isSubQuestion ? "space-y-2" : "space-y-4"}>
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

// ==========================================
// 5) Admin editor (option object editing)
// ==========================================

const QuestionEditor = ({ questions, onUpdate, level = 0 }) => {
  const [parentRef] = useAutoAnimate();

  const handleAdd = () => {
    const newQ = {
      id: uid('q'),
      title: '',
      type: 'text',
      options: [],
      icon: level === 0 ? '📝' : '',
      isRequired: false,
      subQuestions: {}
    };
    onUpdate([...questions, newQ]);
  };

  const handleRemove = (id) => onUpdate(questions.filter(q => q.id !== id));

  const handleChange = (id, field, value) => {
    onUpdate(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleTypeChange = (qId, newType) => {
    onUpdate(questions.map(q => {
      if (q.id !== qId) return q;
      const next = { ...q, type: newType };

      if (newType === 'binary') {
        next.options = ensureBinaryOptions(next);
      } else if (newType === 'radio' || newType === 'checkbox') {
        if (!Array.isArray(next.options) || next.options.length === 0) {
          next.options = [{ id: uid('opt'), label: '' }];
        } else {
          next.options = next.options.map((o, idx) => ({
            id: o?.id ? String(o.id) : `opt_${idx + 1}`,
            label: o?.label != null ? String(o.label) : '',
          }));
        }
      } else {
        next.options = [];
        next.subQuestions = {};
      }

      return next;
    }));
  };

  const handleOptionChange = (qId, optionId, field, value) => {
    onUpdate(questions.map(q => {
      if (q.id !== qId) return q;
      const opts = Array.isArray(q.options) ? q.options : [];
      const newOpts = opts.map(o => o.id === optionId ? { ...o, [field]: value } : o);

      const fixed = newOpts.map((o, idx) => {
        let id = (o.id || '').trim();
        const label = (o.label || '').trim();
        if (!id && label) id = slugify(label);
        if (!id) id = `opt_${idx + 1}`;
        return { id, label: o.label };
      });

      let subQuestions = q.subQuestions || {};
      if (field === 'id' && optionId && value && optionId !== value && subQuestions?.[optionId]) {
        subQuestions = { ...subQuestions, [value]: subQuestions[optionId] };
        delete subQuestions[optionId];
      }

      return { ...q, options: fixed, subQuestions };
    }));
  };

  const handleAddOption = (qId) => {
    onUpdate(questions.map(q => {
      if (q.id !== qId) return q;
      const opts = Array.isArray(q.options) ? q.options : [];
      return { ...q, options: [...opts, { id: uid('opt'), label: '' }] };
    }));
  };

  const handleRemoveOption = (qId, optionId) => {
    onUpdate(questions.map(q => {
      if (q.id !== qId) return q;
      const opts = Array.isArray(q.options) ? q.options : [];
      const newOptions = opts.filter(o => o.id !== optionId);

      const newSub = { ...(q.subQuestions || {}) };
      if (newSub[optionId]) delete newSub[optionId];

      return { ...q, options: newOptions, subQuestions: newSub };
    }));
  };

  const handleMove = (index, direction) => {
    const newQuestions = [...questions];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newQuestions.length) return;
    [newQuestions[index], newQuestions[targetIndex]] = [newQuestions[targetIndex], newQuestions[index]];
    onUpdate(newQuestions);
  };

  const handleSubQuestionsUpdate = (parentId, triggerOptionId, newSubQuestionsList) => {
    onUpdate(questions.map(q => {
      if (q.id !== parentId) return q;
      return {
        ...q,
        subQuestions: {
          ...(q.subQuestions || {}),
          [triggerOptionId]: newSubQuestionsList
        }
      };
    }));
  };

  const indentClass = level > 0
    ? "ml-4 pl-4 border-l-2 border-teal-300 md:ml-12 md:pl-6 md:border-l-4"
    : "";

  return (
    <div ref={parentRef} className={`space-y-4 ${indentClass}`}>
      {questions.map((q, index) => (
        <div key={q.id} className={`p-4 rounded-lg shadow-sm border border-teal-200 transition-colors ${level > 0 ? 'bg-teal-50' : 'bg-white'}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 relative">
            <div className="flex justify-between items-center md:w-auto gap-2">
              <span className="font-bold text-teal-700 mr-2 whitespace-nowrap">
                {level === 0 ? `Q${index + 1}` : `子問題`}
              </span>

              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleMove(index, -1)}
                  disabled={index === 0}
                  title="上移"
                  className="p-1 text-teal-600 hover:bg-teal-100"
                >
                  <ArrowUpIcon className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => handleMove(index, 1)}
                  disabled={index === questions.length - 1}
                  title="下移"
                  className="p-1 text-teal-600 hover:bg-teal-100"
                >
                  <ArrowDownIcon className="w-4 h-4" />
                </Button>
              </div>

              <Button
                variant="ghost"
                onClick={() => handleRemove(q.id)}
                className="md:hidden text-red-400 p-1 rounded-full hover:bg-red-50"
                title="刪除題目"
              >
                <TrashIcon className="w-5 h-5" />
              </Button>
            </div>

            <input
              type="text"
              placeholder={level === 0 ? "請輸入題目..." : "請輸入追問題目..."}
              className="flex-1 p-2 border-2 border-teal-100 rounded focus:ring-2 focus:ring-teal-500 outline-none text-teal-900 bg-teal-50/50"
              value={q.title || ''}
              onChange={(e) => handleChange(q.id, 'title', e.target.value)}
            />

            <select
              className="w-full md:w-40 p-2 border-2 border-teal-100 rounded bg-white outline-none text-teal-900 text-sm"
              value={q.type}
              onChange={(e) => handleTypeChange(q.id, e.target.value)}
            >
              <option value="text">文字填答</option>
              <option value="binary">是非題</option>
              <option value="radio">單選</option>
              <option value="checkbox">多選</option>
            </select>

            <input
              type="text"
              placeholder="icon"
              className="w-full md:w-16 p-2 border-2 border-teal-100 rounded bg-white text-center outline-none text-teal-900"
              value={q.icon || ''}
              onChange={(e) => handleChange(q.id, 'icon', e.target.value)}
            />

            <label className="flex items-center justify-center gap-2 px-3 py-2 border-2 border-teal-100 rounded bg-white cursor-pointer select-none whitespace-nowrap hover:bg-teal-50">
              <input
                type="checkbox"
                checked={!!q.isRequired}
                onChange={(e) => handleChange(q.id, 'isRequired', e.target.checked)}
                className="w-4 h-4 accent-teal-600"
              />
              <span className="text-sm text-teal-900">必填</span>
            </label>

            <Button
              variant="ghost"
              onClick={() => handleRemove(q.id)}
              className="hidden md:flex items-center justify-center p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition"
              title="刪除題目"
            >
              <TrashIcon className="w-6 h-6" />
            </Button>
          </div>

          {(q.type === 'checkbox' || q.type === 'radio' || q.type === 'binary') && (
            <div className="mt-4 pt-3 border-t border-teal-100/50">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">選項與邏輯設定</p>
                <div className="h-px bg-teal-100 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(q.options || []).map((opt, idx) => (
                  <div key={opt.id || idx} className="relative">
                    <div className="flex gap-2 items-center w-full">
                      <span className="text-xs text-teal-400 font-mono w-6 text-right">{idx + 1}.</span>
                      
                      
                      {/* <input
                        type="text"
                        placeholder="optionId"
                        className="w-40 p-2 px-3 border border-teal-200 rounded text-xs bg-white focus:ring-1 focus:ring-teal-500 outline-none text-teal-900 font-mono"
                        value={opt.id || ''}
                        onChange={(e) => handleOptionChange(q.id, opt.id, 'id', e.target.value)}
                        disabled={q.type === 'binary'}
                        title={q.type === 'binary' ? 'binary 題型固定 optionId=yes/no' : '穩定 key（建議英數底線）'}
                      /> */}
                      

                     <input
                        type="text"
                        placeholder={`選項顯示文字 ${idx + 1}`}
                        className="flex-1 p-2 px-3 border border-teal-200 rounded text-sm bg-white focus:ring-1 focus:ring-teal-500 outline-none text-teal-900"
                        value={opt.label || ''}
                        onChange={(e) => handleOptionChange(q.id, opt.id, 'label', e.target.value)}
                      />

                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => handleRemoveOption(q.id, opt.id)}
                        className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                        title="刪除此選項"
                        disabled={q.type === 'binary'}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </Button>

                      {opt.id && <span className="text-teal-300">⬇</span>}
                    </div>

                    {opt.id && (
                      <div className="mt-2 ml-8 pl-4 border-l-2 border-dashed border-teal-300/50">
                        <QuestionEditor
                          questions={q.subQuestions?.[opt.id] || []}
                          onUpdate={(newSubList) => handleSubQuestionsUpdate(q.id, opt.id, newSubList)}
                          level={level + 1}
                        />
                        {(!q.subQuestions?.[opt.id] || q.subQuestions[opt.id].length === 0) && (
                          <div className="text-xs text-teal-400/70 py-1">此選項目前無子問題</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {q.type !== 'binary' && (
                <Button
                  variant="ghost"
                  onClick={() => handleAddOption(q.id)}
                  className="mt-2 ml-8 text-teal-600 text-sm font-bold hover:text-teal-800 flex items-center gap-1"
                >
                  <span>+</span> 新增選項
                </Button>
              )}
            </div>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        onClick={handleAdd}
        className={`w-full py-3 border-2 border-dashed border-teal-300 text-teal-600 rounded-lg hover:bg-teal-50 hover:border-teal-500 transition text-sm font-bold flex items-center justify-center gap-2 ${level > 0 ? 'bg-white/60' : ''}`}
      >
        <span>+</span> {level === 0 ? '新增主題目' : '新增子題目'}
      </Button>
    </div>
  );
};

// ==========================================
// 6) Pages
// ==========================================

const AdminPage = ({ questions, setQuestions, goPreview, onSave, onReset }) => {
  return (
    <div className="px-4 py-8 max-w-6xl mx-auto min-h-screen bg-teal-50 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-teal-100">
        <div>
          <h2 className="text-2xl font-bold text-teal-800">📋 問卷後台管理</h2>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1 md:flex-none px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
          >
            ↺ 重置預設
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            className="flex-1 md:flex-none px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg shadow hover:bg-teal-700 transition"
          >
            💾 儲存設定
          </Button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100 min-h-[500px]">
        <QuestionEditor
          questions={questions}
          onUpdate={setQuestions}
        />
      </div>

      <div className="mt-8 flex justify-center">
        <Button
          variant="primary"
          onClick={goPreview}
          className="px-8 py-3 bg-teal-800 text-white rounded-full font-bold text-lg hover:bg-teal-900 transition shadow-lg flex items-center gap-2"
        >
          <span>📱</span> 前往作答頁面預覽 &rarr;
        </Button>
      </div>
    </div>
  );
};

const UserPage = ({ questions, goBack }) => {
  const [answers, setAnswers] = useState({});
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [animateRef] = useAutoAnimate();

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
        alert('此題為必填，請作答！');
        return;
      }
      setCurrentQIndex(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrev = () => {
    if (currentQIndex > 0) {
      setCurrentQIndex(prev => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDFA] flex flex-col font-sans w-full">

      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-[#F0FDFA]/95 pt-2 pb-2 mb-4 backdrop-blur-sm shadow-sm border-b border-teal-100/50">
        <div className="max-w-xl mx-auto px-4">
          <div className="flex justify-between items-center mb-2 mt-1">
            <h1 className="text-base font-bold text-teal-900 tracking-tight">麻醉前評估表</h1>
            <Button variant="outline" size="sm" onClick={goBack} className="text-[10px] text-teal-600 bg-white border border-teal-200 px-2 py-1 rounded-full shadow-sm hover:bg-teal-50">⚙️ 設定</Button>
          </div>
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
          <div className="text-center py-20 text-teal-600">載入中...</div>
        ) : (
          <div key={currentQuestion.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <QuestionCard
              q={currentQuestion}
              index={currentQIndex}
              answers={answers}
              onAnswerChange={(qId, val) => setAnswers(prev => ({ ...prev, [qId]: val }))}
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
                    alert('此題為必填，請作答！');
                    return;
                  }
                  alert("問卷已提交！（answers 儲存的是 optionId）\n\n" + JSON.stringify(answers, null, 2));
                }}
              >
                Submit ✅
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="flex-[2] py-3 bg-teal-100 border border-teal-200 text-teal-700 rounded-xl font-bold text-sm shadow-sm hover:bg-teal-200 transition transform active:scale-[0.98]"
              >
                Next Step →
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ==========================================
// 7) App main (load/save with normalization)
// ==========================================

export default function App() {
  const [mode, setMode] = useState('admin');
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.debug('API_BASE =', API_BASE, 'API_URL =', API_URL);

    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(API_URL);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setQuestions(normalizeQuestions(data));
          } else {
            console.warn("Server returned empty data, using default config.");
            setQuestions(DEFAULT_QUESTIONS);
          }
        } else {
          console.warn(`Failed to fetch questions: ${response.status}. Using default config.`);
          setQuestions(DEFAULT_QUESTIONS);
        }
      } catch (error) {
        console.error("Error connecting to backend API:", error);
        setQuestions(DEFAULT_QUESTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleSave = async () => {
    const payload = normalizeQuestions(questions);

    const tryContexts = [API_BASE, ..._KNOWN_CONTEXTS.filter(c => c !== API_BASE), ''];
    let lastError = null;
    let success = false;

    for (const ctx of tryContexts) {
      const url = `${ctx}/api/questions`;
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          alert('設定已儲存到伺服器！（optionId schema）');
          success = true;
          break;
        } else if (response.status === 404) {
          lastError = new Error(`404 from ${url}`);
          continue;
        } else {
          alert('錯誤：無法儲存設定到伺服器！');
          success = true;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!success) {
      alert(`連線錯誤：無法連線到任何後端 API。最後錯誤：${lastError}`);
    }
  };

  const handleReset = () => {
    if (confirm('確定要回復預設值嗎？')) {
      setQuestions(DEFAULT_QUESTIONS);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <div className="text-xl font-bold text-teal-700">正在連接伺服器，載入中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50 w-full font-sans text-teal-900">
      {mode === 'admin' ? (
        <AdminPage
          questions={questions}
          setQuestions={(qs) => setQuestions(normalizeQuestions(qs))}
          goPreview={() => setMode('user')}
          onSave={handleSave}
          onReset={handleReset}
        />
      ) : (
        <UserPage
          questions={questions}
          goBack={() => setMode('admin')}
        />
      )}
    </div>
  );
}
