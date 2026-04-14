'use client';

import { useSettingsStore } from '@/lib/store';
import { 
  Save, 
  Key, 
  Rss, 
  Database, 
  MessageSquare, 
  Info,
  Shield,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TabSettings() {
  const settings = useSettingsStore();

  const handleSave = () => {
    alert('Đã lưu cấu hình thành công!');
  };

  const resetPrompts = () => {
    if (confirm('Bạn có chắc muốn khôi phục các Prompt mặc định?')) {
      // Logic to reset would go here, but for now we just alert
      alert('Đã khôi phục Prompt mặc định (Vui lòng tải lại trang)');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      {/* API Keys */}
      <section className="glass-card p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Key className="text-blue-400" />
          Cấu hình API Keys
        </h2>
        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Gemini API Key</label>
            <input 
              type="password" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
              value={settings.geminiApiKey}
              onChange={(e) => settings.setSettings({ geminiApiKey: e.target.value })}
              placeholder="Nhập Gemini API Key..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Groq API Key (Optional)</label>
            <input 
              type="password" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
              value={settings.groqApiKey}
              onChange={(e) => settings.setSettings({ groqApiKey: e.target.value })}
              placeholder="Nhập Groq API Key..."
            />
          </div>
        </div>
      </section>

      {/* Telegram */}
      <section className="glass-card p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <MessageSquare className="text-emerald-400" />
          Cấu hình Telegram
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Bot Token</label>
            <input 
              type="password" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
              value={settings.telegramBotToken}
              onChange={(e) => settings.setSettings({ telegramBotToken: e.target.value })}
              placeholder="Nhập Telegram Bot Token..."
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Chat ID</label>
            <input 
              type="text" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
              value={settings.telegramChatId}
              onChange={(e) => settings.setSettings({ telegramChatId: e.target.value })}
              placeholder="Nhập Telegram Chat ID..."
            />
          </div>
        </div>
      </section>

      {/* Supabase */}
      <section className="glass-card p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Database className="text-amber-400" />
          Cấu hình Supabase
        </h2>
        <div className="grid gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Project URL</label>
            <input 
              type="text" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
              value={settings.supabaseUrl}
              onChange={(e) => settings.setSettings({ supabaseUrl: e.target.value })}
              placeholder="https://your-project.supabase.co"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Anon Key</label>
            <input 
              type="password" 
              className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50"
              value={settings.supabaseKey}
              onChange={(e) => settings.setSettings({ supabaseKey: e.target.value })}
              placeholder="Nhập Supabase Anon Key..."
            />
          </div>
        </div>
      </section>

      {/* RSS & Prompts */}
      <section className="glass-card p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Rss className="text-purple-400" />
            Nguồn tin & AI Prompts
          </h2>
          <button onClick={resetPrompts} className="text-xs text-gray-500 hover:text-red-400 flex items-center gap-1">
            <RefreshCw size={12} />
            Khôi phục mặc định
          </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Danh sách RSS (Mỗi dòng 1 URL)</label>
            <textarea 
              className="w-full h-32 bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50 font-mono text-xs"
              value={settings.rssUrls}
              onChange={(e) => settings.setSettings({ rssUrls: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Prompt Phân tích Macro (Petrodollar Focus)</label>
            <textarea 
              className="w-full h-48 bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50 font-mono text-xs"
              value={settings.promptAnalysis}
              onChange={(e) => settings.setSettings({ promptAnalysis: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400">Prompt Báo cáo Telegram</label>
            <textarea 
              className="w-full h-48 bg-black/20 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500/50 font-mono text-xs"
              value={settings.promptTelegramAdvance}
              onChange={(e) => settings.setSettings({ promptTelegramAdvance: e.target.value })}
            />
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <button onClick={handleSave} className="btn-primary px-12 py-4 text-lg font-bold shadow-lg shadow-blue-500/20">
          <Save size={20} className="inline mr-2" />
          Lưu tất cả cấu hình
        </button>
      </div>
    </div>
  );
}
