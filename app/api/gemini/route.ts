import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { action, payload } = await req.json();
    const apiKey = (process.env.GEMINI_API_KEY || payload.apiKey || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '').trim();
    const groqApiKey = (process.env.GROQ_API_KEY || payload.groqApiKey || process.env.NEXT_PUBLIC_GROQ_API_KEY || '').trim();

    if (!apiKey && !groqApiKey) {
      return NextResponse.json({ error: 'Vui lòng cấu hình Gemini API Key hoặc Groq API Key (Backup).' }, { status: 400 });
    }

    const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

    async function callGroq(prompt: string, model: string, isJson: boolean = false) {
      if (!groqApiKey) throw new Error("Groq API Key is missing.");
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          response_format: isJson ? { type: "json_object" } : undefined,
          temperature: 0.2
        })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error?.message || 'Groq API Error');
      }
      const data = await res.json();
      return data.choices[0].message.content;
    }

    async function runWithFallback(geminiTask: () => Promise<any>, groqTask: () => Promise<any>) {
      try {
        if (!ai) throw new Error("Gemini API Key not configured, forcing fallback.");
        const res = await geminiTask();
        return { result: res, usedApi: 'Gemini' };
      } catch (error: any) {
        const errMsg = error?.message || String(error);
        console.warn("Gemini API failed:", errMsg);
        
        // Fallback if 503, UNAVAILABLE, quota, invalid key, or if Gemini key was missing
        if (groqApiKey && (errMsg.includes('503') || errMsg.includes('UNAVAILABLE') || errMsg.includes('high demand') || errMsg.includes('quota') || errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID') || !ai)) {
          console.log("Attempting Groq fallback...");
          try {
            const res = await groqTask();
            return { result: res, usedApi: 'Groq' };
          } catch (groqError: any) {
            console.error("Groq fallback also failed:", groqError);
            throw new Error(`Cả Gemini và Groq (Backup) đều lỗi. Gemini: ${errMsg}. Groq: ${groqError.message}`);
          }
        }
        throw error;
      }
    }

    if (action === 'score_only') {
      const { articlesData, hotCriteria } = payload;
      const prompt = `Bạn là một chuyên gia phân tích tin tức tài chính. Hãy đánh giá các tin bài sau dựa trên tiêu chí:\n"${hotCriteria}"\n\nDanh sách tin bài (JSON):\n${JSON.stringify(articlesData)}\n\nNhiệm vụ: Chấm điểm từng tin bài từ 1 đến 10 dựa trên mức độ phù hợp với tiêu chí trên.\nTrả về kết quả dưới dạng JSON array, mỗi object gồm:\n- id: ID của tin bài\n- score: Điểm số (1-10)`;

      const geminiTask = async () => {
        const response = await ai!.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { id: { type: Type.STRING }, score: { type: Type.INTEGER } },
                required: ["id", "score"]
              }
            }
          }
        });
        const resultText = response.text;
        if (!resultText) throw new Error("AI không trả về kết quả.");
        return JSON.parse(resultText);
      };

      const groqTask = async () => {
        const groqPrompt = prompt + "\n\nIMPORTANT: You MUST return a valid JSON object with a single key 'results' containing the array of scores. Example: { \"results\": [ {\"id\": \"...\", \"score\": 8} ] }";
        const content = await callGroq(groqPrompt, 'llama-3.1-8b-instant', true);
        const parsed = JSON.parse(content);
        return parsed.results || parsed;
      };

      const { result: results, usedApi } = await runWithFallback(geminiTask, groqTask);
      return NextResponse.json({ results, usedApi });

    } else if (action === 'analyze_and_report') {
      const { articlesData } = payload;
      const reportPrompt = `Bạn là chuyên gia phân tích tài chính và chiến lược gia cấp cao. Dựa vào danh sách các tin tức quan trọng sau đây, hãy thực hiện 2 việc:\n\n1. Viết một BÁO CÁO TỔNG HỢP THỊ TRƯỜNG (main summary) thật CHI TIẾT. Đánh giá sâu sắc ảnh hưởng chung đến thị trường (Chứng khoán, Crypto, Kinh tế vĩ mô). BẮT BUỘC phải có phần DỰ BÁO XU HƯỚNG (Forecast) sắp tới và KHUYẾN NGHỊ HÀNH ĐỘNG (Recommendation) cho nhà đầu tư.\n2. Viết một ghi chú phân tích chi tiết (detailed note) cho TỪNG tin tức, giải thích rõ tại sao tin này quan trọng và tác động cụ thể của nó là gì.\n\nDanh sách tin tức (JSON):\n${JSON.stringify(articlesData)}\n\nTrả về kết quả dưới dạng JSON object với cấu trúc:\n{\n  "summary": "Nội dung báo cáo tổng hợp (dùng HTML tags cơ bản như <b>, <i> để format, dùng ký tự xuống dòng \\n để ngắt dòng, TUYỆT ĐỐI KHÔNG DÙNG thẻ <br>)",\n  "notes": {\n    "id_tin_bai_1": "Ghi chú phân tích chi tiết cho tin bài 1",\n    "id_tin_bai_2": "Ghi chú phân tích chi tiết cho tin bài 2"\n  }\n}`;

      const geminiTask = async () => {
        const response = await ai!.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: reportPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: { type: Type.STRING },
                notes: { type: Type.OBJECT, additionalProperties: { type: Type.STRING } }
              },
              required: ["summary", "notes"]
            },
            thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
          }
        });
        const resultText = response.text;
        if (!resultText) throw new Error("AI không trả về kết quả.");
        return JSON.parse(resultText);
      };

      const groqTask = async () => {
        const groqPrompt = reportPrompt + "\n\nIMPORTANT: You MUST return a valid JSON object with exactly two keys: 'summary' (string) and 'notes' (object mapping id to string).";
        const content = await callGroq(groqPrompt, 'llama-3.3-70b-versatile', true);
        return JSON.parse(content);
      };

      const { result, usedApi } = await runWithFallback(geminiTask, groqTask);
      return NextResponse.json({ ...result, usedApi });

    } else if (action === 'telegram_basic') {
      const { articlesData } = payload;
      const prompt = `Bạn là trợ lý tài chính. Hãy tóm tắt danh sách tin tức sau thành một bản tin NGẮN GỌN để gửi Telegram.\nYêu cầu:\n- Trình bày dạng danh sách rõ ràng (có thể dùng emoji).\n- Mỗi tin gồm: Tiêu đề (kèm link), Điểm số, và 1 câu nhận xét cực kỳ ngắn gọn.\n\nCHÚ Ý ĐỊNH DẠNG BẮT BUỘC: \n- Chỉ dùng các thẻ HTML được Telegram hỗ trợ: <b>, <i>, <a>, <u>, <s>, <code>, <pre>. \n- KHÔNG dùng thẻ markdown như ** hay #. \n- KHÔNG dùng <p>, <br>, <ul>, <li>, <h1>... \n- Dùng ký tự xuống dòng (\\n) để ngắt dòng.\n\nDanh sách tin:\n${JSON.stringify(articlesData)}`;

      const geminiTask = async () => {
        const response = await ai!.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        return response.text || '';
      };
      const groqTask = async () => {
        return await callGroq(prompt, 'llama-3.1-8b-instant', false);
      };

      let { result: text, usedApi } = await runWithFallback(geminiTask, groqTask);
      text = text.replace(/^```html\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();
      return NextResponse.json({ result: text, usedApi });

    } else if (action === 'telegram_advance') {
      const { articlesData } = payload;
      const prompt = `Bạn là chuyên gia phân tích tài chính cấp cao. Hãy viết một bài phân tích CHI TIẾT SÂU SẮC để gửi Telegram dựa trên các tin tức sau.\nYêu cầu:\n- Phân tích chi tiết từng tin tức và tác động của nó đến thị trường (Chứng khoán, Crypto, Vĩ mô).\n- Đưa ra nhận định chuyên sâu, tổng hợp và dự báo xu hướng.\n- Trình bày chuyên nghiệp, mạch lạc.\n\nCHÚ Ý ĐỊNH DẠNG BẮT BUỘC: \n- Chỉ dùng các thẻ HTML được Telegram hỗ trợ: <b>, <i>, <a>, <u>, <s>, <code>, <pre>. \n- KHÔNG dùng thẻ markdown như ** hay #. \n- KHÔNG dùng <p>, <br>, <ul>, <li>, <h1>... \n- Dùng ký tự xuống dòng (\\n) để ngắt dòng.\n\nDanh sách tin:\n${JSON.stringify(articlesData)}`;

      const geminiTask = async () => {
        const response = await ai!.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: prompt,
          config: { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } }
        });
        return response.text || '';
      };
      const groqTask = async () => {
        return await callGroq(prompt, 'llama-3.3-70b-versatile', false);
      };

      let { result: text, usedApi } = await runWithFallback(geminiTask, groqTask);
      text = text.replace(/^```html\n?/, '').replace(/^```\n?/, '').replace(/```$/, '').trim();
      return NextResponse.json({ result: text, usedApi });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
