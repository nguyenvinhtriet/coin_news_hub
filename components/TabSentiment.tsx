'use client';

import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  RefreshCw,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

export default function TabSentiment() {
  const settings = useSettingsStore();
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSentiment = async () => {
    const supabase = getSupabaseClient(settings.supabaseUrl, settings.supabaseKey);
    if (!supabase) return;

    setIsLoading(true);
    try {
      const { data: sentimentData } = await supabase
        .from('market_sentiment')
        .select('*')
        .order('date', { ascending: true })
        .limit(30);
      
      if (sentimentData) setData(sentimentData);
    } catch (error) {
      console.error('Fetch sentiment error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSentiment();
  }, []);

  const latest = data[data.length - 1] || { bullish_score: 50, bearish_score: 50, trend: 'N/A', summary: 'Chưa có dữ liệu phân tích.' };

  return (
    <div className="space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 font-medium">Bullish Score</span>
            <TrendingUp className="text-emerald-500" />
          </div>
          <div className="text-4xl font-bold text-emerald-400">{latest.bullish_score}%</div>
          <div className="mt-2 h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500" style={{ width: `${latest.bullish_score}%` }} />
          </div>
        </div>

        <div className="glass-card p-6 border-red-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 font-medium">Bearish Score</span>
            <TrendingDown className="text-red-500" />
          </div>
          <div className="text-4xl font-bold text-red-400">{latest.bearish_score}%</div>
          <div className="mt-2 h-2 w-full bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-red-500" style={{ width: `${latest.bearish_score}%` }} />
          </div>
        </div>

        <div className="glass-card p-6 border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-400 font-medium">Current Trend</span>
            <Activity className="text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-400 uppercase tracking-wider">{latest.trend}</div>
          <p className="text-xs text-gray-500 mt-2">Dựa trên phân tích vĩ mô Petrodollar</p>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <BarChart3 className="text-blue-400" />
            Biến động tâm lý thị trường (30 ngày)
          </h2>
          <button onClick={fetchSentiment} className="btn-secondary p-2">
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorBull" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorBear" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="#666" 
                fontSize={12} 
                tickFormatter={(str) => new Date(str).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis stroke="#666" fontSize={12} domain={[0, 100]} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '8px' }}
                itemStyle={{ fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="bullish_score" stroke="#10b981" fillOpacity={1} fill="url(#colorBull)" name="Bullish" />
              <Area type="monotone" dataKey="bearish_score" stroke="#ef4444" fillOpacity={1} fill="url(#colorBear)" name="Bearish" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
          <Zap className="text-amber-400" />
          Nhận định chuyên sâu từ AI
        </h2>
        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-gray-300 leading-relaxed">
          {latest.summary}
        </div>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
          <AlertTriangle size={14} />
          <span>Đây là phân tích dựa trên dữ liệu tin tức, không phải lời khuyên đầu tư.</span>
        </div>
      </div>
    </div>
  );
}
