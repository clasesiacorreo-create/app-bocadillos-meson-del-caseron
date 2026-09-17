import type { Metadata } from 'next'
import { Instrument_Serif, Work_Sans } from 'next/font/google'
import './globals.css'

const instrumentSerif = Instrument_Serif({
  variable: '--font-instrument-serif',
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
})

const workSans = Work_Sans({
  variable: '--font-work-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  title: 'El Horno del Caserón · Pedidos a domicilio',
  description:
    'Bocadillos, hamburguesas y sándwiches para recoger o pedir a domicilio en Torrejón de Ardoz.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="es"
      className={`${instrumentSerif.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="bg-ground text-ink antialiased">{children}</body>
    </html>
  )
}
