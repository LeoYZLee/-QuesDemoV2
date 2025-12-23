import React, { useEffect, useState } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from 'react-router-dom';
import AdminPage from './pages/AdminPage.jsx';
import UserPage from './pages/UserPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import { API_BASE, API_BASE_PATH, API_URL, DEFAULT_QUESTIONS, _KNOWN_CONTEXTS, normalizeQuestions } from './lib/questionUtils.js';

/**
 * App shell
 * - 提供 /admin 與 /survey（或 /）兩個路由，分開後台與作答頁
 * - 載入/儲存問卷資料，並在各頁間共用狀態
 */

const AppRoutes = ({ questions, setQuestions, onSave, onReset, isLoading }) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-teal-50">
        <div className="text-xl font-bold text-teal-700">正在連線伺服器，載入中...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/admin"
        element={
          <AdminPage
            questions={questions}
            setQuestions={(qs) => setQuestions(normalizeQuestions(qs))}
            goPreview={() => navigate('/survey')}
            goProfile={() => navigate('/admin/profile')}
            onSave={onSave}
            onReset={onReset}
          />
        }
      />
      <Route
        path="/survey"
        element={
          <UserPage
            questions={questions}
            goBack={() => navigate('/admin')}
          />
        }
      />
      <Route
        path="/admin/profile"
        element={(
          <ProfilePage
            goBack={() => navigate('/admin')}
          />
        )}
      />
      {/* 預設導向作答頁 */}
      <Route path="/" element={<Navigate to="/survey" replace />} />
      <Route path="*" element={<Navigate to="/survey" replace />} />
    </Routes>
  );
};

export default function App() {
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQuestions = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(API_URL);

        if (response.ok) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            setQuestions(normalizeQuestions(data));
          } else {
            console.warn('Server returned empty data, using default config.');
            setQuestions(DEFAULT_QUESTIONS);
          }
        } else {
          console.warn(`Failed to fetch questions: ${response.status}. Using default config.`);
          setQuestions(DEFAULT_QUESTIONS);
        }
      } catch (error) {
        console.error('Error connecting to backend API:', error);
        setQuestions(DEFAULT_QUESTIONS);
      } finally {
        setIsLoading(false);
      }
    };

    fetchQuestions();
  }, []);

  const handleSave = async () => {
    const payload = normalizeQuestions(questions);
    const tryContexts = [API_BASE, ..._KNOWN_CONTEXTS.filter((c) => c !== API_BASE), ''];
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
          alert('設定已儲存到伺服器（optionId schema）。');
          success = true;
          break;
        } else if (response.status === 404) {
          lastError = new Error(`404 from ${url}`);
          continue;
        } else {
          alert('發生錯誤：無法儲存設定到伺服器');
          success = true;
          break;
        }
      } catch (err) {
        lastError = err;
      }
    }

    if (!success) {
      alert(`仍然失敗：無法連線任何可用 API，最後錯誤：${lastError}`);
    }
  };

  const handleReset = () => {
    if (confirm('確定要恢復預設值嗎？')) {
      setQuestions(DEFAULT_QUESTIONS);
    }
  };

  return (
    <BrowserRouter basename={API_BASE_PATH || '/'}>
      <div className="min-h-screen bg-teal-50 w-full font-sans text-teal-900">
        <AppRoutes
          questions={questions}
          setQuestions={setQuestions}
          onSave={handleSave}
          onReset={handleReset}
          isLoading={isLoading}
        />
      </div>
    </BrowserRouter>
  );
}
