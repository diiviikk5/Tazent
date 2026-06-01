import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tazent - Crash Monitoring for Browser Agents',
  description: 'Tazent is a real-time crash and error tracking dashboard for browser-using agents. Capture navigations, clicks, text input, screenshot replays, and local DOM contexts automatically to detect selector changes, network timeouts, or captchas.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
