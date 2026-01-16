import { useState, useEffect } from 'react'
import { useSupabase } from '../contexts/SupabaseContext'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export interface Appointment {
  id: string
  patient_id: string
  professional_id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  google_event_id?: string
  created_at: string
  updated_at: string
  // Dados do paciente (via join)
  patient?: {
    name: string
    phone: string
  }
}

export const useAppointments = () => {
  const { supabase } = useSupabase()
  const { user } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  const loadAppointments = async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          patient:patients(name, phone)
        `)
        .eq('professional_id', user.id)
        .order('start_time', { ascending: true })

      if (error) throw error

      setAppointments(data || [])
    } catch (error) {
      console.error('Error loading appointments:', error)
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  const createAppointment = async (appointmentData: {
    patient_id: string
    title: string
    description?: string
    start_time: string
    end_time: string
    status?: 'scheduled' | 'confirmed' | 'completed' | 'cancelled'
  }) => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          ...appointmentData,
          professional_id: user.id,
          status: appointmentData.status || 'scheduled'
        }])
        .select(`
          *,
          patient:patients(name, phone)
        `)
        .single()

      if (error) throw error

      setAppointments(prev => [...prev, data].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
      ))
      toast.success('Agendamento criado com sucesso!')
      return data
    } catch (error) {
      console.error('Error creating appointment:', error)
      toast.error('Erro ao criar agendamento')
      return null
    }
  }

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return null
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', id)
        .eq('professional_id', user.id)
        .select(`
          *,
          patient:patients(name, phone)
        `)
        .single()

      if (error) throw error

      setAppointments(prev => prev.map(a => a.id === id ? data : a))
      toast.success('Agendamento atualizado com sucesso!')
      return data
    } catch (error) {
      console.error('Error updating appointment:', error)
      toast.error('Erro ao atualizar agendamento')
      return null
    }
  }

  const deleteAppointment = async (id: string) => {
    if (!user) {
      toast.error('Usuário não autenticado')
      return false
    }

    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)
        .eq('professional_id', user.id)

      if (error) throw error

      setAppointments(prev => prev.filter(a => a.id !== id))
      toast.success('Agendamento removido com sucesso!')
      return true
    } catch (error) {
      console.error('Error deleting appointment:', error)
      toast.error('Erro ao remover agendamento')
      return false
    }
  }

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate.toDateString() === date.toDateString()
    })
  }

  const getTodayAppointments = () => {
    return getAppointmentsForDate(new Date())
  }

  const getThisWeekAppointments = () => {
    const now = new Date()
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()))
    const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6))
    
    return appointments.filter(apt => {
      const aptDate = new Date(apt.start_time)
      return aptDate >= startOfWeek && aptDate <= endOfWeek
    })
  }

  useEffect(() => {
    loadAppointments()
  }, [user])

  return {
    appointments,
    loading,
    loadAppointments,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsForDate,
    getTodayAppointments,
    getThisWeekAppointments
  }
}