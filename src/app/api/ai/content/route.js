import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(req) {
  try {
    const { products, theme, tone, referenceData } = await req.json();
    
    if (!products || !products.length) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất 1 sản phẩm.' }, { status: 400 });
    }
    
    if (!apiKey) {
      return NextResponse.json({ error: 'Chưa cấu hình GEMINI_API_KEY trong biến môi trường.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    
    let prompt = `Bạn là một chuyên gia viết content Marketing bán hàng mỹ phẩm trên Facebook.
Hãy viết một bài đăng Facebook siêu hấp dẫn, TƯƠNG TÁC CAO để bán các sản phẩm sau:\n`;

    products.forEach((p, i) => {
      prompt += `- ${p.ten} (Số lượng còn: ${p.slCon})\n`;
    });
    
    prompt += `\nChủ đề bài đăng: ${theme || 'Đăng bán hàng ngày'}\n`;
    prompt += `Văn phong: ${tone || 'Hấp dẫn, thu hút, thân thiện'}\n`;
    
    if (referenceData && referenceData.trim() !== '') {
      prompt += `\nĐẶC BIỆT LƯU Ý - TƯ LIỆU THAM KHẢO TỪ NHÀ SẢN XUẤT:\n"${referenceData}"\n(Hãy khéo léo lồng ghép các thông tin, ưu điểm, công dụng từ phần tư liệu này vào bài viết một cách tự nhiên nhất).\n`;
    }

    prompt += `\nYêu cầu ĐỂ TĂNG TƯƠNG TÁC (QUAN TRỌNG):
Hãy trả về kết quả gồm 2 phần rõ ràng:

[ PHẦN 1: HƯỚNG DẪN ĐĂNG BÀI (Dành riêng cho bạn) ]
- Giờ vàng nên đăng bài này (VD: 11h30 hay 20h00) và lý do.
- Bố cục hình ảnh nên dùng (VD: 1 ảnh vuông + 3 ảnh ngang, chụp tay hay mượn feedback).
- Mẹo tự seeding (Ví dụ: Nhớ tự comment ảnh bảng giá xuống dưới nhé...).

[ PHẦN 2: NỘI DUNG BÀI VIẾT (Để copy đăng luôn) ]
- Mở đầu bằng một câu hỏi tạo sự đồng cảm (Hook) để giữ chân người đọc.
- Khéo léo lồng ghép công dụng/nỗi đau của khách hàng để tạo câu chuyện (Storytelling).
- Nêu lời kêu gọi hành động (Call to action) chốt sale hoặc kêu gọi bình luận/inbox.
- Thêm hashtag phù hợp.

TUYỆT ĐỐI KHÔNG dùng ký tự in đậm markdown như ** hoặc *. Viết văn bản thuần túy (plain text).`;

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
      throw lastError || new Error('Không thể gọi Google Gemini API với bất kỳ model nào.');
    }

    const response = await result.response;
    let text = response.text();
    
    // Xóa sạch các dấu sao markdown nếu AI vẫn cố tình trả về
    text = text.replace(/\*\*/g, '').replace(/\*/g, '');
    
    return NextResponse.json({ content: text });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json({ error: error.message || 'Lỗi khi tạo nội dung' }, { status: 500 });
  }
}
