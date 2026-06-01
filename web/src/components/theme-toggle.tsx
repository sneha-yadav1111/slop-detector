'use client'

import { Terminal } from 'lucide-react'
import { useTheme } from 'next-themes'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="border-console-border bg-console-panel">
          <Terminal className="h-[1.2rem] w-[1.2rem] text-console-green" />
          <span className="sr-only">Console mode</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="border-console-border bg-console-panel">
        <DropdownMenuItem disabled className="cursor-default text-console-text-dim">
          Slop Detector Console
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="cursor-default text-console-text-dim">
          Dark mode only
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
