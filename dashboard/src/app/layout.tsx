import type { Metadata } from 'next'
import './globals.css'
import { BootWrapper } from '@/app/BootWrapper'
import { ThemeProvider } from '@/components/theme-provider'

export const metadata: Metadata = {
  title: 'Slop Detector — AI Signal Intelligence',
  description:
    'Detect hollow PRs, filler commits, and AI-generated slop in your codebase. Open source GitHub Action + live dashboard.',
  themeColor: '#020818',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen bg-signal-bg text-signal-white font-body antialiased">
        <ThemeProvider attribute="class" defaultTheme="dark">
          <BootWrapper>{children}</BootWrapper>
        </ThemeProvider>
      </body>
    </html>
  )
}
