'use client';

import { useState } from 'react';
import { useSettingsStore } from '@/lib/store';
import { 
  Wallet, 
  Plus, 
  Trash2, 
  TrendingUp, 
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

export default function TabPortfolio() {
  const settings = useSettingsStore();
  const [assets, setAssets] = useState([
    { name: 'Bitcoin', symbol: 'BTC', amount: 0.5, price: 65000, change: 2.5 },
    { name: 'Ethereum', symbol: 'ETH', amount: 5, price: 3500, change: -1.2 },
    { name: 'Solana', symbol: 'SOL', amount: 50, price: 145, change: 5.8 },
    { name: 'Gold', symbol: 'XAU', amount: 10, price: 2350, change: 0.5 },
  ]);

  const totalValue = assets.reduce((acc, asset) => acc + (asset.amount * asset.price), 0);

  return (
    <div className="space-y-8">
      {/* Portfolio Header */}
      <div className="glass-card p-8 bg-gradient-to-br from-blue-600/10 to-emerald-600/10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className="text-gray-400 text-sm font-medium uppercase tracking-wider">Tổng giá trị tài sản</span>
            <div className="text-5xl font-bold mt-1 text-white">
              ${totalValue.toLocaleString()}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-gray-500 block mb-1">Lợi nhuận 24h</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <ArrowUpRight size={16} />
                +3.2%
              </span>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
              <span className="text-xs text-gray-500 block mb-1">Vị thế vĩ mô</span>
              <span className="text-blue-400 font-bold">LONG USD/BTC</span>
            </div>
          </div>
        </div>
      </div>

      {/* Asset List */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <PieChart className="text-purple-400" />
            Danh mục đầu tư
          </h2>
          <button className="btn-secondary flex items-center gap-2 text-sm">
            <Plus size={16} />
            Thêm tài sản
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-gray-500 text-sm border-b border-white/5">
                <th className="px-6 py-4 font-medium">Tài sản</th>
                <th className="px-6 py-4 font-medium">Số lượng</th>
                <th className="px-6 py-4 font-medium">Giá hiện tại</th>
                <th className="px-6 py-4 font-medium">Giá trị</th>
                <th className="px-6 py-4 font-medium">Biến động 24h</th>
                <th className="px-6 py-4 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {assets.map((asset) => (
                <tr key={asset.symbol} className="hover:bg-white/5 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {asset.symbol[0]}
                      </div>
                      <div>
                        <div className="font-bold">{asset.name}</div>
                        <div className="text-xs text-gray-500">{asset.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">{asset.amount}</td>
                  <td className="px-6 py-4 font-medium">${asset.price.toLocaleString()}</td>
                  <td className="px-6 py-4 font-bold">${(asset.amount * asset.price).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <span className={`flex items-center gap-1 font-medium ${asset.change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {asset.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {Math.abs(asset.change)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Insight */}
      <div className="glass-card p-6 bg-blue-600/5 border-blue-500/20">
        <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2">
          <TrendingUp size={18} />
          Phân tích danh mục theo Vĩ mô
        </h3>
        <p className="text-sm text-gray-400 leading-relaxed">
          Danh mục của bạn đang tập trung 75% vào các tài sản "Digital Dollar" (BTC, ETH, SOL) và 25% vào Vàng. 
          Đây là cấu trúc phòng thủ tốt trước sự rung lắc của Petrodollar. Khi dòng tiền rời bỏ USD truyền thống, 
          hệ thống MM Mỹ có xu hướng đẩy thanh khoản vào các quỹ ETF Bitcoin để giữ chân dòng vốn toàn cầu trong hệ sinh thái Đô la số.
        </p>
      </div>
    </div>
  );
}
