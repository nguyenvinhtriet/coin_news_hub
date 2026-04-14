import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

async function fetchRSS(urls: string[]) {
  const allItems: any[] = [];
  for (const url of urls) {
    try {
      const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url.trim())}`);
      const data = await res.json();
      if (data.status === 'ok') {
        allItems.push(...data.items.map((item: any) => ({
          id: item.guid || item.link,
          title: item.title,
          link: item.link,
          description: item.description.replace(/<[^>]*>?/gm, '').substring(0, 500),
          pubDate: item.pubDate,
          source: data.feed.title
        })));
      }
    } catch (e) {
      console.error(`RSS Fetch Error for ${url}:`, e);
    }
  }
  return allItems;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get('secret');

    // Simple security check
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const geminiApiKey = process.env.GEMINI_API_KEY || '';
    const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
    const telegramChatId = process.env.TELEGRAM_CHAT_ID || '';

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Supabase config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get Settings from DB or use defaults
    const rssUrls = [
      "https://vnexpress.net/rss/kinh-doanh.rss",
      "https://vietnambiz.vn/rss/kinh-te-vi-mo-8.rss",
      "https://coin68.com/feed/",
      "https://blogtienao.com/feed"
    ];

    // 2. Fetch News
    const allArticles = await fetchRSS(rssUrls);
    
    // 3. Filter last 24h
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentArticles = allArticles.filter(a => new Date(a.pubDate) >= oneDayAgo);

    if (recentArticles.length === 0) {
      return NextResponse.json({ message: 'No new articles' });
    }

    // 4. Analyze with Gemini (Batch)
    const analysisPrompt = `Bạn là chuyên gia vĩ mô. Phân tích các tin tức sau dưới góc nhìn Petrodollar & USD Dominance. 
    Chấm điểm 1-10 về độ quan trọng. Trả về JSON: { "scores": [ { "id": "...", "score": 8, "analysis": "..." } ] }`;
    
    const resGemini = await fetch(new URL('/api/gemini', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze_macro',
        payload: {
          apiKey: geminiApiKey,
          articlesData: recentArticles.slice(0, 15), // Limit for cron
          customPrompt: analysisPrompt
        }
      })
    });

    const geminiData = await resGemini.json();
    const scoredArticles = recentArticles.map(a => {
      const scoreObj = geminiData.result?.scores?.find((s: any) => s.id === a.id);
      return { ...a, ai_score: scoreObj?.score || 0, ai_analysis: scoreObj?.analysis || '' };
    });

    // 5. Save to Supabase
    await supabase.from('articles').upsert(
      scoredArticles.map(a => ({
        link: a.link,
        title: a.title,
        summary: a.description,
        ai_score: a.ai_score,
        ai_analysis: a.ai_analysis,
        created_at: new Date(a.pubDate).toISOString()
      })),
      { onConflict: 'link' }
    );

    // 6. Generate Report for Telegram
    const topArticles = scoredArticles.filter(a => a.ai_score >= 7).sort((a, b) => b.ai_score - a.ai_score);
    if (topArticles.length > 0) {
      const reportRes = await fetch(new URL('/api/gemini', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_report',
          payload: {
            apiKey: geminiApiKey,
            articlesData: topArticles.map(a => ({ title: a.title, link: a.link, score: a.ai_score })),
            portfolio: 'BTC, ETH, SOL, GOLD',
            customPrompt: 'Viết báo cáo Telegram chuyên sâu về Petrodollar dựa trên tin tức này.'
          }
        })
      });

      const reportData = await reportRes.json();
      
      // 7. Send to Telegram
      await fetch(new URL('/api/telegram', req.url).toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageContent: reportData.result,
          botToken: telegramBotToken,
          chatId: telegramChatId
        })
      });
    }

    return NextResponse.json({ success: true, processed: scoredArticles.length });
  } catch (error: any) {
    console.error('Cron Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
