import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CATEGORIES } from '@/lib/categories';

export async function GET() {
  const hasEnvKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
  return NextResponse.json({
    configured: hasEnvKey,
  });
}

export async function POST(req) {
  try {
    const data = await req.json();
    const { imageBase64, mimeType = 'image/jpeg', userApiKey } = data;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Không tìm thấy dữ liệu hình ảnh' }, { status: 400 });
    }

    const rawKey = (userApiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!rawKey) {
      return NextResponse.json({
        error: 'NEED_API_KEY',
        message: 'Vui lòng nhập mã Google Gemini API Key (Miễn phí) hoặc khai báo trong .env.local để quét ảnh.',
      }, { status: 400 });
    }

    const genAI = new GoogleGenerativeAI(rawKey);

    const categoriesList = CATEGORIES.map(c => `- ${c.key}: ${c.name}`).join('\n');

    const prompt = `
Bạn là trợ lý AI chuyên bóc tách thông tin đơn hàng / hóa đơn / ảnh chụp màn hình giỏ hàng mỹ phẩm và tạp hóa.
Hãy đọc kỹ hình ảnh được cung cấp và trích xuất tất cả các sản phẩm có trong hình thành danh sách JSON chuẩn.

Các danh mục hợp lệ trong hệ thống:
${categoriesList}

Quy tắc bóc tách dữ liệu:
1. "ten": Tên sản phẩm đầy đủ và rõ ràng (bỏ bớt các mã SKU dư thừa hoặc tên người mua nếu có, giữ lại tên SP chính).
2. "sl": Số lượng sản phẩm. LƯU Ý ĐẶC BIỆT: Kiểm tra cả số trong các huy hiệu/vòng tròn xanh cạnh ảnh (ví dụ: ① -> 1, ⑤ -> 5), hoặc các ký hiệu "x2", "SL: 3". Nếu không thấy số lượng thì mặc định là 1.
3. "giaMua": Giá nhập / Đơn giá mua của sản phẩm (dạng số). LƯU Ý: Nếu giá hiển thị 175.000 hoặc 175k hoặc 175000 thì hãy quy đổi về đơn vị nghìn đồng là 175 (hoặc 407, 400, 50, 250).
4. "categoryKey": Chọn chính xác 1 trong các key danh mục ở danh sách trên (ví dụ: kem_duong, kem_cn, tre_em, st_dg_kdr, tpcn, tap_hoa, makeup_son, srm_tdc, serum_xk).
5. "loaiHang": Gợi ý viết tắt hoặc tên loại hàng (ví dụ: "TDC", "KCN", "TPCN", "Sâm", "KDR", "Son", "SRM", "Serum", "Tóc", "Cơ thể"...).
6. "nhap": Nơi nhập / mã đơn / mã nhà cung cấp nếu có trên ảnh (ví dụ: "SON12745" từ tiêu đề), nếu không có thì để rỗng "".
7. "dienGiai": Luôn để rỗng "" (tuyệt đối không điền SKU hay mã hàng vào đây vì cột này dùng để ghi tên người mua hàng sau này).

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
      "dienGiai": ""
    }
  ]
}
`;

    // Extract base64 payload without prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    // List of active models with fallback
    const candidateModels = [
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-flash-lite-latest',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ];

    let result = null;
    let lastError = null;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        result = await model.generateContent([
          prompt,
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
        ]);
        if (result) break; // Success
      } catch (e) {
        lastError = e;
        const msg = e.message || '';
        if (msg.includes('404') || msg.includes('not found') || msg.includes('not supported') || msg.includes('429')) {
          console.warn(`Model ${modelName} encountered issue, trying fallback model...`);
          continue;
        }
        if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID')) {
          break;
        }
      }
    }

    if (!result) {
      throw lastError || new Error('Không thể khởi chạy mô hình AI phân tích ảnh.');
    }

    const text = result.response.text();
    
    // Parse JSON safely from markdown blocks or raw text
    let jsonStr = text;
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (match) {
      jsonStr = match[1];
    }

    const parsed = JSON.parse(jsonStr);
    
    // Normalize giaMua if AI returned full VND instead of thousand VND
    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map(it => {
        let gia = Number(it.giaMua) || 0;
        if (gia >= 10000) {
          gia = Math.round(gia / 1000);
        }
        return {
          ...it,
          giaMua: gia,
          dienGiai: '', // Diễn giải là tên người mua, không lưu SKU/ghi chú từ bill
        };
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error('Error scanning image with Gemini:', err);
    const msg = err.message || '';
    const isInvalidKey = msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') || msg.includes('400 Bad Request');
    
    return NextResponse.json({
      error: isInvalidKey ? 'INVALID_API_KEY' : 'SCAN_FAILED',
      message: isInvalidKey
        ? 'Mã Google Gemini API Key không hợp lệ. Vui lòng kiểm tra lại mã API Key.'
        : (err.message || 'Không thể phân tích ảnh. Vui lòng thử lại với ảnh rõ nét hơn.'),
    }, { status: isInvalidKey ? 400 : 500 });
  }
}
