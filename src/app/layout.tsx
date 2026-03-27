import type { Metadata } from "next"
import "./globals.css"
import Sidebar from "@/components/Sidebar"

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
      <body className="h-full flex bg-gray-950 text-gray-100">
        <aside className="w-56 flex-shrink-0 border-r border-gray-800 p-4 overflow-hidden">
          <Sidebar />
        </aside>
        <main className="flex-1 overflow-auto">{children}</main>
      </body>
    </html>
  )
}
