import React from 'react'
import { Users, Calendar, Camera, Clock, CheckCircle, DollarSign, Plus, TrendingUp, Sparkles, Zap, Activity } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'
import AppLayout from '../components/Layout/AppLayout'
import LoadingSpinner from '../components/LoadingSpinner'
import Button from '../components/ui/Button'
import { StatCard } from '../components/ui/StatCard'
import { QuickActionCard } from '../components/ui/QuickActionCard'
import { Card } from '../components/ui/Card'

const DashboardScreen: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stats, loading } = useDashboardStats()

  const quickActions = [
    {
      title: 'Novo Paciente',
      icon: Users,
      gradient: 'from-cyan-500 to-blue-600',
      glow: 'hover:shadow-cyan-500/25',
      action: () => navigate('/patients/new')
    },
    {
      title: 'Agendar Consulta',
      icon: Calendar,
      gradient: 'from-purple-500 to-pink-600',
      glow: 'hover:shadow-purple-500/25',
      action: () => navigate('/appointments/new')
    },
    {
      title: 'Galeria',
      icon: Camera,
      gradient: 'from-orange-500 to-red-600',
      glow: 'hover:shadow-orange-500/25',
      action: () => navigate('/gallery')
    },
    {
      title: 'Financeiro',
      icon: DollarSign,
      gradient: 'from-emerald-500 to-green-600',
      glow: 'hover:shadow-emerald-500/25',
      action: () => navigate('/financial-control')
    }
  ]

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="relative">
              <LoadingSpinner size="lg" className="text-cyan-500" />
              <Sparkles className="absolute -top-2 -right-2 text-purple-500 animate-pulse" size={20} />
            </div>
            <p className="mt-4 text-gray-600 font-medium">Carregando dados premium...</p>
          </div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-8 p-4 md:p-6">
        {/* 🌟 Welcome Section - Premium */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8 border-0 shadow-2xl">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] bg-[length:20px_20px]"></div>
          
          {/* Animated Orbs */}
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-white/10 rounded-2xl backdrop-blur-sm">
                  <Sparkles className="text-cyan-400" size={24} />
                </div>
                <h2 className="text-3xl font-bold text-white">
                  Olá, {user?.user_metadata?.name || 'Dra. Loraine'}! 👋
                </h2>
              </div>
              <p className="text-slate-200 text-lg max-w-2xl">
                Seu dia está <span className="text-cyan-400 font-semibold">87% otimizado</span>. 
                Aqui está sua visão geral inteligente.
              </p>
            </div>
            
            <Button 
              onClick={() => navigate('/patients/new')}
              className="group relative bg-gradient-to-r from-cyan-500 to-blue-600 border-0 text-white px-8 py-4 rounded-2xl font-semibold overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/25"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <Plus size={20} className="mr-2 relative z-10" />
              <span className="relative z-10">Novo Paciente</span>
            </Button>
          </div>
        </div>

        {/* 📊 Stats Grid - Premium */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    title="Total Pacientes"
    value={stats.totalPatients || 0}
    icon={Users}
    gradient="from-blue-500 to-cyan-500"
  />
  <StatCard
    title="Agendamentos Hoje"
    value={stats.todayAppointments || 0}
    icon={Clock}
    gradient="from-green-500 to-emerald-500"
  />
  <StatCard
    title="Esta Semana"
    value={stats.thisWeekAppointments || 0}
    icon={Calendar}
    gradient="from-purple-500 to-pink-500"
  />
  <StatCard
    title="Procedimentos"
    value={stats.completedProcedures || 0}
    icon={CheckCircle}
    gradient="from-orange-500 to-red-500"
  />
</div>

        {/* ⚡ Quick Actions - Premium */}
        <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Ações Rápidas
              </h3>
              <p className="text-slate-500 mt-1">Acesso instantâneo às funções principais</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/patients')}
              className="border-slate-300 text-slate-700 hover:bg-slate-50 hover:shadow-lg rounded-xl"
            >
              Ver Todos
            </Button>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {quickActions.map((action, index) => (
              <div
                key={index}
                onClick={action.action}
                className={`group relative bg-gradient-to-r ${action.gradient} p-6 rounded-2xl cursor-pointer transition-all duration-500 hover:scale-105 hover:shadow-2xl ${action.glow} overflow-hidden`}
              >
                {/* Hover Effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <action.icon size={28} className="text-white" />
                    <Zap size={16} className="text-white/60 group-hover:text-white transition-colors" />
                  </div>
                  <h4 className="text-white font-semibold text-lg mb-2">{action.title}</h4>
                  <div className="w-8 h-1 bg-white/40 rounded-full group-hover:w-12 transition-all duration-300"></div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* 📈 Performance & Activity - Premium */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          {/* Activity Stream */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Activity className="text-purple-600" size={24} />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Atividade em Tempo Real
              </h3>
            </div>
            
            <div className="space-y-4">
              {stats.pendingAppointments > 0 && (
                <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-amber-500 rounded-xl">
                      <Clock className="text-white" size={20} />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-800">{stats.pendingAppointments} confirmações pendentes</p>
                      <p className="text-sm text-amber-600">Necessita atenção imediata</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/appointments')}
                    className="border-amber-600 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl transition-all"
                  >
                    Resolver
                  </Button>
                </div>
              )}
              
              <div className="group flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-blue-500 rounded-xl">
                    <TrendingUp className="text-white" size={20} />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800">Performance Excepcional</p>
                    <p className="text-sm text-blue-600">+15% acima da média mensal</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-3 py-1 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                    <TrendingUp size={14} className="mr-1" />
                    +15%
                  </span>
                </div>
              </div>

              {/* Smart Suggestion */}
              <div className="group p-6 bg-gradient-to-br from-slate-50 to-gray-100 rounded-2xl border border-slate-200 text-center hover:shadow-lg transition-all duration-300">
                <Sparkles className="mx-auto text-slate-400 mb-3" size={32} />
                <p className="font-semibold text-slate-700 mb-2">Sistema Otimizado</p>
                <p className="text-sm text-slate-500">Todas as tarefas estão em dia</p>
              </div>
            </div>
          </Card>

          {/* Performance Metrics */}
          <Card className="bg-white/80 backdrop-blur-sm border border-white/20 shadow-2xl rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="text-green-600" size={24} />
              <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Métricas Inteligentes
              </h3>
            </div>
            
            <div className="space-y-5">
              {/* Occupancy Rate */}
              <div className="group p-5 bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl border border-purple-200 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-purple-800">Taxa de Ocupação</p>
                    <p className="text-sm text-purple-600">Eficiência da semana</p>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">82%</span>
                </div>
                <div className="w-full bg-purple-200 rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full w-4/5"></div>
                </div>
              </div>

              {/* New Patients */}
              <div className="group p-5 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-green-800">Pacientes Novos</p>
                    <p className="text-sm text-green-600">Crescimento mensal</p>
                  </div>
                  <span className="text-2xl font-bold text-green-600">+12</span>
                </div>
                <div className="flex items-center text-green-600 text-sm">
                  <TrendingUp size={16} className="mr-1" />
                  <span>+15% vs último mês</span>
                </div>
              </div>

              {/* Revenue */}
              <div className="group p-5 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border border-blue-200 hover:shadow-lg transition-all duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-semibold text-blue-800">Receita Mensal</p>
                    <p className="text-sm text-blue-600">Previsão inteligente</p>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">R$ 8.240</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Meta: R$ 10.000</span>
                  <span className="text-green-600 font-semibold">82%</span>
                </div>
              </div>

              <Button 
                onClick={() => navigate('/financial-control')}
                className="w-full group bg-gradient-to-r from-slate-800 to-slate-600 border-0 text-white py-4 rounded-2xl font-semibold transition-all duration-300 hover:shadow-2xl hover:scale-105"
              >
                <DollarSign size={20} className="mr-2 group-hover:scale-110 transition-transform" />
                Análise Financeira Completa
              </Button>
            </div>
          </Card>
        </div>

        {/* 🚀 Emergency Actions - Premium */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-500 via-red-500 to-orange-600 p-8 border-0 shadow-2xl">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shine"></div>
          
          <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex-1 text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
                <Zap className="text-white" size={24} />
                <h3 className="text-2xl font-bold text-white">Comando Rápido</h3>
              </div>
              <p className="text-orange-100 text-lg">Acesso instantâneo às funções críticas</p>
            </div>
            
            <div className="flex flex-wrap justify-center lg:justify-end gap-3">
              {[
                { label: 'Formulários', path: '/anamnese' },
                { label: 'Prontuários', path: '/clinical-record' },
                { label: 'Galeria', path: '/gallery' },
                { label: 'Configurações', path: '/settings' }
              ].map((item, index) => (
                <Button 
                  key={index}
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate(item.path)}
                  className="border-white/50 text-white hover:bg-white hover:text-orange-600 backdrop-blur-sm rounded-xl transition-all duration-300 hover:scale-105"
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

export default DashboardScreen