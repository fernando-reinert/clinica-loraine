import { useState, useEffect } from 'react';
import { useSupabase } from '../contexts/SupabaseContext';
import { useAuth } from '../contexts/AuthContext';
export const useDashboardStats = () => {
    const { supabase } = useSupabase();
    const { user } = useAuth();
    const [stats, setStats] = useState({
        totalPatients: 0,
        todayAppointments: 0,
        thisWeekAppointments: 0,
        completedProcedures: 0,
        thisMonthAppointments: 0, // Definido corretamente
        pendingAppointments: 0
    });
    const [loading, setLoading] = useState(true);
    const loadStats = async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            // Total de pacientes
            const { count: totalPatients } = await supabase
                .from('patients')
                .select('*', { count: 'exact', head: true });
            // Agendamentos de hoje
            const today = new Date();
            const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
            const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
            const { count: todayAppointments } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .gte('start_time', startOfDay)
                .lte('start_time', endOfDay);
            // Agendamentos desta semana
            const now = new Date();
            const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
            startOfWeek.setHours(0, 0, 0, 0);
            const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
            endOfWeek.setHours(23, 59, 59, 999);
            const { count: thisWeekAppointments } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .gte('start_time', startOfWeek.toISOString())
                .lte('start_time', endOfWeek.toISOString());
            // Agendamentos deste mês
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
            const { count: thisMonthAppointments } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .gte('start_time', startOfMonth)
                .lte('start_time', endOfMonth);
            // Procedimentos completados (fichas clínicas)
            const { count: completedProcedures } = await supabase
                .from('clinical_records')
                .select('*', { count: 'exact', head: true });
            // Agendamentos pendentes
            const { count: pendingAppointments } = await supabase
                .from('appointments')
                .select('*', { count: 'exact', head: true })
                .in('status', ['scheduled', 'confirmed'])
                .gte('start_time', new Date().toISOString());
            setStats({
                totalPatients: totalPatients || 0,
                todayAppointments: todayAppointments || 0,
                thisWeekAppointments: thisWeekAppointments || 0,
                completedProcedures: completedProcedures || 0,
                thisMonthAppointments: thisMonthAppointments || 0, // Definido corretamente
                pendingAppointments: pendingAppointments || 0
            });
        }
        catch (error) {
            console.error('Error loading dashboard stats:', error);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        loadStats();
    }, [user]);
    return {
        stats,
        loading,
        loadStats
    };
};
