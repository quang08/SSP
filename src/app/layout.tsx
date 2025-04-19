/*
 * Copyright (c) 2025 SSP Team (Peyton, Alex, Jackson, Yousif)
 */

import type { Metadata } from 'next';
import './globals.css';
import React from 'react';
import { Provider } from 'jotai';
import { Prompt } from 'next/font/google';
import { Toaster } from 'sonner';
import { SessionIndicatorWrapper } from '@/components/ui/session-indicator-wrapper';
import { Analytics } from '@vercel/analytics/react';
import Script from 'next/script';

const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-Z4DXLBMFRZ';

export const metadata: Metadata = {
  title: 'Smart Study+',
  description: 'AI-powered study guide generator and practice platform',
  icons: [
    {
      rel: 'icon',
      type: 'image/svg+xml',
      url: '/favicon.svg',
    },
  ],
};

const prompt = Prompt({
  subsets: ['latin'],
  weight: ['200', '300', '400', '500', '700', '800'],
});

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => (
  <html lang="en" className={prompt.className}>
    <head>{/* Add any other head elements here */}</head>
    <body>
      {/* <!-- Google Analytics Scripts --> */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
      />
      <Script
        id="google-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
      {/* --- End Google Analytics Scripts --- */}
      <Provider>
        {children}
        <SessionIndicatorWrapper />
      </Provider>
      <Toaster richColors position="top-right" closeButton />
      <Analytics />
    </body>
  </html>
);

export default RootLayout;
