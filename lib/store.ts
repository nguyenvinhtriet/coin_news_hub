import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Article {
  id: string;
  title: string;
  link: string;
  description: string;
  pubDate: string;
  source: string;
  ai_score?: number;
  ai_analysis?: string;
  selected?: boolean;
  from_db?: boolean;
}

interface SettingsState {
  supabaseUrl: string;
  supabaseAnonKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  geminiApiKey: string;
  hotCriteria: string;
  rssUrls: string;
  setSettings: (settings: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      supabaseUrl: '',
      supabaseAnonKey: '',
      telegramBotToken: '',
      telegramChatId: '',
      geminiApiKey: '',
      hotCriteria: 'Đánh giá xem tin tức này có mức độ Critical (nghiêm trọng) hoặc Hot (nóng) đối với thị trường tài chính, chứng khoán toàn cầu và Crypto hay không. Chấm điểm từ 1-10 và giải thích ngắn gọn.',
      rssUrls: 'https://cointelegraph.com/rss\nhttps://www.coindesk.com/arc/outboundfeeds/rss/\nhttps://search.cnbc.com/rs/search/combinedcms/view.xml?profile=120000000&id=10000664\nhttps://feeds.a.dj.com/rss/RSSMarketsMain.xml\nhttps://vietnamnet.vn/kinh-doanh-tai-chinh.rss',
      setSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    }),
    {
      name: 'news-aggregator-settings',
    }
  )
);

interface AppState {
  articles: Article[];
  selectedDate: string;
  setArticles: (articles: Article[]) => void;
  setSelectedDate: (date: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      articles: [],
      selectedDate: new Date().toISOString().split('T')[0],
      setArticles: (articles) => set({ articles }),
      setSelectedDate: (selectedDate) => set({ selectedDate }),
    }),
    {
      name: 'news-aggregator-cache',
    }
  )
);

interface AuthState {
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false }),
    }),
    {
      name: 'news-aggregator-auth',
    }
  )
);
