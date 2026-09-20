/**
 * Parse diễn giải để tính số lượng tặng (gift quantity) và tổng tiền giảm giá.
 * Dùng chung cho tất cả các nơi tính tổng hợp.
 *
 * @param {string} dienGiai - Nội dung cột diễn giải
 * @returns {object} { giftQty, totalDiscount }
 */
export function parseDienGiaiForStats(dienGiai) {
  let giftQty = 0;
  let totalDiscount = 0;
  if (!dienGiai || typeof dienGiai !== 'string') return { giftQty, totalDiscount };

  const parts = dienGiai.split(/[,\n]/);

  for (let p of parts) {
    p = p.trim();
    if (!p) continue;

    // Tính tặng
    if (/tặng/i.test(p)) {
      let str = p.replace(/\(?tặng\)?/gi, '').trim();
      const qtyMatch = str.match(/^(.*?)\s+([\d\+]+)$/);
      if (qtyMatch) {
        const nums = qtyMatch[2].split('+');
        let sum = 0;
        for (const n of nums) sum += parseInt(n || 0, 10);
        giftQty += sum;
      } else {
        giftQty += 1;
      }
    } else {
      // Tính giảm giá (vd: -20k, -50)
      const discMatch = p.match(/(?:-|\()\s*(\d+)[kK]?\s*\)?$/);
      if (discMatch) {
        totalDiscount += parseInt(discMatch[1], 10);
      }
    }
  }

  return { giftQty, totalDiscount };
}

export function getGiftQty(dienGiai) {
  return parseDienGiaiForStats(dienGiai).giftQty;
}

/**
 * Tính SL bán thực (sau khi trừ tặng) dựa vào dienGiai, slBan.
 */
export function getEffectiveSlBan(p) {
  const { giftQty } = parseDienGiaiForStats(p.dienGiai);
  const slBan = Number(p.slBan) || 0;
  const giftInBan = Math.min(giftQty, slBan);
  return slBan - giftInBan;
}

/**
 * Lấy tổng tiền giảm giá khách hàng từ diễn giải.
 */
export function getDiscountFromDienGiai(p) {
  return parseDienGiaiForStats(p.dienGiai).totalDiscount;
}
