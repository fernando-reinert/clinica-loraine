// src/components/appointments/form/WhatsAppNotifySection.tsx
import React from 'react';
import { MessageCircle } from 'lucide-react';

const REMINDER_OPTIONS = [
  { value: 60, label: '1h antes' },
  { value: 120, label: '2h antes' },
  { value: 180, label: '3h antes' },
] as const;

interface Props {
  patientPhone: string;
  notifyOnCreate: boolean;
  onNotifyOnCreateChange: (v: boolean) => void;
  reminderEnabled: boolean;
  onReminderEnabledChange: (v: boolean) => void;
  reminderMinutesBefore: number;
  onReminderMinutesBeforeChange: (v: number) => void;
  disabled?: boolean;
}

export default function WhatsAppNotifySection({
  patientPhone,
  notifyOnCreate,
  onNotifyOnCreateChange,
  reminderEnabled,
  onReminderEnabledChange,
  reminderMinutesBefore,
  onReminderMinutesBeforeChange,
  disabled,
}: Props) {
  const hasPhone = Boolean(patientPhone && patientPhone.trim());
  // Derivado direto das props — nada de estado local espelhado (evita dessincronia).
  const notifyPatient = notifyOnCreate || reminderEnabled;

  const handleToggleMaster = (checked: boolean) => {
    onNotifyOnCreateChange(checked);
    onReminderEnabledChange(checked);
  };

  return (
    <div className="border-t border-slate-700/50 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          Notificações WhatsApp
        </span>
      </div>

      {!hasPhone ? (
        <p className="text-xs text-amber-400 bg-amber-500/10 border border-amber-400/20 rounded-lg px-3 py-2.5">
          ⚠️ Paciente sem telefone cadastrado
        </p>
      ) : (
        <div className="space-y-3">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={notifyPatient}
              onChange={(e) => handleToggleMaster(e.target.checked)}
              disabled={disabled}
              className="w-[18px] h-[18px] rounded border-slate-500 accent-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [appearance:auto] [-webkit-appearance:auto]"
            />
            <span className="text-sm text-slate-200">Avisar paciente</span>
          </label>

          {/* Sub-opções — animação de altura via grid-template-rows */}
          <div
            className="grid transition-[grid-template-rows] duration-300 ease-out"
            style={{ gridTemplateRows: notifyPatient ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden">
              <div
                className={`ml-6 pl-3 border-l border-slate-700/60 space-y-3 pt-1 transition-opacity duration-300 ${
                  notifyPatient ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {/* Opção A — Avisar agora */}
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={notifyOnCreate}
                    onChange={(e) => onNotifyOnCreateChange(e.target.checked)}
                    disabled={disabled}
                    className="w-[18px] h-[18px] mt-0.5 rounded border-slate-500 accent-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [appearance:auto] [-webkit-appearance:auto]"
                  />
                  <span className="text-sm text-slate-300">
                    Avisar agora
                    <span className="block text-xs text-slate-500 mt-0.5">
                      Envia a confirmação assim que o agendamento for salvo
                    </span>
                  </span>
                </label>

                {/* Opção B — Lembrete automático */}
                <div>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => onReminderEnabledChange(e.target.checked)}
                      disabled={disabled}
                      className="w-[18px] h-[18px] mt-0.5 rounded border-slate-500 accent-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [appearance:auto] [-webkit-appearance:auto]"
                    />
                    <span className="text-sm text-slate-300">
                      Lembrete automático
                      <span className="block text-xs text-slate-500 mt-0.5">
                        Envia um lembrete antes do horário marcado
                      </span>
                    </span>
                  </label>

                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: reminderEnabled ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <div className="flex gap-4 ml-6 pt-2">
                        {REMINDER_OPTIONS.map((opt) => (
                          <label key={opt.value} className="flex items-center gap-1.5 cursor-pointer select-none">
                            <input
                              type="radio"
                              name="whatsapp-reminder-minutes"
                              checked={reminderMinutesBefore === opt.value}
                              onChange={() => onReminderMinutesBeforeChange(opt.value)}
                              disabled={disabled}
                              className="w-[16px] h-[16px] border-slate-500 accent-emerald-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed [appearance:auto] [-webkit-appearance:auto]"
                            />
                            <span className="text-xs text-slate-400">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
