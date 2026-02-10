// src/screens/DashboardScreen.tsx - DESIGN FUTURISTA COMPLETO
import React from 'react'
import { Users, Calendar, Package, Clock, CheckCircle, DollarSign, Plus, TrendingUp, Sparkles, Zap, Activity, Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout'
import LoadingSpinner from '../components/LoadingSpinner'

const DashboardScreen: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stats, loading } = useDashboardStats()

  const quickActions = [
    {
      title: 'Novo Paciente',
      icon: Users,
      gradient: 'from-blue-500 to-cyan-500',
      action: () => navigate('/patients/new')
    },
    {
      title: 'Agendar Consulta',
      icon: Calendar,
      gradient: 'from-purple-500 to-pink-500', 
      action: () => navigate('/appointments/new')
    },
    {
      title: 'Catálogo de Procedimentos',
      icon: Package,
      gradient: 'from-orange-500 to-red-500',
      action: () => navigate('/procedures')
    },
    {
      title: 'Financeiro',
      icon: DollarSign,
      gradient: 'from-green-500 to-emerald-500',
      action: () => navigate('/financial-control')
    }
  ];

  if (loading) {
    return (
      <ResponsiveAppLayout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <LoadingSpinner size="lg" className="text-blue-500" />
              <Sparkles className="absolute -top-2 -right-2 text-purple-500 animate-pulse" size={20} />
            </div>
            <p className="mt-4 text-gray-300">Carregando universo de dados...</p>
          </div>
        </div>
      </ResponsiveAppLayout>
    )
  }

  return (
    <ResponsiveAppLayout title="Dashboard">
      <div className="space-y-8">
        {/* 🌟 Welcome Section - Design Cosmic */}
        <div className="glass-card p-4 sm:p-6 md:p-8 relative overflow-hidden">
          {/* Efeito de partículas */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 min-w-0">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-4 min-w-0">
                <div className="p-3 bg-blue-500/20 rounded-2xl backdrop-blur-sm border border-blue-400/30 flex-shrink-0">
                  <Sparkles className="text-blue-300" size={28} />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl sm:text-3xl font-bold glow-text mb-2 whitespace-normal break-words">
                    Bem-vinda, {user?.user_metadata?.name || 'Dra. Loraine'}! 🌌
                  </h2>
                  <p className="text-gray-300 text-base sm:text-lg whitespace-normal break-words">
                    Seu cosmos está <span className="text-cyan-400 font-semibold">92% otimizado</span>. 
                    Prepare-se para explorar novas dimensões.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0 flex-wrap">
              <button
                onClick={() => navigate('/profile')}
                className="p-3 sm:p-4 bg-white/10 hover:bg-white/20 rounded-2xl backdrop-blur-sm transition-all duration-300 hover:scale-105 group border border-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Configurações"
              >
                <Settings size={24} className="text-white group-hover:text-cyan-300 transition-colors" />
              </button>
              
              <button 
                onClick={() => navigate('/patients/new')}
                className="neon-button group relative overflow-hidden w-full sm:w-auto min-h-[44px] inline-flex items-center justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Plus size={24} className="mr-2 sm:mr-3 relative z-10 shrink-0" />
                <span className="relative z-10 font-semibold whitespace-normal break-words">Novo Paciente</span>
              </button>
            </div>
          </div>
        </div>

        {/* 📊 Stats Grid - Cards Holográficos */}
        <div className="grid-dashboard">
          {[
            { title: 'Total Pacientes', value: stats.totalPatients || 0, icon: Users, color: 'blue' },
            { title: 'Agendamentos Hoje', value: stats.todayAppointments || 0, icon: Calendar, color: 'purple' },
            { title: 'Esta Semana', value: stats.thisWeekAppointments || 0, icon: Clock, color: 'cyan' },
            { title: 'Procedimentos', value: stats.completedProcedures || 0, icon: CheckCircle, color: 'green' }
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={index} className="glass-card p-4 sm:p-6 hover-lift group">
                <div className="flex items-center justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-2xl sm:text-3xl font-bold text-white mb-2">{stat.value}</p>
                    <p className="text-gray-400 text-sm whitespace-normal break-words">{stat.title}</p>
                  </div>
                  <div className={`p-3 rounded-2xl bg-${stat.color}-500/20 border border-${stat.color}-400/30 group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                    <Icon size={28} className={`text-${stat.color}-300`} />
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-700 rounded-full h-2 min-w-0">
                  <div 
                    className={`bg-${stat.color}-500 h-2 rounded-full transition-all duration-1000`}
                    style={{ width: `${Math.min(100, (stat.value / 50) * 100)}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ⚡ Quick Actions - Portal Quântico */}
        <div className="glass-card p-4 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
            <div className="min-w-0">
              <h3 className="text-xl sm:text-2xl font-bold glow-text mb-2 whitespace-normal break-words">
                Portal de Ações
              </h3>
              <p className="text-gray-400 text-sm sm:text-base whitespace-normal break-words">Acesso instantâneo às dimensões principais</p>
            </div>
          </div>
          
          <div className="grid-dashboard">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <div
                  key={index}
                  onClick={action.action}
                  className="group cursor-pointer"
                >
                  <div className={`glass-card p-4 sm:p-6 rounded-2xl transition-all duration-500 hover:scale-105 bg-gradient-to-br ${action.gradient}/10 border ${action.gradient.replace('from-', 'border-').replace(' to-', '/30 border-')}/30`}>
                    <div className="flex items-center justify-between mb-4 min-w-0">
                      <div className={`p-3 rounded-2xl bg-gradient-to-r ${action.gradient} shadow-lg flex-shrink-0`}>
                        <Icon size={24} className="text-white" />
                      </div>
                      <Zap size={16} className="text-gray-400 group-hover:text-white transition-colors flex-shrink-0" />
                    </div>
                    <h4 className="font-semibold text-white text-base sm:text-lg mb-2 whitespace-normal break-words">{action.title}</h4>
                    <div className="w-8 h-1 bg-white/40 rounded-full group-hover:w-12 transition-all duration-300"></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 📈 Performance & Analytics — 2 colunas em xl */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">
          {/* Activity Stream */}
          <div className="glass-card p-4 sm:p-6 md:p-8">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 min-w-0">
              <Activity className="text-purple-400 flex-shrink-0" size={28} />
              <h3 className="text-xl sm:text-2xl font-bold glow-text whitespace-normal break-words">
                Fluxo Temporal
              </h3>
            </div>
            
            <div className="space-y-4 min-w-0">
              {stats.pendingAppointments > 0 && (
                <div className="glass-card p-4 sm:p-6 border border-amber-400/30 bg-amber-500/10 min-w-0">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="p-3 bg-amber-500/20 rounded-2xl border border-amber-400/30 flex-shrink-0">
                      <Clock className="text-amber-300" size={24} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-amber-100 whitespace-normal break-words">{stats.pendingAppointments} confirmações pendentes</p>
                      <p className="text-amber-300 text-sm whitespace-normal break-words">Intervenção temporal necessária</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="glass-card p-4 sm:p-6 border border-green-400/30 bg-green-500/10 min-w-0">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="p-3 bg-green-500/20 rounded-2xl border border-green-400/30 flex-shrink-0">
                    <TrendingUp className="text-green-300" size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-green-100 whitespace-normal break-words">Performance Excepcional</p>
                    <p className="text-green-300 text-sm whitespace-normal break-words">+18% acima da média quântica</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="glass-card p-4 sm:p-6 md:p-8 w-full max-w-full min-w-0">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 min-w-0">
              <TrendingUp className="text-cyan-400 flex-shrink-0" size={28} />
              <h3 className="text-xl sm:text-2xl font-bold glow-text whitespace-normal break-words">
                Métricas Quânticas
              </h3>
            </div>
            
            <div className="space-y-6 min-w-0">
              {/* Occupancy Rate */}
              <div className="space-y-3 min-w-0">
                <div className="flex justify-between items-center gap-2 min-w-0">
                  <span className="text-gray-300 text-sm sm:text-base whitespace-normal break-words">Taxa de Ocupação</span>
                  <span className="text-xl sm:text-2xl font-bold text-purple-300 shrink-0">84%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 min-w-0">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full w-4/5 transition-all duration-1000"></div>
                </div>
              </div>

              {/* Revenue */}
              <div className="space-y-3 min-w-0">
                <div className="flex justify-between items-center gap-2 min-w-0">
                  <span className="text-gray-300 text-sm sm:text-base whitespace-normal break-words">Receita Mensal</span>
                  <span className="text-xl sm:text-2xl font-bold text-green-300 shrink-0">R$ 9.240</span>
                </div>
                <div className="flex justify-between text-sm gap-2 min-w-0 flex-wrap">
                  <span className="text-gray-400">Meta: R$ 12.000</span>
                  <span className="text-green-400 font-semibold">77%</span>
                </div>
              </div>

              <button 
                onClick={() => navigate('/financial-control')}
                className="w-full min-h-[44px] neon-button mt-4 inline-flex items-center justify-center"
              >
                <DollarSign size={20} className="mr-2 sm:mr-3 shrink-0" />
                <span className="whitespace-normal break-words">Análise Financeira Completa</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </ResponsiveAppLayout>
  )
}

export default DashboardScreen