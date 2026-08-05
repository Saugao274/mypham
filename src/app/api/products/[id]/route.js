import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import { logActivity } from '@/lib/activityLogger';

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  const allowed = ['ten', 'loaiHang', 'sl', 'giaMua', 'giaBan', 'slCon', 'slBan', 'slChi',
                   'giamCuoc', 'date', 'baoDongMonths', 'dienGiai', 'nhap', 'categoryKey', 'order'];
  const $set = {};
  for (const k of allowed) if (k in body) $set[k] = body[k];
  
  const old = await Product.findById(params.id);
  if (!old) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  const p = await Product.findByIdAndUpdate(params.id, { $set }, { new: true });

  // Generate a friendly change summary
  const changes = [];
  if ($set.ten !== undefined && $set.ten !== old.ten) changes.push(`Đổi tên: ${old.ten} → ${$set.ten}`);
  if ($set.sl !== undefined && $set.sl !== old.sl) changes.push(`SL: ${old.sl} → ${$set.sl}`);
  if ($set.slBan !== undefined && $set.slBan !== old.slBan) changes.push(`SL bán: ${old.slBan} → ${$set.slBan}`);
  if ($set.slChi !== undefined && $set.slChi !== old.slChi) changes.push(`SL chi: ${old.slChi} → ${$set.slChi}`);
  if ($set.giaMua !== undefined && $set.giaMua !== old.giaMua) changes.push(`Giá mua: ${old.giaMua} → ${$set.giaMua}`);
  if ($set.giaBan !== undefined && $set.giaBan !== old.giaBan) changes.push(`Giá bán: ${old.giaBan} → ${$set.giaBan}`);
  if ($set.nhap !== undefined && $set.nhap !== old.nhap) changes.push(`Nơi nhập: ${old.nhap || '(trống)'} → ${$set.nhap}`);
  if ($set.date !== undefined && $set.date !== old.date) changes.push(`Date: ${old.date || '(trống)'} → ${$set.date}`);

  if (changes.length > 0) {
    await logActivity({
      monthId: p.monthId,
      action: 'UPDATE_PRODUCT',
      targetName: p.ten,
      details: changes.join(' · '),
    });
  }

  return NextResponse.json(p.toJSON());
}

export async function DELETE(_req, { params }) {
  await connectDB();
  const old = await Product.findById(params.id);
  if (old) {
    await logActivity({
      monthId: old.monthId,
      action: 'DELETE_PRODUCT',
      targetName: old.ten,
      details: `Xoá sản phẩm "${old.ten}" (SL: ${old.sl}, Giá mua: ${old.giaMua})`,
    });
    await Product.findByIdAndDelete(params.id);
  }
  return NextResponse.json({ ok: true });
}

