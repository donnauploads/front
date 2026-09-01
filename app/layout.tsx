import type { Metadata, Viewport } from "next"
import { Plus_Jakarta_Sans } from "next/font/google"
import { BRAND_NAME } from "@/lib/brand"
import { ThemeProvider } from "@/components/providers/ThemeProvider"
import { ToastProvider } from "@/components/providers/ToastProvider"
import { SessionBootstrap } from "@/components/providers/SessionBootstrap"
import { RealtimeProvider } from "@/components/providers/RealtimeProvider"
// import { DevToolbar } from "@/components/dev/DevToolbar"
import "./globals.css"

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700"],
})

export const metadata: Metadata = {
  title: `${BRAND_NAME}, Banking that gets you`,
  description: `${BRAND_NAME} offers modern, secure banking built around you.`,
}

// viewport-fit=cover is required for env(safe-area-inset-*) to resolve on
// iOS (notch / Dynamic Island / home indicator). Without it, full-screen
// sheets sit under the status bar and the safe-area paddings are 0.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={jakarta.variable}>
      <body className="bg-flush text-ink antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <ToastProvider>
            <SessionBootstrap>
              <RealtimeProvider>{children}</RealtimeProvider>
            </SessionBootstrap>
            {/* <DevToolbar /> */}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
