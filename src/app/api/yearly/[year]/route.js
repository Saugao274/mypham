import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Month from '@/models/Month';
import Product from '@/models/Product';

function round2(n) { return Math.round(n * 100) / 100; }

export async function GET(req, { params }) {
  await connectDB();
  const year = parseInt(params.year, 10);
  
  if (!year || isNaN(year)) {
    return NextResponse.json({ error: 'Năm không hợp lệ' }, { status: 400 });
  }

  // Lấy tất cả các tháng trong năm được chọn
  const months = await Month.find({ year }).sort({ month: 1 });
  
  const result = [];
  
  for (const m of months) {
    // Lấy toàn bộ sản phẩm của tháng này
    const products = await Product.find({ monthId: m._id.toString() });
    
    let tongBan = 0;
    let tongChi = 0;
    let vonCon = 0;
    
    for (const p of products) {
      tongBan += (p.slBan || 0) * (p.giaBan || 0);
      tongChi += (p.slChi || 0) * (p.giaMua || 0);
      vonCon += (p.slCon || 0) * (p.giaMua || 0);
    }
    
    // Tính tổng mua trong tháng từ mảng purchases
    const purchases = m.purchases || [];
    let tongMua = purchases.reduce((sum, p) => sum + (p.amount || 0), 0);
    
    // Thu: Tổng bán
    // Chi: Tổng chi (từ sản phẩm)
    // Chênh lệch: Thu - Chi
    const chenhLech = tongBan - tongChi;
    
    result.push({
      _id: m._id,
      month: m.month,
      label: m.label,
      tongBan: round2(tongBan),
      tongChi: round2(tongChi),
      chenhLech: round2(chenhLech),
      vonCon: round2(vonCon),
      tongMua: round2(tongMua),
      purchases: purchases,
    });
  }
  
  return NextResponse.json(result);
}
