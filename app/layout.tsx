import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Macro Crypto Intelligence',
  description: 'Hệ thống phân tích vĩ mô và thị trường Crypto dựa trên hệ tư tưởng Petrodollar & USD Dominance',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
