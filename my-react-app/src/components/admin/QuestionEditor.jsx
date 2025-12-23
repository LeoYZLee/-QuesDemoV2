import React from 'react';
import Button from '../ui/Button.jsx';
import { ArrowDownIcon, ArrowUpIcon, TrashIcon } from '../ui/Icons.jsx';
import { ensureBinaryOptions, slugify, uid } from '../../lib/questionUtils.js';

const QuestionEditor = ({ questions, onUpdate, level = 0 }) => {
  const handleAdd = () => {
    const newQ = {
      id: uid('q'),
      title: '',
      type: 'text',
      options: [],
      icon: level === 0 ? '📌' : '',
      isRequired: false,
      subQuestions: {},
    };
    onUpdate([...questions, newQ]);
  };

  const handleRemove = (id) => onUpdate(questions.filter((q) => q.id !== id));

  const handleChange = (id, field, value) => {
    onUpdate(questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)));
  };

  const handleTypeChange = (qId, newType) => {
    onUpdate(questions.map((q) => {
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
    onUpdate(questions.map((q) => {
      if (q.id !== qId) return q;
      const opts = Array.isArray(q.options) ? q.options : [];
      const newOpts = opts.map((o) => (o.id === optionId ? { ...o, [field]: value } : o));

      const fixed = newOpts.map((o, idx) => {
        let id = (o.id || '').trim();
        const label = (o.label || '').trim();
        if (!id && label) id = slugify(label);
        if (!id) id = `opt_${idx + 1}`;
        return { ...o, id };
      });

      const subQuestions = { ...(q.subQuestions || {}) };
      if (subQuestions[optionId] && !fixed.find((o) => o.id === optionId)) {
        delete subQuestions[optionId];
      }

      return { ...q, options: fixed, subQuestions };
    }));
  };

  const handleAddOption = (qId) => {
    onUpdate(questions.map((q) => {
      if (q.id !== qId) return q;
      const opts = Array.isArray(q.options) ? q.options : [];
      return { ...q, options: [...opts, { id: uid('opt'), label: '' }] };
    }));
  };

  const handleRemoveOption = (qId, optionId) => {
    onUpdate(questions.map((q) => {
      if (q.id !== qId) return q;
      const opts = Array.isArray(q.options) ? q.options : [];
      const newOptions = opts.filter((o) => o.id !== optionId);

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
    onUpdate(questions.map((q) => {
      if (q.id !== parentId) return q;
      return {
        ...q,
        subQuestions: {
          ...(q.subQuestions || {}),
          [triggerOptionId]: newSubQuestionsList,
        },
      };
    }));
  };

  const indentClass = level > 0
    ? 'ml-4 pl-4 border-l-2 border-teal-300 md:ml-12 md:pl-6 md:border-l-4'
    : '';

  return (
    <div className={`space-y-4 ${indentClass}`}>
      {questions.map((q, index) => (
        <div key={q.id} className={`p-4 rounded-lg shadow-sm border border-teal-200 transition-colors ${level > 0 ? 'bg-teal-50' : 'bg-white'}`}>
          <div className="flex flex-col md:flex-row md:items-center gap-3 mb-3 relative">
            <div className="flex justify-between items-center md:w-auto gap-2">
              <span className="font-bold text-teal-700 mr-2 whitespace-nowrap">
                {level === 0 ? `Q${index + 1}` : '子題'}
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
              placeholder={level === 0 ? '請輸入問題..' : '請輸入追加問題..'}
              className="flex-1 p-2 border-2 border-teal-100 rounded focus:ring-2 focus:ring-teal-500 outline-none text-teal-900 bg-teal-50/50"
              value={q.title || ''}
              onChange={(e) => handleChange(q.id, 'title', e.target.value)}
            />

            <select
              className="w-full md:w-40 p-2 border-2 border-teal-100 rounded bg-white outline-none text-teal-900 text-sm"
              value={q.type}
              onChange={(e) => handleTypeChange(q.id, e.target.value)}
            >
              <option value="text">填空</option>
              <option value="binary">是/否</option>
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
                <p className="text-xs font-bold text-teal-600 uppercase tracking-wider">選項設定</p>
                <div className="h-px bg-teal-100 flex-1"></div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {(q.options || []).map((opt, idx) => (
                  <div key={opt.id || idx} className="relative">
                    <div className="flex gap-2 items-center w-full">
                      <span className="text-xs text-teal-400 font-mono w-6 text-right">{idx + 1}.</span>

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

                      {opt.id && <span className="text-teal-300">#{opt.id}</span>}
                    </div>

                    {opt.id && (
                      <div className="mt-2 ml-8 pl-4 border-l-2 border-dashed border-teal-300/50">
                        <QuestionEditor
                          questions={q.subQuestions?.[opt.id] || []}
                          onUpdate={(newSubList) => handleSubQuestionsUpdate(q.id, opt.id, newSubList)}
                          level={level + 1}
                        />
                        {(!q.subQuestions?.[opt.id] || q.subQuestions[opt.id].length === 0) && (
                          <div className="text-xs text-teal-400/70 py-1">此選項目前無子題</div>
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

export default QuestionEditor;
