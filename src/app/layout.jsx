import './globals.css';

export const metadata = {
  title: 'Quản lý mỹ phẩm',
  description: 'Chi tiêu, bán hàng và tồn kho mỹ phẩm',
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💄</text></svg>',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
