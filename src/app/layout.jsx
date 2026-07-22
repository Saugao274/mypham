import './globals.css';

export const metadata = {
  title: 'Quản lý mỹ phẩm',
  description: 'Chi tiêu, bán hàng và tồn kho mỹ phẩm',
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
