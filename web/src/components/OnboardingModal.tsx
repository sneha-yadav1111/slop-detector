'use client'

import { ArrowRight, Crosshair, GitCommit, Radar, ShieldAlert, Terminal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STEPS = [
  {
    title: 'Welcome to Slop Detector',
    description:
      'Slop Detector detects hollow AI-generated pull requests, issues, and code comments before they waste reviewer time.',
    icon: Crosshair,
  },
  {
    title: 'How to use the Scanner',
    description:
      'Paste a GitHub URL, a PR description, or raw code. Deterministic heuristics check for filler text, missing reproduction steps, and empty commentary.',
    icon: GitCommit,
  },
  {
    title: 'The Slop Score',
    description:
      'Scores content from 0 to 100. High slop means generic filler that restates the diff. Low slop means high information density.',
    icon: ShieldAlert,
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const hasSeen = localStorage.getItem('Slop Detector-onboarding')
    if (!hasSeen) {
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem('Slop Detector-onboarding', 'true')
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  const current = STEPS[step]
  const Icon = current.icon

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent className="overflow-hidden border-console-border bg-console-panel p-0 sm:max-w-md">
        <div className="flex items-center justify-between border-b border-console-border bg-console-green/10 px-4 py-3">
          <div className="flex items-center gap-2 font-mono text-sm font-semibold text-console-green">
            <Crosshair className="h-4 w-4" />
            System init ({step + 1}/{STEPS.length})
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-console-text-dim hover:bg-console-border/40 hover:text-console-text-bright"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-6 p-8 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded border border-console-border bg-console-panel shadow-console">
            <Icon className="h-10 w-10 text-console-green" />
          </div>

          <DialogHeader>
            <DialogTitle className="mb-2 text-2xl font-bold tracking-tight text-console-text-bright">
              {current.title}
            </DialogTitle>
            <DialogDescription className="font-mono text-sm leading-relaxed text-console-text-dim">
              {current.description}
            </DialogDescription>
          </DialogHeader>

          <Button
            onClick={handleNext}
            className="h-11 w-full border border-console-green/40 bg-console-green/10 font-mono text-sm text-console-green hover:bg-console-green/20 hover:text-console-green"
            size="lg"
          >
            {step < STEPS.length - 1 ? (
              <>
                Next step <ArrowRight className="ml-2 h-4 w-4" />
              </>
            ) : (
              'Initialize console'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
