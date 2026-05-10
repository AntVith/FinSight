import { useEffect, useState } from 'react'

const SYNC_COOLDOWN_MS = 60 * 60 * 1000 // 1 hour
const STORAGE_KEY = 'finsight_last_sync'

const formatTimeUntilSync = (milliseconds: number): string => {
  const totalSeconds = Math.ceil(milliseconds / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m ${seconds}s`
}

interface SyncRateLimitResult {
  canSync: boolean
  nextSyncTime: Date | null
  timeUntilSync: string
  recordSync: () => void
}

export const useSyncRateLimit = (): SyncRateLimitResult => {
  const [lastSync, setLastSync] = useState<Date | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Date(stored) : null
  })
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const nextSyncTime = lastSync ? new Date(lastSync.getTime() + SYNC_COOLDOWN_MS) : null
  const millisecondsUntilSync = nextSyncTime ? nextSyncTime.getTime() - now.getTime() : 0
  const canSync = millisecondsUntilSync <= 0

  const timeUntilSync = canSync ? '' : formatTimeUntilSync(millisecondsUntilSync)

  const recordSync = () => {
    const syncTime = new Date()
    localStorage.setItem(STORAGE_KEY, syncTime.toISOString())
    setLastSync(syncTime)
  }

  return { canSync, nextSyncTime, timeUntilSync, recordSync }
}
