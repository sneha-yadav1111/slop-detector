'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type * as React from 'react'

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  // Force dark-only for Slop Detector console theme
  return (
    <NextThemesProvider
      {...props}
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark"
    >
      {children}
    </NextThemesProvider>
  )
}
