// src/screens/DashboardScreen.tsx
import React from 'react'
import {
  Users, Calendar, Package, Clock, CheckCircle,
  DollarSign, Plus, TrendingUp, Activity, Settings,
  Wallet, ChevronRight,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useDashboardStats } from '../hooks/useDashboardStats'
import { useTodayAppointments } from '../hooks/useTodayAppointments'
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout'

// ─── helpers ────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function todayLabel() {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; badge: string }> = {
  scheduled:   { label: 'Agendado',   dot: 'bg-blue-400',   badge: 'bg-blue-500/20 text-blue-200 border border-blue-400/30' },
  confirmed:   { label: 'Confirmado', dot: 'bg-green-400',  badge: 'bg-green-500/20 text-green-200 border border-green-400/30' },
  completed:   { label: 'Concluído',  dot: 'bg-teal-400',   badge: 'bg-teal-500/20 text-teal-200 border border-teal-400/30' },
  cancelled:   { label: 'Cancelado',  dot: 'bg-red-400',    badge: 'bg-red-500/20 text-red-200 border border-red-400/30' },
  no_show:     { label: 'Falta',      dot: 'bg-orange-400', badge: 'bg-orange-500/20 text-orange-200 border border-orange-400/30' },
  rescheduled: { label: 'Reagendado', dot: 'bg-gray-400',   badge: 'bg-gray-500/20 text-gray-300 border border-gray-400/30' },
}

// ─── skeleton de carregamento ────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6 pb-8">
      {/* welcome */}
      <div className="glass-card p-4 sm:p-5">
        <div className="flex justify-between items-center gap-4">
          <div className="space-y-2">
            <div className="skeleton h-5 w-52 rounded-lg" />
            <div className="skeleton h-3 w-36 rounded" />
          </div>
          <div className="skeleton h-10 w-36 rounded-2xl" />
        </div>
      </div>

      {/* agenda */}
      <div className="glass-card p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="skeleton h-4 w-4 rounded" />
          <div className="skeleton h-5 w-36 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5">
              <div className="skeleton h-4 w-12 rounded flex-shrink-0" />
              <div className="w-px h-8 bg-white/10 flex-shrink-0" />
              <div className="skeleton h-4 flex-1 rounded" />
              <div className="skeleton h-5 w-20 rounded-full flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* kpis */}
      <div className="grid-dashboard">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="glass-card p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-3">
                <div className="skeleton h-9 w-14 rounded-lg" />
                <div className="skeleton h-3 w-28 rounded" />
              </div>
              <div className="skeleton h-11 w-11 rounded-2xl flex-shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── componente principal ────────────────────────────────────────────────────

