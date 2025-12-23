import React, { useMemo, useState } from 'react';
import QRCode from 'qrcode';
import Button from '../components/ui/Button.jsx';
import { API_BASE, API_BASE_PATH } from '../lib/questionUtils.js';

const initialForm = {
  name: '',
  idNo: '',
  gender: 'male',
  address: '',
  mobile: '',
  emergencyName: '',
  emergencyPhone: '',
};

const genUuid = () => {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch (_) {
    /* ignore */
  }
  return `uuid_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
};

const Input = ({ label, children }) => (
  <label className="flex flex-col gap-2 text-sm font-semibold text-teal-800">
    <span>{label}</span>
    {children}
  </label>
);

export default function ProfilePage({ goBack }) {
  const [form, setForm] = useState(initialForm);
  const [uuid, setUuid] = useState('');
  const [surveyUrl, setSurveyUrl] = useState('');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const apiUrl = useMemo(() => `${API_BASE}/api/profile`, []);
  const buildSurveyUrl = (id) => {
    const origin = (typeof window !== 'undefined' && window.location?.origin) ? window.location.origin : '';
    const basePath = String(API_BASE_PATH || '').replace(/\/+$/, '');
    return `${origin}${basePath || ''}/survey?uuid=${encodeURIComponent(id)}`;
  };

  const updateField = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const validate = () => {
    if (!form.name.trim()) return '請填寫姓名';
    if (!form.idNo.trim()) return '請填寫身分證號';
    if (!form.mobile.trim()) return '請填寫行動電話';
    return '';
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const newId = genUuid();
      setUuid(newId);
      const link = buildSurveyUrl(newId);
      setSurveyUrl(link);
      const dataUrl = await QRCode.toDataURL(link, { margin: 1, width: 240 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      console.error('QR generate error', err);
      alert('QR Code 產生失敗，請稍後重試');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const msg = validate();
    if (msg) {
      alert(msg);
      return;
    }
    const currentUuid = uuid || genUuid();
    if (!uuid) setUuid(currentUuid);
    const link = surveyUrl || buildSurveyUrl(currentUuid);
    if (!surveyUrl) setSurveyUrl(link);
    if (!qrDataUrl) {
      try {
        const dataUrl = await QRCode.toDataURL(link, { margin: 1, width: 240 });
        setQrDataUrl(dataUrl);
      } catch (_) {
        /* ignore */
      }
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        uuid: currentUuid,
        surveyUrl: link,
        submittedAt: new Date().toISOString(),
      };
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      alert('已送出並記錄成功');
    } catch (err) {
      console.error('submit profile error', err);
      alert('送出失敗，請稍後重試');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0FDFA]">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-start justify-between gap-3 bg-white p-5 rounded-2xl shadow-sm border border-teal-100">
          <div>
            <h1 className="text-2xl font-bold text-teal-800">基本個人資料聯繫單</h1>
            <p className="text-sm text-teal-700 mt-1">填寫聯繫資訊並生成 UUID QR Code，掃描後可帶入問卷身分。</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={goBack}>返回管理</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-teal-100 space-y-4">
            <Input label="姓名">
              <input
                className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="王小明"
              />
            </Input>
            <Input label="身分證號">
              <input
                className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={form.idNo}
                onChange={(e) => updateField('idNo', e.target.value)}
                placeholder="A123456789"
              />
            </Input>
            <Input label="性別">
              <div className="flex gap-4">
                {[
                  { id: 'male', label: '生理男' },
                  { id: 'female', label: '生理女' },
                  { id: 'other', label: '其他' },
                ].map((opt) => (
                  <label key={opt.id} className="flex items-center gap-2 text-sm font-medium text-teal-700">
                    <input
                      type="radio"
                      name="gender"
                      value={opt.id}
                      checked={form.gender === opt.id}
                      onChange={() => updateField('gender', opt.id)}
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </Input>
            <Input label="通訊地址">
              <input
                className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={form.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="縣市區鄉鎮路段門牌"
              />
            </Input>
            <Input label="行動電話">
              <input
                className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                value={form.mobile}
                onChange={(e) => updateField('mobile', e.target.value)}
                placeholder="09xx-xxx-xxx"
              />
            </Input>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="緊急聯絡人姓名">
                <input
                  className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  value={form.emergencyName}
                  onChange={(e) => updateField('emergencyName', e.target.value)}
                  placeholder="王小明"
                />
              </Input>
              <Input label="緊急聯絡人電話">
                <input
                  className="border border-teal-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  value={form.emergencyPhone}
                  onChange={(e) => updateField('emergencyPhone', e.target.value)}
                  placeholder="市話或手機"
                />
              </Input>
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button onClick={handleGenerate} variant="secondary" disabled={isGenerating}>
                {isGenerating ? '產生中…' : '生成 UUID 與 QR Code'}
              </Button>
              <Button onClick={handleSubmit} variant="primary" disabled={isSubmitting}>
                {isSubmitting ? '送出中…' : '送出並記錄'}
              </Button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-teal-100 space-y-3">
            <h3 className="text-lg font-bold text-teal-800">UUID / QR Code</h3>
            <div className="text-sm text-teal-700 break-all bg-teal-50 border border-teal-100 rounded-lg p-3 min-h-[48px]">
              {uuid || '尚未產生，點右上 UUID 與 QR Code 即可取得'}
            </div>
            {surveyUrl && (
              <div className="text-xs text-teal-700 break-all bg-white border border-teal-100 rounded-lg p-3">
                問卷連結：{surveyUrl}
              </div>
            )}
            {qrDataUrl ? (
              <div className="flex flex-col items-center gap-2">
                <img src={qrDataUrl} alt="UUID QR Code" className="w-48 h-48 border border-teal-100 rounded-xl shadow-sm bg-white" />
                <span className="text-xs text-teal-700">掃描後會開啟問卷並帶入此 UUID</span>
              </div>
            ) : (
              <div className="text-sm text-teal-600">尚未生成 QR Code</div>
            )}
            <p className="text-xs text-teal-600 leading-relaxed">
              送出時會一併帶入 UUID、問卷連結並寫入後端。若未先產生，系統會自動產一組。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
