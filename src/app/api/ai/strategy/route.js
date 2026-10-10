import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req) {
  try {
    const { products, theme, referenceData } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!products || !products.length) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất 1 sản phẩm.' }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    let prompt = `Bạn là một chuyên gia thực chiến Marketing Facebook mảng mỹ phẩm tại Việt Nam. Trả lời với giọng văn mộc mạc, thực tế, như đang "truyền nghề" cho một người bán hàng. Không dùng văn phong "AI", không chào hỏi rườm rà.
Khách hàng đang muốn bán các sản phẩm sau:
`;
    products.forEach(p => prompt += `- ${p.ten}\n`);
    
    if (theme) prompt += `Chủ đề ưu tiên: ${theme}\n`;
    if (referenceData) prompt += `\nTư liệu tham khảo:\n"${referenceData}"\n`;

    prompt += `
Vấn đề của khách là: Bài đăng bị trôi, ít tương tác. Khách muốn có một LỘ TRÌNH ĐĂNG BÀI cụ thể trong 3 ngày tới để vét sạch kho và thu hút khách.

NHIỆM VỤ CỦA BẠN: Viết lộ trình 3 ngày siêu thực chiến, đi thẳng vào vấn đề. Mỗi ngày phải bắt buộc có:
1. KHUNG GIỜ VÀNG ĐĂNG BÀI: Gợi ý giờ cụ thể (VD: Trưa 11h30-13h, hoặc Tối 20h-21h) và giải thích ngắn gọn tại sao.
2. BỐ CỤC HÌNH ẢNH (Quan trọng): Khuyên khách dùng mấy ảnh, tỷ lệ thế nào để Facebook hiển thị đẹp nhất (VD: 1 ảnh vuông + 3 ảnh ngang, hoặc 1 video 15s + 1 ảnh kết quả...). Khuyên cụ thể dùng ảnh thật, chụp tay hay ảnh lấy từ hãng.
3. CÁCH VIẾT VÀ TƯƠNG TÁC: Hôm đó viết dài hay ngắn? Đầu bài đặt câu hỏi gì? Công dụng để ở đâu (để trên bài hay mồi dưới comment)? Mẹo tự thả seeding (tự bình luận mồi) như thế nào?

YÊU CẦU FORMAT:
- Viết ngắn gọn, dễ đọc, xuống dòng rõ ràng.
- TUYỆT ĐỐI KHÔNG dùng ký hiệu in đậm ** của markdown vì web không hiển thị được. Dùng [ ] hoặc Viết Hoa để nhấn mạnh.
- Bỏ qua các câu sáo rỗng như "Đây là chiến lược của bạn". Bắt đầu luôn vào "NGÀY 1: ...".`;

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

    if (!result) throw lastError || new Error('Không thể gọi API');

    const response = await result.response;
    let text = response.text().trim();
    text = text.replace(/\*\*/g, '').replace(/\*/g, ''); // Dọn dẹp markdown
    
    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
