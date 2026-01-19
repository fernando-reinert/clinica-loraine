import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
const OfflineContext = createContext(undefined);
export const useOffline = () => {
    const context = useContext(OfflineContext);
    if (context === undefined) {
        throw new Error('useOffline must be used within an OfflineProvider');
    }
    return context;
};
export const OfflineProvider = ({ children }) => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [syncStatus, setSyncStatus] = useState('idle');
    const [pendingChanges, setPendingChanges] = useState(0);
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast.success('Conexão restaurada - Sincronizando dados...');
            // Trigger sync when coming back online
            syncPendingChanges();
        };
        const handleOffline = () => {
            setIsOnline(false);
            toast.error('Sem conexão - Trabalhando offline');
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);
    const syncPendingChanges = async () => {
        if (!isOnline)
            return;
        setSyncStatus('syncing');
        try {
            // Simulate sync process
            await new Promise(resolve => setTimeout(resolve, 2000));
            setPendingChanges(0);
            setSyncStatus('idle');
            toast.success('Dados sincronizados com sucesso!');
        }
        catch (error) {
            setSyncStatus('error');
            toast.error('Erro na sincronização');
        }
    };
    const value = {
        isOnline,
        syncStatus,
        pendingChanges
    };
    return (_jsx(OfflineContext.Provider, { value: value, children: children }));
};
