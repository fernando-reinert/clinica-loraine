// src/screens/AppointmentCreateScreen.tsx - NOVO LAYOUT FUTURISTA + PACIENTE PRÉ-SELECIONADO + PROCEDIMENTOS
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calendar, User, Plus, Search, Mail, Phone, Calendar as CalendarIcon, DollarSign } from 'lucide-react';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import AppointmentPlanEditor from '../components/AppointmentPlanEditor';
import { supabase } from '../services/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import { listActiveProcedures } from '../services/procedures/procedureService';
import type { Procedure } from '../types/db';
import type { AppointmentPlanItem, AppointmentPaymentInfo } from '../types/appointmentPlan';
import { calculatePlanTotals } from '../types/appointmentPlan';
import { createFinancialRecord } from '../services/financial/financialService';
import type { FinancialProcedureItem } from '../services/financial/financialService';
import toast from 'react-hot-toast';

// Função de conversão de data segura
const convertToSupabaseFormat = (dateTimeString: string): string | null => {
  try {
    if (!dateTimeString) return null;
    const date = new Date(dateTimeString);
    return date.toISOString();
  } catch (error) {
    // Erro silencioso - retorna null para permitir validação no componente
    return null;
  }
};

interface Patient {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  birth_date?: string;
  photo_url?: string | null;
}

