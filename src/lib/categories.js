// Danh mục cố định — khớp với các sheet trong file gốc.
// hasLoaiHang: true nếu sheet gốc có cột "Loại hàng" (một số sheet không có).
export const CATEGORIES = [
  { key: 'kem_duong',   name: 'Kem dưỡng',                        order: 1, hasLoaiHang: false },
  { key: 'kem_cn',      name: 'Kem chống nắng',                   order: 2, hasLoaiHang: false },
  { key: 'tre_em',      name: 'Trẻ em',                           order: 3, hasLoaiHang: true  },
  { key: 'st_dg_kdr',   name: 'Sữa tắm - Dầu gội - Kem đánh răng', order: 4, hasLoaiHang: true  },
  { key: 'tpcn',        name: 'Thực phẩm chức năng',              order: 5, hasLoaiHang: true  },
  { key: 'tap_hoa',     name: 'Tạp hóa',                          order: 6, hasLoaiHang: true  },
  { key: 'makeup_son',  name: 'Makeup - Son',                     order: 7, hasLoaiHang: true  },
  { key: 'srm_tdc',     name: 'Sữa rửa mặt - Tẩy da chết - Tẩy trang', order: 8, hasLoaiHang: true },
  { key: 'serum_xk',    name: 'Serum - Xịt khoáng - NHH',         order: 9, hasLoaiHang: true  },
];

export const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

// Ánh xạ tên sheet trong file Excel về category key.
// Chấp nhận nhiều biến thể tên sheet mà file gốc dùng.
export function matchSheetToCategory(sheetName) {
  if (!sheetName) return null;
  const n = sheetName.toLowerCase().trim();
  if (n.includes('kem cn') || (n.includes('chống nắng') && !n.includes('dưỡng'))) return 'kem_cn';
  if (n.includes('chống nắng') && n.includes('dưỡng')) return 'kem_duong'; // sheet gộp cũ → xếp vào kem dưỡng, người dùng có thể sửa
  if (n.includes('kem dưỡng') || n === 'dưỡng') return 'kem_duong';
  if (n.includes('thực phẩm chức năng') || n.includes('tpcn')) return 'tpcn';
  if (n.includes('trẻ em')) return 'tre_em';
  if ((n.includes('sữa tắm') || n.includes('dầu gội') || n.includes('kem đr'))) return 'st_dg_kdr';
  if (n.includes('tạp hóa') || n === 'linh tinh') return 'tap_hoa';
  if (n.includes('make') || n.includes('son')) return 'makeup_son';
  if (n.includes('sữa rửa mặt') || n.includes('srm') || n.includes('tẩy trang') || n.includes('tẩy da chết')) return 'srm_tdc';
  if (n.includes('serum') || n.includes('nhh') || n.includes('xk') || n.includes('xịt khoáng') || n.includes('nước hoa hồng')) return 'serum_xk';
  return null;
}
