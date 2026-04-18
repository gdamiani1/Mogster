import type { Metadata } from 'next';
import { Anton, JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

const anton = Anton({ weight: '400', subsets: ['latin'], variable: '--font-anton', display: 'swap' });
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

const SITE_URL = 'https://www.mogster.app';
const SITE_TITLE = 'Mogster — Your Aura. Rated. No Cap.';
const SITE_DESCRIPTION = 'AI rates your aura. Chat roasts you. Join the waitlist.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_TITLE,
    template: '%s | Mogster',
  },
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'Mogster',
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  verification: {
    google: 'BKprUAn_wN8_vi59Zr5Mq_QJYn372BWKcHRNvGHMEzY',
  },
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
