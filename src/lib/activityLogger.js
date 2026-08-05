import { connectDB } from '@/lib/mongodb';
import ActivityLog from '@/models/ActivityLog';

export async function logActivity({ monthId, action, targetName = '', details = '' }) {
  try {
    await connectDB();
    await ActivityLog.create({
      monthId: monthId || null,
      action,
      targetName,
      details,
      createdAt: new Date(),
    });
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}