const DashboardScreen: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { stats, loading: statsLoading } = useDashboardStats()
  const { appointments: todayApts, loading: aptsLoading } = useTodayAppointments()

  const loading = statsLoading || aptsLoading

  const kpiCards = [
    {
      title: 'Pacientes',
      value: stats.totalPatients,
      icon: Users,
      color: 'blue',
      path: '/patients',
    },
    {
      title: 'Hoje',
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'purple',
      path: '/appointments',
    },
    {
      title: 'Esta Semana',
      value: stats.thisWeekAppointments,
      icon: Clock,
      color: 'cyan',
      path: '/appointments',
    },
    {
      title: 'Fichas Clínicas',
      value: stats.completedProcedures,
      icon: CheckCircle,
      color: 'green',
      path: '/patients',
    },
  ]

  const quickActions = [
    { title: 'Novo Paciente',  icon: Users,      gradient: 'from-blue-500 to-cyan-500',     path: '/patients/new' },
    { title: 'Agenda',         icon: Calendar,   gradient: 'from-purple-500 to-pink-500',   path: '/appointments' },
    { title: 'Procedimentos',  icon: Package,    gradient: 'from-orange-500 to-red-500',    path: '/procedures' },
    { title: 'Financeiro',     icon: DollarSign, gradient: 'from-green-500 to-emerald-500', path: '/financial-control' },
    { title: 'Monjaro',        icon: Wallet,     gradient: 'from-emerald-500 to-teal-500',  path: '/monjaro' },
  ]

  if (loading) {
    return (
      <ResponsiveAppLayout title="Dashboard">
        <DashboardSkeleton />
      </ResponsiveAppLayout>
    )
  }

  return (
    <ResponsiveAppLayout title="Dashboard">
      <div className="space-y-6 pb-8">

        {/* ── 1. Boas-vindas (compacto) ── */}
        <div className="glass-card p-4 sm:p-5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/8 via-purple-500/5 to-transparent pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-white mb-0.5 break-words">
                Bem-vinda, {user?.user_metadata?.name || 'Dra. Loraine'}
              </h2>
              <p className="text-gray-400 text-xs capitalize">{todayLabel()}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => navigate('/profile')}
                className="p-2.5 bg-white/8 hover:bg-white/15 rounded-xl transition-colors border border-indigo-400/25 min-h-[40px] min-w-[40px] flex items-center justify-center"
                aria-label="Perfil"
              >
                <Settings size={18} className="text-gray-300" />
              </button>

              <button
                onClick={() => navigate('/patients/new')}
                className="neon-button min-h-[40px] inline-flex items-center justify-center text-sm px-4 py-2.5"
              >
                <Plus size={16} className="mr-1.5 shrink-0" />
                <span className="font-semibold">Novo Paciente</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── 2. Agenda do Dia (hero) ── */}
        <div className="glass-card p-4 sm:p-6">
          {/* cabeçalho */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5">
              {/* indicador "live" */}
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-60" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-purple-500" />
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">Agenda do Dia</h3>
              {todayApts.length > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-400/20 font-medium">
                  {todayApts.length}
                </span>
              )}
            </div>

            <button
              onClick={() => navigate('/appointments')}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 flex-shrink-0"
            >
              Ver tudo
              <ChevronRight size={13} />
            </button>
          </div>

          {/* lista ou empty state */}
          {todayApts.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <div className="p-4 rounded-2xl bg-white/5 border border-indigo-400/15">
                <Calendar size={26} className="text-gray-500" />
              </div>
              <div>
                <p className="text-gray-300 font-medium text-sm">Agenda livre hoje</p>
                <p className="text-gray-500 text-xs mt-1">Nenhum agendamento marcado</p>
              </div>
              <button
                onClick={() => navigate('/appointments')}
                className="btn-outline text-sm px-5 py-2.5 gap-2"
              >
                <Plus size={15} className="flex-shrink-0" />
                Criar agendamento
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              {todayApts.map((apt) => {
                const s = STATUS_CONFIG[apt.status] ?? STATUS_CONFIG['scheduled']
                return (
                  <button
                    key={apt.id}
                    type="button"
                    onClick={() => navigate('/appointments')}
                    className="w-full group flex items-center gap-3 p-3 sm:p-3.5 rounded-xl bg-white/4 hover:bg-white/8 transition-colors border border-indigo-400/15 hover:border-indigo-400/35 text-left cursor-pointer"
                  >
                    {/* horário — largura fixa, mono */}
                    <span className="flex-shrink-0 w-12 text-right font-mono text-sm font-semibold text-white/90 tabular-nums">
                      {formatTime(apt.start_time)}
                    </span>

                    {/* separador */}
                    <div className={`w-0.5 self-stretch rounded-full flex-shrink-0 my-0.5 ${s.dot}`} style={{ opacity: 0.6 }} />

                    {/* nome + procedimento */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate leading-tight">
                        {apt.patient_name || apt.title}
                      </p>
                      {apt.patient_name && apt.title !== apt.patient_name && (
                        <p className="text-gray-500 text-xs truncate mt-0.5">{apt.title}</p>
                      )}
                    </div>

                    {/* dot de status (mobile) + badge (sm+) */}
                    <div className="flex-shrink-0 flex items-center gap-2">
                      <span className={`hidden sm:inline-flex text-xs px-2.5 py-0.5 rounded-full font-medium ${s.badge}`}>
                        {s.label}
                      </span>
                      <span className={`sm:hidden h-2 w-2 rounded-full flex-shrink-0 ${s.dot}`} />
                      <ChevronRight size={14} className="text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0" />
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── 3. KPI cards (clicáveis, números dominantes) ── */}
        <div className="grid-dashboard">
          {kpiCards.map((stat, i) => {
            const Icon = stat.icon
            return (
              <button
                key={i}
                type="button"
                onClick={() => navigate(stat.path)}
                className={`glass-card p-4 sm:p-5 text-left cursor-pointer group w-full`}
              >
                <div className="flex items-start justify-between gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-3xl sm:text-4xl font-bold text-white tabular-nums leading-none mb-2">
                      {stat.value}
                    </p>
                    <p className="text-gray-400 text-xs font-medium uppercase tracking-wide">
                      {stat.title}
                    </p>
                  </div>
                  <div className={`p-2.5 rounded-xl bg-${stat.color}-500/15 border border-${stat.color}-400/25 group-hover:bg-${stat.color}-500/25 transition-colors flex-shrink-0`}>
                    <Icon size={22} className={`text-${stat.color}-300`} />
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* ── 4. Ações Rápidas ── */}
        <div className="glass-card p-4 sm:p-6">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
            Ações Rápidas
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
            {quickActions.map((action, i) => {
              const Icon = action.icon
              const isLast = i === quickActions.length - 1
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => navigate(action.path)}
                  className={`
                    group relative p-4 rounded-2xl border border-indigo-400/15
                    bg-white/4 hover:bg-white/8
                    transition-all duration-200 text-left w-full
                    hover:border-indigo-400/35 hover:-translate-y-0.5
                    ${isLast ? 'col-span-2 sm:col-span-1' : ''}
                  `}
                >
                  <div className={`p-2.5 rounded-xl bg-gradient-to-r ${action.gradient} shadow-md w-fit mb-3 group-hover:scale-105 transition-transform duration-200`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="font-semibold text-white text-sm leading-tight block">{action.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── 5. Alertas + Desempenho ── */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 xl:grid-cols-2">

          {/* Alertas Operacionais */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <Activity className="text-purple-400 flex-shrink-0" size={18} />
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Alertas Operacionais</h3>
            </div>

            {stats.pendingAppointments > 0 ? (
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="w-full group flex items-center gap-3 p-4 rounded-2xl border border-amber-400/30 bg-amber-500/8 hover:bg-amber-500/15 transition-colors text-left cursor-pointer"
              >
                <div className="p-2.5 bg-amber-500/20 rounded-xl border border-amber-400/25 flex-shrink-0">
                  <Clock className="text-amber-300" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-100 text-sm">
                    {stats.pendingAppointments} agendamento{stats.pendingAppointments > 1 ? 's' : ''} sem confirmação
                  </p>
                  <p className="text-amber-400/70 text-xs mt-0.5">Toque para abrir a agenda</p>
                </div>
                <ChevronRight size={16} className="text-amber-400/40 group-hover:text-amber-400/80 transition-colors flex-shrink-0" />
              </button>
            ) : (
              <div className="flex items-center gap-3 p-4 rounded-2xl border border-green-400/20 bg-green-500/6">
                <div className="p-2.5 bg-green-500/15 rounded-xl border border-green-400/20 flex-shrink-0">
                  <CheckCircle className="text-green-400" size={18} />
                </div>
                <div>
                  <p className="font-medium text-green-200 text-sm">Tudo em dia</p>
                  <p className="text-green-500/70 text-xs mt-0.5">Sem pendências na agenda</p>
                </div>
              </div>
            )}
          </div>

          {/* Desempenho do Mês */}
          <div className="glass-card p-4 sm:p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <TrendingUp className="text-cyan-400 flex-shrink-0" size={18} />
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Desempenho do Mês</h3>
            </div>

            <div className="space-y-4">
              <div className="flex items-end justify-between gap-2">
                <span className="text-gray-400 text-sm">Agendamentos</span>
                <span className="text-3xl font-bold text-cyan-300 tabular-nums leading-none">
                  {stats.thisMonthAppointments}
                </span>
              </div>

              <div className="flex items-end justify-between gap-2">
                <span className="text-gray-400 text-sm">Fichas abertas</span>
                <span className="text-3xl font-bold text-purple-300 tabular-nums leading-none">
                  {stats.completedProcedures}
                </span>
              </div>

              <div className="pt-1 border-t border-indigo-400/15">
                <button
                  type="button"
                  onClick={() => navigate('/financial-control')}
                  className="btn-outline w-full min-h-[40px] text-sm gap-2 mt-3"
                >
                  <DollarSign size={15} className="flex-shrink-0" />
                  Ver Financeiro
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ResponsiveAppLayout>
  )
}

export default DashboardScreen
