import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Month from '@/models/Month';
import Product from '@/models/Product';
import Debt from '@/models/Debt';
import { parseWorkbook } from '@/lib/excel';

// Nhận JSON: { url, monthId? | year+month?, replace? }
// Hỗ trợ:
//   - Google Sheets:  https://docs.google.com/spreadsheets/d/<ID>/edit...   (cần share "Bất kỳ ai có link đều xem được")
//   - Google Drive file: https://drive.google.com/file/d/<ID>/view...
function extractId(input) {
  if (!input) return null;
  const s = String(input);
  let m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return { type: 'sheet', id: m[1] };
  m = s.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
  if (m) return { type: 'file', id: m[1] };
  m = s.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (m) return { type: 'file', id: m[1] };
  // Nếu người dùng dán thẳng ID
  if (/^[a-zA-Z0-9-_]{20,}$/.test(s.trim())) return { type: 'sheet', id: s.trim() };
  return null;
}

async function fetchAsXlsx({ type, id }) {
  const url = type === 'sheet'
    ? `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`
    : `https://drive.google.com/uc?export=download&id=${id}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`Không tải được file từ Google (${res.status}). Kiểm tra quyền chia sẻ.`);
  const buf = Buffer.from(await res.arrayBuffer());
  return buf;
}

export async function POST(req) {
  await connectDB();
  const body = await req.json();
  const parsed = extractId(body.url);
  if (!parsed) return NextResponse.json({ error: 'Link Google Drive/Sheets không hợp lệ' }, { status: 400 });

  let monthId = body.monthId;
  if (!monthId && body.year && body.month) {
    const y = Number(body.year), m = Number(body.month);
    let existing = await Month.findOne({ year: y, month: m });
    if (!existing) existing = await Month.create({ year: y, month: m, label: `Tháng ${m}/${y}` });
    monthId = existing._id;
  }
  if (!monthId) return NextResponse.json({ error: 'Chưa chọn tháng đích' }, { status: 400 });

  let buf;
  try {
    buf = await fetchAsXlsx(parsed);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }

  const data = parseWorkbook(buf);
  if (body.replace) {
    await Product.deleteMany({ monthId });
    await Debt.deleteMany({ monthId });
  }
  const products = data.products.map(p => ({ ...p, monthId }));
  const debts = data.debts.map(d => ({ ...d, monthId }));
  if (products.length) await Product.insertMany(products);
  if (debts.length) await Debt.insertMany(debts);
  return NextResponse.json({ ok: true, monthId, imported: { products: products.length, debts: debts.length } });
}
