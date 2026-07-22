import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Month from '@/models/Month';
import Product from '@/models/Product';
import Debt from '@/models/Debt';

export async function DELETE(_req, { params }) {
  await connectDB();
  const { id } = params;
  await Product.deleteMany({ monthId: id });
  await Debt.deleteMany({ monthId: id });
  await Month.findByIdAndDelete(id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  const m = await Month.findByIdAndUpdate(params.id, { $set: body }, { new: true });
  return NextResponse.json(m);
}
