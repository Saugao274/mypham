import { connectDB } from '@/lib/mongodb';
import Month from '@/models/Month';
import Product from '@/models/Product';
import Debt from '@/models/Debt';
import { buildWorkbook } from '@/lib/excel';
import { CATEGORIES } from '@/lib/categories';

export async function GET(_req, { params }) {
  await connectDB();
  const { monthId } = params;
  const m = await Month.findById(monthId);
  if (!m) return new Response(JSON.stringify({ error: 'Tháng không tồn tại' }), { status: 404 });

  const [products, debts] = await Promise.all([
    Product.find({ monthId }).sort({ categoryKey: 1, order: 1 }).lean(),
    Debt.find({ monthId }).sort({ order: 1 }).lean(),
  ]);

  const productsByCat = {};
  for (const cat of CATEGORIES) productsByCat[cat.key] = [];
  for (const p of products) {
    if (productsByCat[p.categoryKey]) productsByCat[p.categoryKey].push(p);
  }

  const buf = buildWorkbook({ label: m.label, productsByCat, debts });
  const filename = `my_pham_${m.label.replace(/\s+/g, '_')}.xlsx`;
  return new Response(buf, {
    status: 200,
    headers: {
      'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  });
}
