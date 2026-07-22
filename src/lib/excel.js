import * as XLSX from 'xlsx';
import { CATEGORIES, CATEGORY_MAP, matchSheetToCategory } from './categories.js';

// ============ IMPORT ============

// Chuẩn hoá header về tên chuẩn — tolerance với biến thể chữ hoa/thường/dấu
function normHeader(h) {
  if (h === null || h === undefined) return '';
  return String(h).toLowerCase().trim().replace(/\s+/g, ' ');
}

const HEADER_ALIASES = {
  ten:      ['tên sp', 'ten sp', 'tên sản phẩm', 'sản phẩm'],
  loaiHang: ['loại hàng', 'loai hang'],
  sl:       ['sl'],
  giaMua:   ['giá mua', 'gia mua'],
  giaBan:   ['giá bán', 'gia ban'],
  slCon:    ['sl còn', 'sl con'],
  slBan:    ['sl bán', 'sl ban'],
  slChi:    ['sl chi'],
  giamCuoc: ['giảm, trừ cước', 'giảm, cước', 'giảm cước', 'giam cuoc', 'giảm trừ cước'],
  date:     ['date', 'ngày'],
  dienGiai: ['diễn giải', 'dien giai'],
  nhap:     ['nhập', 'nhap'],
  // Các cột tính toán (tổng vốn, tổng bán,...) sẽ bỏ qua khi import,
  // vì luôn tính lại từ số liệu gốc.
};

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.forEach((h, idx) => {
    const n = normHeader(h);
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.includes(n)) {
        map[field] = idx;
        break;
      }
    }
  });
  return map;
}

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function str(v) {
  if (v === null || v === undefined) return '';
  // Excel có thể trả về Date cho cột date — convert về chuỗi mm/yy
  if (v instanceof Date) {
    const mm = v.getMonth() + 1;
    const yy = String(v.getFullYear()).slice(2);
    return `${mm}/${yy}`;
  }
  return String(v).trim();
}

export function parseWorkbook(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const result = { products: [], debts: [] };

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
    if (!rows.length) continue;

    // Nợ sheet
    if (sheetName.toLowerCase().includes('nợ') || sheetName.toLowerCase().includes('no')) {
      parseDebtRows(rows, result.debts);
      continue;
    }

    // Tổng hợp — bỏ qua, sẽ tự tính
    if (sheetName.toLowerCase().includes('tổng hợp') || sheetName.toLowerCase().includes('tong hop')) {
      continue;
    }

    const categoryKey = matchSheetToCategory(sheetName);
    if (!categoryKey) continue;

    const headerRow = rows[0];
    const map = buildHeaderMap(headerRow);
    if (map.ten === undefined) continue;

    let order = 0;
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i];
      const ten = str(r[map.ten]);
      if (!ten) continue;
      result.products.push({
        categoryKey,
        order: ++order,
        ten,
        loaiHang: map.loaiHang !== undefined ? str(r[map.loaiHang]) : '',
        sl:       map.sl       !== undefined ? num(r[map.sl])       : 0,
        giaMua:   map.giaMua   !== undefined ? num(r[map.giaMua])   : 0,
        giaBan:   map.giaBan   !== undefined ? num(r[map.giaBan])   : 0,
        slCon:    map.slCon    !== undefined ? num(r[map.slCon])    : 0,
        slBan:    map.slBan    !== undefined ? num(r[map.slBan])    : 0,
        slChi:    map.slChi    !== undefined ? num(r[map.slChi])    : 0,
        giamCuoc: map.giamCuoc !== undefined ? num(r[map.giamCuoc]) : 0,
        date:     map.date     !== undefined ? str(r[map.date])     : '',
        dienGiai: map.dienGiai !== undefined ? str(r[map.dienGiai]) : '',
        nhap:     map.nhap     !== undefined ? str(r[map.nhap])     : '',
      });
    }
  }

  return result;
}

function parseDebtRows(rows, out) {
  const header = rows[0].map(normHeader);
  const idx = {
    khach:       header.findIndex(h => h.includes('khách') || h === 'khach'),
    soTien:      header.findIndex(h => h.includes('số tiền') || h.includes('so tien')),
    daThanhToan: header.findIndex(h => h.includes('đã thanh toán') || h.includes('da thanh toan')),
    noTu:        header.findIndex(h => h.includes('nợ từ') || h.includes('no tu')),
    dienGiai:    header.findIndex(h => h.includes('diễn giải') || h.includes('dien giai')),
  };
  if (idx.khach === -1) return;
  let order = 0;
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const khach = str(r[idx.khach]);
    if (!khach) continue;
    out.push({
      order: ++order,
      khach,
      soTien:      idx.soTien      !== -1 ? num(r[idx.soTien])      : 0,
      daThanhToan: idx.daThanhToan !== -1 ? num(r[idx.daThanhToan]) : 0,
      noTu:        idx.noTu        !== -1 ? str(r[idx.noTu])        : '',
      dienGiai:    idx.dienGiai    !== -1 ? str(r[idx.dienGiai])    : '',
    });
  }
}

