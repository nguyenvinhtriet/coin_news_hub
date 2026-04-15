// Audit: Code file description updated for deployment - 2026-04-15
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
  groqApiKey: string;
  hotCriteria: string;
  rssUrls: string;
  defaultScoreFilter: string[];
  cronSecret: string;
  portfolio: { coin: string; amount: number }[];
  promptAnalyzeReport: string;
  promptTelegramBasic: string;
  promptTelegramAdvance: string;
  promptPortfolioImpact: string;
  promptSentiment: string;
  setSettings: (settings: Partial<SettingsState>) => void;
}

export const DEFAULT_PROMPT_ANALYZE_REPORT = `Bạn là một chuyên gia kinh tế vĩ mô và chiến lược gia đầu tư cấp cao. Dựa vào danh sách các tin tức quan trọng và dữ liệu thị trường sau đây, hãy thực hiện 2 việc với độ CHÍNH XÁC và CHI TIẾT cao nhất:

THÔNG TIN THỊ TRƯỜNG HIỆN TẠI (Thời gian: {currentTime} - Bản tin buổi {timeOfDay}):
Giá Crypto (USD, Biến động 24h & 7 ngày): {cryptoString}

DANH MỤC ĐẦU TƯ CỦA NGƯỜI DÙNG:
{portfolioString}

1. Viết một BÁO CÁO TỔNG HỢP THỊ TRƯỜNG (main summary) thật CHI TIẾT và SÂU SẮC. 
- Đánh giá toàn diện ảnh hưởng chung đến thị trường (Chứng khoán, Crypto, Kinh tế vĩ mô, Lãi suất, Lạm phát nếu có). 
- BẮT BUỘC phải có phần DỰ BÁO XU HƯỚNG (Forecast) ngắn hạn và trung hạn, kèm theo KHUYẾN NGHỊ HÀNH ĐỘNG (Recommendation) rõ ràng cho nhà đầu tư.
- LƯU Ý THỜI GIAN: Đây là bản tin buổi {timeOfDay}. Hãy phân tích xu hướng thị trường dựa trên các sự kiện trong 12-24 giờ qua, kết hợp so sánh với dữ liệu 7 ngày để có cái nhìn toàn cảnh. Tránh đưa ra nhận định chung chung.
- PHÂN TÍCH DANH MỤC: Dựa vào danh mục đầu tư của người dùng (nếu có), hãy phân tích xem các tin tức và xu hướng thị trường hiện tại ảnh hưởng CỤ THỂ như thế nào đến TỪNG tài sản họ đang nắm giữ. Đưa ra chiến lược quản trị rủi ro và tối ưu hóa lợi nhuận riêng cho danh mục này.
- TRÍCH DẪN TIN TỨC: Khi đưa ra nhận định, hãy trích dẫn hoặc nhắc đến các tin tức cụ thể trong danh sách để tăng tính thuyết phục.

2. Viết một ghi chú phân tích chi tiết (detailed note) cho TỪNG tin tức. Không chỉ tóm tắt, mà phải giải thích rõ TẠI SAO tin này quan trọng, hệ lụy logic của nó là gì, và tác động cụ thể đến dòng tiền hoặc tâm lý thị trường ra sao.

Danh sách tin tức (JSON):
{articlesData}

Trả về kết quả dưới dạng JSON object với cấu trúc:
{
  "summary": "Nội dung báo cáo tổng hợp (dùng HTML tags cơ bản như <b>, <i> để format, dùng ký tự xuống dòng \\n để ngắt dòng, TUYỆT ĐỐI KHÔNG DÙNG thẻ <br>)",
  "notes": {
    "id_tin_bai_1": "Ghi chú phân tích chi tiết và hệ lụy cho tin bài 1",
    "id_tin_bai_2": "Ghi chú phân tích chi tiết và hệ lụy cho tin bài 2"
  }
}`;

export const DEFAULT_PROMPT_TELEGRAM_BASIC = `Bạn là trợ lý tài chính. Hãy tóm tắt danh sách tin tức sau thành một bản tin NGẮN GỌN để gửi Telegram.
Yêu cầu:
- Trình bày dạng danh sách rõ ràng, format ĐẸP MẮT, dễ nhìn (sử dụng emoji hợp lý, ví dụ: 📰, 🚀, ⚠️, 💡).
- Bắt đầu bằng tiêu đề: 🌅 Bản tin buổi {timeOfDay} ({currentTime})
- Mỗi tin gồm: Tiêu đề (kèm link), Điểm số, và 1 câu nhận xét cực kỳ ngắn gọn.

CHÚ Ý ĐỊNH DẠNG BẮT BUỘC: 
- Chỉ dùng các thẻ HTML được Telegram hỗ trợ: <b>, <i>, <a>, <u>, <s>, <code>, <pre>. 
- KHÔNG dùng thẻ markdown như ** hay #. 
- KHÔNG dùng <p>, <br>, <ul>, <li>, <h1>... 
- Dùng ký tự xuống dòng (\\n) để ngắt dòng.

Danh sách tin:
{articlesData}`;

