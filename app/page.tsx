'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Newspaper, 
  Send, 
  Settings, 
  Activity, 
  BookOpen, 
  Wallet,
  Menu,
  X
} from 'lucide-react';
import TabNewsFeed from '@/components/TabNewsFeed';
import TabDispatcher from '@/components/TabDispatcher';
import TabSettings from '@/components/TabSettings';
import TabSentiment from '@/components/TabSentiment';
import TabPortfolio from '@/components/TabPortfolio';
import TabGuideline from '@/components/TabGuideline';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [activeTab, setActiveTab] = useState('news');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const tabs = [
    { id: 'news', label: 'News Feed', icon: Newspaper },
    { id: 'sentiment', label: 'Sentiment', icon: Activity },
    { id: 'dispatcher', label: 'Dispatcher', icon: Send },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'guideline', label: 'Guideline', icon: BookOpen },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#0a0a0f] text-gray-100">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="relative flex flex-col border-r border-white/10 bg-black/40 backdrop-blur-xl"
      >
        <div className="flex h-16 items-center justify-between px-6">
          {isSidebarOpen && (
            <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
              Macro Intel
            </span>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 p-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 transition-all ${
                  isActive 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon size={22} />
                {isSidebarOpen && <span className="font-medium">{tab.label}</span>}
                {isActive && isSidebarOpen && (
                  <motion.div 
                    layoutId="activeTab"
                    className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className={`flex items-center gap-3 ${isSidebarOpen ? 'px-2' : 'justify-center'}`}>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-500" />
            {isSidebarOpen && (
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-medium truncate">Bum Expert</span>
                <span className="text-xs text-gray-500 truncate">Macro Strategist</span>
              </div>
            )}
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0a0a0f] to-[#050507] p-8">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </h1>
            <p className="text-gray-400 mt-1">
              Hệ thống phân tích vĩ mô dựa trên hệ tư tưởng Petrodollar & USD Dominance.
            </p>
          </header>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'news' && <TabNewsFeed />}
              {activeTab === 'sentiment' && <TabSentiment />}
              {activeTab === 'dispatcher' && <TabDispatcher />}
              {activeTab === 'portfolio' && <TabPortfolio />}
              {activeTab === 'guideline' && <TabGuideline />}
              {activeTab === 'settings' && <TabSettings />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
