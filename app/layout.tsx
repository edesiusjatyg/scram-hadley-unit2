import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SCRAM - Hadley Unit 2',
  description: 'Terminal-Style Boiling Water Reactor Shift Simulation Game',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col font-mono text-[13px] overflow-hidden bg-[#0a0a0a] text-[#33ff33]">
        {children}
      </body>
    </html>
  );
}
