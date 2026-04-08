'use client';

import { useState } from 'react';
import { useSettingsStore, useAppStore, Article } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { Loader2, Sparkles, Save, CheckSquare, Square, ExternalLink, Rss, FileText, Calendar } from 'lucide-react';

export default function TabNewsFeed() {
  const settings = useSettingsStore();
  const { articles, selectedDate, setArticles, setSelectedDate } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRSS = async () => {
    setLoading(true);
    setError(null);
    try {
      const urls = settings.rssUrls.split('\n').map(u => u.trim()).filter(u => u);
      if (urls.length === 0) {
        throw new Error("Vui lòng nhập ít nhất 1 RSS URL trong phần Cấu hình.");
      }

      const targetDate = new Date(selectedDate);
      targetDate.setHours(0, 0, 0, 0);
      const nextDate = new Date(targetDate);
      nextDate.setDate(nextDate.getDate() + 1);

      let dbArticles: any[] = [];
      if (settings.supabaseUrl && settings.supabaseAnonKey) {
        const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
        if (supabase) {
          const { data, error: dbError } = await supabase
            .from('articles')
            .select('*')
            .gte('created_at', targetDate.toISOString())
            .lt('created_at', nextDate.toISOString());
          
          if (!dbError && data) {
            dbArticles = data;
          }
        }
      }

      const allArticles: Article[] = [];
      
      for (const url of urls) {
        const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
        const data = await res.json();
        if (data.status === 'ok') {
          const items = data.items.map((item: any) => ({
            id: item.guid || item.link,
            title: item.title,
            link: item.link,
            description: item.description?.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...',
            pubDate: item.pubDate,
            source: data.feed.title,
            selected: false,
            from_db: false
          }));
          allArticles.push(...items);
        }
      }
      
      const filteredRss = allArticles.filter(a => {
        const pubDate = new Date(a.pubDate);
        return pubDate >= targetDate && pubDate < nextDate;
      });

      const merged: Article[] = [...dbArticles.map(dbA => ({
        id: dbA.id,
        title: dbA.title,
        link: dbA.link,
        description: dbA.summary,
        pubDate: dbA.created_at,
        source: 'Database',
        ai_score: dbA.ai_score,
        ai_analysis: dbA.ai_analysis,
        selected: false,
        from_db: true
      }))];

      for (const rssA of filteredRss) {
        if (!merged.find(m => m.link === rssA.link)) {
          merged.push(rssA);
        }
      }

      merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      
      if (merged.length === 0) {
        throw new Error(`Không có tin tức nào trong ngày ${selectedDate}.`);
      }

      setArticles(merged.slice(0, 30));
    } catch (err: any) {
      setError(err.message || "Lỗi khi tải RSS.");
    } finally {
      setLoading(false);
    }
  };

  const analyzeWithAI = async () => {
    const selectedArticles = articles.filter(a => a.selected);
    if (selectedArticles.length === 0) {
      setError("Vui lòng chọn ít nhất 1 tin bài để phân tích.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      
      const articlesData = selectedArticles.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description
      }));

      const prompt = `
        Bạn là một chuyên gia phân tích tin tức tài chính. Hãy đánh giá các tin bài sau dựa trên tiêu chí:
        "${settings.hotCriteria}"
        
        Danh sách tin bài (JSON):
        ${JSON.stringify(articlesData)}
        
        Nhiệm vụ: Chấm điểm từng tin bài từ 1 đến 10 dựa trên mức độ phù hợp với tiêu chí trên.
        Trả về kết quả dưới dạng JSON array, mỗi object gồm:
        - id: ID của tin bài
        - score: Điểm số (1-10)
        - reason: 1 câu tóm tắt lý do ngắn gọn.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                score: { type: Type.INTEGER },
                reason: { type: Type.STRING }
              },
              required: ["id", "score", "reason"]
            }
          },
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("AI không trả về kết quả.");
      
      const aiResults = JSON.parse(resultText);
      
      const updatedArticles = articles.map(article => {
        const aiData = aiResults.find((r: any) => r.id === article.id);
        if (aiData) {
          return { ...article, ai_score: aiData.score, ai_analysis: aiData.reason };
        }
        return article;
      });

      updatedArticles.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
      setArticles(updatedArticles);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi khi phân tích bằng AI.");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setArticles(articles.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  const toggleSelectAll = () => {
    const allSelected = articles.every(a => a.selected);
    setArticles(articles.map(a => ({ ...a, selected: !allSelected })));
  };

  const saveArticlesToDB = async () => {
    const selectedArticles = articles.filter(a => a.selected);
    if (selectedArticles.length === 0) {
      setError("Vui lòng chọn ít nhất 1 tin bài để lưu.");
      return;
    }

    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      setError("Vui lòng cấu hình Supabase trong phần Cấu hình.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
      if (!supabase) throw new Error("Không thể khởi tạo Supabase Client.");

      const newArticles = selectedArticles.filter(a => !a.from_db);
      const existingArticles = selectedArticles.filter(a => a.from_db);

      if (newArticles.length > 0) {
        const dataToInsert = newArticles.map(a => ({
          title: a.title,
          link: a.link,
          summary: a.description,
          ai_score: a.ai_score || 0,
          ai_analysis: a.ai_analysis || '',
          created_at: new Date(a.pubDate).toISOString()
        }));

        const { error: insertError } = await supabase.from('articles').insert(dataToInsert);
        if (insertError) throw insertError;
      }

      if (existingArticles.length > 0) {
        for (const a of existingArticles) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ ai_score: a.ai_score, ai_analysis: a.ai_analysis })
            .eq('id', a.id);
          if (updateError) throw updateError;
        }
      }

      setArticles(articles.map(a => a.selected ? { ...a, selected: false, from_db: true } : a));
      alert(`Đã lưu thành công ${selectedArticles.length} tin bài vào Database!`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi khi lưu vào Supabase.");
    } finally {
      setSaving(false);
    }
  };

  const generateReportAndSave = async () => {
    const selectedArticles = articles.filter(a => a.selected);
    if (selectedArticles.length === 0) {
      setError("Vui lòng chọn ít nhất 1 tin bài để tạo báo cáo.");
      return;
    }

    if (!settings.supabaseUrl || !settings.supabaseAnonKey) {
      setError("Vui lòng cấu hình Supabase trong phần Cấu hình.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseAnonKey);
      if (!supabase) throw new Error("Không thể khởi tạo Supabase Client.");

      // 1. Generate Report with Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
      const reportPrompt = `
        Bạn là chuyên gia phân tích tài chính cấp cao. Dựa vào danh sách các tin tức quan trọng sau đây, hãy viết một BÁO CÁO TỔNG HỢP THỊ TRƯỜNG bằng TIẾNG VIỆT.
        
        Yêu cầu báo cáo:
        1. Nhận định ảnh hưởng của từng tin tức (ngắn gọn).
        2. Đánh giá ảnh hưởng chung đến thị trường (Chứng khoán, Crypto, Kinh tế vĩ mô).
        3. Dự báo/Nhận định biến chuyển thị trường trong ngày hôm nay.
        
        ĐỊNH DẠNG BẮT BUỘC:
        Chỉ sử dụng các thẻ HTML được Telegram hỗ trợ: <b>, <i>, <u>, <s>, <a>, <code>, <pre>. 
        KHÔNG dùng <p>, <br>, <h1>, <ul>, <li>. 
        Sử dụng ký tự xuống dòng (\\n) để ngắt dòng. 
        Trả về nội dung text thuần túy chứa các thẻ HTML này, không bọc trong markdown block.
        
        Danh sách tin tức:
        ${JSON.stringify(selectedArticles.map(a => ({ title: a.title, summary: a.description, ai_analysis: a.ai_analysis, link: a.link })))}
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: reportPrompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          }
        }
      });

      let reportContent = response.text || '';
      reportContent = reportContent.replace(/^```html\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();

      // 2. Save Report to Supabase
      const { error: reportError } = await supabase
        .from('reports')
        .insert([{ content: reportContent, is_sent: false }]);

      if (reportError) throw reportError;

      setArticles(articles.map(a => a.selected ? { ...a, selected: false } : a));
      alert(`Đã tạo báo cáo và lưu thành công!`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Lỗi khi tạo báo cáo hoặc lưu vào Supabase.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Khám phá & Đánh giá AI</h2>
          <p className="text-gray-500 mt-1">Lấy tin tức từ RSS và dùng Gemini để chấm điểm & tạo báo cáo.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium text-gray-700"
            />
          </div>
          <button
            onClick={fetchRSS}
            disabled={loading || analyzing}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
            Tải RSS
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {articles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center bg-gray-50 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
                {articles.every(a => a.selected) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                Chọn tất cả ({articles.filter(a => a.selected).length}/{articles.length})
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={analyzeWithAI}
                disabled={loading || analyzing || !articles.some(a => a.selected)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Phân tích AI (Đã chọn)
              </button>
              <button
                onClick={saveArticlesToDB}
                disabled={saving || !articles.some(a => a.selected)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Lưu Tin (Đã chọn)
              </button>
              <button
                onClick={generateReportAndSave}
                disabled={saving || !articles.some(a => a.selected)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Tạo Báo Cáo & Lưu
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {articles.map((article) => (
              <div key={article.id} className={`p-4 flex gap-4 transition-colors ${article.selected ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                <button onClick={() => toggleSelect(article.id)} className="mt-1 text-gray-400 hover:text-blue-600">
                  {article.selected ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <a href={article.link} target="_blank" rel="noreferrer" className="text-lg font-semibold text-gray-900 hover:text-blue-600 flex items-center gap-2 group">
                      {article.title}
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                    {article.ai_score !== undefined && (
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg shrink-0 ${
                        article.ai_score >= 8 ? 'bg-red-100 text-red-700' :
                        article.ai_score >= 5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {article.ai_score}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-2">{article.description}</p>
                  
                  {article.ai_analysis && (
                    <div className="mt-3 bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex gap-2">
                      <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                      <p className="text-sm text-blue-900">{article.ai_analysis}</p>
                    </div>
                  )}
                  
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
                    <span className={article.from_db ? 'text-emerald-600 font-medium' : ''}>{article.source}</span>
                    <span>{new Date(article.pubDate).toLocaleString('vi-VN')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {articles.length === 0 && !loading && !error && (
        <div className="text-center py-20 bg-gray-50 rounded-xl border border-gray-200 border-dashed">
          <Rss className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Chưa có tin tức nào. Hãy bấm &quot;Tải RSS&quot; để bắt đầu.</p>
        </div>
      )}
    </div>
  );
}
