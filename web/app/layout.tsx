import type { Metadata } from 'next';
import { Anton, JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: 'Mogster — Your Aura. Rated. No Cap.',
  description: 'AI rates your aura. Chat roasts you. Join the waitlist.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${anton.variable} ${jbmono.variable} ${inter.variable}`}>
      <body className="bg-hazard-yellow text-ink font-body">
        {children}
      </body>
    </html>
  );
}
