'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, useAppStore } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  Send, 
  FileText, 
  History, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function TabDispatcher() {
  const { articles } = useAppStore();
  const settings = useSettingsStore();
  const [report, setReport] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const fetchHistory = async () => {
    const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseKey);
    if (!supabase) return;
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    if (data) setHistory(data);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const generateReport = async () => {
    if (!settings.geminiApiKey) {
      alert('Vui lòng cấu hình Gemini API Key');
      return;
    }

    const selectedArticles = articles.filter(a => a.selected);
    if (selectedArticles.length === 0) {
      alert('Vui lòng chọn tin bài ở tab News Feed trước');
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_report',
          payload: {
            articlesData: selectedArticles.map(a => ({ title: a.title, link: a.link, analysis: a.ai_analysis, score: a.ai_score })),
            portfolio: settings.portfolio,
            apiKey: settings.geminiApiKey,
            customPrompt: settings.promptTelegramAdvance
          }
        })
      });

      const data = await res.json();
      if (data.result) {
        setReport(data.result);
      }
    } catch (error) {
      console.error('Report generation error:', error);
      alert('Lỗi khi tạo báo cáo');
    } finally {
      setIsGenerating(false);
    }
  };

  const sendToTelegram = async () => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      alert('Vui lòng cấu hình Telegram trong Settings');
      return;
    }

    if (!report) {
      alert('Vui lòng tạo báo cáo trước');
      return;
    }

    setIsSending(true);
    try {
      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent: report,
          botToken: settings.telegramBotToken,
          chatId: settings.telegramChatId
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('Đã gửi báo cáo lên Telegram thành công!');
        
        // Save to Supabase history
        const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseKey);
        if (supabase) {
          await supabase.from('reports').insert({
            content: report,
            type: 'macro_report',
            is_sent: true
          });
          fetchHistory();
        }
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Telegram error:', error);
      alert(`Lỗi gửi Telegram: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(report);
    alert('Đã sao chép vào bộ nhớ tạm');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Editor */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <FileText className="text-blue-400" />
              Báo cáo Vĩ mô & Petrodollar
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={generateReport} 
                disabled={isGenerating}
                className="btn-primary flex items-center gap-2"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                Tạo báo cáo AI
              </button>
            </div>
          </div>

          <textarea 
            className="w-full h-[500px] bg-black/20 border border-white/10 rounded-xl p-4 text-gray-300 font-mono text-sm focus:outline-none focus:border-blue-500/50 resize-none"
            placeholder="Nội dung báo cáo sẽ xuất hiện ở đây..."
            value={report}
            onChange={(e) => setReport(e.target.value)}
          />

          <div className="flex justify-end gap-3 mt-4">
            <button onClick={copyToClipboard} className="btn-secondary flex items-center gap-2">
              <Copy size={18} />
              Sao chép
            </button>
            <button 
              onClick={sendToTelegram} 
              disabled={isSending || !report}
              className="btn-primary flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {isSending ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              Gửi Telegram
            </button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="space-y-6">
        <div className="glass-card p-6">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
            <History className="text-emerald-400" />
            Lịch sử báo cáo
          </h2>

          <div className="space-y-4">
            {history.map((item) => (
              <div key={item.id} className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors group">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-500">
                    {new Date(item.created_at).toLocaleString('vi-VN')}
                  </span>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                </div>
                <p className="text-sm text-gray-300 line-clamp-3 mb-3">
                  {item.content}
                </p>
                <button 
                  onClick={() => setReport(item.content)}
                  className="text-xs text-blue-400 hover:underline flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Khôi phục bản thảo
                </button>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-10 text-gray-500">
                Chưa có lịch sử báo cáo.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
