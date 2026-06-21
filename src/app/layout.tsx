import type { Metadata } from "next";
import Script from "next/script";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "OtoParking — Test Center",
  description:
    "Multi-module testing and visualization center for the OtoParking smart parking platform — Financial Flows, Gate Simulator, Auth, Notifications, Pricing, and more.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/otoparking-green.png", type: "image/png", sizes: "256x256" },
    ],
    apple: [
      { url: "/otoparking-green.png", sizes: "256x256", type: "image/png" },
    ],
  },
  openGraph: {
    title: "OtoParking — Test Center",
    description:
      "Multi-module testing and visualization center for the OtoParking smart parking platform.",
    images: [{ url: "/otoparking-green.png", width: 1059, height: 1059 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/*
         * Runs before React hydration to apply the stored theme class
         * to <html> immediately, preventing a flash of unstyled content.
         * next/script with strategy="beforeInteractive" is the correct way
         * to inject an inline blocking script in Next.js App Router.
         */}
        <Script id="theme-init" strategy="beforeInteractive">{`
          (function(){
            try{
              var s=localStorage.getItem('op_theme');
              document.documentElement.classList.add((s==='light'||s==='dark')?s:'dark');
            }catch(e){
              document.documentElement.classList.add('dark');
            }
          })();
        `}</Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-background text-foreground min-h-screen overflow-hidden">
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  );
}
