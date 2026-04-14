import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { messageContent, botToken, chatId } = await req.json();

    if (!botToken || !chatId) {
      return NextResponse.json({ error: 'Telegram credentials missing' }, { status: 400 });
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: messageContent,
        parse_mode: 'HTML',
        disable_web_page_preview: false
      })
    });

    const data = await res.json();
    if (!data.ok) {
      throw new Error(data.description);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Telegram API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
