import { useState, useEffect } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'

export interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  thisWeekAppointments: number
  completedProcedures: number
  thisMonthAppointments: number
  pendingAppointments: number
}

export const useDashboardStats = () => {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    thisWeekAppointments: 0,
    completedProcedures: 0,
    thisMonthAppointments: 0,
    pendingAppointments: 0,
  })
  const [loading, setLoading] = useState(true)

  const loadStats = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const now = new Date()
      const y = now.getFullYear()
      const m = now.getMonth()
      const d = now.getDate()
      const dow = now.getDay() // 0=dom

      // Intervalos — sem mutação do objeto Date
      const startOfDay = new Date(y, m, d, 0, 0, 0, 0).toISOString()
      const endOfDay = new Date(y, m, d, 23, 59, 59, 999).toISOString()

      const startOfWeek = new Date(y, m, d - dow, 0, 0, 0, 0).toISOString()
      const endOfWeek = new Date(y, m, d - dow + 6, 23, 59, 59, 999).toISOString()

      const startOfMonth = new Date(y, m, 1, 0, 0, 0, 0).toISOString()
      const endOfMonth = new Date(y, m + 1, 0, 23, 59, 59, 999).toISOString()

      const nowIso = now.toISOString()

      // Todas as queries em paralelo
      const [
        { count: totalPatients },
        { count: todayAppointments },
        { count: thisWeekAppointments },
        { count: thisMonthAppointments },
        { count: completedProcedures },
        { count: pendingAppointments },
      ] = await Promise.all([
        supabase.from('patients').select('*', { count: 'exact', head: true }),

        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', startOfDay)
          .lte('start_time', endOfDay),

        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', startOfWeek)
          .lte('start_time', endOfWeek),

        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .gte('start_time', startOfMonth)
          .lte('start_time', endOfMonth),

        supabase.from('clinical_records').select('*', { count: 'exact', head: true }),

        supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .in('status', ['scheduled', 'confirmed'])
          .gte('start_time', nowIso),
      ])

      setStats({
        totalPatients: totalPatients ?? 0,
        todayAppointments: todayAppointments ?? 0,
        thisWeekAppointments: thisWeekAppointments ?? 0,
        completedProcedures: completedProcedures ?? 0,
        thisMonthAppointments: thisMonthAppointments ?? 0,
        pendingAppointments: pendingAppointments ?? 0,
      })
    } catch (error) {
      console.error('Error loading dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStats()
  }, [user])

  return { stats, loading, loadStats }
}
