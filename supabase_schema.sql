-- Chạy script này trong Supabase SQL Editor để tạo các bảng cần thiết

-- 1. Bảng articles (Lưu trữ tin tức)
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    link TEXT NOT NULL UNIQUE, -- Bắt buộc phải có UNIQUE constraint để dùng upsert
    summary TEXT,
    ai_score INTEGER DEFAULT 0,
    ai_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Bảng reports (Lưu trữ báo cáo)
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    is_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Thiết lập Row Level Security (RLS)
-- Cho phép đọc/ghi công khai (chỉ dùng cho mục đích demo/cá nhân, nếu public app thì cần cấu hình Auth)
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho phép tất cả mọi người thao tác (nếu bạn dùng Anon Key)
CREATE POLICY "Allow public all operations on articles" ON public.articles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public all operations on reports" ON public.reports FOR ALL USING (true) WITH CHECK (true);
