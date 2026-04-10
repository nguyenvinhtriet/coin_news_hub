'use client';

import { useState } from 'react';
import { useSettingsStore, useAppStore, Article } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { Loader2, Sparkles, Save, CheckSquare, Square, ExternalLink, Rss, FileText, Calendar, Zap, Filter } from 'lucide-react';

export default function TabNewsFeed() {
  const settings = useSettingsStore();
  const { articles, selectedDate, setArticles, setSelectedDate } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minScore, setMinScore] = useState<number>(7);
  const [mainSummary, setMainSummary] = useState<string | null>(null);
  const [usedApi, setUsedApi] = useState<string | null>(null);
  const [scoreFilter, setScoreFilter] = useState<string[]>(settings.defaultScoreFilter || ['9-10', '7-8', 'unscored']);

  const SCORE_RANGES = [
    { id: '9-10', label: '9-10', check: (s?: number) => s !== undefined && s >= 9 },
    { id: '7-8', label: '7-8', check: (s?: number) => s !== undefined && s >= 7 && s <= 8 },
    { id: '5-6', label: '5-6', check: (s?: number) => s !== undefined && s >= 5 && s <= 6 },
    { id: '1-4', label: '1-4', check: (s?: number) => s !== undefined && s >= 1 && s <= 4 },
    { id: 'unscored', label: 'Chưa chấm', check: (s?: number) => s === undefined }
  ];

  const filteredArticles = articles.filter(a => {
    return SCORE_RANGES.some(range => scoreFilter.includes(range.id) && range.check(a.ai_score));
  });

  const fetchRSSData = async () => {
    const urls = settings.rssUrls.split('\n').map(u => u.trim()).filter(u => u);
    if (urls.length === 0) {
      throw new Error("Vui lòng nhập ít nhất 1 RSS URL trong phần Cấu hình.");
    }

    const targetDate = new Date(selectedDate);
    targetDate.setHours(0, 0, 0, 0);
    const nextDate = new Date(targetDate);
    nextDate.setDate(nextDate.getDate() + 1);

    let dbArticles: any[] = [];
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || settings.supabaseUrl;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || settings.supabaseAnonKey;

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
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
      try {
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
      } catch (e) {
        console.error("Error fetching RSS URL:", url, e);
      }
    }
    
    const filteredRss = allArticles.filter(a => {
      const pubDate = new Date(a.pubDate);
      return pubDate >= targetDate && pubDate < nextDate;
    });

    const currentArticlesMap = new Map(articles.map(a => [a.link, a]));

    const merged: Article[] = [...dbArticles.map(dbA => {
      const existing = currentArticlesMap.get(dbA.link);
      return {
        id: dbA.id,
        title: dbA.title,
        link: dbA.link,
        description: dbA.summary,
        pubDate: dbA.created_at,
        source: 'Database',
        ai_score: existing?.ai_score !== undefined ? existing.ai_score : dbA.ai_score,
        ai_analysis: existing?.ai_analysis || dbA.ai_analysis,
        selected: existing ? existing.selected : false,
        from_db: true
      };
    })];

    for (const rssA of filteredRss) {
      if (!merged.find(m => m.link === rssA.link)) {
        const existing = currentArticlesMap.get(rssA.link);
        if (existing) {
          merged.push(existing);
        } else {
          merged.push(rssA);
        }
      }
    }

    merged.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
    
    if (merged.length === 0) {
      throw new Error(`Không có tin tức nào trong ngày ${selectedDate}.`);
    }

    return merged.slice(0, 100);
  };

  const fetchRSS = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRSSData();
      setArticles(data);
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
      const articlesData = selectedArticles.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description
      }));

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score_only',
          payload: {
            articlesData,
            hotCriteria: settings.hotCriteria,
            apiKey: settings.geminiApiKey,
            groqApiKey: settings.groqApiKey
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi gọi API chấm điểm.");

      const aiResults = data.results;
      
      const updatedArticles = articles.map(article => {
        const aiData = aiResults.find((r: any) => r.id === article.id);
        if (aiData) {
          return { ...article, ai_score: aiData.score };
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || settings.supabaseUrl;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || settings.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Vui lòng cấu hình Supabase trong Environment Variables hoặc Settings.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
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
        if (insertError) throw new Error(insertError.message || JSON.stringify(insertError));
      }

      if (existingArticles.length > 0) {
        for (const a of existingArticles) {
          const { error: updateError } = await supabase
            .from('articles')
            .update({ ai_score: a.ai_score, ai_analysis: a.ai_analysis })
            .eq('id', a.id);
          if (updateError) throw new Error(updateError.message || JSON.stringify(updateError));
        }
      }

      setArticles(articles.map(a => a.selected ? { ...a, selected: false, from_db: true } : a));
      alert(`Đã lưu thành công ${selectedArticles.length} tin bài vào Database!`);
    } catch (err: any) {
      console.error("Error details:", err);
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      if (errMsg.includes("Forbidden use of secret API key in browser")) {
        setError("Lỗi cấu hình Supabase: Bạn đang sử dụng 'Service Role Key' (khóa bí mật) thay vì 'Anon Key' (khóa công khai). Vui lòng vào Supabase Dashboard -> Project Settings -> API để copy đúng khóa 'anon' (public) và cập nhật lại trong Cài đặt.");
      } else {
        setError(errMsg || "Lỗi khi lưu vào Supabase.");
      }
    } finally {
      setSaving(false);
    }
  };

  const generateReportAndSave = async () => {
    const selectedArticles = filteredArticles.filter(a => a.selected && a.ai_score !== undefined);
    if (selectedArticles.length === 0) {
      setError(`Vui lòng chọn ít nhất 1 tin bài đã được chấm điểm để phân tích chi tiết và tạo báo cáo.`);
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || settings.supabaseUrl;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || settings.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Vui lòng cấu hình Supabase trong Environment Variables hoặc Settings.");
      return;
    }

    setSaving(true);
    setError(null);
    setMainSummary(null);
    setUsedApi(null);

    try {
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
      if (!supabase) throw new Error("Không thể khởi tạo Supabase Client.");

      // 1. Generate Detailed Analysis & Report with Gemini
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_and_report',
          payload: {
            articlesData: selectedArticles.map(a => ({ id: a.id, title: a.title, summary: a.description, link: a.link })),
            apiKey: settings.geminiApiKey,
            groqApiKey: settings.groqApiKey
          }
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi gọi API tạo báo cáo.");

      const reportContent = data.summary;
      const notes = data.notes || {};
      
      setMainSummary(reportContent);
      setUsedApi(data.usedApi);

      // Update articles with detailed notes
      const updatedArticles = articles.map(article => {
        if (notes[article.id]) {
          return { ...article, ai_analysis: notes[article.id] };
        }
        return article;
      });
      setArticles(updatedArticles);

      // 2. Save Report to Supabase
      const { error: reportError } = await supabase
        .from('reports')
        .insert([{ content: reportContent, is_sent: false }]);

      if (reportError) throw new Error(reportError.message || JSON.stringify(reportError));

      // Deselect the ones we just processed
      setArticles(updatedArticles.map(a => selectedArticles.find(sa => sa.id === a.id) ? { ...a, selected: false } : a));
      
      alert(`Đã phân tích chi tiết, tạo báo cáo và lưu thành công!`);
    } catch (err: any) {
      console.error("Error details:", err);
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      if (errMsg.includes("Forbidden use of secret API key in browser")) {
        setError("Lỗi cấu hình Supabase: Bạn đang sử dụng 'Service Role Key' (khóa bí mật) thay vì 'Anon Key' (khóa công khai). Vui lòng vào Supabase Dashboard -> Project Settings -> API để copy đúng khóa 'anon' (public) và cập nhật lại trong Cài đặt.");
      } else {
        setError(errMsg || "Lỗi khi tạo báo cáo hoặc lưu vào Supabase.");
      }
    } finally {
      setSaving(false);
    }
  };

  const runAutoProcess = async () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || settings.supabaseUrl;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || settings.supabaseAnonKey;

    if (!supabaseUrl || !supabaseAnonKey) {
      setError("Vui lòng cấu hình Supabase trong Environment Variables hoặc Settings để dùng tính năng Tự động.");
      return;
    }

    setLoading(true);
    setAnalyzing(true);
    setSaving(true);
    setError(null);
    setMainSummary(null);
    setUsedApi(null);

    try {
      // 1. Fetch RSS
      const fetchedArticles = await fetchRSSData();
      
      // 2. Score All
      const articlesToScore = fetchedArticles.map(a => ({
        id: a.id,
        title: a.title,
        description: a.description
      }));

      const scoreRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score_only',
          payload: {
            articlesData: articlesToScore,
            hotCriteria: settings.hotCriteria,
            apiKey: settings.geminiApiKey,
            groqApiKey: settings.groqApiKey
          }
        })
      });

      const scoreData = await scoreRes.json();
      if (!scoreRes.ok) throw new Error(scoreData.error || "Lỗi khi gọi API chấm điểm.");

      const aiResults = scoreData.results;
      let scoredArticles = fetchedArticles.map(article => {
        const aiData = aiResults.find((r: any) => r.id === article.id);
        if (aiData) {
          return { ...article, ai_score: aiData.score };
        }
        return article;
      });

      scoredArticles.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));

      // 3. Filter >= minScore
      const highScored = scoredArticles.filter(a => {
        return SCORE_RANGES.some(range => range.id !== 'unscored' && scoreFilter.includes(range.id) && range.check(a.ai_score));
      });
      if (highScored.length === 0) {
        setArticles(scoredArticles);
        alert(`Đã tải và chấm điểm xong. Không có tin nào thỏa mãn bộ lọc điểm để phân tích sâu.`);
        return;
      }

      // 4. Analyze & Report
      const reportRes = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_and_report',
          payload: {
            articlesData: highScored.map(a => ({ id: a.id, title: a.title, summary: a.description, link: a.link })),
            apiKey: settings.geminiApiKey,
            groqApiKey: settings.groqApiKey
          }
        })
      });

      const reportData = await reportRes.json();
      if (!reportRes.ok) throw new Error(reportData.error || "Lỗi khi gọi API tạo báo cáo.");

      const reportContent = reportData.summary;
      const notes = reportData.notes || {};
      setMainSummary(reportContent);
      setUsedApi(reportData.usedApi);

      scoredArticles = scoredArticles.map(article => {
        if (notes[article.id]) {
          return { ...article, ai_analysis: notes[article.id] };
        }
        return article;
      });

      // 5. Save to DB
      const supabase = getSupabaseClient(supabaseUrl, supabaseAnonKey);
      if (supabase) {
        // Save Report
        await supabase.from('reports').insert([{ content: reportContent, is_sent: false }]);

        // Save Articles
        const newArticles = highScored.filter(a => !a.from_db);
        const existingArticles = highScored.filter(a => a.from_db);

        if (newArticles.length > 0) {
          const dataToInsert = newArticles.map(a => {
            const finalA = scoredArticles.find(sa => sa.id === a.id) || a;
            return {
              title: finalA.title,
              link: finalA.link,
              summary: finalA.description,
              ai_score: finalA.ai_score || 0,
              ai_analysis: finalA.ai_analysis || '',
              created_at: new Date(finalA.pubDate).toISOString()
            };
          });
          await supabase.from('articles').insert(dataToInsert);
        }

        if (existingArticles.length > 0) {
          for (const a of existingArticles) {
            const finalA = scoredArticles.find(sa => sa.id === a.id) || a;
            await supabase
              .from('articles')
              .update({ ai_score: finalA.ai_score, ai_analysis: finalA.ai_analysis })
              .eq('id', finalA.id);
          }
        }

        scoredArticles = scoredArticles.map(a => highScored.find(ha => ha.id === a.id) ? { ...a, from_db: true } : a);
      }

      setArticles(scoredArticles);
      alert(`Hoàn tất quy trình Tự động! Đã xử lý và lưu ${highScored.length} tin bài.`);

    } catch (err: any) {
      console.error("Error details:", err);
      const errMsg = err?.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      if (errMsg.includes("Forbidden use of secret API key in browser")) {
        setError("Lỗi cấu hình Supabase: Bạn đang sử dụng 'Service Role Key' (khóa bí mật) thay vì 'Anon Key' (khóa công khai). Vui lòng vào Supabase Dashboard -> Project Settings -> API để copy đúng khóa 'anon' (public) và cập nhật lại trong Cài đặt.");
      } else {
        setError(errMsg || "Lỗi trong quá trình Tự động.");
      }
    } finally {
      setLoading(false);
      setAnalyzing(false);
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
            disabled={loading || analyzing || saving}
            className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {loading && !analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rss className="w-4 h-4" />}
            Tải RSS
          </button>
          <button
            onClick={runAutoProcess}
            disabled={loading || analyzing || saving}
            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium shadow-sm"
          >
            {(loading || analyzing || saving) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            Tự động (All-in-one)
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-100">
          {error}
        </div>
      )}

      {mainSummary && (
        <div className="bg-emerald-50 rounded-xl shadow-sm border border-emerald-200 overflow-hidden p-6 mb-6">
          <h3 className="text-lg font-bold text-emerald-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Báo cáo tổng hợp thị trường
          </h3>
          <div 
            className="prose prose-sm max-w-none text-emerald-800"
            dangerouslySetInnerHTML={{ __html: mainSummary.replace(/\n/g, '<br/>') }}
          />
          {usedApi && (
            <div className="mt-4 pt-4 border-t border-emerald-200/50 text-right text-xs text-emerald-600/70 font-medium">
              Powered by {usedApi}
            </div>
          )}
        </div>
      )}

      {articles.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex flex-wrap justify-between items-center bg-gray-50 gap-4">
            <div className="flex items-center gap-4">
              <button onClick={toggleSelectAll} className="flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium">
                {filteredArticles.length > 0 && filteredArticles.every(a => a.selected) ? <CheckSquare className="w-5 h-5 text-blue-600" /> : <Square className="w-5 h-5" />}
                Chọn tất cả ({filteredArticles.filter(a => a.selected).length}/{filteredArticles.length})
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 w-full sm:w-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-1"><Filter className="w-4 h-4"/> Lọc:</span>
                {SCORE_RANGES.map(range => (
                  <label key={range.id} className="flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={scoreFilter.includes(range.id)}
                      onChange={(e) => {
                        if (e.target.checked) setScoreFilter([...scoreFilter, range.id]);
                        else setScoreFilter(scoreFilter.filter(id => id !== range.id));
                      }}
                      className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                    />
                    <span className="text-xs text-gray-700 whitespace-nowrap">{range.label}</span>
                  </label>
                ))}
              </div>
              <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
              <button
                onClick={analyzeWithAI}
                disabled={loading || analyzing || !filteredArticles.some(a => a.selected)}
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap shrink-0"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Sparkles className="w-4 h-4 shrink-0" />}
                Chấm điểm AI (Đã chọn)
              </button>
              <button
                onClick={generateReportAndSave}
                disabled={saving || !filteredArticles.some(a => a.selected)}
                className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap shrink-0"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <FileText className="w-4 h-4 shrink-0" />}
                Phân tích chi tiết & Tạo Báo Cáo
              </button>
              <button
                onClick={saveArticlesToDB}
                disabled={saving || !filteredArticles.some(a => a.selected)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm font-medium whitespace-nowrap shrink-0"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Save className="w-4 h-4 shrink-0" />}
                Lưu Tin (Đã chọn)
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredArticles.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Không có tin tức nào phù hợp với bộ lọc.
              </div>
            ) : (
              filteredArticles.map((article) => (
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
              ))
            )}
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
