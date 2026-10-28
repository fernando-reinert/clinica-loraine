// Landing page pública (clinica-aurea.com). O sistema roda em app.clinica-aurea.com,
// então telas voltadas ao paciente devem sair para a landing, nunca para o login do app.
const LANDING_URL =
  (import.meta.env.VITE_LANDING_URL as string | undefined)?.replace(/\/$/, '') ||
  'https://clinica-aurea.com';

export function goToLanding(): void {
  if (import.meta.env.DEV) {
    window.location.assign('/');
    return;
  }
  window.location.assign(LANDING_URL);
}
