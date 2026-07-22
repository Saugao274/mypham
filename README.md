# Quản lý mỹ phẩm — Next.js + MongoDB

Web quản lý chi tiêu, bán hàng và tồn kho mỹ phẩm, bám sát đúng cấu trúc 3 file Excel gốc.

## Tính năng

- 🔐 Đăng nhập admin đơn giản (username / password đặt trong `.env.local`).
- 📅 Quản lý nhiều tháng — mỗi tháng có các sheet riêng biệt như file gốc:
  - Kem dưỡng, Kem chống nắng, Trẻ em, Sữa tắm–Dầu gội–Kem đr, TPCN, Tạp hoá, Makeup–Son, Sữa rửa mặt–Tẩy da chết–Tẩy trang, Serum–XK–NHH.
  - Sổ nợ.
  - Tổng hợp (tự tính).
- ✏️ **Sửa trực tiếp trong bảng** — bấm vào ô là gõ, tự lưu sau 0.5s.
- ➕ Thêm / xoá sản phẩm và khoản nợ.
- 🧮 **Các cột tự tính**: Tổng vốn, Vốn còn, Tổng bán, Tổng lãi, Tổng chi, Còn nợ, sheet Tổng hợp (không nhập tay, không lo sai).
- 🔄 **Carry-over tồn kho**: khi tạo tháng mới có thể chọn "Carry-over từ tháng X" — tất cả sản phẩm và số lượng còn của tháng đó tự động thành tồn đầu tháng mới. `SL bán / SL chi / Diễn giải / Giảm cước` được reset về 0.
- ⬆️ **Import** từ file `.xlsx` trong máy **hoặc** link Google Sheet đã chia sẻ công khai.
- ⬇️ **Export** file `.xlsx` giữ đúng cấu trúc: mỗi danh mục là 1 sheet, có sheet Nợ + Tổng hợp.
- 📱 **Responsive** — dùng được trên điện thoại, bảng cuộn ngang.

## Cài đặt

### 1. Yêu cầu

- Node.js **≥ 18** (khuyên 20 hoặc 22).
- MongoDB đang chạy — chọn 1 trong 2:
  - **Local**: cài MongoDB Community rồi chạy `mongod` mặc định port `27017`.
  - **Cloud (miễn phí)**: đăng ký https://cloud.mongodb.com → tạo cluster free → lấy connection string `mongodb+srv://...`.

### 2. Cấu hình

```bash
cd mypham-app
cp .env.example .env.local
```

Sửa `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/mypham
# hoặc: mongodb+srv://<user>:<pass>@cluster.xxxxx.mongodb.net/mypham

ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123     # ĐỔI mật khẩu trước khi deploy
JWT_SECRET=doi-thanh-1-chuoi-ngau-nhien-dai-32-ky-tu-tro-len
```

### 3. Chạy

```bash
npm install
npm run dev
```

Mở http://localhost:3000 → đăng nhập với `admin` / `admin123` (hoặc thông tin bạn đặt trong `.env.local`).

### 4. Deploy production

```bash
npm run build
npm start
```

## Hướng dẫn dùng

### Lần đầu — nạp dữ liệu 3 tháng cũ

1. Vào **Tháng / Import / Export**.
2. Chọn tab **"Từ máy tính"** → chọn file `mỹ_phẩm_tháng_9.xlsx` → chọn **"Tạo tháng mới"** T9/2024 → **Import**.
3. Lặp lại cho file tháng 10-11 và tháng 4/2025.

### Tạo tháng tiếp theo (carry-over)

1. **Tháng / Import / Export** → mục "Quản lý tháng".
2. Chọn tháng + năm mới.
3. Ở dropdown **"Carry-over tồn kho từ tháng"** chọn tháng gần nhất → **Tạo tháng**.
4. Sang tab **Sản phẩm** thấy toàn bộ hàng còn ở tháng trước đã có sẵn, `SL bán / SL chi` = 0, sẵn sàng nhập bán mới.

### Import từ Google Sheet

1. Trong Google Sheets: File → Share → "Anyone with the link" → Viewer → copy link.
2. Vào **Tháng / Import / Export** → tab **"Google Sheet"** → dán link.

### Export

Chọn tháng cần xuất → bấm **"Tải file .xlsx"**. File tải về mở được bằng Excel/Google Sheets, đủ mọi sheet.

## Cấu trúc dự án

```
src/
├── app/
│   ├── login/                    # trang đăng nhập
│   ├── dashboard/
│   │   ├── page.jsx              # Tổng hợp
│   │   ├── products/page.jsx     # Sản phẩm (theo danh mục)
│   │   ├── debts/page.jsx        # Sổ nợ
│   │   └── manage/page.jsx       # Tháng / Import / Export
│   └── api/                      # tất cả endpoint (Next.js Route Handlers)
├── components/                   # ProductTable, DebtTable, MonthSelector
├── lib/                          # mongodb.js, auth.js, excel.js, categories.js
├── models/                       # Month, Product, Debt (Mongoose)
└── middleware.js                 # bảo vệ tất cả route (trừ /login)
```

## Ghi chú kỹ thuật

- **Backend + Frontend gói chung 1 project** — API là các Route Handlers của Next.js (`src/app/api/*`).
- Dữ liệu tính toán (Tổng vốn, Tổng lãi, ...) **không lưu vào DB**, tính lại từ số nguyên gốc — tránh sai sót.
- Debounce 0.5s trên các ô đang gõ để tự lưu, không cần bấm nút.
- File Excel parse bằng `xlsx` (SheetJS), khoan dung với các biến thể tên cột trong file gốc.
