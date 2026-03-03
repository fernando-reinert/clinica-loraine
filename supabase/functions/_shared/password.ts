// Server-side password strength: min 8, upper, lower, number, symbol.
export function validatePasswordStrength(password: string): { ok: boolean; error?: string } {
  if (password.length < 8) {
    return { ok: false, error: "Senha deve ter no mínimo 8 caracteres." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, error: "Senha deve conter ao menos uma letra maiúscula." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, error: "Senha deve conter ao menos uma letra minúscula." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, error: "Senha deve conter ao menos um número." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, error: "Senha deve conter ao menos um símbolo (ex.: !@#$%&*)." };
  }
  return { ok: true };
}
