import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import Month from '@/models/Month';

export const dynamic = 'force-dynamic';

function round2(n) { return Math.round(n * 100) / 100; }

function parseDienGiai(dienGiai) {
  if (!dienGiai) return [];
  const parts = dienGiai.split(',');
  const results = [];
  
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    
    // Tìm phần số/toán tử ở cuối chuỗi. Ví dụ: "bé 1", "dũng", "ngọc ý 2", "hằng 2+3"
    const match = p.match(/^(.*?)\s*([\d\+\s]+)$/);
    if (match && match[1]) {
      const name = match[1].trim();
      let qty = 1;
      try {
        const expr = match[2].replace(/\s/g, '');
        if (/^[\d\+]+$/.test(expr)) {
          // Tính tổng biểu thức "2+3"
          qty = expr.split('+').reduce((sum, n) => sum + parseInt(n || 0, 10), 0);
        }
      } catch (e) {
        qty = 1;
      }
      results.push({ name, qty });
    } else {
      // Nếu không khớp (không có số ở cuối), mặc định số lượng = 1
      results.push({ name: p, qty: 1 });
    }
  }
  return results;
}

export async function GET() {
  await connectDB();
  
  // Lấy các sản phẩm có dienGiai khác rỗng
  const products = await Product.find({ dienGiai: { $ne: '' } }).populate('monthId');
  
  const customerMap = {};
  
  for (const p of products) {
    if (!p.dienGiai) continue;
    const parsed = parseDienGiai(p.dienGiai);
    
    for (const item of parsed) {
      if (!item.name) continue;
      
      const key = item.name.toLowerCase();
      if (!customerMap[key]) {
        customerMap[key] = {
          name: item.name, // Lấy tên viết hoa/thường đầu tiên làm chuẩn
          purchases: [],
          totalSpent: 0
        };
      }
      
      const price = p.giaBan || 0;
      const total = item.qty * price;
      
      customerMap[key].purchases.push({
        _id: p._id.toString() + '_' + key,
        productName: p.ten,
        monthLabel: p.monthId ? p.monthId.label : 'Không rõ',
        date: p.date,
        qty: item.qty,
        price: price,
        total: total
      });
      
      customerMap[key].totalSpent += total;
    }
  }
  
  // Convert map to array and sort by totalSpent descending
  const customers = Object.values(customerMap).map(c => {
    c.totalSpent = round2(c.totalSpent);
    // Sắp xếp các lần mua theo tháng hoặc giữ nguyên thứ tự (đã được fetch theo DB)
    return c;
  });
  
  customers.sort((a, b) => b.totalSpent - a.totalSpent);
  
  return NextResponse.json(customers);
}
