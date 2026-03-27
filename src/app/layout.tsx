import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "PM Workstation",
  description: "Agent-powered workspace for Product Managers",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full bg-gray-950 text-gray-100">{children}</body>
    </html>
  )
}
