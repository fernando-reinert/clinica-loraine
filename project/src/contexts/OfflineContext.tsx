import React, { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'

interface OfflineContextType {
  isOnline: boolean
  syncStatus: 'idle' | 'syncing' | 'error'
  pendingChanges: number
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined)

export const useOffline = () => {
  const context = useContext(OfflineContext)
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider')
  }
  return context
}

interface OfflineProviderProps {
  children: React.ReactNode
}

export const OfflineProvider: React.FC<OfflineProviderProps> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'error'>('idle')
  const [pendingChanges, setPendingChanges] = useState(0)

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      toast.success('Conexão restaurada - Sincronizando dados...')
      // Trigger sync when coming back online
      syncPendingChanges()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error('Sem conexão - Trabalhando offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const syncPendingChanges = async () => {
    if (!isOnline) return

    setSyncStatus('syncing')
    try {
      // Simulate sync process
      await new Promise(resolve => setTimeout(resolve, 2000))
      setPendingChanges(0)
      setSyncStatus('idle')
      toast.success('Dados sincronizados com sucesso!')
    } catch (error) {
      setSyncStatus('error')
      toast.error('Erro na sincronização')
    }
  }

  const value = {
    isOnline,
    syncStatus,
    pendingChanges
  }

  return (
    <OfflineContext.Provider value={value}>
      {children}
    </OfflineContext.Provider>
  )
}