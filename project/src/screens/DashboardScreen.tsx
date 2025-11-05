import React, { useEffect, useState } from 'react'
import { Users, Calendar, Camera, TrendingUp, Clock, CheckCircle, DollarSign } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'
import Header from '../components/Header'
import BottomNavigation from '../components/BottomNavigation'
import LoadingSpinner from '../components/LoadingSpinner'

const DashboardScreen: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stats, loading } = useDashboardStats()

  const quickActions = [
    {
      title: 'Novo Paciente',
      icon: Users,
      color: 'bg-gradient-to-r from-pink-500 to-pink-600',
      action: () => navigate('/patients')
    },
    {
      title: 'Agendar Consulta',
      icon: Calendar,
      color: 'bg-gradient-to-r from-rose-500 to-rose-600',
      action: () => navigate('/appointments')
    },
    {
      title: 'Galeria',
      icon: Camera,
      color: 'bg-gradient-to-r from-fuchsia-500 to-fuchsia-600',
      action: () => navigate('/gallery')
    },
    {
      title: 'Financeiro',
      icon: DollarSign,
      color: 'bg-gradient-to-r from-green-500 to-green-600',
      action: () => navigate('/financial-control')
    }
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-900 via-pink-800 to-pink-700 text-white pb-20">
      <Header title="Dashboard" />

      <div className="p-6 space-y-8">
        {/* Welcome Section */}
        <div className="ios-card p-6 bg-gradient-to-r from-pink-800 to-rose-800 rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-white mb-2">
            Olá, {user?.user_metadata?.name || 'Dra. Loraine'}! 👋
          </h2>
          <p className="text-gray-300">
            Bem-vinda de volta. Aqui está um resumo do seu dia.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <div className="ios-card p-6 bg-gradient-to-r from-pink-500 to-pink-600 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{stats.totalPatients || 0}</p>
                <p className="text-sm text-gray-300">Total Pacientes</p>
              </div>
              <Users className="text-white" size={30} />
            </div>
          </div>

          <div className="ios-card p-6 bg-gradient-to-r from-rose-500 to-rose-600 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{stats.todayAppointments}</p>
                <p className="text-sm text-gray-300">Hoje</p>
              </div>
              <Clock className="text-white" size={30} />
            </div>
          </div>

          <div className="ios-card p-6 bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{stats.thisWeekAppointments}</p>
                <p className="text-sm text-gray-300">Esta Semana</p>
              </div>
              <Calendar className="text-white" size={30} />
            </div>
          </div>

          <div className="ios-card p-6 bg-gradient-to-r from-pink-400 to-pink-500 rounded-lg shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-3xl font-bold text-white">{stats.completedProcedures}</p>
                <p className="text-sm text-gray-300">Procedimentos</p>
              </div>
              <CheckCircle className="text-white" size={30} />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-2xl font-semibold text-white mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon
              return (
                <button
                  key={index}
                  onClick={action.action}
                  className="ios-card p-6 text-center bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg shadow-lg active:scale-95 transition-transform"
                >
                  <div className={`${action.color} w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4`}>
                    <Icon size={30} className="text-white" />
                  </div>
                  <p className="font-medium text-white">{action.title}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div>
          <h3 className="text-2xl font-semibold text-white mb-4">Atividade Recente</h3>
          <div className="ios-card p-6 bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg shadow-lg">
            <div className="text-center text-gray-300">
              <p>Atividades recentes aparecerão aqui</p>
            </div>
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  )
}

export default DashboardScreen