import { BenchmarkSection, HowItWorks } from '@/components/InfoSections'
import { AppSidebar } from '@/components/Sidebar'
import { Badge } from '@/components/ui/badge'
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Cpu, Crosshair } from 'lucide-react'

export default function HowItWorksPage() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <main className="relative min-w-0 flex-1">
          <div className="sticky top-0 z-50 flex items-center border-b border-console-border bg-background/90 p-4 backdrop-blur-md md:hidden">
            <SidebarTrigger className="h-10 w-10 border-console-border" />
            <Badge className="ml-4 border-console-border bg-console-panel font-mono uppercase tracking-wide text-console-text-bright">
              How it works
            </Badge>
          </div>
          <div className="mx-auto max-w-4xl px-5 py-8 lg:px-10">
            <header className="mb-10 animate-in-up">
              <h1 className="text-3xl font-extrabold tracking-tight text-console-text-bright lg:text-4xl">
                <Crosshair className="mr-3 inline h-8 w-8 text-console-green" />
                How Slop Detector works
              </h1>
              <p className="mt-3 max-w-2xl font-mono text-console-text-dim">
                One engine, four detectors — heuristics-first with optional LLM for gray zones.
              </p>
            </header>
            <div className="space-y-12">
              <HowItWorks />
              <BenchmarkSection />
            </div>
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
