import type { Metadata } from 'next'
import { Space_Grotesk, Figtree } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

const figtree = Figtree({
  subsets: ['latin'],
  variable: '--font-figtree',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MiTurnoVirtual · Reservar turno',
  description: 'Reservá tu turno online de forma rápida y simple.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${spaceGrotesk.variable} ${figtree.variable}`}>{children}</body>
    </html>
  )
}
