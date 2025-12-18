import React, { useState } from 'react';
import { useAutoAnimate } from '@formkit/auto-animate/react';

// --- 1. 後台設定頁面組件 (Admin) ---
const AdminPage = ({ questions, setQuestions, goPreview }) => {
  // AutoAnimate hook，讓列表變動時有平滑動畫
  const [parentRef] = useAutoAnimate();

  // 新增一個空白題目
  const addQuestion = () => {
    const newId = Date.now();
    setQuestions([
      ...questions,
      { id: newId, title: '', type: 'text', options: [] }
    ]);
  };

  // 刪除題目
  const removeQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  // 更新題目內容
  const updateQuestion = (id, field, value) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // 新增選項 (給單選/多選題用)
  const addOption = (qId) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        return { ...q, options: [...q.options, ''] };
      }
      return q;
    }));
  };

  // 更新選項文字
  const updateOption = (qId, optIndex, value) => {
    setQuestions(questions.map(q => {
      if (q.id === qId) {
        const newOptions = [...q.options];
        newOptions[optIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-gray-50 min-h-screen">
      {/* 🍊 主標題顏色：溫暖的 Orange-700 */}
      <h2 className="text-2xl font-bold mb-4 text-orange-700">📋 問卷設定後台</h2>
      <p className="mb-4 text-sm text-gray-600">在此設定麻醉評估單的題目</p>
      
      {/* 綁定動畫的父容器 */}
      <div ref={parentRef} className="space-y-4">
        {questions.map((q, index) => (
          <div key={q.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <span className="font-bold text-gray-400">Q{index + 1}</span>
              <button 
                onClick={() => removeQuestion(q.id)}
                className="text-red-500 hover:text-red-700 text-sm"
              >
                刪除題目
              </button>
            </div>

            {/* 題目名稱輸入框 */}
            <input
              type="text"
              placeholder="請輸入題目"
              className="w-full p-2 border rounded mb-2"
              value={q.title}
              onChange={(e) => updateQuestion(q.id, 'title', e.target.value)}
            />

            {/* 題目類型選擇 */}
            <select
              className="w-full p-2 border rounded mb-2 bg-gray-50"
              value={q.type}
              onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
            >
              <option value="text">文字填答 (如：身高/體重)</option>
              <option value="checkbox">多選勾選 (如：過往病史)</option>
              <option value="radio">單選 (如：是否禁食)</option>
            </select>

            {/* 如果是選擇題，顯示選項設定區 */}
            {(q.type === 'checkbox' || q.type === 'radio') && (
              {/* 🍯 邊框顏色：清新的 Amber-200 */}
              <div className="ml-4 mt-2 border-l-2 border-amber-200 pl-4">
                <p className="text-xs text-gray-500 mb-1">選項設定：</p>
                {q.options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 mb-1">
                    <input
                      type="text"
                      placeholder={`選項 ${idx + 1}`}
                      className="p-1 border rounded flex-1 text-sm"
                      value={opt}
                      onChange={(e) => updateOption(q.id, idx, e.target.value)}
                    />
                  </div>
                ))}
                <button 
                  onClick={() => addOption(q.id)}
                  className="text-orange-500 text-sm hover:underline mt-1"
                >
                  + 新增選項
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 flex gap-4">
        {/* 🍊 主要按鈕：溫暖的 Orange-500 */}
        <button 
          onClick={addQuestion}
          className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 transition"
        >
          + 新增題目
        </button>
        {/* 🌿 次要按鈕：清新的 Emerald-500 */}
        <button 
          onClick={goPreview}
          className="px-4 py-2 bg-emerald-500 text-white rounded hover:bg-emerald-600 transition ml-auto"
        >
          前往作答頁面 &rarr;
        </button>
      </div>
    </div>
  );
};

// --- 2. 前台作答頁面組件 (User) ---
const UserPage = ({ questions, goBack }) => {
  const [answers, setAnswers] = useState({});

  const handleInputChange = (qId, value) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  const handleCheckboxChange = (qId, option) => {
    const current = answers[qId] || [];
    if (current.includes(option)) {
      handleInputChange(qId, current.filter(item => item !== option));
    } else {
      handleInputChange(qId, [...current, option]);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto bg-white min-h-screen">
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">麻醉前評估表</h1>
        <button onClick={goBack} className="text-sm text-gray-500 hover:text-gray-800">
          ⚙️ 返回設定
        </button>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        {questions.length === 0 && <p className="text-gray-400 text-center">目前沒有題目，請回後台設定。</p>}
        
        {questions.map((q, index) => (
          <div key={q.id} className="border-b pb-4 last:border-0">
            <label className="block text-lg font-medium text-gray-800 mb-2">
              {index + 1}. {q.title}
            </label>

            {/* 文字填答 */}
            {q.type === 'text' && (
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 outline-none"
                placeholder="請輸入回答..."
                onChange={(e) => handleInputChange(q.id, e.target.value)}
              />
            )}

            {/* 單選題 */}
            {q.type === 'radio' && (
              <div className="flex flex-col gap-2">
                {q.options.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      value={opt}
                      onChange={() => handleInputChange(q.id, opt)}
                      {/* 🍊 輸入框顏色：Orange-600 */}
                      className="w-4 h-4 text-orange-600"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}

            {/* 多選題 */}
            {q.type === 'checkbox' && (
              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, i) => (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      value={opt}
                      onChange={() => handleCheckboxChange(q.id, opt)}
                      {/* 🍊 輸入框顏色：Orange-600 */}
                      className="w-4 h-4 text-orange-600 rounded"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        ))}

        {questions.length > 0 && (
          {/* 🍊 提交按鈕：溫暖的 Orange-500 */}
          <button className="w-full py-3 bg-orange-500 text-white rounded-lg font-bold text-lg hover:bg-orange-600 shadow-lg mt-8">
            提交評估表
          </button>
        )}
      </form>
    </div>
  );
};

// --- 3. 主程式 (App) ---
export default function App() {
  // 模式切換：'admin' | 'user'
  const [mode, setMode] = useState('admin');
  
  // 這是所有的題目資料狀態 (預設範例)
  const [questions, setQuestions] = useState([
    { 
      id: 1, 
      title: '身高 / 體重', 
      type: 'text', 
      options: [] 
    },
    { 
      id: 2, 
      title: '是否曾患有以下疾病？(可複選)', 
      type: 'checkbox', 
      options: ['心臟病', '肝臟病', '腎臟病', '糖尿病', '高血壓'] 
    }
  ]);

  return (
    <div>
      {mode === 'admin' ? (
        <AdminPage 
          questions={questions} 
          setQuestions={setQuestions} 
          goPreview={() => setMode('user')} 
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
