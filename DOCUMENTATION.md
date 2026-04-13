# Hướng dẫn Cài đặt & Sử dụng Tính năng Mới

Tài liệu này hướng dẫn bạn cách thiết lập các tính năng nâng cao: Cron Job (Tự động hoá), Phân tích Tâm lý (Sentiment Trend), và Theo dõi Danh mục (Portfolio).

## 1. Tính năng Tự động hoá (Cron Job)

Hệ thống đã được thiết kế một API endpoint riêng tại `/api/cron` để chạy toàn bộ quy trình: Lấy tin -> Chấm điểm -> Lọc tin Hot -> Phân tích -> Gửi Telegram -> Lưu Tâm lý thị trường.

### Cách thiết lập Cron Job:

Vì ứng dụng được deploy trên Vercel/Cloud Run, bạn có thể sử dụng các dịch vụ gọi API tự động miễn phí như **cron-job.org** hoặc **GitHub Actions**.

**Bước 1: Lấy thông tin cấu hình**
API `/api/cron` yêu cầu truyền lên một JSON payload chứa toàn bộ cấu hình của bạn (vì Cron Job chạy độc lập trên server và không có Local Storage của trình duyệt).

**Bước 2: Tạo Request trên cron-job.org**
- Tạo tài khoản tại [cron-job.org](https://cron-job.org/).
- Nhấn **Create Cronjob**.
- **URL**: `https://<domain-cua-ban>/api/cron`
- **Execution schedule**: Chọn thời gian bạn muốn chạy (VD: 9:00 AM và 6:00 PM mỗi ngày).
- Qua tab **Advanced**:
  - **HTTP Method**: `POST`
  - **Headers**: Thêm Header `Authorization` với giá trị `Bearer my-super-secret-cron-key-123` (Bạn có thể đổi key này trong code `lib/store.ts` hoặc truyền qua biến môi trường `CRON_SECRET`).
  - **Body**: Chọn `JSON` và dán cấu hình của bạn vào:

```json
{
  "payload": {
    "supabaseUrl": "https://xxx.supabase.co",
    "supabaseAnonKey": "ey...",
    "telegramBotToken": "123456:ABC...",
    "telegramChatId": "-100...",
    "geminiApiKey": "AIza...",
    "hotCriteria": "Tiêu chí đánh giá của bạn...",
    "rssUrls": "https://cointelegraph.com/rss\nhttps://vietnamnet.vn/kinh-doanh-tai-chinh.rss",
    "portfolio": [
      { "coin": "BTC", "amount": 0.5 },
      { "coin": "ETH", "amount": 10 }
    ]
  }
}
```

- Nhấn **Save** và Cron Job của bạn đã sẵn sàng!

---

## 2. Phân tích Tâm lý Thị trường (Sentiment Trend)

Để tính năng biểu đồ Tâm lý hoạt động, bạn cần tạo một bảng trong cơ sở dữ liệu Supabase để lưu trữ điểm số mỗi ngày.

**Bước 1:** Đăng nhập vào [Supabase Dashboard](https://supabase.com/dashboard).
**Bước 2:** Chọn Project của bạn -> Vào mục **SQL Editor**.
**Bước 3:** Copy và chạy đoạn mã SQL sau:

```sql
-- Tạo bảng market_sentiment
CREATE TABLE IF NOT EXISTS public.market_sentiment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    bullish_score INTEGER NOT NULL,
    bearish_score INTEGER NOT NULL,
    trend TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Tạo bảng app_settings để lưu cấu hình (như danh sách RSS)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- Bật RLS (Row Level Security)
ALTER TABLE public.market_sentiment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc/ghi công khai (Vì ứng dụng dùng Anon Key)
CREATE POLICY "Allow public read access on market_sentiment" ON public.market_sentiment FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on market_sentiment" ON public.market_sentiment FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on market_sentiment" ON public.market_sentiment FOR UPDATE USING (true);

CREATE POLICY "Allow public read access on app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Allow public insert access on app_settings" ON public.app_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access on app_settings" ON public.app_settings FOR UPDATE USING (true);
```

Sau khi chạy xong, mỗi khi Cron Job chạy, hệ thống sẽ tự động phân tích và lưu điểm số vào bảng này. Bạn có thể xem biểu đồ tại tab **Tâm lý thị trường**.

---

## 3. Theo dõi Danh mục (Portfolio Tracking)

Tính năng này đã được tích hợp sẵn vào giao diện.
- Truy cập tab **Danh mục đầu tư**.
- Thêm các đồng coin và số lượng bạn đang nắm giữ.
- Khi bạn tạo báo cáo Telegram (hoặc khi Cron Job chạy), AI sẽ tự động đọc danh mục này và thêm một phần **Phân tích tác động riêng đến danh mục của bạn** vào trong báo cáo.
