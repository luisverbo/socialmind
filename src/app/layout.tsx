import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SocialMind — Automação de Instagram com IA',
  description: 'Configure sua conta e comece a automatizar seus carrosséis no Instagram.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" style={{ colorScheme: 'light', backgroundColor: '#F8F7FF' }} suppressHydrationWarning>
      <body className={inter.className} style={{ backgroundColor: '#F8F7FF', color: '#1A1A2E' }}>{children}</body>
    </html>
  )
}
