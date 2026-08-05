import mongoose from 'mongoose';

const ActivityLogSchema = new mongoose.Schema({
  monthId: { type: mongoose.Schema.Types.ObjectId, ref: 'Month', index: true },
  action: {
    type: String,
    enum: [
      'CREATE_PRODUCT',
      'UPDATE_PRODUCT',
      'DELETE_PRODUCT',
      'CREATE_DEBT',
      'UPDATE_DEBT',
      'DELETE_DEBT',
      'SCAN_BILL',
      'CARRY_OVER',
      'IMPORT',
      'OTHER',
    ],
    default: 'OTHER',
  },
  targetName: { type: String, default: '' },
  details: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});

export default mongoose.models.ActivityLog || mongoose.model('ActivityLog', ActivityLogSchema);
