import { useState, useEffect } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import { fetchTodayAppointments, type TodayAppointmentRow } from '../services/appointments/appointmentService'

export type { TodayAppointmentRow }

export const useTodayAppointments = () => {
  const { supabase: _supabase } = useSupabase() // mantém o provider no contexto
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<TodayAppointmentRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    setLoading(true)
    fetchTodayAppointments(user.id)
      .then(setAppointments)
      .catch((err) => console.error('[useTodayAppointments]', err))
      .finally(() => setLoading(false))
  }, [user])

  return { appointments, loading }
}
