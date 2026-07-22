import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import Debt from '@/models/Debt';
import { CATEGORIES } from '@/lib/categories';

function round2(n) { return Math.round(n * 100) / 100; }

function getMonthsRemaining(dateStr) {
  if (!dateStr) return null;
  const m = String(dateStr).match(/(\d{1,2})[\/\-](\d{2,4})/);
  if (!m) return null;
  let mm = parseInt(m[1], 10);
  let yy = parseInt(m[2], 10);
  if (yy < 100) yy += 2000;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  return (yy - currentYear) * 12 + (mm - currentMonth);
}

export async function GET(_req, { params }) {
  await connectDB();
  const { monthId } = params;
  const [products, debts] = await Promise.all([
    Product.find({ monthId }),
    Debt.find({ monthId }),
  ]);

  const alerts = [];

  const rows = CATEGORIES.map((cat, i) => {
    let tongVon = 0, tongBan = 0, tongLai = 0, tongChi = 0, vonCon = 0;
    for (const p of products) {
      if (p.categoryKey !== cat.key) continue;
      tongVon += (p.sl || 0) * (p.giaMua || 0);
      tongBan += (p.slBan || 0) * (p.giaBan || 0);
      tongLai += (p.slBan || 0) * (p.giaBan || 0) - (p.slBan || 0) * (p.giaMua || 0) - (p.giamCuoc || 0);
      tongChi += (p.slChi || 0) * (p.giaMua || 0);
      vonCon  += (p.slCon || 0) * (p.giaMua || 0);

      const remain = getMonthsRemaining(p.date);
      if (remain !== null) {
        const threshold = p.baoDongMonths ?? 6;
        if (remain <= threshold) {
          alerts.push({
            _id: p._id,
            ten: p.ten,
            date: p.date,
            remain,
            categoryName: cat.name,
            isExpired: remain <= 0
          });
        }
      }
    }
    return {
      tt: i + 1,
      key: cat.key,
      name: cat.name,
      tongVon: round2(tongVon),
      tongBan: round2(tongBan),
      tongLai: round2(tongLai),
      tongChi: round2(tongChi),
      vonCon: round2(vonCon),
    };
  });

  const total = rows.reduce((acc, r) => ({
    tongVon: acc.tongVon + r.tongVon,
    tongBan: acc.tongBan + r.tongBan,
    tongLai: acc.tongLai + r.tongLai,
    tongChi: acc.tongChi + r.tongChi,
    vonCon:  acc.vonCon  + r.vonCon,
  }), { tongVon: 0, tongBan: 0, tongLai: 0, tongChi: 0, vonCon: 0 });

  const tongNo = debts.reduce((s, d) => s + ((d.soTien || 0) - (d.daThanhToan || 0)), 0);
  
  alerts.sort((a, b) => a.remain - b.remain);

  return NextResponse.json({
    rows,
    alerts,
    total: {
      tongVon: round2(total.tongVon),
      tongBan: round2(total.tongBan),
      tongLai: round2(total.tongLai),
      tongChi: round2(total.tongChi),
      vonCon:  round2(total.vonCon),
      tongNo:  round2(tongNo),
    },
  });
}
