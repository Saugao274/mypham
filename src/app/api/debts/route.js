import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Debt from '@/models/Debt';
import { logActivity } from '@/lib/activityLogger';

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const monthId = searchParams.get('monthId');
  if (!monthId) return NextResponse.json({ error: 'Thiếu monthId' }, { status: 400 });
  const list = await Debt.find({ monthId }).sort({ order: 1, createdAt: 1 });
  return NextResponse.json(list.map(d => d.toJSON()));
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  if (!body.monthId || !body.khach) {
    return NextResponse.json({ error: 'Thiếu monthId / khach' }, { status: 400 });
  }
  const last = await Debt.findOne({ monthId: body.monthId }).sort({ order: -1 });
  const order = (last?.order || 0) + 1;
  const d = await Debt.create({ ...body, order });

  await logActivity({
    monthId: body.monthId,
    action: 'CREATE_DEBT',
    targetName: d.khach,
    details: `Thêm khoản nợ khách "${d.khach}" (Số tiền: ${d.soTien || 0}, Đã thanh toán: ${d.daThanhToan || 0})`,
  });

  return NextResponse.json(d.toJSON());
}

