/**
 * Parse diễn giải để tính số lượng tặng (gift quantity).
 * Dùng chung cho tất cả các nơi tính tổng hợp.
 *
 * @param {string} dienGiai - Nội dung cột diễn giải
 * @returns {number} Tổng số lượng tặng
 */
export function getGiftQty(dienGiai) {
  if (!dienGiai || typeof dienGiai !== 'string') return 0;

  const parts = dienGiai.split(/[,\n]/);
  let giftQty = 0;

  for (let p of parts) {
    p = p.trim();
    if (!p) continue;

    // Chỉ tính entry có chữ "tặng"
    if (!/tặng/i.test(p)) continue;

    // Bỏ chữ "tặng" ra để lấy số lượng
    let str = p.replace(/\(?tặng\)?/gi, '').trim();

    // Tách tên và số lượng: "Hiếu 2" → qty = 2
    const qtyMatch = str.match(/^(.*?)\s+([\d\+]+)$/);
    if (qtyMatch) {
      const nums = qtyMatch[2].split('+');
      let sum = 0;
      for (const n of nums) sum += parseInt(n || 0, 10);
      giftQty += sum;
    } else {
      // Không có số lượng → mặc định 1
      giftQty += 1;
    }
  }

  return giftQty;
}

/**
 * Tính SL bán thực (sau khi trừ tặng) dựa vào dienGiai, slBan, slChi.
 * Logic: gift ưu tiên nằm trong slBan trước.
 *
 * @param {object} p - Product object cần có: dienGiai, slBan, slChi
 * @returns {number} effectiveSlBan - SL bán thực sự (đã trừ tặng)
 */
export function getEffectiveSlBan(p) {
  const giftQty = getGiftQty(p.dienGiai);
  const slBan = Number(p.slBan) || 0;
  // Tặng nằm trong slBan (ưu tiên), tối đa = slBan
  const giftInBan = Math.min(giftQty, slBan);
  return slBan - giftInBan;
}
