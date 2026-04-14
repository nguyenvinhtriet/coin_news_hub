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

interface AppState {
  articles: Article[];
  setArticles: (articles: Article[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  articles: [],
  setArticles: (articles) => set({ articles }),
  isLoading: false,
  setIsLoading: (loading) => set({ isLoading: loading }),
}));

interface SettingsState {
  geminiApiKey: string;
  groqApiKey: string;
  telegramBotToken: string;
  telegramChatId: string;
  supabaseUrl: string;
  supabaseKey: string;
  portfolio: string;
  rssUrls: string;
  promptAnalysis: string;
  promptTelegramAdvance: string;
  promptSentiment: string;
  setSettings: (settings: Partial<SettingsState>) => void;
}

const DEFAULT_RSS = [
  "https://vnexpress.net/rss/kinh-doanh.rss",
  "https://vietnambiz.vn/rss/kinh-te-vi-mo-8.rss",
  "https://cafef.vn/vi-mo.rss",
  "https://tinnhanhchungkhoan.vn/rss/thoi-su-1.rss",
  "https://coin68.com/feed/",
  "https://blogtienao.com/feed"
].join('\n');

const DEFAULT_ANALYSIS_PROMPT = `Bạn là một chuyên gia phân tích kinh tế vĩ mô và thị trường tài chính toàn cầu. 
Nhiệm vụ của bạn là phân tích các tin tức dựa trên hệ tư tưởng "Petrodollar & USD Dominance".

Góc nhìn cốt lõi:
1. Mọi biến động địa chính trị (chiến tranh, xung đột) là lớp vỏ. Cốt lõi là cuộc chiến bảo vệ ngai vàng của đồng USD.
2. Hệ thống Petrodollar đang bị đe dọa bởi các liên minh mới (BRICS, thanh toán bằng CNY/EUR).
3. Mỹ sẽ sử dụng mọi công cụ (Chứng khoán, Trái phiếu, và đặc biệt là Crypto - "Digital Dollar") để hút dòng tiền quay lại.
4. Crypto không đứng ngoài cuộc chơi vĩ mô; nó là công cụ thanh khoản mới của hệ thống tài chính Mỹ.

Yêu cầu phân tích:
- Chấm điểm tin tức (1-10) dựa trên mức độ ảnh hưởng đến dòng tiền vĩ mô và Crypto.
- Giải thích tin tức này tác động thế nào đến vị thế đồng USD và hệ thống Petrodollar.
- Phân tích xem tin tức này có phải là một phần của "ván bài lớn" để MM (Market Makers) đẩy giá tài sản nhằm khẳng định sức mạnh đô la hay không.
- Kết luận ngắn gọn về hướng đi tiềm năng của thị trường (BTC, Altcoin, Vàng).

Định dạng trả về JSON:
{
  "scores": [
    { "id": "...", "score": 8, "analysis": "..." }
  ]
}`;

const DEFAULT_REPORT_PROMPT = `Dựa trên danh sách tin tức đã chọn, hãy viết một báo cáo chuyên sâu cho Telegram.
Phong cách: Sắc sảo, thực tế, nhìn thấu các lớp màn truyền thông, tập trung vào bản chất vĩ mô.

Cấu trúc báo cáo:
1. **Bức tranh lớn (Macro View)**: Tổng hợp các tin tức về địa chính trị, dầu mỏ, và USD. Giải thích sự liên kết giữa chúng dưới góc nhìn Petrodollar.
2. **Ván bài của Market Makers**: Phân tích cách dòng tiền đang được điều hướng. Tại sao tin xấu lại có thể là cơ hội gom hàng?
3. **Crypto & Digital Dollars**: Tình hình Bitcoin, Stablecoins và dòng tiền tổ chức Mỹ.
4. **Chiến lược hành động**: Lời khuyên cụ thể cho nhà đầu tư trong giai đoạn "thử lửa" này.

Lý luận phải chặt chẽ, logic, không cảm xúc. Sử dụng các thuật ngữ như "Petrodollar", "Thanh khoản Đô la", "Digital Dollar", "MM ván bài".`;

const DEFAULT_SENTIMENT_PROMPT = `Phân tích tâm lý thị trường dựa trên các tin tức hàng đầu. 
Xác định xem thị trường đang ở giai đoạn "Sợ hãi do cảm xúc" hay "Chuẩn bị cho chu kỳ mới".
Trả về JSON:
{
  "bullish_score": 0-100,
  "bearish_score": 0-100,
  "trend": "Tích lũy / Đẩy giá / Phân phối / Sợ hãi",
  "summary": "Phân tích chi tiết về sự chuyển dịch tâm lý vĩ mô..."
}`;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      geminiApiKey: '',
      groqApiKey: '',
      telegramBotToken: '',
      telegramChatId: '',
      supabaseUrl: '',
      supabaseKey: '',
      portfolio: 'BTC, ETH, SOL, GOLD',
      rssUrls: DEFAULT_RSS,
      promptAnalysis: DEFAULT_ANALYSIS_PROMPT,
      promptTelegramAdvance: DEFAULT_REPORT_PROMPT,
      promptSentiment: DEFAULT_SENTIMENT_PROMPT,
      setSettings: (newSettings) => set((state) => ({ ...state, ...newSettings })),
    }),
    {
      name: 'macro-intel-settings',
    }
  )
);
