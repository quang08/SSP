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
import { Bug } from 'lucide-react';

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

      <a
        href="https://forms.gle/m9Vj4F69pfd92dDu5"
        target="_blank"
        rel="noopener noreferrer"
        className="group fixed bottom-4 right-4 z-50 p-3 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2 flex items-center gap-2"
        title="Report a Bug"
      >
        <Bug className="h-6 w-6" />
        <span className="hidden group-hover:inline-block whitespace-nowrap bg-gray-700 text-white text-lg rounded py-1 px-2 absolute bottom-full -right-12 mb-0 transform -translate-x-1/2 translate-y-[-0.5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Having issues? Tell us here!
        </span>
      </a>
    </body>
  </html>
);

export default RootLayout;