export const DEFAULT_PROMPT_TELEGRAM_ADVANCE = `Bạn là một chuyên gia kinh tế vĩ mô và chiến lược gia đầu tư cấp cao. Hãy viết một bài phân tích CHI TIẾT SÂU SẮC và CHÍNH XÁC để gửi Telegram dựa trên các tin tức và dữ liệu thị trường sau.

THÔNG TIN THỊ TRƯỜNG HIỆN TẠI (Thời gian: {currentTime} - Bản tin buổi {timeOfDay}):
Giá Crypto (USD, Biến động 24h & 7 ngày): {cryptoString}

DANH MỤC ĐẦU TƯ CỦA NGƯỜI DÙNG:
{portfolioString}

Yêu cầu phân tích:
- Phân tích logic và chi tiết từng tin tức: Tại sao nó xảy ra? Dòng tiền sẽ dịch chuyển thế nào? Tác động đến thị trường (Chứng khoán, Crypto, Vĩ mô) ra sao?
- Đưa ra nhận định chuyên sâu, tổng hợp các sự kiện rời rạc thành một bức tranh toàn cảnh và dự báo xu hướng ngắn/trung hạn.
- LƯU Ý THỜI GIAN: Đây là bản tin buổi {timeOfDay}. Hãy phân tích xu hướng thị trường dựa trên các sự kiện trong 12-24 giờ qua, kết hợp so sánh với dữ liệu 7 ngày để có cái nhìn toàn cảnh.
- PHÂN TÍCH DANH MỤC: Dựa vào danh mục đầu tư của người dùng (nếu có), hãy phân tích xem các tin tức và xu hướng thị trường hiện tại ảnh hưởng CỤ THỂ như thế nào đến TỪNG tài sản họ đang nắm giữ. Đưa ra chiến lược hành động rõ ràng (Mua/Bán/Giữ/Phòng ngừa rủi ro) cho danh mục này.
- Trình bày chuyên nghiệp, mạch lạc, format ĐẸP MẮT, dễ nhìn trên Telegram (sử dụng emoji hợp lý để phân chia các phần: 📊 Bức tranh Thị trường, 📰 Phân tích Tin tức, 💡 Nhận định & Dự báo, 💼 Tác động Danh mục, 🎯 Khuyến nghị Hành động).

CHÚ Ý ĐỊNH DẠNG BẮT BUỘC: 
- Chỉ dùng các thẻ HTML được Telegram hỗ trợ: <b>, <i>, <a>, <u>, <s>, <code>, <pre>. 
- KHÔNG dùng thẻ markdown như ** hay #. 
- KHÔNG dùng <p>, <br>, <ul>, <li>, <h1>... 
- Dùng ký tự xuống dòng (\\n) để ngắt dòng.
- Đảm bảo các con số phần trăm được định dạng gọn gàng (ví dụ: +1.25%, -0.50%).

Danh sách tin:
{articlesData}`;