// ============ EXPORT ============

const PRODUCT_HEADERS_WITH_LOAI = [
  'TT', 'TÊN SP', 'Loại hàng', 'Sl', 'Giá mua', 'Tổng vốn', 'SL còn', 'Vốn còn',
  'Giá bán', 'Sl bán', 'Tổng bán', 'Tổng lãi', 'Sl chi', 'Tổng chi',
  'Date', 'Diễn giải', 'Giảm, cước', 'Nhập',
];
const PRODUCT_HEADERS_NO_LOAI = [
  'TT', 'TÊN SP', 'Sl', 'Giá mua', 'Tổng vốn', 'SL còn', 'Vốn còn',
  'Giá bán', 'Sl bán', 'Tổng bán', 'Tổng lãi', 'Sl chi', 'Tổng chi',
  'Date', 'Diễn giải', 'Giảm, cước', 'Nhập',
];

function computeRow(p) {
  const tongVon = round2((p.sl || 0) * (p.giaMua || 0));
  const vonCon = round2((p.slCon || 0) * (p.giaMua || 0));
  const tongBan = round2((p.slBan || 0) * (p.giaBan || 0));
  const tongChi = round2((p.slChi || 0) * (p.giaMua || 0));
  const tongLai = round2(tongBan - (p.slBan || 0) * (p.giaMua || 0) - (p.giamCuoc || 0));
  return { tongVon, vonCon, tongBan, tongLai, tongChi };
}
function round2(n) { return Math.round(n * 100) / 100; }

export function buildWorkbook({ label, productsByCat, debts }) {
  const wb = XLSX.utils.book_new();

  // Sheet cho mỗi category
  for (const cat of CATEGORIES) {
    const list = productsByCat[cat.key] || [];
    const headers = cat.hasLoaiHang ? PRODUCT_HEADERS_WITH_LOAI : PRODUCT_HEADERS_NO_LOAI;
    const data = [headers];
    let tt = 0;
    for (const p of list) {
      const c = computeRow(p);
      tt++;
      if (cat.hasLoaiHang) {
        data.push([
          tt, p.ten, p.loaiHang || '',
          p.sl || 0, p.giaMua || 0, c.tongVon, p.slCon || 0, c.vonCon,
          p.giaBan || 0, p.slBan || 0, c.tongBan, c.tongLai, p.slChi || 0, c.tongChi,
          p.date || '', p.dienGiai || '', p.giamCuoc || 0, p.nhap || '',
        ]);
      } else {
        data.push([
          tt, p.ten,
          p.sl || 0, p.giaMua || 0, c.tongVon, p.slCon || 0, c.vonCon,
          p.giaBan || 0, p.slBan || 0, c.tongBan, c.tongLai, p.slChi || 0, c.tongChi,
          p.date || '', p.dienGiai || '', p.giamCuoc || 0, p.nhap || '',
        ]);
      }
    }
    const ws = XLSX.utils.aoa_to_sheet(data);
    // Trim sheet name (Excel limit 31 chars)
    const sheetName = cat.name.slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  // Sheet nợ
  const debtHeaders = ['TT', 'Khách', 'Số tiền', 'Đã thanh toán', 'Còn nợ', 'Nợ từ', 'Diễn giải'];
  const debtData = [debtHeaders];
  let dt = 0;
  for (const d of debts || []) {
    dt++;
    const conNo = round2((d.soTien || 0) - (d.daThanhToan || 0));
    debtData.push([dt, d.khach, d.soTien || 0, d.daThanhToan || 0, conNo, d.noTu || '', d.dienGiai || '']);
  }
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(debtData), 'Nợ');

  // Sheet tổng hợp
  const sumHeaders = ['TT', 'Sản phẩm', 'Tổng vốn', 'Tổng tiền bán', 'Tổng lãi', 'Tổng chi', 'Vốn còn', 'Tổng nợ'];
  const sumData = [sumHeaders];
  let totV = 0, totB = 0, totL = 0, totC = 0, totVC = 0;
  CATEGORIES.forEach((cat, i) => {
    const list = productsByCat[cat.key] || [];
    let v = 0, b = 0, l = 0, ch = 0, vc = 0;
    for (const p of list) {
      const c = computeRow(p);
      v += c.tongVon; b += c.tongBan; l += c.tongLai; ch += c.tongChi; vc += c.vonCon;
    }
    v = round2(v); b = round2(b); l = round2(l); ch = round2(ch); vc = round2(vc);
    totV += v; totB += b; totL += l; totC += ch; totVC += vc;
    sumData.push([i + 1, cat.name, v, b, l, ch, vc, '']);
  });
  const totalDebt = (debts || []).reduce((s, d) => s + ((d.soTien || 0) - (d.daThanhToan || 0)), 0);
  sumData.push(['#', 'Tổng', round2(totV), round2(totB), round2(totL), round2(totC), round2(totVC), round2(totalDebt)]);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(sumData), 'Tổng hợp');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}
