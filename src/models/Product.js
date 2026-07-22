import mongoose from 'mongoose';

// Bám sát các cột trong sheet gốc:
// TT | TÊN SP | Loại hàng | Sl | Giá mua | Tổng vốn | SL còn | Vốn còn |
// Giá bán | Sl bán | Tổng bán | Tổng lãi | Sl chi | Tổng chi |
// Date | Diễn giải | Giảm/cước | Nhập
//
// Các cột "Tổng vốn / Vốn còn / Tổng bán / Tổng lãi / Tổng chi" được TÍNH TỰ ĐỘNG
// (không lưu trong DB) để tránh sai lệch dữ liệu.
const ProductSchema = new mongoose.Schema(
  {
    monthId: { type: mongoose.Schema.Types.ObjectId, ref: 'Month', required: true, index: true },
    categoryKey: { type: String, required: true, index: true },
    order: { type: Number, default: 0 },

    ten: { type: String, required: true, trim: true },
    loaiHang: { type: String, default: '' },

    sl: { type: Number, default: 0 },       // Nhập vào tổng số lượng ban đầu
    giaMua: { type: Number, default: 0 },
    giaBan: { type: Number, default: 0 },
    slCon: { type: Number, default: 0 },    // Số lượng còn lại
    slBan: { type: Number, default: 0 },    // Số đã bán
    slChi: { type: Number, default: 0 },    // Số đã dùng / chi
    giamCuoc: { type: Number, default: 0 }, // Giảm giá, trừ cước

    date: { type: String, default: '' },    // Giữ dạng chuỗi vì gốc có "3/26", "9/26"
    baoDongMonths: { type: Number, default: 6 }, // Số tháng cảnh báo hết hạn
    dienGiai: { type: String, default: '' },
    nhap: { type: String, default: '' },
  },
  { timestamps: true }
);

ProductSchema.index({ monthId: 1, categoryKey: 1, order: 1 });

// Virtual computed fields
ProductSchema.virtual('tongVon').get(function () {
  return round2((this.sl || 0) * (this.giaMua || 0));
});
ProductSchema.virtual('vonCon').get(function () {
  return round2((this.slCon || 0) * (this.giaMua || 0));
});
ProductSchema.virtual('tongBan').get(function () {
  return round2((this.slBan || 0) * (this.giaBan || 0));
});
ProductSchema.virtual('tongChi').get(function () {
  return round2((this.slChi || 0) * (this.giaMua || 0));
});
ProductSchema.virtual('tongLai').get(function () {
  const doanhThu = (this.slBan || 0) * (this.giaBan || 0);
  const goc = (this.slBan || 0) * (this.giaMua || 0);
  return round2(doanhThu - goc - (this.giamCuoc || 0));
});

ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);
