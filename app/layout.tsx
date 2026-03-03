import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: "Greek Mythos — Greek Archetype Assessment",
  description: 'Discover your Greek mythological archetype through our mystical personality assessment.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-navy min-h-screen text-cream antialiased">
        {children}
      </body>
    </html>
  )
}
