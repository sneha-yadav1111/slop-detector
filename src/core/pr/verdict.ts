// Five-band PR verdict labels (dashboard + summaries).

export type PrVerdictBand =
  | 'slop'
  | 'likely-slop'
  | 'gray-zone'
  | 'likely-clean'
  | 'clean'

export function prVerdictBand(score: number): PrVerdictBand {
  if (score <= 2) return 'slop'
  if (score <= 3) return 'likely-slop'
  if (score <= 6) return 'gray-zone'
  if (score <= 8) return 'likely-clean'
  return 'clean'
}

export function prVerdictLabel(band: PrVerdictBand): string {
  switch (band) {
    case 'slop':
      return 'Slop'
    case 'likely-slop':
      return 'Likely slop'
    case 'gray-zone':
      return 'Gray zone'
    case 'likely-clean':
      return 'Likely clean'
    case 'clean':
      return 'Clean'
  }
}