export const DEFAULT_PROMPT_PORTFOLIO_IMPACT = `Bạn là một chuyên gia kinh tế và quản lý danh mục đầu tư cấp cao. Dựa vào danh sách tin tức mới nhất và dữ liệu thị trường (bao gồm biến động 24h và 7 ngày), hãy phân tích TOÀN DIỆN VÀ CHÍNH XÁC tác động lên danh mục đầu tư của người dùng.

THÔNG TIN THỊ TRƯỜNG (Giá, Biến động 24h, Biến động 7 ngày): {cryptoString}
DANH MỤC ĐẦU TƯ: {portfolioString}
TIN TỨC: {articlesData}

Yêu cầu phân tích:
1. So sánh xu hướng hiện tại với dữ liệu 1 tuần qua để có góc nhìn tổng quan.
2. Đánh giá chi tiết từng tin tức có thể tác động RIÊNG BIỆT đến từng loại tài sản như thế nào (ví dụ: tin quốc gia X chấp nhận thanh toán bằng đồng Y, tin update mạng lưới Z...).
3. CHỈ phân tích các tài sản có trong DANH MỤC ĐẦU TƯ của người dùng. KHÔNG phân tích các tài sản khác ngoài danh mục.
4. Đưa ra dự báo (predict) và hành động cụ thể (action) cho từng tài sản trong danh mục.

Trả về JSON object với cấu trúc:
{
  "overall_impact": "Tóm tắt tác động chung lên toàn bộ danh mục, so sánh với xu hướng 1 tuần qua (khoảng 3-4 câu).",
  "asset_analysis": [
    {
      "coin": "Mã coin (VD: BTC)",
      "trend": "Tăng / Giảm / Đi ngang",
      "reason": "Lý do cực kỳ chi tiết, liên kết trực tiếp một tin tức cụ thể hoặc dữ liệu thị trường với đồng coin này.",
      "predict": "Dự báo xu hướng ngắn hạn và trung hạn.",
      "action": "Hành động khuyến nghị (VD: Nắm giữ, Chốt lời một phần, Mua thêm...)."
    }
  ]
}`;

export const DEFAULT_PROMPT_SENTIMENT = `Bạn là chuyên gia phân tích tâm lý thị trường tài chính. Dựa vào danh sách các tin tức quan trọng sau đây, hãy đánh giá tâm lý chung của thị trường.
      
Nhiệm vụ:
1. Chấm điểm Bullish (Lạc quan/Tăng giá) từ 0 đến 100.
2. Chấm điểm Bearish (Bi quan/Giảm giá) từ 0 đến 100. (Lưu ý: Bullish + Bearish không nhất thiết phải bằng 100, vì thị trường có thể vừa có tin rất tốt vừa có tin rất xấu).
3. Xác định xu hướng chung (trend): "bullish", "bearish", hoặc "neutral".
4. Viết 1 câu tóm tắt ngắn gọn lý do.

Danh sách tin tức:
{articlesData}

Trả về kết quả dưới dạng JSON object với cấu trúc chính xác như sau:
{
  "bullish_score": 75,
  "bearish_score": 20,
  "trend": "bullish",
  "summary": "Thị trường phản ứng tích cực với tin tức ETF..."
}`;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      telegramBotToken: '', // Không nên expose ra NEXT_PUBLIC_
      telegramChatId: '',   // Không nên expose ra NEXT_PUBLIC_
      geminiApiKey: '',     // Không nên expose ra NEXT_PUBLIC_
      groqApiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '', // Backup AI
      hotCriteria: process.env.NEXT_PUBLIC_HOT_CRITERIA || 'Đánh giá xem tin tức này có mức độ Critical (nghiêm trọng) hoặc Hot (nóng) đối với thị trường tài chính, chứng khoán toàn cầu và Crypto hay không. Chấm điểm từ 1-10 và giải thích ngắn gọn.',
      rssUrls: process.env.NEXT_PUBLIC_RSS_URLS ? process.env.NEXT_PUBLIC_RSS_URLS.replace(/,/g, '\n') : 'https://cointelegraph.com/rss\nhttps://www.coindesk.com/arc/outboundfeeds/rss/\nhttps://search.cnbc.com/rs/search/combinedcms/view.xml?profile=120000000&id=10000664\nhttps://feeds.a.dj.com/rss/RSSMarketsMain.xml\nhttps://vietnamnet.vn/kinh-doanh-tai-chinh.rss\nhttps://vnexpress.net/rss/kinh-doanh.rss\nhttps://dantri.com.vn/rss/kinh-doanh.rss\nhttps://cafef.vn/doc-nhanh.rss\nhttps://vneconomy.vn/rss/tai-chinh.rss\nhttps://bitcoinmagazine.com/.rss/full/',
      defaultScoreFilter: ['9-10', '7-8', 'unscored'],
      cronSecret: 'my-super-secret-cron-key-123', // Default secret for cron job
      portfolio: [], // Default empty portfolio
      promptAnalyzeReport: DEFAULT_PROMPT_ANALYZE_REPORT,
      promptTelegramBasic: DEFAULT_PROMPT_TELEGRAM_BASIC,
      promptTelegramAdvance: DEFAULT_PROMPT_TELEGRAM_ADVANCE,
      promptPortfolioImpact: DEFAULT_PROMPT_PORTFOLIO_IMPACT,
      promptSentiment: DEFAULT_PROMPT_SENTIMENT,
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
