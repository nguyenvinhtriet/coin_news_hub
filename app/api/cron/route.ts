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

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const { payload } = await req.json();
    
    // 1. Verify Cron Secret
    const cronSecret = process.env.CRON_SECRET || payload?.cronSecret;
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Extract settings from payload (since cron won't have local storage)
    const { supabaseUrl, supabaseAnonKey, telegramBotToken, telegramChatId, geminiApiKey, groqApiKey, rssUrls, hotCriteria, portfolio } = payload;

    if (!supabaseUrl || !supabaseAnonKey || !telegramBotToken || !telegramChatId || (!geminiApiKey && !groqApiKey)) {
      return NextResponse.json({ error: 'Missing required configuration in payload' }, { status: 400 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const urls = rssUrls.split('\n').filter((u: string) => u.trim() !== '');

    // 3. Fetch RSS
    const articles = await fetchRSS(urls);
    if (articles.length === 0) {
      return NextResponse.json({ message: 'No articles found' });
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
          groqApiKey
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
          groqApiKey
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
