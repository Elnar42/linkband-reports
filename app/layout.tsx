import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LinkBand Report',
  description: 'Your personal brain performance report by LinkBand',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
