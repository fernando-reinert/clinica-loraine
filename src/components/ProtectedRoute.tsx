import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'
import { fetchMyAccessProfile } from '../services/admin/adminService'

interface ProtectedRouteProps {
  children: React.ReactNode
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading } = useAuth()
  const [profileLoading, setProfileLoading] = useState(true)
  const [isActive, setIsActive] = useState<boolean | null>(null)

  useEffect(() => {
    if (!user) {
      setProfileLoading(false)
      setIsActive(null)
      return
    }
    let cancelled = false
    setProfileLoading(true)
    fetchMyAccessProfile()
      .then((profile) => {
        if (!cancelled) {
          setIsActive(profile?.is_active ?? false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsActive(false)
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [user])

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (profileLoading || isActive === null) {
    return <LoadingSpinner />
  }

  if (!isActive) {
    return <Navigate to="/access-pending" replace />
  }

  return <>{children}</>
}

export default ProtectedRoute