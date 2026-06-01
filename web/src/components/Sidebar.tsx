'use client'

import { GitPullRequest, Info, Radar, Crosshair, Terminal } from 'lucide-react'
import { GithubIcon } from '@/components/icons'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

const NAV = [
  { label: 'Scanner', href: '/app', Icon: Crosshair },
  { label: 'How it Works', href: '/how-it-works', Icon: Info },
]

export function AppSidebar() {
  return (
    <Sidebar className="border-r border-console-border">
      <SidebarHeader className="border-b border-console-border p-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded border border-console-green/40 bg-console-green/10">
            <Crosshair className="h-5 w-5 text-console-green" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-console-green animate-pulse" />
          </div>
          <div>
            <div className="text-sm font-bold leading-tight text-console-text-bright">
              Slop Detector
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-console-text-dim">
              Slop Scanner
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.map(({ label, href, Icon }) => (
                <SidebarMenuItem key={label}>
                  <SidebarMenuButton
                    asChild
                    className="transition-colors hover:bg-console-border/40 font-mono text-xs text-console-text-dim hover:text-console-text-bright"
                  >
                    <a href={href} className="flex items-center gap-3 text-sm font-medium">
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="space-y-4 border-t border-console-border p-4">
        <div className="rounded border border-console-border bg-console-panel/80 p-4 font-mono text-[11px] leading-relaxed text-console-text-dim">
          <div className="mb-2 flex items-center gap-1.5 font-semibold text-console-text-bright">
            <GitPullRequest className="h-3.5 w-3.5 text-console-green" /> Track A
          </div>
          Detects hollow AI PRs, filler commits, and code comments that say nothing.
        </div>
        <div className="flex gap-2">
          <a
            href="https://github.com/sneha-yadav1111/slop-scan"
            target="_blank"
            rel="noreferrer"
            className="flex flex-1 items-center justify-center gap-2 rounded border border-console-border bg-console-panel px-3 py-2.5 font-mono text-xs text-console-text-dim transition-colors hover:border-console-green/30 hover:bg-console-green/10 hover:text-console-green"
          >
            <GithubIcon className="h-3.5 w-3.5" /> Source
          </a>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
