'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/store';
import { Save, Database, MessageSquare, Rss, Info, Sparkles, Filter } from 'lucide-react';

export default function TabSettings() {
  const settings = useSettingsStore();
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const sqlDDL = `CREATE TABLE articles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  summary TEXT,
  ai_score INTEGER,
  ai_analysis TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`;

  const SCORE_RANGES = [
    { id: '9-10', label: '9 - 10 Điểm' },
    { id: '7-8', label: '7 - 8 Điểm' },
    { id: '5-6', label: '5 - 6 Điểm' },
    { id: '1-4', label: '1 - 4 Điểm' },
    { id: 'unscored', label: 'Chưa chấm điểm' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Cấu hình hệ thống</h2>
        <p className="text-gray-500 mt-1">Thiết lập API keys và tiêu chí đánh giá AI. Dữ liệu được lưu an toàn trên trình duyệt của bạn.</p>
        <div className="mt-4 bg-blue-50 border border-blue-100 p-4 rounded-lg text-sm text-blue-800">
          <p className="font-semibold mb-1 flex items-center gap-1"><Info className="w-4 h-4" /> Mẹo triển khai Vercel:</p>
          <p>Bạn có thể cấu hình các thông số này thông qua <strong>Environment Variables</strong> trên Vercel để bảo mật và không cần nhập lại. Các biến hỗ trợ:</p>
          <ul className="list-disc list-inside mt-2 space-y-1 font-mono text-xs">
            <li>NEXT_PUBLIC_SUPABASE_URL</li>
            <li>NEXT_PUBLIC_SUPABASE_ANON_KEY</li>
            <li>GEMINI_API_KEY</li>
            <li>TELEGRAM_BOT_TOKEN</li>
            <li>TELEGRAM_CHAT_ID</li>
            <li>NEXT_PUBLIC_ADMIN_PASSWORD_HASH</li>
          </ul>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        
        {/* AI Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <Sparkles className="w-5 h-5 text-purple-500" />
            Cấu hình AI (Gemini & Groq)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gemini API Key</label>
              <input
                type="password"
                value={settings.geminiApiKey}
                onChange={(e) => settings.setSettings({ geminiApiKey: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="AIzaSy..."
              />
              <p className="text-xs text-gray-500 mt-1">Nếu để trống, hệ thống sẽ sử dụng biến môi trường trên server (Vercel).</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Groq API Key (Backup)</label>
              <input
                type="password"
                value={settings.groqApiKey}
                onChange={(e) => settings.setSettings({ groqApiKey: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                placeholder="gsk_..."
              />
              <p className="text-xs text-gray-500 mt-1">Dùng Llama 3 làm phương án dự phòng khi Gemini bị lỗi 503.</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* RSS & Prompt Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <Rss className="w-5 h-5 text-orange-500" />
            Cấu hình Nguồn tin & Tiêu chí
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Danh sách RSS URL (Mỗi dòng 1 link)</label>
              <textarea
                value={settings.rssUrls}
                onChange={(e) => settings.setSettings({ rssUrls: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-mono text-sm"
                placeholder="https://example.com/rss"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu chí Đánh giá (Prompt Context)</label>
              <textarea
                value={settings.hotCriteria}
                onChange={(e) => settings.setSettings({ hotCriteria: e.target.value })}
                rows={5}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all"
                placeholder="Ví dụ: Hãy chấm điểm cao cho các tin tức ảnh hưởng mạnh..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-1"><Filter className="w-4 h-4"/> Bộ lọc điểm mặc định</label>
              <div className="flex flex-wrap gap-3">
                {SCORE_RANGES.map(range => (
                  <label key={range.id} className="flex items-center gap-1.5 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={(settings.defaultScoreFilter || []).includes(range.id)}
                      onChange={(e) => {
                        const current = settings.defaultScoreFilter || [];
                        if (e.target.checked) {
                          settings.setSettings({ defaultScoreFilter: [...current, range.id] });
                        } else {
                          settings.setSettings({ defaultScoreFilter: current.filter(id => id !== range.id) });
                        }
                      }}
                      className="rounded text-orange-500 focus:ring-orange-500"
                    />
                    <span className="text-sm text-gray-700">{range.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">Các tin tức thuộc nhóm điểm này sẽ được hiển thị mặc định và được chọn để phân tích khi dùng tính năng Tự động.</p>
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Supabase Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <Database className="w-5 h-5 text-emerald-500" />
            Supabase
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supabase URL</label>
              <input
                type="text"
                value={settings.supabaseUrl}
                onChange={(e) => settings.setSettings({ supabaseUrl: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="https://xxxx.supabase.co"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supabase Anon Key</label>
              <input
                type="password"
                value={settings.supabaseAnonKey}
                onChange={(e) => settings.setSettings({ supabaseAnonKey: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              />
            </div>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* Telegram Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
              <MessageSquare className="w-5 h-5 text-sky-500" />
              Telegram Bot
            </h3>
          </div>
          
          <div className="bg-sky-50 p-4 rounded-lg border border-sky-100 text-sm text-sky-800 space-y-2">
            <p className="font-semibold flex items-center gap-1"><Info className="w-4 h-4" /> Hướng dẫn setup Telegram Bot:</p>
            <ol className="list-decimal list-inside space-y-1 ml-1">
              <li>Mở Telegram, tìm <strong>@BotFather</strong> và gõ <code className="bg-white px-1 py-0.5 rounded">/newbot</code> để tạo bot mới.</li>
              <li>Copy <strong>Bot Token</strong> do BotFather cung cấp dán vào ô bên dưới.</li>
              <li>Tạo một Channel hoặc Group trên Telegram, sau đó <strong>thêm Bot của bạn vào</strong> và cấp quyền Admin.</li>
              <li>Gửi 1 tin nhắn bất kỳ vào Channel/Group đó.</li>
              <li>Truy cập: <a href={`https://api.telegram.org/bot${settings.telegramBotToken || '<BOT_TOKEN>'}/getUpdates`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline break-all">https://api.telegram.org/bot{settings.telegramBotToken ? '...' : '<BOT_TOKEN>'}/getUpdates</a></li>
              <li>Tìm trường <code className="bg-white px-1 py-0.5 rounded">&quot;chat&quot;:&#123;&quot;id&quot;: -100...&#125;</code> và copy dãy số đó dán vào ô <strong>Chat / Channel ID</strong>.</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bot Token</label>
              <input
                type="password"
                value={settings.telegramBotToken}
                onChange={(e) => settings.setSettings({ telegramBotToken: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                placeholder="1234567890:ABCdefGhIJKlmNoPQRsTUVwxyZ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Chat / Channel ID</label>
              <input
                type="text"
                value={settings.telegramChatId}
                onChange={(e) => settings.setSettings({ telegramChatId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                placeholder="-1001234567890"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 flex items-center gap-4">
          <button
            type="submit"
            className="flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-lg hover:bg-gray-800 transition-colors font-medium"
          >
            <Save className="w-4 h-4" />
            Lưu cấu hình
          </button>
          {saved && <span className="text-emerald-600 font-medium">Đã lưu thành công!</span>}
        </div>
      </form>

      {/* SQL Helper */}
      <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800 mb-2">
          <Database className="w-5 h-5" />
          Tiện ích Database (SQL DDL)
        </h3>
        <p className="text-sm text-gray-600 mb-4">Copy đoạn mã sau và chạy trong Supabase SQL Editor để tạo bảng lưu trữ tin tức và báo cáo.</p>
        <div className="relative">
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm font-mono">
            {sqlDDL}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(sqlDDL);
              alert("Đã copy SQL!");
            }}
            className="absolute top-3 right-3 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded text-xs transition-colors"
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

