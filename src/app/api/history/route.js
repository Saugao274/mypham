import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

export async function GET(req) {
  await connectDB();
  const { searchParams } = new URL(req.url);
  const monthId = searchParams.get('monthId');
  const limit = parseInt(searchParams.get('limit') || '100', 10);
  const q = {};

  if (monthId && monthId !== 'all') {
    q.monthId = monthId;
  }

  const logs = await ActivityLog.find(q)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('monthId', 'label year month')
    .lean();

  return NextResponse.json(logs);
}

export async function DELETE() {
  await connectDB();
  await ActivityLog.deleteMany({});
  return NextResponse.json({ ok: true });
}
