// src/utils/dateUtils.ts

/**
 * Tipos de status de agendamento
 */
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled';

/**
 * Converte uma data no formato do input datetime-local para o formato ISO 8601 do Supabase
 * @param dateString - String no formato 'yyyy-MM-ddTHH:mm' (vindo do input datetime-local)
 * @returns String no formato ISO 8601 ou null se inválido
 */
export const convertToSupabaseFormat = (dateString: string): string | null => {
  if (!dateString) {
    console.error('Data vazia recebida');
    return null;
  }

  try {
    // Adiciona segundos se não existirem
    const normalizedDate = dateString.includes(':') && dateString.split(':').length === 2
      ? `${dateString}:00`
      : dateString;

    const date = new Date(normalizedDate);

    if (isNaN(date.getTime())) {
      console.error('Data inválida:', dateString);
      return null;
    }

    return date.toISOString();
  } catch (error) {
    console.error('Erro ao converter data para Supabase:', error);
    return null;
  }
};

/**
 * Converte uma data ISO do Supabase para formato brasileiro legível
 * @param isoString - Data no formato ISO 8601
 * @returns String formatada no padrão brasileiro ou mensagem de erro
 */
export const convertToBrazilianFormat = (isoString: string): string => {
  if (!isoString) return "Data não informada";

  try {
    // Normaliza a string para garantir o formato ISO
    const normalizedDate = isoString.endsWith('Z') 
      ? isoString 
      : isoString.includes('+') 
        ? isoString 
        : `${isoString.split('.')[0]}Z`;

    const date = new Date(normalizedDate);

    if (isNaN(date.getTime())) {
      console.error('Data ISO inválida:', isoString);
      return "Data inválida";
    }

    // Formata a data completa (dia/mês/ano hora:minuto)
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (error) {
    console.error('Erro ao formatar data brasileira:', error);
    return "Erro ao formatar data";
  }
};

/**
 * Formata a data para exibição resumida (apenas data)
 * @param isoString - Data no formato ISO
 * @returns String no formato 'dd/MM/yyyy'
 */
export const formatDateOnly = (isoString: string): string => {
  if (!isoString) return "--/--/----";

  try {
    const date = new Date(isoString);
    return isNaN(date.getTime()) 
      ? "--/--/----" 
      : date.toLocaleDateString('pt-BR');
  } catch (error) {
    console.error('Erro ao formatar apenas data:', error);
    return "--/--/----";
  }
};

/**
 * Formata apenas o horário (HH:MM)
 * @param isoString - Data no formato ISO
 * @returns String no formato 'HH:MM'
 */
export const formatTimeOnly = (isoString: string): string => {
  if (!isoString) return "--:--";

  try {
    const date = new Date(isoString);
    return isNaN(date.getTime())
      ? "--:--"
      : date.toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        });
  } catch (error) {
    console.error('Erro ao formatar apenas hora:', error);
    return "--:--";
  }
};

/**
 * Converte uma data brasileira (string) para objeto Date
 * @param dateString - String no formato 'dd/MM/yyyy' ou 'dd/MM/yyyy HH:mm'
 * @returns Objeto Date ou null se inválido
 */
export const brazilianStringToDate = (dateString: string): Date | null => {
  if (!dateString) return null;

  try {
    const [datePart, timePart] = dateString.split(' ');
    const [day, month, year] = datePart.split('/').map(Number);

    if (!timePart) {
      return new Date(year, month - 1, day);
    }

    const [hours, minutes] = timePart.split(':').map(Number);
    return new Date(year, month - 1, day, hours, minutes);
  } catch (error) {
    console.error('Erro ao converter string brasileira para Date:', error);
    return null;
  }
};

/**
 * Valida se uma data é futura
 * @param isoString - Data no formato ISO
 * @returns true se a data é futura
 */
export const isFutureDate = (isoString: string): boolean => {
  if (!isoString) return false;

  try {
    const date = new Date(isoString);
    return !isNaN(date.getTime()) && date > new Date();
  } catch (error) {
    console.error('Erro ao validar data futura:', error);
    return false;
  }
};

