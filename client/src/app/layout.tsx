import { Inter } from 'next/font/google'
import { Providers } from '@/providers'
import { Toaster } from "@/components/ui/sonner";
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'BAMN - Bangladesh Academic Mentor Network',
  description: 'BAMN is a public-facing web platform designed to connect Bangladeshi academics and researchers based abroad (mentors) with students and early-career researchers (mentees) in Bangladesh.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head />
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
