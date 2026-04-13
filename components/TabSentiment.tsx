import { useState, useEffect } from 'react';
import { useSettingsStore } from '@/lib/store';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Minus, Activity, AlertCircle } from 'lucide-react';

export default function TabSentiment() {
  const { supabaseUrl, supabaseAnonKey } = useSettingsStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSentiment() {
      if (!supabaseUrl || !supabaseAnonKey) {
        setError('Vui lòng cấu hình Supabase trong tab Cài đặt.');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const { data: sentimentData, error: dbError } = await supabase
          .from('market_sentiment')
          .select('*')
          .order('date', { ascending: true })
          .limit(30); // Lấy 30 ngày gần nhất

        if (dbError) throw dbError;
        
        // Format date for chart
        const formattedData = (sentimentData || []).map(item => ({
          ...item,
          displayDate: new Date(item.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
        }));
        
        setData(formattedData);
      } catch (err: any) {
        console.error('Error fetching sentiment:', err);
        setError(err.message || 'Lỗi khi tải dữ liệu tâm lý thị trường.');
      } finally {
        setLoading(false);
      }
    }

    fetchSentiment();
  }, [supabaseUrl, supabaseAnonKey]);

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Không thể tải dữ liệu</p>
          <p className="text-sm mt-1">{error}</p>
          <p className="text-sm mt-2 text-red-500">Lưu ý: Bạn cần tạo bảng <code>market_sentiment</code> trong Supabase trước. Xem hướng dẫn ở tab Guideline.</p>
        </div>
      </div>
    );
  }

  const latestData = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Phân tích Tâm lý Thị trường (Sentiment Trend)</h2>
        </div>
        <p className="text-gray-500 ml-13">Biểu đồ trực quan hoá xu hướng tâm lý Bullish/Bearish qua các ngày dựa trên phân tích của AI.</p>
      </div>

      {data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Chưa có dữ liệu</h3>
          <p className="text-gray-500 mt-2">Hệ thống chưa ghi nhận dữ liệu tâm lý nào. Dữ liệu sẽ được tạo tự động khi chạy Cron Job.</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          {latestData && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Chỉ số Bullish (Hôm nay)</p>
                  <p className="text-2xl font-bold text-gray-900">{latestData.bullish_score}/100</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <TrendingDown className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Chỉ số Bearish (Hôm nay)</p>
                  <p className="text-2xl font-bold text-gray-900">{latestData.bearish_score}/100</p>
                </div>
              </div>
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  latestData.trend === 'bullish' ? 'bg-green-100 text-green-600' : 
                  latestData.trend === 'bearish' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'
                }`}>
                  {latestData.trend === 'bullish' ? <TrendingUp className="w-6 h-6" /> : 
                   latestData.trend === 'bearish' ? <TrendingDown className="w-6 h-6" /> : <Minus className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Xu hướng chung</p>
                  <p className="text-2xl font-bold text-gray-900 capitalize">{latestData.trend}</p>
                </div>
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Biểu đồ xu hướng (30 ngày gần nhất)</h3>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBullish" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorBearish" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="displayDate" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    labelStyle={{ fontWeight: 'bold', color: '#374151', marginBottom: '4px' }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area type="monotone" dataKey="bullish_score" name="Bullish Score" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorBullish)" />
                  <Area type="monotone" dataKey="bearish_score" name="Bearish Score" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorBearish)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Summary Log */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Nhật ký phân tích AI</h3>
            <div className="space-y-4">
              {[...data].reverse().map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex gap-4">
                  <div className="shrink-0 mt-1">
                    {item.trend === 'bullish' ? <TrendingUp className="w-5 h-5 text-green-500" /> : 
                     item.trend === 'bearish' ? <TrendingDown className="w-5 h-5 text-red-500" /> : <Minus className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">{new Date(item.date).toLocaleDateString('vi-VN')}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-medium">
                        Bull: {item.bullish_score} | Bear: {item.bearish_score}
                      </span>
                    </div>
                    <p className="text-gray-700 text-sm">{item.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
