'use client';

import { useState, useEffect } from 'react';
import { LayoutDashboard, Send, Settings, Newspaper, LogOut } from 'lucide-react';
import TabNewsFeed from '@/components/TabNewsFeed';
import TabDispatcher from '@/components/TabDispatcher';
import TabSettings from '@/components/TabSettings';
import Login from '@/components/Login';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'feed' | 'dispatcher' | 'settings'>('feed');
  const [mounted, setMounted] = useState(false);
  const { isAuthenticated, logout } = useAuthStore();

  // Prevent hydration mismatch for Zustand persist
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-20">
        <div className="flex items-center gap-2 text-blue-600 font-bold text-lg">
          <LayoutDashboard className="w-5 h-5" />
          <span>AI News Hub</span>
        </div>
        <button onClick={logout} className="text-gray-400 hover:text-red-600 transition-colors" title="Đăng xuất">
          <LogOut className="w-5 h-5" />
        </button>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-col fixed inset-y-0 z-10">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 text-blue-600 font-bold text-xl">
              <LayoutDashboard className="w-6 h-6" />
              <span>AI News Hub</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Aggregator & Dispatcher</p>
          </div>
          <button onClick={logout} className="text-gray-400 hover:text-red-600 transition-colors" title="Đăng xuất">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => setActiveTab('feed')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'feed' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Newspaper className="w-5 h-5" />
            Khám phá & Đánh giá
          </button>
          
          <button
            onClick={() => setActiveTab('dispatcher')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'dispatcher' ? 'bg-sky-50 text-sky-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Send className="w-5 h-5" />
            Quản lý & Gửi Telegram
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'settings' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <Settings className="w-5 h-5" />
            Cấu hình hệ thống
          </button>
        </nav>
        
        <div className="p-4 border-t border-gray-100 text-xs text-gray-400 text-center">
          Powered by Gemini AI & Supabase
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pb-24 md:pb-8">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'feed' && <TabNewsFeed />}
          {activeTab === 'dispatcher' && <TabDispatcher />}
          {activeTab === 'settings' && <TabSettings />}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-20 pb-safe">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] font-medium ${
            activeTab === 'feed' ? 'text-blue-600' : 'text-gray-500'
          }`}
        >
          <Newspaper className="w-6 h-6 mb-1" />
          Khám phá
        </button>
        <button
          onClick={() => setActiveTab('dispatcher')}
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] font-medium ${
            activeTab === 'dispatcher' ? 'text-sky-600' : 'text-gray-500'
          }`}
        >
          <Send className="w-6 h-6 mb-1" />
          Gửi tin
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center p-2 rounded-lg text-[10px] font-medium ${
            activeTab === 'settings' ? 'text-gray-900' : 'text-gray-500'
          }`}
        >
          <Settings className="w-6 h-6 mb-1" />
          Cấu hình
        </button>
      </nav>
    </div>
  );
}
