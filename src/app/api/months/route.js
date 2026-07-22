import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Month from '@/models/Month';
import Product from '@/models/Product';

export async function GET() {
  await connectDB();
  const list = await Month.find().sort({ year: -1, month: -1 }).lean();
  return NextResponse.json(list);
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const year = Number(body.year);
  const month = Number(body.month);
  const carryFromId = body.carryFromId || null; // nếu có, carry-over tồn kho

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return NextResponse.json({ error: 'Năm/tháng không hợp lệ' }, { status: 400 });
  }
  const label = body.label || `Tháng ${month}/${year}`;

  const existing = await Month.findOne({ year, month });
  if (existing) {
    return NextResponse.json({ error: 'Tháng này đã tồn tại' }, { status: 400 });
  }

  const newMonth = await Month.create({ year, month, label });

  // Carry-over: sao chép sản phẩm từ tháng nguồn, giữ SL còn làm SL mới,
  // reset các chỉ số bán/chi/diễn giải.
  if (carryFromId) {
    const src = await Product.find({ monthId: carryFromId }).lean();
    const docs = src.map(p => ({
      monthId: newMonth._id,
      categoryKey: p.categoryKey,
      order: p.order,
      ten: p.ten,
      loaiHang: p.loaiHang || '',
      sl: p.slCon || 0,       // tồn cuối tháng trước → nhập đầu tháng mới
      giaMua: p.giaMua || 0,
      giaBan: p.giaBan || 0,
      slCon: p.slCon || 0,    // vẫn còn nguyên vì chưa bán gì
      slBan: 0,
      slChi: 0,
      giamCuoc: 0,
      date: '',
      dienGiai: '',
      nhap: p.nhap || '',     // giữ nguồn nhập
    })).filter(p => p.sl > 0 || p.giaMua > 0); // bỏ dòng rỗng

    if (docs.length) await Product.insertMany(docs);
  }

  return NextResponse.json(newMonth);
}
