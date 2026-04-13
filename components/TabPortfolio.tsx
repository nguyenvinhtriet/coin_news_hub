import { useState } from 'react';
import { useSettingsStore, useAppStore } from '@/lib/store';
import { createClient } from '@supabase/supabase-js';
import { Wallet, Plus, Trash2, TrendingUp, DollarSign, Sparkles, Loader2, TrendingDown, Minus, AlertCircle, Send } from 'lucide-react';

export default function TabPortfolio() {
  const { portfolio, setSettings, geminiApiKey, groqApiKey, telegramBotToken, telegramChatId, supabaseUrl, supabaseAnonKey } = useSettingsStore();
  const { articles } = useAppStore();
  const [newCoin, setNewCoin] = useState('');
  const [newAmount, setNewAmount] = useState('');
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);

  const syncPortfolioToDB = async (newPortfolio: any[]) => {
    if (supabaseUrl && supabaseAnonKey) {
      try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        await supabase.from('app_settings').upsert({ key: 'portfolio', value: JSON.stringify(newPortfolio) });
      } catch (err) {
        console.error('Failed to sync portfolio to DB:', err);
      }
    }
  };

  const handleAddCoin = () => {
    if (!newCoin.trim() || !newAmount || isNaN(Number(newAmount))) return;
    
    const updatedPortfolio = [...portfolio];
    const existingIndex = updatedPortfolio.findIndex(p => p.coin.toUpperCase() === newCoin.toUpperCase());
    
    if (existingIndex >= 0) {
      updatedPortfolio[existingIndex].amount += Number(newAmount);
    } else {
      updatedPortfolio.push({ coin: newCoin.toUpperCase(), amount: Number(newAmount) });
    }
    
    setSettings({ portfolio: updatedPortfolio });
    syncPortfolioToDB(updatedPortfolio);
    setNewCoin('');
    setNewAmount('');
  };

  const handleRemoveCoin = (index: number) => {
    const updatedPortfolio = [...portfolio];
    updatedPortfolio.splice(index, 1);
    setSettings({ portfolio: updatedPortfolio });
    syncPortfolioToDB(updatedPortfolio);
  };

  const handleAnalyzeImpact = async () => {
    if (portfolio.length === 0) {
      setError('Vui lòng thêm tài sản vào danh mục trước khi phân tích.');
      return;
    }
    
    // Get top articles (score >= 7) or just recent ones if not scored
    const topArticles = articles.filter(a => (a.ai_score || 0) >= 7).slice(0, 10);
    const articlesToAnalyze = topArticles.length > 0 ? topArticles : articles.slice(0, 10);

    if (articlesToAnalyze.length === 0) {
      setError('Không có tin tức nào để phân tích. Vui lòng qua tab Khám phá để lấy tin tức mới nhất.');
      return;
    }

    if (!geminiApiKey && !groqApiKey) {
      setError('Vui lòng cấu hình API Key trong tab Cài đặt.');
      return;
    }

    setIsAnalyzing(true);
    setError('');
    setAnalysisResult(null);

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_portfolio_impact',
          payload: {
            articlesData: articlesToAnalyze.map(a => ({ title: a.title, description: a.description })),
            portfolio,
            apiKey: geminiApiKey,
            groqApiKey
          }
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to analyze impact');
      }

      const data = await res.json();
      setAnalysisResult(data.result);
      setSendSuccess(false);
    } catch (err: any) {
      console.error('Error analyzing portfolio:', err);
      setError(err.message || 'Đã có lỗi xảy ra khi phân tích.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendTelegram = async () => {
    if (!analysisResult) return;
    if (!telegramBotToken || !telegramChatId) {
      setError('Vui lòng cấu hình Telegram Bot Token và Chat ID trong tab Cài đặt.');
      return;
    }

    setIsSending(true);
    setError('');
    setSendSuccess(false);

    try {
      // Format the analysis result into a beautiful HTML message for Telegram
      let message = `<b>💼 PHÂN TÍCH DANH MỤC ĐẦU TƯ (AI)</b>\n\n`;
      message += `<b>📊 Đánh giá chung:</b>\n${analysisResult.overall_impact}\n\n`;
      message += `<b>🎯 Phân tích chi tiết tài sản:</b>\n\n`;

      analysisResult.asset_analysis?.forEach((asset: any) => {
        const trendEmoji = asset.trend.toLowerCase().includes('tăng') || asset.trend.toLowerCase().includes('up') ? '📈' :
                           asset.trend.toLowerCase().includes('giảm') || asset.trend.toLowerCase().includes('down') ? '📉' : '➖';
        
        message += `🔹 <b>${asset.coin}</b> ${trendEmoji} <i>(${asset.trend})</i>\n`;
        message += `   📝 <b>Lý do:</b> ${asset.reason}\n`;
        message += `   🔮 <b>Dự báo:</b> ${asset.predict}\n`;
        message += `   ⚡ <b>Hành động:</b> <code>${asset.action}</code>\n\n`;
      });

      const res = await fetch('/api/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent: message,
          botToken: telegramBotToken,
          chatId: telegramChatId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send to Telegram');
      }

      setSendSuccess(true);
      setTimeout(() => setSendSuccess(false), 3000);
    } catch (err: any) {
      console.error('Error sending to Telegram:', err);
      setError(err.message || 'Lỗi khi gửi báo cáo Telegram.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
            <Wallet className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Theo dõi danh mục (Portfolio)</h2>
        </div>
        <p className="text-gray-500 ml-13">Nhập danh mục đầu tư của bạn để AI cá nhân hoá báo cáo và phân tích tác động của tin tức lên tài sản của bạn.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Coin Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-500" /> Thêm tài sản
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mã Coin (VD: BTC, ETH)</label>
              <input
                type="text"
                value={newCoin}
                onChange={(e) => setNewCoin(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 uppercase"
                placeholder="BTC"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng</label>
              <input
                type="number"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="0.5"
                step="any"
              />
            </div>
            <button
              onClick={handleAddCoin}
              disabled={!newCoin.trim() || !newAmount}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Thêm vào danh mục
            </button>
          </div>
        </div>

        {/* Portfolio List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Danh mục hiện tại
          </h3>
          
          {portfolio.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
              <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Danh mục của bạn đang trống.</p>
              <p className="text-sm text-gray-400 mt-1">Hãy thêm tài sản để AI có thể phân tích cá nhân hoá cho bạn.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-sm text-gray-500">
                    <th className="pb-3 font-medium">Tài sản (Coin)</th>
                    <th className="pb-3 font-medium">Số lượng</th>
                    <th className="pb-3 font-medium text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {portfolio.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="py-4 font-bold text-gray-900 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                          {item.coin.substring(0, 3)}
                        </div>
                        {item.coin}
                      </td>
                      <td className="py-4 text-gray-700">{item.amount.toLocaleString('en-US', { maximumFractionDigits: 6 })}</td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => handleRemoveCoin(index)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Xoá"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Impact Analysis Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-500" />
              Phân tích Tác động (AI)
            </h3>
            <p className="text-gray-500 text-sm mt-1">Đánh giá ảnh hưởng của tin tức mới nhất lên danh mục của bạn.</p>
          </div>
          <button
            onClick={handleAnalyzeImpact}
            disabled={isAnalyzing || portfolio.length === 0}
            className="flex items-center justify-center gap-2 bg-purple-600 text-white px-6 py-2.5 rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {isAnalyzing ? 'Đang phân tích...' : 'Phân tích ngay'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-start gap-3 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {analysisResult && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-end mb-4">
              <button
                onClick={handleSendTelegram}
                disabled={isSending}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  sendSuccess ? 'bg-green-100 text-green-700' : 'bg-sky-100 text-sky-700 hover:bg-sky-200'
                } disabled:opacity-50`}
              >
                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {sendSuccess ? 'Đã gửi thành công!' : 'Gửi báo cáo Telegram'}
              </button>
            </div>

            <div className="bg-purple-50 p-5 rounded-xl border border-purple-100">
              <h4 className="font-semibold text-purple-900 mb-2">Đánh giá chung</h4>
              <p className="text-purple-800 leading-relaxed">{analysisResult.overall_impact}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analysisResult.asset_analysis?.map((asset: any, idx: number) => (
                <div key={idx} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-700 text-xs">
                        {asset.coin.substring(0, 3)}
                      </div>
                      <span className="font-bold text-gray-900">{asset.coin}</span>
                    </div>
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                      asset.trend.toLowerCase().includes('tăng') || asset.trend.toLowerCase().includes('up') ? 'bg-green-100 text-green-700' :
                      asset.trend.toLowerCase().includes('giảm') || asset.trend.toLowerCase().includes('down') ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {asset.trend.toLowerCase().includes('tăng') || asset.trend.toLowerCase().includes('up') ? <TrendingUp className="w-3 h-3" /> :
                       asset.trend.toLowerCase().includes('giảm') || asset.trend.toLowerCase().includes('down') ? <TrendingDown className="w-3 h-3" /> :
                       <Minus className="w-3 h-3" />}
                      {asset.trend}
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed mb-3">{asset.reason}</p>
                  <div className="space-y-2 border-t border-gray-100 pt-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">Dự báo:</span>
                      <span className="text-sm text-gray-800">{asset.predict}</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider shrink-0 mt-0.5">Hành động:</span>
                      <span className="text-sm text-blue-700 font-medium">{asset.action}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
