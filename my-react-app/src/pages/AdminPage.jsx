import React from 'react';
import Button from '../components/ui/Button.jsx';
import QuestionEditor from '../components/admin/QuestionEditor.jsx';

const AdminPage = ({ questions, setQuestions, goPreview, goProfile, onSave, onReset }) => {
  return (
    <div className="px-4 py-8 max-w-6xl mx-auto min-h-screen bg-teal-50 w-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 bg-white p-5 rounded-2xl shadow-sm border border-teal-100">
        <div>
          <h2 className="text-2xl font-bold text-teal-800">🧭 問卷後台管理</h2>
        </div>
        <div className="flex gap-3 w-full md:w-auto flex-wrap">
          <Button
            variant="secondary"
            onClick={goProfile}
            className="flex-1 md:flex-none px-4 py-2 text-sm rounded-lg shadow-sm"
          >
            基本資料聯繫單
          </Button>
          <Button
            variant="outline"
            onClick={onReset}
            className="flex-1 md:flex-none px-4 py-2 text-sm border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-medium transition"
          >
            重置回預設
          </Button>
          <Button
            variant="primary"
            onClick={onSave}
            className="flex-1 md:flex-none px-6 py-2 bg-teal-600 text-white text-sm font-bold rounded-lg shadow hover:bg-teal-700 transition"
          >
            儲存到伺服器
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
          <span>👀</span> 切換到作答預覽 →
        </Button>
      </div>
    </div>
  );
};

export default AdminPage;
