import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();
    const apiKey = (payload.apiKey || process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();

    if (!apiKey) {
      return NextResponse.json({ error: 'Vui lòng cấu hình Gemini API Key trong phần Cấu hình hoặc biến môi trường.' }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });

    if (action === 'score_only') {
      const { articlesData, hotCriteria } = payload;
      
      const prompt = `
        Bạn là một chuyên gia phân tích tin tức tài chính. Hãy đánh giá các tin bài sau dựa trên tiêu chí:
        "${hotCriteria}"
        
        Danh sách tin bài (JSON):
        ${JSON.stringify(articlesData)}
        
        Nhiệm vụ: Chấm điểm từng tin bài từ 1 đến 10 dựa trên mức độ phù hợp với tiêu chí trên.
        Trả về kết quả dưới dạng JSON array, mỗi object gồm:
        - id: ID của tin bài
        - score: Điểm số (1-10)
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                score: { type: Type.INTEGER }
              },
              required: ["id", "score"]
            }
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("AI không trả về kết quả.");
      
      const aiResults = JSON.parse(resultText);
      return NextResponse.json({ results: aiResults });

    } else if (action === 'analyze_and_report') {
      const { articlesData } = payload;
      
      const reportPrompt = `
        Bạn là chuyên gia phân tích tài chính cấp cao. Dựa vào danh sách các tin tức quan trọng sau đây, hãy thực hiện 2 việc:
        
        1. Viết một BÁO CÁO TỔNG HỢP THỊ TRƯỜNG (main summary) đánh giá ảnh hưởng chung đến thị trường (Chứng khoán, Crypto, Kinh tế vĩ mô) và dự báo biến chuyển.
        2. Viết một ghi chú phân tích chi tiết (detailed note) cho TỪNG tin tức.
        
        Danh sách tin tức (JSON):
        ${JSON.stringify(articlesData)}
        
        Trả về kết quả dưới dạng JSON object với cấu trúc:
        {
          "summary": "Nội dung báo cáo tổng hợp (dùng HTML tags cơ bản như <b>, <i>, <br> để format)",
          "notes": {
            "id_tin_bai_1": "Ghi chú phân tích chi tiết cho tin bài 1",
            "id_tin_bai_2": "Ghi chú phân tích chi tiết cho tin bài 2"
          }
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: reportPrompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              notes: { 
                type: Type.OBJECT,
                additionalProperties: { type: Type.STRING }
              }
            },
            required: ["summary", "notes"]
          },
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH
          }
        }
      });

      const resultText = response.text;
      if (!resultText) throw new Error("AI không trả về kết quả.");
      
      const aiResults = JSON.parse(resultText);
      return NextResponse.json(aiResults);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Gemini API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
