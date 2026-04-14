'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore, useAppStore, Article } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  RefreshCw, 
  ExternalLink, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter,
  Zap,
  ChevronDown,
  ChevronUp,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TabNewsFeed() {
  const { articles, setArticles, isLoading, setIsLoading } = useAppStore();
  const settings = useSettingsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const urls = settings.rssUrls.split('\n').filter(url => url.trim());
      const allArticles: Article[] = [];

      for (const url of urls) {
        try {
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url.trim())}`);
          const data = await res.json();
          if (data.status === 'ok') {
            const items = data.items.map((item: any) => ({
              id: item.guid || item.link,
              title: item.title,
              link: item.link,
              description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...',
              pubDate: item.pubDate,
              source: data.feed.title,
            }));
            allArticles.push(...items);
          }
        } catch (err) {
          console.error(`Error fetching RSS from ${url}:`, err);
        }
      }

      // Sort by date
      allArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
      setArticles(allArticles);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const analyzeArticles = async () => {
    if (!settings.geminiApiKey) {
      alert('Vui lòng cấu hình Gemini API Key trong Settings');
      return;
    }

    const selectedArticles = articles.filter(a => a.selected);
    if (selectedArticles.length === 0) {
      alert('Vui lòng chọn ít nhất một tin bài để phân tích');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_macro',
          payload: {
            articlesData: selectedArticles.map(a => ({ id: a.id, title: a.title, description: a.description })),
            apiKey: settings.geminiApiKey,
            customPrompt: settings.promptAnalysis
          }
        })
      });

      const data = await res.json();
      if (data.result && data.result.scores) {
        const scoresMap = new Map(data.result.scores.map((s: any) => [s.id, s]));
        const updatedArticles = articles.map(a => {
          const scoreObj = scoresMap.get(a.id) as any;
          if (scoreObj) {
            return { ...a, ai_score: scoreObj.score, ai_analysis: scoreObj.analysis };
          }
          return a;
        });
        setArticles(updatedArticles);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Lỗi khi phân tích tin bài');
    } finally {
      setIsLoading(false);
    }
  };

  const saveToSupabase = async () => {
    const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseKey);
    if (!supabase) {
      alert('Vui lòng cấu hình Supabase trong Settings');
      return;
    }

    const scoredArticles = articles.filter(a => a.ai_score !== undefined);
    if (scoredArticles.length === 0) {
      alert('Không có tin bài nào đã được chấm điểm để lưu');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('articles')
        .upsert(
          scoredArticles.map(a => ({
            link: a.link,
            title: a.title,
            summary: a.description,
            ai_score: a.ai_score,
            ai_analysis: a.ai_analysis,
            created_at: new Date(a.pubDate).toISOString()
          })),
          { onConflict: 'link' }
        );

      if (error) throw error;
      alert('Đã lưu tin bài vào Supabase thành công');
    } catch (error: any) {
      console.error('Supabase error:', error);
      alert(`Lỗi Supabase: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredArticles = articles.filter(a => {
    const matchesSearch = a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.source.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesScore = filterScore === null || (a.ai_score && a.ai_score >= filterScore);
    return matchesSearch && matchesScore;
  });

  const toggleSelect = (id: string) => {
    setArticles(articles.map(a => a.id === id ? { ...a, selected: !a.selected } : a));
  };

  const selectAll = () => {
    const allSelected = articles.every(a => a.selected);
    setArticles(articles.map(a => ({ ...a, selected: !allSelected })));
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="glass-card p-4 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input 
            type="text" 
            placeholder="Tìm kiếm tin tức..."
            className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:border-blue-500/50"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchNews} disabled={isLoading} className="btn-secondary flex items-center gap-2">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            Lấy tin mới
          </button>
          <button onClick={selectAll} className="btn-secondary">
            {articles.every(a => a.selected) ? 'Bỏ chọn hết' : 'Chọn hết'}
          </button>
          <button onClick={analyzeArticles} disabled={isLoading} className="btn-primary flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
            <Zap size={18} />
            Phân tích Macro
          </button>
          <button onClick={saveToSupabase} disabled={isLoading} className="btn-secondary flex items-center gap-2">
            <Save size={18} />
            Lưu Database
          </button>
        </div>
      </div>

      {/* Article List */}
      <div className="grid gap-4">
        <AnimatePresence>
          {filteredArticles.map((article) => (
            <motion.div 
              key={article.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`glass-card overflow-hidden transition-all ${article.selected ? 'border-blue-500/50 bg-blue-500/5' : ''}`}
            >
              <div className="p-5 flex gap-4">
                <div className="pt-1">
                  <input 
                    type="checkbox" 
                    checked={!!article.selected}
                    onChange={() => toggleSelect(article.id)}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-blue-600 focus:ring-blue-500"
                  />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-lg font-semibold leading-tight hover:text-blue-400 transition-colors">
                      <a href={article.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                        {article.title}
                        <ExternalLink size={14} className="opacity-50" />
                      </a>
                    </h3>
                    {article.ai_score !== undefined && (
                      <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                        article.ai_score >= 8 ? 'bg-emerald-500/20 text-emerald-400' :
                        article.ai_score >= 5 ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {article.ai_score}/10
                      </div>
                    )}
                  </div>

                  <p className="text-gray-400 text-sm line-clamp-2 mb-3">
                    {article.description}
                  </p>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="bg-white/5 px-2 py-1 rounded">{article.source}</span>
                    <span>{new Date(article.pubDate).toLocaleString('vi-VN')}</span>
                    {article.ai_analysis && (
                      <button 
                        onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                        className="text-blue-400 hover:underline flex items-center gap-1"
                      >
                        {expandedId === article.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        Xem phân tích vĩ mô
                      </button>
                    )}
                  </div>

                  <AnimatePresence>
                    {expandedId === article.id && article.ai_analysis && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-4 pt-4 border-t border-white/10 text-sm text-gray-300 leading-relaxed italic"
                      >
                        <div className="flex gap-2">
                          <Zap size={16} className="text-amber-400 shrink-0 mt-1" />
                          <p>{article.ai_analysis}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredArticles.length === 0 && !isLoading && (
          <div className="text-center py-20 glass-card">
            <AlertCircle size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-500">Không tìm thấy tin bài nào. Hãy nhấn "Lấy tin mới".</p>
          </div>
        )}
      </div>
    </div>
  );
}