/**
 * Calcula a diferença em minutos entre duas datas ISO
 * @param startISO - Data de início
 * @param endISO - Data de término
 * @returns Diferença em minutos ou null se inválido
 */
export const getMinutesDifference = (startISO: string, endISO: string): number | null => {
  if (!startISO || !endISO) return null;

  try {
    const start = new Date(startISO);
    const end = new Date(endISO);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return null;
    }

    return (end.getTime() - start.getTime()) / (1000 * 60);
  } catch (error) {
    console.error('Erro ao calcular diferença de minutos:', error);
    return null;
  }
};

/**
 * Adiciona minutos a uma data ISO
 * @param isoString - Data base
 * @param minutes - Minutos a adicionar
 * @returns Nova data ISO ou null se inválido
 */
export const addMinutesToDate = (isoString: string, minutes: number): string | null => {
  if (!isoString || isNaN(minutes)) return null;

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return null;

    date.setMinutes(date.getMinutes() + minutes);
    return date.toISOString();
  } catch (error) {
    console.error('Erro ao adicionar minutos à data:', error);
    return null;
  }
};

/**
 * Formata a data para exibição completa por extenso
 * Exemplo: "Segunda-feira, 15 de Janeiro de 2024 às 14:30"
 * @param isoString - Data ISO
 * @returns String formatada ou mensagem de erro
 */
export const formatFullExtendedDate = (isoString: string): string => {
  if (!isoString) return "Data não informada";

  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "Data inválida";

    return date.toLocaleString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (error) {
    console.error('Erro ao formatar data por extenso:', error);
    return "Erro ao formatar data";
  }
};

/**
 * Combina a data do início (ISO ou datetime-local) com a hora de término (HH:mm).
 * O término é no mesmo dia do início.
 * @param startIsoOrLocal - Data/hora de início (ISO 8601 ou 'yyyy-MM-ddTHH:mm')
 * @param endTimeHHmm - Hora de término no formato 'HH:mm'
 * @returns Data/hora de término em ISO 8601 ou null se inválido
 */
export const combineDateWithTime = (startIsoOrLocal: string, endTimeHHmm: string): string | null => {
  if (!startIsoOrLocal || !endTimeHHmm || !/^\d{1,2}:\d{2}$/.test(endTimeHHmm.trim())) return null;
  try {
    const start = new Date(startIsoOrLocal);
    if (isNaN(start.getTime())) return null;
    const [h, m] = endTimeHHmm.trim().split(':').map(Number);
    if (h > 23 || h < 0 || m > 59 || m < 0) return null;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m, 0, 0);
    return end.toISOString();
  } catch (error) {
    console.error('Erro ao combinar data com hora:', error);
    return null;
  }
};

/**
 * Single source of truth for appointment end time ISO.
 * - startIsoOrLocal: required (datetime-local or ISO).
 * - endTimeHHMM: optional time on the same date as start (e.g. "15:46").
 * - If endTimeHHMM is empty: default 60 minutes from start.
 * - If endTimeHHMM is provided: use start date + endTimeHHMM; must be > start (returns null otherwise).
 * @returns ISO string (UTC) for DB/Google Calendar, or null if invalid / end <= start
 */
export function buildEndTimeIso(
  startIsoOrLocal: string,
  endTimeHHMM?: string | null
): string | null {
  if (!startIsoOrLocal?.trim()) return null;
  try {
    const start = new Date(startIsoOrLocal.trim());
    if (isNaN(start.getTime())) return null;
    const trimmed = endTimeHHMM?.trim();
    if (!trimmed) {
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      return end.toISOString();
    }
    if (!/^\d{1,2}:\d{2}$/.test(trimmed)) return null;
    const [h, m] = trimmed.split(':').map(Number);
    if (h > 23 || h < 0 || m > 59 || m < 0) return null;
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h, m, 0, 0);
    if (end.getTime() <= start.getTime()) return null;
    return end.toISOString();
  } catch {
    return null;
  }
}

/**
 * Calcula end_time ISO a partir de start_time e duração em minutos (para dropdown de duração).
 */
export function buildEndTimeFromDurationMinutes(startIso: string, durationMinutes: number): string | null {
  return addMinutesToDate(startIso, durationMinutes);
}