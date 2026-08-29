import mongoose from 'mongoose';

const PurchaseSchema = new mongoose.Schema({
  supplier: { type: String, required: true },
  date: { type: String, required: true },
  amount: { type: Number, required: true },
});

const MonthSchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    month: { type: Number, required: true, min: 1, max: 12 },
    label: { type: String, required: true }, // e.g. "Tháng 4/2025"
    note: { type: String, default: '' },
    purchases: { type: [PurchaseSchema], default: [] },
  },
  { timestamps: true }
);

MonthSchema.index({ year: 1, month: 1 }, { unique: true });

export default mongoose.models.Month || mongoose.model('Month', MonthSchema);
