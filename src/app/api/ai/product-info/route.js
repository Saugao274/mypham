import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { productNames } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!productNames || !productNames.length) {
      return NextResponse.json({ error: 'Thiếu danh sách sản phẩm.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const namesStr = productNames.map(n => `- ${n}`).join('\n');
    
    const prompt = `Hãy đóng vai một chuyên gia mỹ phẩm. Hãy cung cấp thông tin chi tiết cho TỪNG sản phẩm trong danh sách dưới đây:
${namesStr}

Yêu cầu trả về thông tin cực kỳ ngắn gọn, súc tích cho MỖI sản phẩm (dưới 100 chữ/sản phẩm) bao gồm:
- Công dụng chính.
- Thành phần nổi bật.
- Hướng dẫn sử dụng nhanh.

Hãy trình bày theo định dạng:
--- [ TÊN SẢN PHẨM ] ---
(Thông tin...)

Tuyệt đối không viết lan man, tập trung vào điểm mạnh để chốt sale.`;

    const candidateModels = [
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash'
    ];

    let result = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent(prompt);
        if (result) break;
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    if (!result) {
      throw lastError || new Error('Không thể gọi Google Gemini API.');
    }

    const response = await result.response;
    let text = response.text().trim();
    text = text.replace(/\*\*/g, '').replace(/\*/g, '');
    
    return NextResponse.json({ info: text });
  } catch (error) {
    console.error('Error fetching product info:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tra cứu' }, { status: 500 });
  }
}
