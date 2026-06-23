import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Environment Marketing Agent',
  description: 'Generador de videos de marketing con IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`h-full ${inter.className}`}>
      <body className="h-full">{children}</body>
    </html>
  )
}
