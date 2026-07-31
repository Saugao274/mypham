import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Debt from '@/models/Debt';
import Month from '@/models/Month';

export async function POST(req) {
  try {
    await connectDB();
    const { sourceId, targetId } = await req.json();
    if (!sourceId || !targetId || sourceId === targetId) {
      return NextResponse.json({ error: 'Tháng không hợp lệ' }, { status: 400 });
    }

    const sourceMonth = await Month.findById(sourceId);
    if (!sourceMonth) return NextResponse.json({ error: 'Không tìm thấy tháng nguồn' }, { status: 404 });

    const srcDebts = await Debt.find({ monthId: sourceId }).lean();
    let count = 0;
    
    const lastTargetDebt = await Debt.findOne({ monthId: targetId }).sort({ order: -1 });
    let currentOrder = lastTargetDebt ? (lastTargetDebt.order || 0) : 0;

    const debtDocs = srcDebts.map(d => {
      const conNo = (d.soTien || 0) - (d.daThanhToan || 0);
      return {
        monthId: targetId,
        order: ++currentOrder,
        khach: d.khach,
        soTien: Math.round(conNo * 100) / 100,
        daThanhToan: 0,
        noTu: d.noTu || sourceMonth.label,
        dienGiai: d.dienGiai
      };
    }).filter(d => d.soTien > 0);

    if (debtDocs.length) {
      await Debt.insertMany(debtDocs);
      count = debtDocs.length;
    }

    return NextResponse.json({ success: true, count });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
