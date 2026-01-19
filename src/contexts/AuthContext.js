import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import { useSupabase } from './SupabaseContext';
import toast from 'react-hot-toast';
const AuthContext = createContext(undefined);
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
export const AuthProvider = ({ children }) => {
    const { supabase } = useSupabase();
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });
        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (event === 'SIGNED_IN') {
                toast.success('Login realizado com sucesso!');
            }
            else if (event === 'SIGNED_OUT') {
                toast.success('Logout realizado com sucesso!');
            }
        });
        return () => subscription.unsubscribe();
    }, [supabase.auth]);
    const signIn = async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) {
            throw new Error(error.message);
        }
    };
    const signUp = async (email, password, name, profession) => {
        try {
            // Criar o usuário com o email e senha
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                    },
                },
            });
            if (error) {
                throw new Error(error.message);
            }
            // NOTA: O profissional será criado via modal de setup quando necessário
            // Não criamos automaticamente aqui para garantir que todos os dados sejam coletados
            // (nome, registro profissional, etc.)
            // Sucesso ao criar a conta e salvar a profissão
            toast.success('Conta criada com sucesso!');
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : 'Erro desconhecido');
        }
    };
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw new Error(error.message);
        }
    };
    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) {
            throw new Error(error.message);
        }
        toast.success('Email de recuperação enviado!');
    };
    const value = {
        user,
        session,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
    };
    return (_jsx(AuthContext.Provider, { value: value, children: children }));
};
