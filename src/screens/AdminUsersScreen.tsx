// Painel admin: listagem user_profiles + gerar link de cadastro staff (Edge Function createStaffInvite).
import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle, Link2, Copy, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ResponsiveAppLayout from '../components/Layout/ResponsiveAppLayout';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useAdminUsers } from '../hooks/useAdminUsers';
import type { UserProfileRow } from '../services/admin/adminTypes';

function ProfileRow({
  profile,
  isCurrentUser,
  onToggleActive,
  toggleLoading,
}: {
  profile: UserProfileRow;
  isCurrentUser: boolean;
  onToggleActive: (userId: string, isActive: boolean) => void;
  toggleLoading: string | null;
}) {
  const loading = toggleLoading === profile.user_id;
  const canToggle = profile.role !== 'owner' && !isCurrentUser;
  return (
    <tr className="border-b border-white/10">
      <td className="py-3 px-2 text-gray-200">{profile.email}</td>
      <td className="py-3 px-2">
        <span
          className={`px-2 py-0.5 rounded text-xs ${
            profile.role === 'owner' ? 'bg-purple-500/30 text-purple-200' : 'bg-gray-500/30 text-gray-200'
          }`}
        >
          {profile.role}
        </span>
      </td>
      <td className="py-3 px-2">
        {profile.role === 'owner' ? (
          <span className="text-gray-500">—</span>
        ) : (
          <button
            type="button"
            disabled={loading || !canToggle}
            onClick={() => onToggleActive(profile.user_id, !profile.is_active)}
            className={`text-sm font-medium ${
              profile.is_active ? 'text-green-400 hover:underline' : 'text-red-400 hover:underline'
            }`}
          >
            {loading ? (
              <Loader2 className="animate-spin inline" size={14} />
            ) : profile.is_active ? (
              'Ativo'
            ) : (
              'Inativo'
            )}
          </button>
        )}
      </td>
    </tr>
  );
}

const EXPIRY_OPTIONS = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 60, label: '1 hora' },
  { value: 120, label: '2 horas' },
] as const;

const ROLE_OPTIONS = [
  { value: 'viewer' as const, label: 'Visualizador' },
  { value: 'staff' as const, label: 'Staff' },
  { value: 'admin' as const, label: 'Admin' },
];

const AdminUsersScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    me,
    users,
    loading,
    loadError,
    isOwnerActive,
    isAllowedAdminEmail,
    toggleLoading,
    toggleActive,
    inviteLoading,
    inviteError,
    createStaffInviteLink,
  } = useAdminUsers();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'viewer' | 'staff' | 'admin'>('staff');
  const [inviteExpires, setInviteExpires] = useState(60);
  const [inviteResult, setInviteResult] = useState<{ signupUrl: string; email: string } | null>(null);

  if (!user) {
    navigate('/login', { replace: true });
    return null;
  }

  if (loading) {
    return (
      <ResponsiveAppLayout title="Admin">
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner size="lg" className="text-blue-500" />
        </div>
      </ResponsiveAppLayout>
    );
  }

  if (loadError) {
    return (
      <ResponsiveAppLayout title="Admin">
        <div className="glass-card p-8 max-w-md mx-auto text-center">
          <AlertCircle className="mx-auto text-amber-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-white mb-2">Erro ao carregar</h2>
          <p className="text-gray-400 mb-6 break-words">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="neon-button w-full min-h-[44px] flex items-center justify-center"
          >
            Tentar novamente
          </button>
        </div>
      </ResponsiveAppLayout>
    );
  }

  const allowed = isAllowedAdminEmail(user.email ?? undefined) && Boolean(me && isOwnerActive);
  if (!allowed) {
    return (
      <ResponsiveAppLayout title="Admin">
        <div className="glass-card p-8 max-w-md mx-auto text-center">
          <Shield className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-xl font-semibold text-white mb-2">Acesso negado</h2>
          <p className="text-gray-400 mb-6">
            Apenas o proprietário autorizado pode acessar esta área.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard', { replace: true })}
            className="neon-button w-full min-h-[44px] flex items-center justify-center"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </ResponsiveAppLayout>
    );
  }

  const handleOpenInviteModal = () => {
    setInviteResult(null);
    setInviteEmail('');
    setInviteRole('staff');
    setInviteExpires(60);
    setInviteModalOpen(true);
  };

  const handleCreateInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Informe um e-mail válido.');
      return;
    }
    const result = await createStaffInviteLink({
      email,
      role: inviteRole,
      expiresMinutes: inviteExpires,
    });
    if (result) {
      setInviteResult({ signupUrl: result.signupUrl, email });
    }
  };

  // Link exibido/compartilhado sempre usa a origin atual (dev ou produção).
  const inviteCode =
    inviteResult
      ? (() => {
          try {
            const url = new URL(inviteResult.signupUrl);
            const parts = url.pathname.split('/').filter(Boolean);
            return parts[parts.length - 1] ?? '';
          } catch {
            const parts = inviteResult.signupUrl.split('/').filter(Boolean);
            return parts[parts.length - 1] ?? '';
          }
        })()
      : '';
  const inviteLink = inviteCode ? `${window.location.origin}/staff-signup/${inviteCode}` : '';

  const copyLink = () => {
    if (!inviteLink) return;
    navigator.clipboard.writeText(inviteLink);
    toast.success('Link copiado.');
  };

  const whatsappMessage = inviteResult
    ? `Segue seu link para criar acesso ao Clínica Áurea (válido por ${inviteExpires} min). Use o e-mail: ${inviteResult.email}. ${inviteLink}`
    : '';
  const whatsappUrl = whatsappMessage
    ? `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`
    : '#';

  return (
    <ResponsiveAppLayout title="Usuários internos">
      <div className="space-y-6">
        <p className="text-gray-400">
          Gerencie usuários do seu tenant (listagem via public.user_profiles).
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleOpenInviteModal}
            className="neon-button min-h-[44px] inline-flex items-center gap-2"
          >
            <Link2 size={18} />
            Gerar link de cadastro
          </button>
        </div>
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead>
                <tr className="border-b border-white/20 text-left text-gray-400 text-sm">
                  <th className="py-3 px-2 font-medium">E-mail</th>
                  <th className="py-3 px-2 font-medium">Função</th>
                  <th className="py-3 px-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {users.map((p) => (
                  <ProfileRow
                    key={p.user_id}
                    profile={p}
                    isCurrentUser={p.user_id === me!.user_id}
                    onToggleActive={toggleActive}
                    toggleLoading={toggleLoading}
                  />
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="py-8 text-center text-gray-500">Nenhum usuário no tenant.</div>
          )}
        </div>
      </div>

      {/* Modal: Gerar link de cadastro */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-card max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-white mb-4">Gerar link de cadastro</h3>
            {!inviteResult ? (
              <>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">E-mail do convidado *</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="ex: colaborador@email.com"
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Função</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'viewer' | 'staff' | 'admin')}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-1">Expiração</label>
                    <select
                      value={inviteExpires}
                      onChange={(e) => setInviteExpires(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:border-indigo-400 focus:outline-none"
                    >
                      {EXPIRY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {inviteError && (
                  <p className="mt-2 text-sm text-red-400">{inviteError}</p>
                )}
                <div className="mt-6 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setInviteModalOpen(false)}
                    className="px-4 py-2 rounded-lg border border-white/20 text-gray-300 hover:bg-white/5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateInvite}
                    disabled={inviteLoading}
                    className="neon-button min-h-[44px] inline-flex items-center gap-2"
                  >
                    {inviteLoading ? <Loader2 className="animate-spin" size={18} /> : <Link2 size={18} />}
                    Gerar link
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-gray-400 text-sm mb-2">Link gerado. Compartilhe com o e-mail: <strong className="text-white">{inviteResult.email}</strong></p>
                <div className="flex gap-2 items-center mb-4">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="p-2 rounded-lg border border-white/20 text-gray-300 hover:bg-white/5"
                    title="Copiar link"
                  >
                    <Copy size={18} />
                  </button>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366] text-white hover:opacity-90 mb-4"
                >
                  <MessageCircle size={18} />
                  Abrir WhatsApp
                </a>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => { setInviteModalOpen(false); setInviteResult(null); }}
                    className="neon-button min-h-[44px]"
                  >
                    Fechar
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </ResponsiveAppLayout>
  );
};

export default AdminUsersScreen;
