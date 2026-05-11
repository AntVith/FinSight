import { useEffect, useMemo, useState } from 'react'

interface RotatingStatusMarqueeProperties {
  phrases: readonly string[]
  rotationIntervalMs?: number
  className?: string
}

export const RotatingStatusMarquee = ({
  phrases,
  rotationIntervalMs = 1900,
  className = '',
}: RotatingStatusMarqueeProperties) => {
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0)

  useEffect(() => {
    if (phrases.length <= 1) {
      return undefined
    }
    setCurrentPhraseIndex(0)
    const advanceTimer = window.setInterval(() => {
      setCurrentPhraseIndex((prior) => (prior + 1) % phrases.length)
    }, rotationIntervalMs)
    return () => window.clearInterval(advanceTimer)
  }, [phrases, rotationIntervalMs])

  const widestSpacerCandidate = useMemo(
    () => phrases.reduce((acc, candidate) => (candidate.length > acc.length ? candidate : acc), ''),
    [phrases]
  )

  if (phrases.length === 0) {
    return null
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className={`relative inline-flex items-center align-middle overflow-hidden ${className}`}
    >
      <span aria-hidden className="invisible whitespace-nowrap">
        {widestSpacerCandidate}
      </span>
      {phrases.map((phrase, phraseIndex) => (
        <span
          key={`${phraseIndex}-${phrase}`}
          className={`absolute inset-0 flex items-center justify-center whitespace-nowrap transition-all duration-500 ease-out ${
            phraseIndex === currentPhraseIndex
              ? 'opacity-100 translate-y-0 blur-0'
              : 'opacity-0 translate-y-1.5 blur-[2px] pointer-events-none'
          }`}
        >
          {phrase}
        </span>
      ))}
    </span>
  )
}
