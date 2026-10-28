// src/components/DateInputBR.tsx
// Campo de data sempre em dd/mm/aaaa (o <input type="date"> nativo segue o idioma do navegador).
// value/onChange usam ISO "YYYY-MM-DD" ('' quando vazio ou inválido). O ícone abre o seletor nativo.
import React, { useEffect, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';

interface Props {
  value: string;
  onChange: (iso: string) => void;
  max?: string;
  required?: boolean;
  className?: string;
  id?: string;
}

const isoToBr = (iso: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

/** "dd/mm/aaaa" -> ISO, ou '' se incompleto/inexistente (ex.: 31/02/2026). */
const brToIso = (br: string): string => {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(br);
  if (!m) return '';
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
};

const maskBr = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
};

export default function DateInputBR({ value, onChange, max, required, className = '', id }: Props) {
  const [text, setText] = useState(() => isoToBr(value));
  const textRef = useRef<HTMLInputElement>(null);

  // Mudança vinda do pai (ex.: seletor ou valor sincronizado). Valor vazio não apaga o que está sendo digitado.
  useEffect(() => {
    if (value && value !== brToIso(text)) setText(isoToBr(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const iso = brToIso(text);
  const tooLate = !!iso && !!max && iso > max;
  const message = text && !iso ? 'Data inválida. Use dd/mm/aaaa.' : tooLate ? 'A data não pode ser no futuro.' : '';

  useEffect(() => {
    textRef.current?.setCustomValidity(message);
  }, [message]);

  const handleText = (raw: string) => {
    const masked = maskBr(raw);
    setText(masked);
    onChange(brToIso(masked));
  };

  return (
    <div className="relative">
      <input
        ref={textRef}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd/mm/aaaa"
        maxLength={10}
        value={text}
        onChange={(e) => handleText(e.target.value)}
        required={required}
        pattern="\d{2}/\d{2}/\d{4}"
        title="Use o formato dd/mm/aaaa"
        className={`${className} pr-12`}
      />
      <label className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-gray-300">
        <CalendarDays size={18} />
        <input
          type="date"
          tabIndex={-1}
          aria-label="Abrir calendário"
          value={iso}
          max={max}
          onChange={(e) => {
            if (!e.target.value) return;
            setText(isoToBr(e.target.value));
            onChange(e.target.value);
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </label>
    </div>
  );
}
