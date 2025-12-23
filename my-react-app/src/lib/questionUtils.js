import { useMemo } from 'react';

// 1) API endpoints (compatible with existing deploy contexts)
export const _KNOWN_CONTEXTS = ['/QuestionnaireApp', '/questionnaire'];
const _ctxFromPath = (typeof window !== 'undefined' && window.location && window.location.pathname)
  ? _KNOWN_CONTEXTS.find((c) => window.location.pathname.startsWith(c)) || ''
  : '';

const rawApiBase = (import.meta.env && import.meta.env.VITE_API_BASE)
  ? import.meta.env.VITE_API_BASE
  : (_ctxFromPath || '/questionnaire');

// Remove trailing slash to avoid // when拼接
export const API_BASE = String(rawApiBase || '').replace(/\/+$/, '') || '/questionnaire';
const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';

export const API_BASE_PATH = API_BASE.startsWith('http')
  ? (() => {
      try { return new URL(API_BASE).pathname || '/'; } catch (_) { return '/'; }
    })()
  : API_BASE || '/';

export const API_BASE_URL = API_BASE.startsWith('http')
  ? API_BASE
  : `${origin}${API_BASE}`;

export const API_URL = `${API_BASE_URL}/api/questions`;

// 2) optionId helpers
export const uid = (prefix = 'id') => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return `${prefix}_${crypto.randomUUID()}`;
  } catch (_) {
    // ignore
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

export const slugify = (s) => String(s || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/[^a-z0-9_\u4e00-\u9fff-]/g, '')
  .replace(/_+/g, '_')
  .slice(0, 40) || `opt_${Math.random().toString(16).slice(2, 8)}`;

export const ensureBinaryOptions = (q) => {
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

export const normalizeOptions = (q) => {
  const labelToId = {};
  const raw = Array.isArray(q.options) ? q.options : [];

  if (q.type === 'binary') {
    const options = ensureBinaryOptions(q);
    options.forEach((o) => { labelToId[o.label] = o.id; });
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

export const remapSubQuestionsKeys = (subQuestions, options, labelToId) => {
  if (!subQuestions || typeof subQuestions !== 'object') return undefined;

  const optionIds = new Set((options || []).map((o) => o.id));
  const out = {};

  Object.keys(subQuestions).forEach((k) => {
    const list = subQuestions[k];
    const asId = optionIds.has(k) ? k : (labelToId?.[k] || k);
    out[asId] = normalizeQuestions(Array.isArray(list) ? list : []);
  });

  return out;
};

export const normalizeQuestions = (questions) => {
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

// 3) Default questions (optionId-based)
export const DEFAULT_QUESTIONS = normalizeQuestions([
  {
    id: 'height_weight',
    title: '身高 / 體重',
    type: 'text',
    options: [],
    icon: '📏',
    isRequired: true,
  },
  {
    id: 'heart_disease',
    title: '目前是否患有心臟疾病？',
    type: 'binary',
    options: [
      { id: 'yes', label: '是' },
      { id: 'no', label: '否' },
    ],
    icon: '❤️',
    isRequired: true,
    subQuestions: {
      yes: [
        {
          id: 'heart_disease_type',
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
              {
                id: 'heart_other_desc',
                title: '請補充說明',
                type: 'text',
                options: [],
                icon: '📝',
                isRequired: true,
              },
            ],
          },
        },
      ],
    },
  },
  {
    id: 'past_history',
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
        {
          id: 'dm_meds',
          title: '是否定期服用藥物？',
          type: 'binary',
          options: [
            { id: 'yes', label: '是' },
            { id: 'no', label: '否' },
          ],
          icon: '💊',
        },
      ],
      asthma: [
        {
          id: 'asthma_last',
          title: '最近一次發作是什麼時候？',
          type: 'text',
          options: [],
          icon: '🌬️',
        },
      ],
    },
  },
]);

// Handy hook for memoized defaults (optional use)
export const useDefaultQuestions = () => useMemo(() => DEFAULT_QUESTIONS, []);
