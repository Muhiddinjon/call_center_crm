import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

export const metadata: Metadata = {
  title: 'Call Center CRM',
  description: 'Binotel integratsiyasi bilan qo\'ng\'iroqlarni boshqarish tizimi',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
