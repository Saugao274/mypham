import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Month from '@/models/Month';
import Product from '@/models/Product';
import Debt from '@/models/Debt';
import { parseWorkbook } from '@/lib/excel';

// Nhận multipart form: field "file" (xlsx) + "monthId" (đích)
// hoặc "year" + "month" để tự tạo tháng mới.
// query ?replace=1 để xoá dữ liệu hiện có của tháng trước khi import.
export async function POST(req) {
  await connectDB();
  const url = new URL(req.url);
  const replace = url.searchParams.get('replace') === '1';

  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Thiếu file' }, { status: 400 });
  }

  let monthId = form.get('monthId');
  const year = form.get('year');
  const month = form.get('month');

  if (!monthId && year && month) {
    const y = Number(year), m = Number(month);
    let existing = await Month.findOne({ year: y, month: m });
    if (!existing) {
      existing = await Month.create({ year: y, month: m, label: `Tháng ${m}/${y}` });
    }
    monthId = existing._id;
  }

  if (!monthId) {
    return NextResponse.json({ error: 'Chưa chọn tháng đích' }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const parsed = parseWorkbook(buf);

  if (replace) {
    await Product.deleteMany({ monthId });
    await Debt.deleteMany({ monthId });
  }

  const products = parsed.products.map(p => ({ ...p, monthId }));
  const debts = parsed.debts.map(d => ({ ...d, monthId }));

  if (products.length) await Product.insertMany(products);
  if (debts.length) await Debt.insertMany(debts);

  return NextResponse.json({
    ok: true,
    monthId,
    imported: { products: products.length, debts: debts.length },
  });
}
