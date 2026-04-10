import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messageContent, botToken, chatId } = await req.json();

    // Ưu tiên dùng Environment Variable, nếu không có thì dùng từ payload (Settings)
    const finalBotToken = (process.env.TELEGRAM_BOT_TOKEN || botToken || '').trim();
    const finalChatId = (process.env.TELEGRAM_CHAT_ID || chatId || '').trim();

    if (!finalBotToken || !finalChatId) {
      return NextResponse.json({ error: 'Vui lòng cấu hình Telegram Bot Token và Chat ID trong Environment Variables hoặc Settings.' }, { status: 400 });
    }

    // Telegram doesn't support <br> tags in HTML parse mode, replace them with newlines
    const safeMessageContent = messageContent
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p>/gi, '');

    const res = await fetch(`https://api.telegram.org/bot${finalBotToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: finalChatId,
        text: safeMessageContent,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(`Lỗi Telegram: ${data.description}`);
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Telegram API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
