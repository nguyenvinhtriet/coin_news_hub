// Audit: Code file description updated for deployment - 2026-04-15
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { NextResponse } from 'next/server';

async function getCryptoPrices() {
  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin,ripple&vs_currencies=usd&include_24hr_change=true&include_7d_change=true', { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const data = await res.json();
    
    // Format the data nicely to avoid long decimals
    let formattedData: Record<string, any> = {};
    for (const [coin, values] of Object.entries(data)) {
      const v = values as any;
      formattedData[coin] = {
        usd: v.usd,
        usd_24h_change: v.usd_24h_change ? Number(v.usd_24h_change.toFixed(2)) : null,
        usd_7d_change: v.usd_7d_change ? Number(v.usd_7d_change.toFixed(2)) : null
      };
    }
    return formattedData;
  } catch (e) {
    console.error("Failed to fetch crypto prices:", e);
    return null;
  }
}

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
      const { articlesData, portfolio, customPrompt } = payload;
      const cryptoData = await getCryptoPrices();
      const cryptoString = cryptoData ? JSON.stringify(cryptoData) : "Không thể lấy dữ liệu giá coin lúc này.";
      const currentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const timeOfDay = new Date().getHours() < 12 ? 'Sáng' : new Date().getHours() < 18 ? 'Chiều' : 'Tối';
      const portfolioString = portfolio && portfolio.length > 0 ? JSON.stringify(portfolio) : "Không có danh mục đầu tư cụ thể.";

      let reportPrompt = customPrompt;
      if (!reportPrompt) {
        reportPrompt = `Bạn là một chuyên gia kinh tế vĩ mô và chiến lược gia đầu tư cấp cao. Dựa vào danh sách các tin tức quan trọng và dữ liệu thị trường sau đây, hãy thực hiện 2 việc với độ CHÍNH XÁC và CHI TIẾT cao nhất:

THÔNG TIN THỊ TRƯỜNG HIỆN TẠI (Thời gian: ${currentTime} - Bản tin buổi ${timeOfDay}):
Giá Crypto (USD, Biến động 24h & 7 ngày): ${cryptoString}

DANH MỤC ĐẦU TƯ CỦA NGƯỜI DÙNG:
${portfolioString}

1. Viết một BÁO CÁO TỔNG HỢP THỊ TRƯỜNG (main summary) thật CHI TIẾT và SÂU SẮC. 
- Đánh giá toàn diện ảnh hưởng chung đến thị trường (Chứng khoán, Crypto, Kinh tế vĩ mô, Lãi suất, Lạm phát nếu có). 
- BẮT BUỘC phải có phần DỰ BÁO XU HƯỚNG (Forecast) ngắn hạn và trung hạn, kèm theo KHUYẾN NGHỊ HÀNH ĐỘNG (Recommendation) rõ ràng cho nhà đầu tư.
- LƯU Ý THỜI GIAN: Đây là bản tin buổi ${timeOfDay}. Hãy phân tích xu hướng thị trường dựa trên các sự kiện trong 12-24 giờ qua, kết hợp so sánh với dữ liệu 7 ngày để có cái nhìn toàn cảnh. Tránh đưa ra nhận định chung chung.
- PHÂN TÍCH DANH MỤC: Dựa vào danh mục đầu tư của người dùng (nếu có), hãy phân tích xem các tin tức và xu hướng thị trường hiện tại ảnh hưởng CỤ THỂ như thế nào đến TỪNG tài sản họ đang nắm giữ. Đưa ra chiến lược quản trị rủi ro và tối ưu hóa lợi nhuận riêng cho danh mục này.

2. Viết một ghi chú phân tích chi tiết (detailed note) cho TỪNG tin tức. Không chỉ tóm tắt, mà phải giải thích rõ TẠI SAO tin này quan trọng, hệ lụy logic của nó là gì, và tác động cụ thể đến dòng tiền hoặc tâm lý thị trường ra sao.

Danh sách tin tức (JSON):
${JSON.stringify(articlesData)}

Trả về kết quả dưới dạng JSON object với cấu trúc:
{
  "summary": "Nội dung báo cáo tổng hợp (dùng HTML tags cơ bản như <b>, <i> để format, dùng ký tự xuống dòng \\n để ngắt dòng, TUYỆT ĐỐI KHÔNG DÙNG thẻ <br>)",
  "notes": {
    "id_tin_bai_1": "Ghi chú phân tích chi tiết và hệ lụy cho tin bài 1",
    "id_tin_bai_2": "Ghi chú phân tích chi tiết và hệ lụy cho tin bài 2"
  }
}`;
      } else {
        reportPrompt = reportPrompt
          .replace('{currentTime}', currentTime)
          .replace('{timeOfDay}', timeOfDay)
          .replace('{cryptoString}', cryptoString)
          .replace('{portfolioString}', portfolioString)
          .replace('{articlesData}', JSON.stringify(articlesData));
      }

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
      const { articlesData, customPrompt } = payload;
      const currentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const timeOfDay = new Date().getHours() < 12 ? 'Sáng' : new Date().getHours() < 18 ? 'Chiều' : 'Tối';

      let prompt = customPrompt;
      if (!prompt) {
        prompt = `Bạn là trợ lý tài chính. Hãy tóm tắt danh sách tin tức sau thành một bản tin NGẮN GỌN để gửi Telegram.
Yêu cầu:
- Trình bày dạng danh sách rõ ràng, format ĐẸP MẮT, dễ nhìn (sử dụng emoji hợp lý, ví dụ: 📰, 🚀, ⚠️, 💡).
- Bắt đầu bằng tiêu đề: 🌅 Bản tin buổi ${timeOfDay} (${currentTime})
- Mỗi tin gồm: Tiêu đề (kèm link), Điểm số, và 1 câu nhận xét cực kỳ ngắn gọn.

CHÚ Ý ĐỊNH DẠNG BẮT BUỘC: 
- Chỉ dùng các thẻ HTML được Telegram hỗ trợ: <b>, <i>, <a>, <u>, <s>, <code>, <pre>. 
- KHÔNG dùng thẻ markdown như ** hay #. 
- KHÔNG dùng <p>, <br>, <ul>, <li>, <h1>... 
- Dùng ký tự xuống dòng (\\n) để ngắt dòng.

Danh sách tin:
${JSON.stringify(articlesData)}`;
      } else {
        prompt = prompt
          .replace('{currentTime}', currentTime)
          .replace('{timeOfDay}', timeOfDay)
          .replace('{articlesData}', JSON.stringify(articlesData));
      }

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
      const { articlesData, portfolio, customPrompt } = payload;
      const cryptoData = await getCryptoPrices();
      const cryptoString = cryptoData ? JSON.stringify(cryptoData) : "Không thể lấy dữ liệu giá coin lúc này.";
      const currentTime = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
      const timeOfDay = new Date().getHours() < 12 ? 'Sáng' : new Date().getHours() < 18 ? 'Chiều' : 'Tối';
      const portfolioString = portfolio && portfolio.length > 0 ? JSON.stringify(portfolio) : "Không có danh mục đầu tư cụ thể.";

      let prompt = customPrompt;
      if (!prompt) {
        prompt = `Bạn là một chuyên gia kinh tế vĩ mô và chiến lược gia đầu tư cấp cao. Hãy viết một bài phân tích CHI TIẾT SÂU SẮC và CHÍNH XÁC để gửi Telegram dựa trên các tin tức và dữ liệu thị trường sau.

THÔNG TIN THỊ TRƯỜNG HIỆN TẠI (Thời gian: ${currentTime} - Bản tin buổi ${timeOfDay}):
Giá Crypto (USD, Biến động 24h & 7 ngày): ${cryptoString}

DANH MỤC ĐẦU TƯ CỦA NGƯỜI DÙNG:
${portfolioString}

Yêu cầu phân tích:
- Phân tích logic và chi tiết từng tin tức: Tại sao nó xảy ra? Dòng tiền sẽ dịch chuyển thế nào? Tác động đến thị trường (Chứng khoán, Crypto, Vĩ mô) ra sao?
- Đưa ra nhận định chuyên sâu, tổng hợp các sự kiện rời rạc thành một bức tranh toàn cảnh và dự báo xu hướng ngắn/trung hạn.
- LƯU Ý THỜI GIAN: Đây là bản tin buổi ${timeOfDay}. Hãy phân tích xu hướng thị trường dựa trên các sự kiện trong 12-24 giờ qua, kết hợp so sánh với dữ liệu 7 ngày để có cái nhìn toàn cảnh.
- PHÂN TÍCH DANH MỤC: Dựa vào danh mục đầu tư của người dùng (nếu có), hãy phân tích xem các tin tức và xu hướng thị trường hiện tại ảnh hưởng CỤ THỂ như thế nào đến TỪNG tài sản họ đang nắm giữ. Đưa ra chiến lược hành động rõ ràng (Mua/Bán/Giữ/Phòng ngừa rủi ro) cho danh mục này.
- Trình bày chuyên nghiệp, mạch lạc, format ĐẸP MẮT, dễ nhìn trên Telegram (sử dụng emoji hợp lý để phân chia các phần: 📊 Bức tranh Thị trường, 📰 Phân tích Tin tức, 💡 Nhận định & Dự báo, 💼 Tác động Danh mục, 🎯 Khuyến nghị Hành động).

CHÚ Ý ĐỊNH DẠNG BẮT BUỘC: 
- Chỉ dùng các thẻ HTML được Telegram hỗ trợ: <b>, <i>, <a>, <u>, <s>, <code>, <pre>. 
- KHÔNG dùng thẻ markdown như ** hay #. 
- KHÔNG dùng <p>, <br>, <ul>, <li>, <h1>... 
- Dùng ký tự xuống dòng (\\n) để ngắt dòng.
- Đảm bảo các con số phần trăm được định dạng gọn gàng (ví dụ: +1.25%, -0.50%).

Danh sách tin:
${JSON.stringify(articlesData)}`;
      } else {
        prompt = prompt
          .replace('{currentTime}', currentTime)
          .replace('{timeOfDay}', timeOfDay)
          .replace('{cryptoString}', cryptoString)
          .replace('{portfolioString}', portfolioString)
          .replace('{articlesData}', JSON.stringify(articlesData));
      }

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

    } else if (action === 'analyze_sentiment') {
      const { articlesData, customPrompt } = payload;
      let prompt = customPrompt;
      if (!prompt) {
        prompt = `Bạn là chuyên gia phân tích tâm lý thị trường tài chính. Dựa vào danh sách các tin tức quan trọng sau đây, hãy đánh giá tâm lý chung của thị trường.
      
Nhiệm vụ:
1. Chấm điểm Bullish (Lạc quan/Tăng giá) từ 0 đến 100.
2. Chấm điểm Bearish (Bi quan/Giảm giá) từ 0 đến 100. (Lưu ý: Bullish + Bearish không nhất thiết phải bằng 100, vì thị trường có thể vừa có tin rất tốt vừa có tin rất xấu).
3. Xác định xu hướng chung (trend): "bullish", "bearish", hoặc "neutral".
4. Viết 1 câu tóm tắt ngắn gọn lý do.

Danh sách tin tức:
${JSON.stringify(articlesData)}

Trả về kết quả dưới dạng JSON object với cấu trúc chính xác như sau:
{
  "bullish_score": 75,
  "bearish_score": 20,
  "trend": "bullish",
  "summary": "Thị trường phản ứng tích cực với tin tức ETF..."
}`;
      } else {
        prompt = prompt.replace('{articlesData}', JSON.stringify(articlesData));
      }

      const geminiTask = async () => {
        const response = await ai!.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                bullish_score: { type: Type.INTEGER },
                bearish_score: { type: Type.INTEGER },
                trend: { type: Type.STRING },
                summary: { type: Type.STRING }
              },
              required: ["bullish_score", "bearish_score", "trend", "summary"]
            }
          }
        });
        const resultText = response.text;
        if (!resultText) throw new Error("AI không trả về kết quả.");
        return JSON.parse(resultText);
      };

      const groqTask = async () => {
        const groqPrompt = prompt + "\n\nIMPORTANT: You MUST return a valid JSON object with exactly four keys: 'bullish_score' (number), 'bearish_score' (number), 'trend' (string), and 'summary' (string).";
        const content = await callGroq(groqPrompt, 'llama-3.1-8b-instant', true);
        return JSON.parse(content);
      };

      const { result, usedApi } = await runWithFallback(geminiTask, groqTask);
      return NextResponse.json({ result, usedApi });

    } else if (action === 'analyze_portfolio_impact') {
      const { articlesData, portfolio, customPrompt } = payload;
      const cryptoData = await getCryptoPrices();
      const cryptoString = cryptoData ? JSON.stringify(cryptoData) : "Không thể lấy dữ liệu giá coin lúc này.";

      let prompt = customPrompt;
      if (!prompt) {
        prompt = `Bạn là một chuyên gia kinh tế và quản lý danh mục đầu tư cấp cao. Dựa vào danh sách tin tức mới nhất và dữ liệu thị trường (bao gồm biến động 24h và 7 ngày), hãy phân tích TOÀN DIỆN VÀ CHÍNH XÁC tác động lên danh mục đầu tư của người dùng.

THÔNG TIN THỊ TRƯỜNG (Giá, Biến động 24h, Biến động 7 ngày): ${cryptoString}
DANH MỤC ĐẦU TƯ: ${JSON.stringify(portfolio)}
TIN TỨC: ${JSON.stringify(articlesData)}

Yêu cầu phân tích:
1. So sánh xu hướng hiện tại với dữ liệu 1 tuần qua để có góc nhìn tổng quan.
2. Đánh giá chi tiết từng tin tức có thể tác động RIÊNG BIỆT đến từng loại tài sản như thế nào (ví dụ: tin quốc gia X chấp nhận thanh toán bằng đồng Y, tin update mạng lưới Z...).
3. CHỈ phân tích các tài sản có trong DANH MỤC ĐẦU TƯ của người dùng. KHÔNG phân tích các tài sản khác ngoài danh mục.
4. Đưa ra dự báo (predict) và hành động cụ thể (action) cho từng tài sản trong danh mục.

Trả về JSON object với cấu trúc:
{
  "overall_impact": "Tóm tắt tác động chung lên toàn bộ danh mục, so sánh với xu hướng 1 tuần qua (khoảng 3-4 câu).",
  "asset_analysis": [
    {
      "coin": "Mã coin (VD: BTC)",
      "trend": "Tăng / Giảm / Đi ngang",
      "reason": "Lý do cực kỳ chi tiết, liên kết trực tiếp một tin tức cụ thể hoặc dữ liệu thị trường với đồng coin này.",
      "predict": "Dự báo xu hướng ngắn hạn và trung hạn.",
      "action": "Hành động khuyến nghị (VD: Nắm giữ, Chốt lời một phần, Mua thêm...)."
    }
  ]
}`;
      } else {
        prompt = prompt
          .replace('{cryptoString}', cryptoString)
          .replace('{portfolioString}', JSON.stringify(portfolio))
          .replace('{articlesData}', JSON.stringify(articlesData));
      }

      const geminiTask = async () => {
        const response = await ai!.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overall_impact: { type: Type.STRING },
                asset_analysis: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      coin: { type: Type.STRING },
                      trend: { type: Type.STRING },
                      reason: { type: Type.STRING },
                      predict: { type: Type.STRING },
                      action: { type: Type.STRING }
                    },
                    required: ["coin", "trend", "reason", "predict", "action"]
                  }
                }
              },
              required: ["overall_impact", "asset_analysis"]
            }
          }
        });
        const resultText = response.text;
        if (!resultText) throw new Error("AI không trả về kết quả.");
        return JSON.parse(resultText);
      };

      const groqTask = async () => {
        const groqPrompt = prompt + "\n\nIMPORTANT: You MUST return a valid JSON object with exactly two keys: 'overall_impact' (string) and 'asset_analysis' (array of objects with coin, trend, reason, predict, action).";
        const content = await callGroq(groqPrompt, 'llama-3.1-8b-instant', true);
        return JSON.parse(content);
      };

      const { result, usedApi } = await runWithFallback(geminiTask, groqTask);
      return NextResponse.json({ result, usedApi });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('AI API error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
