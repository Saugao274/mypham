import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES } from '@/lib/categories';

export async function POST(req) {
  try {
    const data = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', userApiKey } = data;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu hình ảnh' }, { status: 400 });
    }

    const apiKey = userApiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: 'NEED_API_KEY',
        message: 'Vui lòng nhập Google Gemini API Key (Miễn phí) để sử dụng tính năng quét ảnh thông minh.',
      }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-1.5-flash which is free, fast, and excellent at multimodal vision
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const categoriesList = CATEGORIES.map(c => `- ${c.key}: ${c.name}`).join('\n');

    const prompt = `
Bạn là trợ lý AI chuyên bóc tách thông tin đơn hàng / hóa đơn / ảnh chụp màn hình giỏ hàng mỹ phẩm và tạp hóa.
Hãy đọc kỹ hình ảnh được cung cấp và trích xuất tất cả các sản phẩm có trong hình thành danh sách JSON chuẩn.

Các danh mục hợp lệ trong hệ thống:
${categoriesList}

Quy tắc bóc tách dữ liệu:
1. "ten": Tên sản phẩm đầy đủ và rõ ràng (bỏ bớt các mã SKU dư thừa hoặc tên người mua nếu có, giữ lại tên SP chính).
2. "sl": Số lượng sản phẩm. LƯU Ý ĐẶC BIỆT: Kiểm tra cả số trong các huy hiệu/vòng tròn xanh cạnh ảnh (ví dụ: ① -> 1, ⑤ -> 5), hoặc các ký hiệu "x2", "SL: 3". Nếu không thấy số lượng thì mặc định là 1.
3. "giaMua": Giá nhập / Đơn giá mua của sản phẩm (dạng số, ví dụ 175, 407, 250, hoặc 175000 -> 175 nếu bảng tính dùng đơn vị nghìn đồng. Nhìn vào số hiển thị trên ảnh như 175, 400, 250 để điền đúng số nguyên tương ứng).
4. "categoryKey": Chọn chính xác 1 trong các key danh mục ở danh sách trên (ví dụ: kem_duong, kem_cn, tre_em, st_dg_kdr, tpcn, tap_hoa, makeup_son, srm_tdc, serum_xk).
5. "loaiHang": Gợi ý viết tắt hoặc tên loại hàng (ví dụ: "TDC", "KCN", "TPCN", "Sâm", "KDR", "Son", "SRM", "Serum", "Tóc", "Cơ thể"...).
6. "nhap": Nơi nhập / mã đơn / mã nhà cung cấp nếu có trên ảnh (ví dụ: "SON12745" từ tiêu đề), nếu không có thì để rỗng "".
7. "dienGiai": Ghi chú thêm nếu có (hoặc mã SKU).

BẮT BUỘC: Trả về kết quả ĐÚNG định dạng JSON sau (không kèm văn bản giải thích nào khác ngoài JSON):
{
  "supplier": "mã hoặc tên nơi nhập nếu thấy trên ảnh, hoặc rỗng",
  "items": [
    {
      "ten": "Tẩy tế bào chết dịu nhẹ Ohui 100ml",
      "sl": 1,
      "giaMua": 175,
      "categoryKey": "srm_tdc",
      "loaiHang": "TDC",
      "nhap": "SON12745",
      "dienGiai": "SKU: PVN2414"
    }
  ]
}
`;

    // Extract base64 payload without prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const text = result.response.text();
    
    // Parse JSON safely from markdown blocks or raw text
    let jsonStr = text;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonStr = match[1];
    }

    const parsed = JSON.parse(jsonStr);
    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Error scanning image with Gemini:', err);
    return NextResponse.json({
      error: 'SCAN_FAILED',
      message: err.message || 'Không thể phân tích ảnh. Vui lòng thử lại với ảnh rõ nét hơn hoặc kiểm tra API Key.',
    }, { status: 500 });
  }
}
