import { useContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { syncTransactions } from './api/client'
import { Navbar } from './components/Navbar/Navbar'
import { ThemeContext, ThemeProvider } from './context/ThemeContext'
import { Connect } from './views/Connect'
import { Dashboard } from './views/Dashboard'

const AppContent = () => {
  const navigate = useNavigate()
  const { isDark, toggleDark } = useContext(ThemeContext)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (localStorage.getItem('finsight_connected')) {
      setIsConnected(true)
    }
  }, [])

  const handleConnect = async () => {
    setIsSyncing(true)
    setSyncError(null)
    try {
      await syncTransactions()
      setIsConnected(true)
      localStorage.setItem('finsight_connected', 'true')
      navigate('/dashboard')
    } catch (err) {
      console.error('Failed to sync transactions after connect:', err)
      setSyncError('Failed to sync transactions. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleDisconnect = () => {
    setIsConnected(false)
    localStorage.removeItem('finsight_connected')
    navigate('/')
  }

  return (
    <>
      <Navbar onDisconnect={handleDisconnect} isDark={isDark} toggleDark={toggleDark} />
      <Routes>
        <Route
          path="/"
          element={
            <Connect onSuccess={handleConnect} syncError={syncError} isSyncing={isSyncing} />
          }
        />
        <Route
          path="/dashboard"
          element={
            isConnected ? <Dashboard isSyncing={isSyncing} /> : <Navigate to="/" replace />
          }
        />
      </Routes>
    </>
  )
}

export const App = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  )
}

