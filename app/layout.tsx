import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ClientRoot } from "./client-root"
import { Toaster } from "sonner"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "E.I. Vision - Executive Intelligence Copilot",
  description: "AI-powered strategic intelligence for executives (E.I. Copilot)",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`}>
        <ClientRoot>{children}</ClientRoot>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
} 