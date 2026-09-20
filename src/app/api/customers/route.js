import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';
import Month from '@/models/Month';

export const dynamic = 'force-dynamic';

function round2(n) { return Math.round(n * 100) / 100; }

function parseDienGiai(dienGiai) {
  if (!dienGiai) return [];
  const parts = dienGiai.split(/[,\n]/);
  const results = [];
  
  for (let p of parts) {
    p = p.trim();
    if (!p) continue;
    
    let str = p;
    let isFree = false;
    let discountVal = 0;

    // 1. Check for "tặng"
    if (/tặng/i.test(str)) {
      isFree = true;
      str = str.replace(/\(?tặng\)?/gi, '').trim();
    } else {
      // 2. Check for "-50" or "-50k" at the end
      const discMatch = str.match(/(?:-|\()\s*(\d+)[kK]?\s*\)?$/);
      if (discMatch) {
        discountVal = parseInt(discMatch[1], 10);
        str = str.substring(0, discMatch.index).trim();
      }
    }

    // 3. Extract quantity at the end
    let name = str;
    let qty = 1;
    const qtyMatch = str.match(/^(.*?)\s+([\d\+]+)$/);
    if (qtyMatch) {
      name = qtyMatch[1].trim();
      const expr = qtyMatch[2];
      qty = expr.split('+').reduce((s, n) => s + parseInt(n || 0, 10), 0);
    }

    if (name) {
      // Chuẩn hóa tên: In hoa chữ cái đầu cho đẹp
      name = name.charAt(0).toUpperCase() + name.slice(1);
      results.push({ name, qty, isFree, discountVal });
    }
  }
  return results;
}

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const monthId = searchParams.get('monthId');
  
  const query = { dienGiai: { $ne: '' } };
  if (monthId && monthId !== 'all') {
    query.monthId = monthId;
  }
  
  // Lấy các sản phẩm có dienGiai khác rỗng (và theo tháng nếu có)
  const products = await Product.find(query).populate('monthId');
  
  const customerMap = {};
  
  for (const p of products) {
    if (!p.dienGiai) continue;
    const parsed = parseDienGiai(p.dienGiai);
    
    for (const item of parsed) {
      if (!item.name) continue;
      
      const key = item.name.toLowerCase();
      if (!customerMap[key]) {
        customerMap[key] = {
          name: item.name,
          purchases: [],
          totalSpent: 0
        };
      }
      
      const price = p.giaBan || 0;
      let discount = item.discountVal || 0;
      if (item.isFree) {
        discount = item.qty * price; // Miễn phí 100%
      }
      
      let total = (item.qty * price) - discount;
      if (total < 0) total = 0; // Tránh âm tiền nếu lỡ nhập giảm giá lớn hơn giá trị
      
      customerMap[key].purchases.push({
        _id: p._id.toString() + '_' + key,
        productName: p.ten,
        categoryKey: p.categoryKey,
        monthId: p.monthId ? p.monthId._id.toString() : null,
        monthLabel: p.monthId ? p.monthId.label : 'Không rõ',
        date: p.date,
        qty: item.qty,
        price: price,
        discount: discount,
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
