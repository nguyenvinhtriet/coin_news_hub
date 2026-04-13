import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Helper to fetch RSS
async function fetchRSS(urls: string[]) {
  const allArticles: any[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'ok' && data.items) {
        const items = data.items.map((item: any) => ({
          id: item.guid || item.link,
          title: item.title,
          link: item.link,
          description: item.description?.replace(/<[^>]*>?/gm, '').substring(0, 300) + '...',
          pubDate: item.pubDate,
          source: data.feed.title || url
        }));
        allArticles.push(...items);
      }
    } catch (e) {
      console.error(`Error fetching RSS ${url}:`, e);
    }
  }
  return allArticles;
}

export async function GET(req: Request) {
  return handleCron(req, true);
}

export async function POST(req: Request) {
  return handleCron(req, false);
}

async function handleCron(req: Request, isGet: boolean) {
  try {
    const authHeader = req.headers.get('authorization');
    let payload: any = {};
    
    if (!isGet) {
      try { payload = await req.json(); } catch (e) {}
    }
    
    // 1. Verify Cron Secret
    const cronSecret = process.env.CRON_SECRET || payload?.cronSecret || 'my-super-secret-cron-key-123';
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract settings (Priority: Payload -> Env Vars)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || payload.supabaseUrl;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || payload.supabaseAnonKey;
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || payload.telegramBotToken;
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || payload.telegramChatId;
    const geminiApiKey = process.env.GEMINI_API_KEY || payload.geminiApiKey;
    const groqApiKey = process.env.GROQ_API_KEY || payload.groqApiKey;

    if (!supabaseUrl || !supabaseAnonKey || !telegramBotToken || !telegramChatId || (!geminiApiKey && !groqApiKey)) {
      return NextResponse.json({ error: 'Missing required configuration (Env vars or payload)' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Fetch dynamic settings from Supabase app_settings if not in payload
    let rssUrls = payload.rssUrls || process.env.NEXT_PUBLIC_RSS_URLS;
    let hotCriteria = payload.hotCriteria || process.env.NEXT_PUBLIC_HOT_CRITERIA;
    let portfolio = payload.portfolio || [];
    let promptAnalyzeReport = payload.promptAnalyzeReport;
    let promptTelegramBasic = payload.promptTelegramBasic;
    let promptTelegramAdvance = payload.promptTelegramAdvance;
    let promptPortfolioImpact = payload.promptPortfolioImpact;
    let promptSentiment = payload.promptSentiment;

    try {
      const { data: settingsData } = await supabase.from('app_settings').select('*');
      if (settingsData) {
        const dbRss = settingsData.find(s => s.key === 'rss_urls')?.value;
        if (dbRss && !payload.rssUrls) rssUrls = dbRss;
        
        const dbCriteria = settingsData.find(s => s.key === 'hot_criteria')?.value;
        if (dbCriteria && !payload.hotCriteria) hotCriteria = dbCriteria;

        const dbPortfolio = settingsData.find(s => s.key === 'portfolio')?.value;
        if (dbPortfolio && !payload.portfolio) portfolio = JSON.parse(dbPortfolio);

        const dbPromptAnalyzeReport = settingsData.find(s => s.key === 'prompt_analyze_report')?.value;
        if (dbPromptAnalyzeReport && !payload.promptAnalyzeReport) promptAnalyzeReport = dbPromptAnalyzeReport;

        const dbPromptTelegramBasic = settingsData.find(s => s.key === 'prompt_telegram_basic')?.value;
        if (dbPromptTelegramBasic && !payload.promptTelegramBasic) promptTelegramBasic = dbPromptTelegramBasic;

        const dbPromptTelegramAdvance = settingsData.find(s => s.key === 'prompt_telegram_advance')?.value;
        if (dbPromptTelegramAdvance && !payload.promptTelegramAdvance) promptTelegramAdvance = dbPromptTelegramAdvance;

        const dbPromptPortfolioImpact = settingsData.find(s => s.key === 'prompt_portfolio_impact')?.value;
        if (dbPromptPortfolioImpact && !payload.promptPortfolioImpact) promptPortfolioImpact = dbPromptPortfolioImpact;

        const dbPromptSentiment = settingsData.find(s => s.key === 'prompt_sentiment')?.value;
        if (dbPromptSentiment && !payload.promptSentiment) promptSentiment = dbPromptSentiment;
      }
    } catch (e) {
      console.error("Error fetching app_settings:", e);
    }

    if (!rssUrls) {
       rssUrls = 'https://cointelegraph.com/rss\nhttps://www.coindesk.com/arc/outboundfeeds/rss/'; // fallback
    }
    if (!hotCriteria) {
       hotCriteria = 'Đánh giá xem tin tức này có mức độ Critical (nghiêm trọng) hoặc Hot (nóng) đối với thị trường tài chính, chứng khoán toàn cầu và Crypto hay không. Chấm điểm từ 1-10 và giải thích ngắn gọn.';
    }

    const urls = rssUrls.split('\n').filter((u: string) => u.trim() !== '');

    // 3. Fetch RSS
    const allArticles = await fetchRSS(urls);
    
    // Filter articles to only those published in the last 12 hours
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);
    const articles = allArticles.filter(a => new Date(a.pubDate) >= twelveHoursAgo);

    if (articles.length === 0) {
      return NextResponse.json({ message: 'No recent articles found in the last 12 hours' });
    }

    // 4. Score Articles via Gemini API
    const scoreRes = await fetch(new URL('/api/gemini', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'score_only',
        payload: {
          articlesData: articles.map(a => ({ id: a.id, title: a.title, description: a.description })),
          hotCriteria,
          apiKey: geminiApiKey,
          groqApiKey
        }
      })
    });

    if (!scoreRes.ok) throw new Error('Failed to score articles');
    const scoreData = await scoreRes.json();
    const scores = scoreData.results;

    // Merge scores
    const scoredArticles = articles.map(article => {
      const scoreObj = scores.find((s: any) => s.id === article.id);
      return { ...article, ai_score: scoreObj ? scoreObj.score : 0 };
    });

    // 5. Save to Supabase
    const { error: dbError } = await supabase
      .from('articles')
      .upsert(
        scoredArticles.map(a => ({
          title: a.title,
          link: a.link,
          description: a.description,
          pub_date: new Date(a.pubDate).toISOString(),
          source: a.source,
          ai_score: a.ai_score,
          created_at: new Date().toISOString()
        })),
        { onConflict: 'link' }
      );

    if (dbError) console.error("Supabase upsert error:", dbError);

    // 6. Filter Top Articles (Score >= 7)
    const topArticles = scoredArticles.filter(a => a.ai_score >= 7).sort((a, b) => b.ai_score - a.ai_score).slice(0, 10);

    if (topArticles.length === 0) {
      return NextResponse.json({ message: 'No high-score articles to report' });
    }

    // 7. Generate Telegram Report (Advanced)
    const reportRes = await fetch(new URL('/api/gemini', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'telegram_advance',
        payload: {
          articlesData: topArticles.map(a => ({ title: a.title, link: a.link, score: a.ai_score })),
          portfolio,
          apiKey: geminiApiKey,
          groqApiKey,
          customPrompt: promptTelegramAdvance
        }
      })
    });

    if (!reportRes.ok) throw new Error('Failed to generate report');
    const reportData = await reportRes.json();
    const telegramMessage = reportData.result;

    // 8. Send to Telegram
    const tgRes = await fetch(new URL('/api/telegram', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: telegramMessage,
        botToken: telegramBotToken,
        chatId: telegramChatId
      })
    });

    if (!tgRes.ok) throw new Error('Failed to send Telegram message');

    // 9. Generate and Save Sentiment Trend
    const sentimentRes = await fetch(new URL('/api/gemini', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_sentiment',
        payload: {
          articlesData: topArticles.map(a => ({ title: a.title, description: a.description, score: a.ai_score })),
          apiKey: geminiApiKey,
          groqApiKey,
          customPrompt: promptSentiment
        }
      })
    });

    if (sentimentRes.ok) {
      const sentimentData = await sentimentRes.json();
      if (sentimentData.result) {
        await supabase.from('market_sentiment').insert({
          date: new Date().toISOString().split('T')[0],
          bullish_score: sentimentData.result.bullish_score,
          bearish_score: sentimentData.result.bearish_score,
          trend: sentimentData.result.trend,
          summary: sentimentData.result.summary
        });
      }
    }

    return NextResponse.json({ success: true, message: 'Cron job executed successfully' });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
