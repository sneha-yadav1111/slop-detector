'use client'

import { ArrowRight, BarChart3, GitPullRequest, X, type LucideIcon } from 'lucide-react'
import { Logo, LogoBadge } from '@/components/Logo'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STEPS: {
  title: string
  description: string
  icon?: LucideIcon
}[] = [
  {
    title: 'Signal Intelligence Console',
    description:
      'Slop Detector detects hollow AI-generated pull requests, issues, and code comments before they waste reviewer time.',
  },
  {
    title: 'How to use the Scanner',
    description:
      'Paste a GitHub URL, a PR description, or raw code. Deterministic heuristics check for filler text, missing reproduction steps, and empty commentary.',
    icon: GitPullRequest,
  },
  {
    title: 'The Slop Score',
    description:
      'Scores content from 0 to 100. LOW SIGNAL means generic filler that restates the diff. HIGH SIGNAL means high information density.',
    icon: BarChart3,
  },
]

export function OnboardingModal() {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    const hasSeen = localStorage.getItem('slop-detector-onboarding')
    if (!hasSeen) {
      setOpen(true)
    }
  }, [])

  const handleClose = () => {
    setOpen(false)
    localStorage.setItem('slop-detector-onboarding', 'true')
  }

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1)
    } else {
      handleClose()
    }
  }

  const current = STEPS[step]
  const StepIcon = current.icon

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose()
      }}
    >
      <DialogContent className="overflow-hidden border-signal-border bg-signal-surface-2 max-w-md p-0">
        <div className="flex items-center justify-between border-b border-signal-border bg-signal-cyan/10 px-6 py-5">
          <div className="flex items-center gap-2 font-data text-xs text-signal-cyan">
            <Logo size={16} className="text-signal-cyan" />
            System init ({step + 1}/{STEPS.length})
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md p-1 text-signal-text-dim hover:bg-signal-border/40 hover:text-signal-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-col items-center space-y-6 p-8 text-center">
          {step === 0 || !StepIcon ? (
            <LogoBadge className="w-12 h-12" size={26} variant="muted" />
          ) : (
            <div className="w-12 h-12 hex-icon bg-signal-cyan/10 border border-signal-cyan/20 flex items-center justify-center">
              <StepIcon className="h-5 w-5 text-signal-cyan" />
            </div>
          )}

          <DialogHeader>
            <DialogTitle className="font-display font-bold text-base text-signal-white mb-2">
              {current.title}
            </DialogTitle>
            <DialogDescription className="font-data text-sm text-signal-text-dim leading-relaxed">
              {current.description}
            </DialogDescription>
          </DialogHeader>

          <Button
            onClick={handleNext}
            className="bg-signal-cyan text-signal-bg font-display font-bold text-sm px-6 py-2.5 rounded hover:bg-white transition-colors"
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
