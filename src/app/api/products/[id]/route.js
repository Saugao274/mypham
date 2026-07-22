import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  // Chỉ nhận các field cho phép
  const allowed = ['ten', 'loaiHang', 'sl', 'giaMua', 'giaBan', 'slCon', 'slBan', 'slChi',
                   'giamCuoc', 'date', 'baoDongMonths', 'dienGiai', 'nhap', 'categoryKey', 'order'];
  const $set = {};
  for (const k of allowed) if (k in body) $set[k] = body[k];
  const p = await Product.findByIdAndUpdate(params.id, { $set }, { new: true });
  if (!p) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });
  return NextResponse.json(p.toJSON());
}

export async function DELETE(_req, { params }) {
  await connectDB();
  await Product.findByIdAndDelete(params.id);
  return NextResponse.json({ ok: true });
}
