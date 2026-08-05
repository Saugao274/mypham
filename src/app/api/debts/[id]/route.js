import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Debt from '@/models/Debt';
import { logActivity } from '@/lib/activityLogger';

export async function PATCH(req, { params }) {
  await connectDB();
  const body = await req.json();
  const allowed = ['khach', 'soTien', 'daThanhToan', 'noTu', 'dienGiai', 'order'];
  const $set = {};
  for (const k of allowed) if (k in body) $set[k] = body[k];
  
  const old = await Debt.findById(params.id);
  if (!old) return NextResponse.json({ error: 'Không tìm thấy' }, { status: 404 });

  const d = await Debt.findByIdAndUpdate(params.id, { $set }, { new: true });

  const changes = [];
  if ($set.khach !== undefined && $set.khach !== old.khach) changes.push(`Tên: ${old.khach} → ${$set.khach}`);
  if ($set.soTien !== undefined && $set.soTien !== old.soTien) changes.push(`Số tiền: ${old.soTien} → ${$set.soTien}`);
  if ($set.daThanhToan !== undefined && $set.daThanhToan !== old.daThanhToan) changes.push(`Đã trả: ${old.daThanhToan} → ${$set.daThanhToan}`);
  if ($set.noTu !== undefined && $set.noTu !== old.noTu) changes.push(`Nợ từ: ${old.noTu || '(trống)'} → ${$set.noTu}`);
  if ($set.dienGiai !== undefined && $set.dienGiai !== old.dienGiai) changes.push(`Diễn giải: ${old.dienGiai || '(trống)'} → ${$set.dienGiai}`);

  if (changes.length > 0) {
    await logActivity({
      monthId: d.monthId,
      action: 'UPDATE_DEBT',
      targetName: d.khach,
      details: changes.join(' · '),
    });
  }

  return NextResponse.json(d.toJSON());
}

export async function DELETE(_req, { params }) {
  await connectDB();
  const old = await Debt.findById(params.id);
  if (old) {
    await logActivity({
      monthId: old.monthId,
      action: 'DELETE_DEBT',
      targetName: old.khach,
      details: `Xoá khoản nợ của khách "${old.khach}" (Nợ: ${old.soTien}, Đã trả: ${old.daThanhToan})`,
    });
    await Debt.findByIdAndDelete(params.id);
  }
  return NextResponse.json({ ok: true });
}

