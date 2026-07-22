import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Debt from '@/models/Debt';

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  const allowed = ['khach', 'soTien', 'daThanhToan', 'noTu', 'dienGiai', 'order'];
  const $set = {};
  for (const k of allowed) if (k in body) $set[k] = body[k];
  const d = await Debt.findByIdAndUpdate(params.id, { $set }, { new: true });
  if (!d) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(d.toJSON());
}

export async function DELETE(_req, { params }) {
  await connectDB();
  await Debt.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
