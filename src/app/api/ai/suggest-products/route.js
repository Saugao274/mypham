import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { products, theme } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!products || !products.length || !theme) {
      return NextResponse.json({ error: 'Thiếu thông tin sản phẩm hoặc chủ đề.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Rút gọn danh sách SP để đỡ tốn token (chỉ gửi ID và Tên)
    const productList = products.map(p => `{"id":"${p._id}", "name":"${p.ten}"}`).join(',\n');
    
    const prompt = `Bạn là một chuyên gia bán hàng mỹ phẩm. Người dùng muốn đăng một bài viết với chủ đề: "${theme}".
Dưới đây là danh sách các sản phẩm đang có trong kho:
[
${productList}
]

Nhiệm vụ của bạn: Hãy chọn ra NHỮNG sản phẩm PHÙ HỢP NHẤT với chủ đề "${theme}" để người dùng đăng bài (có thể chọn từ 5 đến 15 sản phẩm tuỳ độ phù hợp).
CHÚ Ý QUAN TRỌNG: Chỉ trả về một mảng JSON chứa các "id" của các sản phẩm được chọn. Tuyệt đối không giải thích thêm, không có text dư thừa, không có format markdown \`\`\`. 
Ví dụ kết quả trả về hợp lệ:
["id_1", "id_2", "id_3"]
`;

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
    
    // Clean up markdown block if AI still outputs it
    text = text.replace(/^```json/i, '').replace(/^```/i, '').replace(/```$/i, '').trim();

    const selectedIds = JSON.parse(text);
    return NextResponse.json({ ids: selectedIds });
  } catch (error) {
    console.error('Error suggesting products:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi gợi ý sản phẩm' }, { status: 500 });
  }
}
