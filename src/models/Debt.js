import mongoose from 'mongoose';

// tt | khách | số tiền | đã thanh toán | còn nợ | nợ từ | diễn giải
const DebtSchema = new mongoose.Schema(
  {
    monthId: { type: mongoose.Schema.Types.ObjectId, ref: 'Month', required: true, index: true },
    order: { type: Number, default: 0 },
    khach: { type: String, required: true, trim: true },
    soTien: { type: Number, default: 0 },
    daThanhToan: { type: Number, default: 0 },
    noTu: { type: String, default: '' },
    dienGiai: { type: String, default: '' },
  },
  { timestamps: true }
);

DebtSchema.virtual('conNo').get(function () {
  const v = (this.soTien || 0) - (this.daThanhToan || 0);
  return Math.round(v * 100) / 100;
});

DebtSchema.set('toJSON', { virtuals: true });
DebtSchema.set('toObject', { virtuals: true });

export default mongoose.models.Debt || mongoose.model('Debt', DebtSchema);
