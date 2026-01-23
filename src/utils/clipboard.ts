// src/utils/clipboard.ts
// Função para copiar texto para clipboard

export const copyToClipboard = async (text: string): Promise<void> => {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      document.execCommand('copy');
    } catch (err) {
      prompt('Copie o link abaixo:', text);
    } finally {
      document.body.removeChild(textArea);
    }
  } catch (error) {
    prompt('Copie o link abaixo:', text);
  }
};
