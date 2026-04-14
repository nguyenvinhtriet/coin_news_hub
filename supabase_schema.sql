-- SQL DDL for Macro Crypto Intelligence

-- 1. Articles Table
CREATE TABLE articles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    link TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    ai_score INTEGER,
    ai_analysis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Reports Table
CREATE TABLE reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'macro_report',
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Market Sentiment Table
CREATE TABLE market_sentiment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE UNIQUE NOT NULL DEFAULT CURRENT_DATE,
    bullish_score INTEGER NOT NULL,
    bearish_score INTEGER NOT NULL,
    trend TEXT NOT NULL,
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Optional but recommended)
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_sentiment ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (or authenticated only)
CREATE POLICY "Allow public read" ON articles FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON articles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update" ON articles FOR UPDATE USING (true);

CREATE POLICY "Allow public read" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON reports FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read" ON market_sentiment FOR SELECT USING (true);
CREATE POLICY "Allow public insert" ON market_sentiment FOR INSERT WITH CHECK (true);
