import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { LanguageProvider } from '@/contexts/LanguageContext';
import { SyncProvider } from '@/contexts/SyncContext';
import TranslationLoader from '@/components/TranslationLoader';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "AfriCart - Nigerian Marketplace",
  description: "Shop the best products in Nigeria",
  applicationName: "AfriCart",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "AfriCart",
  },
};

export const viewport = {
  themeColor: "#f97316",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (localStorage.theme === 'dark') {
                  document.documentElement.classList.add('dark')
                } else {
                  document.documentElement.classList.remove('dark')
                }
              } catch (_) {}

              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('AfriCart PWA: ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('AfriCart PWA: ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <LanguageProvider>
          <SyncProvider>
            {/* 3. TranslationLoader shows loading screen during translation */}
            <TranslationLoader />
            
            {children}
          </SyncProvider>
        </LanguageProvider>
        <Toaster
          position="top-right"
          reverseOrder={false}
          gutter={8}
          toastOptions={{
            duration: 3000,
            style: {
              background: "#fff",
              color: "#363636",
              padding: "16px",
              borderRadius: "12px",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
              fontSize: "14px",
              maxWidth: "500px",
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: "#10b981",
                secondary: "#fff",
              },
              style: {
                background: "#ecfdf5",
                color: "#065f46",
                border: "1px solid #10b981",
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: "#ef4444",
                secondary: "#fff",
              },
              style: {
                background: "#fef2f2",
                color: "#991b1b",
                border: "1px solid #ef4444",
              },
            },
            loading: {
              style: {
                background: "#eff6ff",
                color: "#1e40af",
                border: "1px solid #3b82f6",
              },
            },
          }}
        />
      </body>
    </html>
  );
}