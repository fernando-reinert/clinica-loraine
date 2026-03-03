-- Fix: permitir que o trigger AFTER DELETE insira em appointment_history
-- sem violar FK. O CASCADE apagava as linhas de histórico antes do trigger rodar,
-- e o trigger insere um registro "deleted" com appointment_id = OLD.id (já inexistente).
-- Removemos a FK em appointment_id para que o histórico de exclusão possa ser gravado
-- (appointment_id continua guardando o uuid do agendamento deletado para auditoria).

ALTER TABLE public.appointment_history
  DROP CONSTRAINT IF EXISTS appointment_history_appointment_id_fkey;

COMMENT ON COLUMN public.appointment_history.appointment_id IS 'UUID do agendamento (pode ser de registro já excluído, para auditoria)';
