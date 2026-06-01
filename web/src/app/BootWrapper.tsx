'use client'

import { useState, useCallback } from 'react'
import { InitializingScreen } from '@/components/InitializingScreen'

export function BootWrapper({ children }: { children: React.ReactNode }) {
  const [booted, setBooted] = useState(false)

  const handleBootComplete = useCallback(() => {
    setBooted(true)
  }, [])

  return (
    <>
      {!booted && <InitializingScreen onComplete={handleBootComplete} />}
      <div className={!booted ? 'opacity-0' : 'opacity-100 animate-console-boot'}>
        {children}
      </div>
    </>
  )
}
