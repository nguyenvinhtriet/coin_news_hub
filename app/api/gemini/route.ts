import { GoogleGenAI } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();
    const { apiKey, articlesData, customPrompt, portfolio } = payload;

    if (!apiKey) {
      return NextResponse.json({ error: 'API Key is required' }, { status: 400 });
    }

    const genAI = new GoogleGenAI(apiKey);
    const model = (genAI as any).getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: { responseMimeType: (action === 'analyze_macro' || action === 'analyze_sentiment') ? 'application/json' : 'text/plain' }
    });

    let prompt = '';

    if (action === 'analyze_macro') {
      prompt = `${customPrompt}\n\nDanh sách tin tức cần phân tích:\n${JSON.stringify(articlesData)}`;
    } else if (action === 'generate_report') {
      prompt = `${customPrompt}\n\nDanh mục đầu tư: ${portfolio}\n\nTin tức đã phân tích:\n${JSON.stringify(articlesData)}`;
    } else if (action === 'analyze_sentiment') {
      prompt = `${customPrompt}\n\nTin tức:\n${JSON.stringify(articlesData)}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (action === 'analyze_macro' || action === 'analyze_sentiment') {
      return NextResponse.json({ result: JSON.parse(text) });
    }

    return NextResponse.json({ result: text });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
