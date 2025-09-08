import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { GlobalProvider } from '@/components/client/global-provider';

export const metadata: Metadata = {
  title: 'Visage',
  description: 'AI-powered image creation studio',
  manifest: '/manifest.json',
  icons: {
    icon: '/logo.svg',
    apple: '/logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="theme-color" content="#0f0e11" />
      </head>
      <body suppressHydrationWarning>
        <GlobalProvider>
            {children}
        </GlobalProvider>
        <Toaster />
      </body>
    </html>
  );
}
