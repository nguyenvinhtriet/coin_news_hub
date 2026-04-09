'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { Loader2, Send, CheckSquare, Square, CheckCircle2, Circle, RefreshCw, FileText } from 'lucide-react';
import { format } from 'date-fns';

interface DBReport {
  id: string;
  content: string;
  is_sent: boolean;
  created_at: string;
  selected?: boolean;
}

export default function TabDispatcher() {
  const settings = useSettingsStore();
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [reports, setReports] = useState<DBReport[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = async () => {
    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      setError("Vui lòng cấu hình Supabase trong phần Cấu hình.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
      if (!supabase) throw new Error("Không thể khởi tạo Supabase Client.");

      const { data, error: dbError } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbError) throw dbError;

      setReports((data || []).map(r => ({ ...r, selected: false })));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi khi tải dữ liệu từ Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (settings.supabaseUrl && settings.supabaseAnonKey) {
      fetchReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.supabaseUrl, settings.supabaseAnonKey]);

  const toggleSelect = (id: string) => {
    setReports(reports.map(r => r.id === id ? { ...r, selected: !r.selected } : r));
  };

  const sendToTelegram = async () => {
    const selectedReports = reports.filter(r => r.selected);
    if (selectedReports.length === 0) return;

    if (!settings.telegramBotToken || !settings.telegramChatId) {
      setError("Vui lòng cấu hình Telegram Bot trong phần Cấu hình.");
      return;
    }

    setSending(true);
    setError(null);

    try {
      const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
      if (!supabase) throw new Error("Không thể khởi tạo Supabase Client.");

      for (const report of selectedReports) {
        const res = await fetch(`https://api.telegram.org/bot${settings.telegramBotToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: settings.telegramChatId,
            text: report.content,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });

        const data = await res.json();
        if (!data.ok) {
          throw new Error(`Lỗi Telegram: ${data.description}`);
        }

        // Update Supabase
        await supabase
          .from('reports')
          .update({ is_sent: true })
          .eq('id', report.id);
      }

      // Refresh list
      await fetchReports();
      alert(`Đã gửi thành công ${selectedReports.length} báo cáo qua Telegram!`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi khi gửi qua Telegram.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quản lý & Gửi Telegram</h2>
          <p className="text-gray-500 mt-1">Quản lý các báo cáo AI đã tạo và phân phối qua Telegram Channel.</p>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
          <button
            onClick={fetchReports}
            disabled={loading}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <RefreshCw className={`w-4 h-4 shrink-0 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          <button
            onClick={sendToTelegram}
            disabled={sending || !reports.some(r => r.selected)}
            className="flex items-center gap-2 bg-sky-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Send className="w-4 h-4 shrink-0" />}
            Gửi Báo Cáo qua Telegram
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b border-gray-200">
              <tr>
                <th className="p-4 w-12 text-center whitespace-nowrap">Chọn</th>
                <th className="p-4 w-24 text-center whitespace-nowrap">Trạng thái</th>
                <th className="p-4 min-w-[300px]">Nội dung Báo cáo</th>
                <th className="p-4 w-32 whitespace-nowrap">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    {loading ? "Đang tải dữ liệu..." : "Chưa có báo cáo nào được lưu."}
                  </td>
                </tr>
              ) : (
                reports.map((report) => (
                  <tr key={report.id} className={`hover:bg-gray-50 transition-colors ${report.selected ? 'bg-sky-50/30' : ''}`}>
                    <td className="p-4 text-center">
                      <button onClick={() => toggleSelect(report.id)} className="text-gray-400 hover:text-sky-600">
                        {report.selected ? <CheckSquare className="w-5 h-5 text-sky-600" /> : <Square className="w-5 h-5" />}
                      </button>
                    </td>
                    <td className="p-4 text-center whitespace-nowrap">
                      {report.is_sent ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-xs font-medium">
                          <CheckCircle2 className="w-3 h-3" /> Đã gửi
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-500 bg-gray-100 px-2 py-1 rounded-full text-xs font-medium">
                          <Circle className="w-3 h-3" /> Chưa gửi
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-sky-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded border border-gray-100 max-h-40 overflow-y-auto whitespace-pre-wrap">
                          {report.content}
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-xs text-gray-500 whitespace-nowrap">
                      {format(new Date(report.created_at), 'dd/MM/yyyy HH:mm')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
