import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';

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
  return NextResponse.json(p.toJSON());
}
