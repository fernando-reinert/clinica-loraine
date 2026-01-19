import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
import { supabase } from '../services/supabase/client';
const SupabaseContext = createContext(undefined);
export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (context === undefined) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
};
export const SupabaseProvider = ({ children }) => {
    return (_jsx(SupabaseContext.Provider, { value: { supabase }, children: children }));
};