const AppointmentCreateScreen: React.FC = () => {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { user } = useAuth();
  const urlParams = new URLSearchParams(search);
  const patientId = urlParams.get('patientId');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [patientSearchResults, setPatientSearchResults] = useState<Patient[]>([]);
  const [patientSearchLoading, setPatientSearchLoading] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [showPatientSearch, setShowPatientSearch] = useState(!patientId);
  const patientSearchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('Clínica Estética');

  // Estados para procedimentos
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [proceduresLoading, setProceduresLoading] = useState(false);
  const [procedureSearch, setProcedureSearch] = useState('');
  const [showProcedureDropdown, setShowProcedureDropdown] = useState(false);
  const [planItems, setPlanItems] = useState<AppointmentPlanItem[]>([]);

  // Estados para pagamento
  const [paymentInfo, setPaymentInfo] = useState<AppointmentPaymentInfo>({
    installments: 1,
    payment_method: 'pix',
    first_payment_date: new Date().toISOString().split('T')[0],
  });

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setError('');
        setLoading(true);

        // Carregar procedimentos ativos
        await loadProcedures();

        if (patientId) {
          // Fluxo: paciente pré-selecionado via querystring
          await loadPatient(patientId);
        } else {
          // Fluxo: sem paciente na URL, mostrar autocomplete (busca sob demanda)
          if (isMounted) setLoading(false);
        }
      } finally {
        if (isMounted && !patientId) {
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, [patientId]);

  const loadProcedures = async () => {
    try {
      setProceduresLoading(true);
      const data = await listActiveProcedures();
      setProcedures(data);
    } catch (err: any) {
      console.error('Erro ao carregar procedimentos:', err);
      toast.error('Erro ao carregar procedimentos');
    } finally {
      setProceduresLoading(false);
    }
  };

  const loadPatient = async (id: string) => {
    try {
      setError('');
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone, email, birth_date, photo_url')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Erro ao carregar paciente:', error);
        setError('Paciente não encontrado');
        setShowPatientSearch(true);
        return;
      }

      setPatient(data as Patient);
    } catch (err) {
      console.error('Erro ao carregar paciente:', err);
      setError('Erro ao carregar paciente');
      setShowPatientSearch(true);
    } finally {
      setLoading(false);
    }
  };

  const searchPatients = async (query: string) => {
    if (query.length < 2) {
      setPatientSearchResults([]);
      return;
    }
    try {
      setPatientSearchLoading(true);
      const q = query.trim();
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, phone, email, birth_date, photo_url')
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10);

      if (error) {
        console.error('Erro ao buscar pacientes:', error);
        setPatientSearchResults([]);
        return;
      }
      setPatientSearchResults((data || []) as Patient[]);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
      setPatientSearchResults([]);
    } finally {
      setPatientSearchLoading(false);
    }
  };

  useEffect(() => {
    if (patientSearchDebounceRef.current) {
      clearTimeout(patientSearchDebounceRef.current);
      patientSearchDebounceRef.current = null;
    }
    if (patientSearchQuery.length < 2) {
      setPatientSearchResults([]);
      setShowPatientDropdown(false);
      return;
    }
    patientSearchDebounceRef.current = setTimeout(() => {
      searchPatients(patientSearchQuery);
      setShowPatientDropdown(true);
    }, 300);
    return () => {
      if (patientSearchDebounceRef.current) {
        clearTimeout(patientSearchDebounceRef.current);
      }
    };
  }, [patientSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(target)) {
        setShowPatientDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectPatient = (selectedPatient: Patient) => {
    setPatient(selectedPatient);
    setPatientSearchQuery('');
    setShowPatientDropdown(false);
    setShowPatientSearch(false);
    setError('');
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('pt-BR');
    } catch {
      return 'Data inválida';
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const filteredProcedures = useMemo(() => {
    if (!procedureSearch.trim()) return procedures;
    const search = procedureSearch.toLowerCase();
    return procedures.filter(
      (p) =>
        p.name.toLowerCase().includes(search) ||
        (p.category && p.category.toLowerCase().includes(search))
    );
  }, [procedures, procedureSearch]);

  const handleSelectProcedure = (procedure: Procedure) => {
    // Verificar se o procedimento já está na lista
    const existingIndex = planItems.findIndex(item => item.procedure_catalog_id === procedure.id);
    
    if (existingIndex >= 0) {
      // Se já existe, incrementar quantidade
      const updated = [...planItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: updated[existingIndex].quantity + 1,
      };
      setPlanItems(updated);
    } else {
      // Adicionar novo item
      const newItem: AppointmentPlanItem = {
        procedure_catalog_id: procedure.id,
        name: procedure.name,
        category: procedure.category || null,
        cost_price: procedure.cost_price || 0,
        sale_price: procedure.sale_price || 0,
        final_price: procedure.sale_price || 0,
        quantity: 1,
        discount: 0,
      };
      setPlanItems([...planItems, newItem]);
    }
    
    setProcedureSearch('');
    setShowProcedureDropdown(false);
    
    // Preencher título automaticamente se estiver vazio
    if (!title) {
      setTitle(procedure.name);
    }
  };

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.procedure-dropdown-container')) {
        setShowProcedureDropdown(false);
      }
    };

    if (showProcedureDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showProcedureDropdown]);

  const createAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError('');

    try {
      // ============================================
      // VALIDAÇÕES OBRIGATÓRIAS (produção)
      // ============================================
      
      if (!patient?.id) {
        throw new Error('Por favor, selecione um paciente.');
      }

      if (!patient?.name || patient.name.trim() === '') {
        throw new Error('Nome do paciente não encontrado. Por favor, recarregue a página.');
      }

      if (!startTime) {
        throw new Error('Por favor, informe a data e hora de início.');
      }

      // Validação defensiva: pelo menos um procedimento do catálogo obrigatório
      if (!planItems || planItems.length === 0) {
        toast.error('Adicione pelo menos um procedimento do catálogo');
        throw new Error('Por favor, adicione pelo menos um procedimento do catálogo.');
      }

      // Validar que todos os itens têm procedure_catalog_id
      const invalidItems = planItems.filter(item => !item.procedure_catalog_id);
      if (invalidItems.length > 0) {
        toast.error('Alguns procedimentos estão inválidos. Remova e adicione novamente.');
        throw new Error('Procedimentos inválidos detectados.');
      }

      // Validar total do plano > 0
      const planTotals = calculatePlanTotals(planItems);
      if (planTotals.totalFinal <= 0) {
        toast.error('O total do atendimento deve ser maior que zero');
        throw new Error('Total do atendimento inválido.');
      }

      // Validações de pagamento
      if (!paymentInfo.installments || paymentInfo.installments < 1) {
        toast.error('Número de parcelas deve ser pelo menos 1');
        throw new Error('Número de parcelas inválido.');
      }

      if (!paymentInfo.payment_method || paymentInfo.payment_method.trim() === '') {
        toast.error('Selecione um método de pagamento');
        throw new Error('Método de pagamento não selecionado.');
      }

      if (!paymentInfo.first_payment_date || paymentInfo.first_payment_date.trim() === '') {
        toast.error('Informe a data do primeiro pagamento');
        throw new Error('Data do primeiro pagamento não informada.');
      }

      if (!user?.id) {
        throw new Error('Usuário não autenticado.');
      }

      const isoStartTime = convertToSupabaseFormat(startTime);
      if (!isoStartTime) {
        throw new Error('Data e hora de início inválidos.');
      }

      // Validar que end_time > start_time
      let isoEndTime = endTime ? convertToSupabaseFormat(endTime) : null;
      // Calcular end_time baseado na duração total dos procedimentos se não fornecido
      if (!isoEndTime && planItems.length > 0) {
        const totalDuration = planItems.reduce((sum, item) => {
          // Buscar duração do procedimento no catálogo
          const proc = procedures.find(p => p.id === item.procedure_catalog_id);
          return sum + (proc?.duration_minutes || 0) * item.quantity;
        }, 0);
        if (totalDuration > 0) {
          const start = new Date(isoStartTime);
          start.setMinutes(start.getMinutes() + totalDuration);
          isoEndTime = start.toISOString();
        }
      }

      if (isoEndTime && new Date(isoEndTime) <= new Date(isoStartTime)) {
        throw new Error('A data/hora de término deve ser posterior à data/hora de início.');
      }

      // ============================================
      // PREPARAR PAYLOAD DO INSERT
      // ============================================
      
      const appointmentTitle = title || planItems.map(item => item.name).join(' + ') || 'Agendamento';
      
      const appointmentData: any = {
        patient_id: patient.id,
        patient_name: patient.name.trim(), // ✅ SNAPSHOT: sempre enviar nome do paciente
        professional_id: user.id,
        title: appointmentTitle,
        description: description || null,
        start_time: isoStartTime,
        end_time: isoEndTime,
        status: 'scheduled',
      };


      // ============================================
      // INSERIR AGENDAMENTO
      // ============================================
      
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert([appointmentData])
        .select('id')
        .single();

      if (appointmentError || !appointment) {
        // Mensagem de erro mais detalhada
        let errorMsg = `Erro ao salvar agendamento: ${appointmentError?.message || 'Erro desconhecido'}`;
        if ((appointmentError as any)?.details) {
          errorMsg += ` - ${(appointmentError as any).details}`;
        }
        if ((appointmentError as any)?.hint) {
          errorMsg += ` (${(appointmentError as any).hint})`;
        }
        
        throw new Error(errorMsg);
      }

      // ============================================
      // VALIDAR E EXTRAIR appointment_id
      // ============================================
      
      const appointmentId = appointment.id;
      if (!appointmentId) {
        throw new Error('Erro: ID do agendamento não foi retornado após criação.');
      }

      // ============================================
      // PREPARAR PAYLOAD DOS PROCEDIMENTOS (múltiplos itens)
      // ============================================
      
      const procedureItemsPayload = planItems.map(item => ({
        appointment_id: appointmentId,
        procedure_catalog_id: item.procedure_catalog_id, // ✅ OBRIGATÓRIO
        procedure_name_snapshot: item.name.trim(),
        final_price: Number(item.final_price.toFixed(2)),
        quantity: item.quantity || 1,
        discount: item.discount || 0,
      }));


      // ============================================
      // INSERIR ITENS DE PROCEDIMENTOS (batch)
      // ============================================
      
      const { error: procedureError } = await supabase
        .from('appointment_procedures')
        .insert(procedureItemsPayload);

      if (procedureError) {
        // Tentar remover o agendamento criado (rollback best-effort)
        try {
          await supabase.from('appointments').delete().eq('id', appointmentId);
        } catch (rollbackError: any) {
          // Rollback falhou - apenas continuar
        }
        
        // Mensagem de erro detalhada
        let errorMsg = `Erro ao salvar procedimento: ${procedureError.message || 'Erro desconhecido'}`;
        if ((procedureError as any)?.details) {
          errorMsg += ` - ${(procedureError as any).details}`;
        }
        if ((procedureError as any)?.hint) {
          errorMsg += ` (${(procedureError as any).hint})`;
        }
        
        throw new Error(errorMsg);
      }

      // ============================================
      // CRIAR REGISTRO FINANCEIRO + PARCELAS
      // ============================================
      
      try {
        // Converter planItems para FinancialProcedureItem
        const financialItems: FinancialProcedureItem[] = planItems.map(item => {
          const itemProfit = (item.final_price * item.quantity - item.discount) - (item.cost_price * item.quantity);
          return {
            procedure_catalog_id: item.procedure_catalog_id,
            procedure_name_snapshot: item.name,
            cost_price_snapshot: item.cost_price,
            final_price_snapshot: item.final_price,
            quantity: item.quantity,
            discount: item.discount,
            profit_snapshot: itemProfit,
          };
        });

        const financialResult = await createFinancialRecord({
          patientId: patient.id,
          patientName: patient.name.trim(),
          items: financialItems,
          installmentsConfig: {
            count: paymentInfo.installments,
            paymentMethod: paymentInfo.payment_method,
            firstPaymentDate: paymentInfo.first_payment_date,
          },
          appointmentId: appointmentId,
          procedureType: appointmentTitle,
        });
        
        // Se campos foram removidos, avisar o usuário
        if (financialResult.removedFields && financialResult.removedFields.length > 0) {
          const fieldsList = financialResult.removedFields.join(', ');
          toast(`⚠️ Schema desatualizado: campos ${fieldsList} não existem no banco. Execute a migration 20260121000000_financial_procedure_items.sql no Supabase.`, {
            duration: 6000,
            icon: '⚠️',
          });
        }
      } catch (financialError: any) {
        // Não fazer rollback do agendamento - apenas avisar
        // O agendamento já foi criado, apenas o financeiro falhou
        toast.error('Agendamento criado, mas houve erro ao registrar pagamento. Verifique no Financeiro.');
      }

      // Mensagem de sucesso e reset do formulário
      toast.success('Agendamento criado com sucesso!');
      
      // Reset do formulário
      setPlanItems([]);
      setTitle('');
      setDescription('');
      setStartTime('');
      setEndTime('');
      setLocation('Clínica Estética');
      setPaymentInfo({
        installments: 1,
        payment_method: 'pix',
        first_payment_date: new Date().toISOString().split('T')[0],
      });
      
      navigate('/appointments');
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao criar agendamento';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <ResponsiveAppLayout title="Carregando..." showBack={true}>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="lg" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  return (
    <ResponsiveAppLayout title="Novo Agendamento" showBack={true}>
      <div className="space-y-6">
        {/* Header futurista do agendamento com informações do paciente integradas */}
        <div className="glass-card p-6 md:p-8 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-cyan-500/10" />
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-bold glow-text mb-4">Novo Agendamento</h1>
            
            {patient ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                {/* Avatar */}
                <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center overflow-hidden border border-white/20 flex-shrink-0">
                  {patient.photo_url ? (
                    <img
                      src={patient.photo_url}
                      alt={patient.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-white font-bold text-xl md:text-2xl">
                      {patient.name?.charAt(0)?.toUpperCase() || 'P'}
                    </span>
                  )}
                </div>
                
                {/* Informações do paciente */}
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg md:text-xl font-semibold text-white mb-2 truncate">
                    {patient.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 md:gap-4 text-sm">
                    {patient.phone && (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Phone size={14} className="text-cyan-400" />
                        <span>{patient.phone}</span>
                      </div>
                    )}
                    {patient.email && (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <Mail size={14} className="text-purple-400" />
                        <span className="truncate max-w-[200px]">{patient.email}</span>
                      </div>
                    )}
                    {patient.birth_date && (
                      <div className="flex items-center gap-1.5 text-gray-300">
                        <CalendarIcon size={14} className="text-pink-400" />
                        <span>Nasc. {formatDate(patient.birth_date)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-300 text-sm md:text-base">Selecione um paciente para agendar</p>
            )}
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="glass-card p-4 border border-red-400/40 bg-red-500/10">
            <p className="text-sm text-red-100">{error}</p>
          </div>
        )}

        {/* Seletor de paciente — autocomplete (busca ao digitar, mín. 2 caracteres) */}
        {(!patientId || showPatientSearch) && (
          <div className="glass-card p-6 border border-white/10">
            <h2 className="text-lg font-semibold glow-text mb-4 flex items-center gap-2">
              <User className="text-cyan-300" size={20} />
              <span>Selecionar Paciente</span>
            </h2>

            <div ref={patientDropdownRef} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Buscar paciente… (mín. 2 caracteres)"
                value={patientSearchQuery}
                onChange={(e) => setPatientSearchQuery(e.target.value)}
                onFocus={() => patientSearchQuery.length >= 2 && setShowPatientDropdown(true)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm"
                autoComplete="off"
              />
              {patientSearchQuery.length >= 2 && showPatientDropdown && (
                <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl">
                  {patientSearchLoading ? (
                    <div className="py-4 text-center text-sm text-gray-400 flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      <span>Buscando…</span>
                    </div>
                  ) : patientSearchResults.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-300">
                      Nenhum paciente encontrado
                    </div>
                  ) : (
                    patientSearchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectPatient(p)}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                      >
                        <p className="font-semibold text-white text-sm">{p.name}</p>
                        {p.phone && <p className="text-xs text-gray-300">{p.phone}</p>}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => navigate('/patients/new')}
                className="w-full neon-button text-sm flex items-center justify-center gap-2"
              >
                <Plus size={18} />
                <span>Cadastrar novo paciente</span>
              </button>
            </div>
          </div>
        )}

        {/* Formulário de agendamento */}
        <div className="glass-card p-6 border border-white/10">
          <h2 className="text-lg font-semibold glow-text mb-6 flex items-center gap-2">
            <Calendar className="text-purple-300" size={20} />
            <span>Detalhes do Agendamento</span>
          </h2>

          <form onSubmit={createAppointment} className="space-y-5">
            {/* Seleção de Procedimento */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Adicionar Procedimento *
              </label>
              <div className="relative procedure-dropdown-container">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar procedimento do catálogo..."
                  value={procedureSearch}
                  onChange={(e) => {
                    setProcedureSearch(e.target.value);
                    setShowProcedureDropdown(true);
                  }}
                  onFocus={() => setShowProcedureDropdown(true)}
                  className="holo-input w-full pl-9 pr-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                />
                {showProcedureDropdown && filteredProcedures.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-xl">
                    {filteredProcedures.map((proc) => (
                      <button
                        key={proc.id}
                        type="button"
                        onClick={() => handleSelectProcedure(proc)}
                        className="w-full text-left px-4 py-3 hover:bg-white/10 transition-colors border-b border-white/5 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-white text-sm truncate">{proc.name}</p>
                            {proc.category && (
                              <p className="text-xs text-gray-400 truncate">{proc.category}</p>
                            )}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-green-400">
                              {formatCurrency(proc.sale_price)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {proceduresLoading && (
                <p className="text-xs text-gray-400 mt-1">Carregando procedimentos...</p>
              )}
            </div>

            {/* Plano do Atendimento - Componente reutilizável */}
            {planItems.length > 0 && (
              <AppointmentPlanEditor
                items={planItems}
                onChange={setPlanItems}
                title="Plano do Atendimento"
              />
            )}

            {/* Pagamento do Atendimento */}
            {planItems.length > 0 && (() => {
              const planTotals = calculatePlanTotals(planItems);
              const installmentValue = planTotals.totalFinal / paymentInfo.installments;
              
              return (
                <div className="glass-card p-6 border border-white/10 bg-white/5">
                  <h3 className="text-lg font-semibold glow-text mb-4 flex items-center gap-2">
                    <DollarSign className="text-green-300" size={20} />
                    <span>Pagamento do Atendimento</span>
                  </h3>

                  {/* Resumo rápido */}
                  <div className="mb-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-300">Total do Atendimento</p>
                        <p className="text-lg font-bold text-white">{formatCurrency(planTotals.totalFinal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-300">Valor por Parcela ({paymentInfo.installments}x)</p>
                        <p className="text-lg font-bold text-green-400">{formatCurrency(installmentValue)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Campos de pagamento */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Número de Parcelas *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={paymentInfo.installments}
                        onChange={(e) => {
                          const value = Number(e.target.value);
                          if (value >= 1) {
                            setPaymentInfo({ ...paymentInfo, installments: value });
                          }
                        }}
                        className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Método de Pagamento *
                      </label>
                      <select
                        value={paymentInfo.payment_method}
                        onChange={(e) => {
                          setPaymentInfo({
                            ...paymentInfo,
                            payment_method: e.target.value as AppointmentPaymentInfo['payment_method'],
                          });
                        }}
                        className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                        required
                      >
                        <option value="pix" className="text-black">PIX</option>
                        <option value="cash" className="text-black">Dinheiro</option>
                        <option value="credit_card" className="text-black">Cartão de Crédito</option>
                        <option value="debit_card" className="text-black">Cartão de Débito</option>
                        <option value="bank_transfer" className="text-black">Transferência Bancária</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-300 mb-1.5">
                        Data do Primeiro Pagamento *
                      </label>
                      <input
                        type="date"
                        value={paymentInfo.first_payment_date}
                        onChange={(e) => {
                          setPaymentInfo({ ...paymentInfo, first_payment_date: e.target.value });
                        }}
                        className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Título/Observação (opcional) */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Título / Observação (opcional)
              </label>
              <input
                type="text"
                placeholder="Título adicional ou observação sobre o procedimento..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
              />
            </div>

            {/* Grid responsivo: Data/Hora Início e Término */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Data e Hora de Início *
                </label>
                <input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">
                  Data e Hora de Término
                </label>
                <input
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
                />
              </div>
            </div>

            {/* Local */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Local
              </label>
              <input
                type="text"
                placeholder="Local da consulta"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm transition-all"
              />
            </div>

            {/* Descrição / Observações */}
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1.5">
                Descrição / Observações
              </label>
              <textarea
                placeholder="Detalhes adicionais, observações, materiais necessários..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="holo-input w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none text-sm h-28 resize-none transition-all"
              />
            </div>

            {/* Botões de ação - Responsivos */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => navigate('/appointments')}
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-gray-200 transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="w-full sm:w-auto flex-1 neon-button inline-flex items-center justify-center gap-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creating ? <LoadingSpinner size="sm" /> : <Plus size={18} />}
                <span>{creating ? 'Criando...' : 'Criar Agendamento'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </ResponsiveAppLayout>
  );
};

export default AppointmentCreateScreen;

