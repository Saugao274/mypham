import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import { logActivity } from '@/lib/activityLogger';

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const monthId = searchParams.get('monthId');
  const categoryKey = searchParams.get('categoryKey');
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });

  const q = { monthId };
  if (categoryKey) q.categoryKey = categoryKey;
  const list = await Product.find(q).sort({ categoryKey: 1, order: 1, createdAt: 1 });
  return NextResponse.json(list.map(p => p.toJSON()));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();

  // Support batch insert if body is array or has items
  if (body.items && Array.isArray(body.items)) {
    const created = [];
    for (const item of body.items) {
      if (!item.monthId || !item.categoryKey || !item.ten) continue;
      if (item.slCon === undefined || item.slCon === null || item.slCon === '') {
        item.slCon = item.sl || 0;
      }
      const last = await Product.findOne({ monthId: item.monthId, categoryKey: item.categoryKey }).sort({ order: -1 });
      const order = (last?.order || 0) + 1;
      const p = await Product.create({ ...item, order });
      created.push(p);
    }
    await logActivity({
      monthId: body.monthId || created[0]?.monthId,
      action: 'SCAN_BILL',
      targetName: `${created.length} sản phẩm`,
      details: `Nhập hàng loạt ${created.length} sản phẩm từ quét ảnh / AI`,
    });
    return NextResponse.json({ ok: true, count: created.length });
  }

  if (!body.monthId || !body.categoryKey || !body.ten) {
    return NextResponse.json({ error: 'Thiếu monthId / categoryKey / ten' }, { status: 400 });
  }
  // Nếu chưa có slCon thì mặc định = sl (mới nhập vào)
  if (body.slCon === undefined || body.slCon === null || body.slCon === '') {
    body.slCon = body.sl || 0;
  }
  const last = await Product.findOne({ monthId: body.monthId, categoryKey: body.categoryKey }).sort({ order: -1 });
  const order = (last?.order || 0) + 1;
  const p = await Product.create({ ...body, order });

  await logActivity({
    monthId: body.monthId,
    action: 'CREATE_PRODUCT',
    targetName: p.ten,
    details: `Thêm mới sản phẩm (SL: ${p.sl || 0}, Giá mua: ${p.giaMua || 0}${p.nhap ? `, Nơi nhập: ${p.nhap}` : ''})`,
  });

  return NextResponse.json(p.toJSON());
}

