// src/utils/treatmentPlanExport.ts – export share card to PNG de forma robusta
import { toPng } from 'html-to-image';

const CARD_ID = 'treatment-plan-share-card';
const EXPORT_WIDTH = 1080;
const EXPORT_HEIGHT = 1350;
const PIXEL_RATIO = 2;

function dataUrlToBlob(dataUrl: string): Blob {
  if (!dataUrl || typeof dataUrl !== 'string') {
    throw new Error('Exportação da imagem falhou: data URL inválida.');
  }

  const [header, base64] = dataUrl.split(',');
  if (!header || !base64 || !header.startsWith('data:image/png;base64')) {
    throw new Error('Exportação da imagem falhou: formato inesperado de data URL.');
  }

  try {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'image/png' });
  } catch (err) {
    console.error('Erro ao converter data URL para Blob:', err);
    throw new Error('Exportação da imagem falhou ao converter o conteúdo para Blob.');
  }
}

export async function exportShareCardToPng(): Promise<Blob> {
  const el = document.getElementById(CARD_ID);
  if (!el) {
    throw new Error('Elemento do card não encontrado. Monte o TreatmentPlanShareCard antes de exportar.');
  }

  // Clona o elemento para evitar mutações de layout durante o export
  const clone = el.cloneNode(true) as HTMLElement;

  // Garante dimensões fixas do card de compartilhamento
  clone.style.width = `${EXPORT_WIDTH}px`;
  clone.style.height = `${EXPORT_HEIGHT}px`;
  clone.style.display = 'block';
  clone.style.visibility = 'visible';
  clone.style.position = 'fixed';
  clone.style.top = '-99999px';
  clone.style.left = '-99999px';
  clone.style.margin = '0';
  clone.style.padding = '0';
  clone.style.boxSizing = 'border-box';
  clone.style.backgroundColor = '#ffffff';

  document.body.appendChild(clone);

  try {
    const dataUrl = await toPng(clone, {
      pixelRatio: PIXEL_RATIO,
      cacheBust: true,
      backgroundColor: '#ffffff',
      width: EXPORT_WIDTH,
      height: EXPORT_HEIGHT,
      // Evita tentar inlinar webfonts a partir de styles remotos (ex.: Google Fonts)
      // o que causaria SecurityError ao acessar cssRules em CSSStyleSheet cross-origin.
      fontEmbedCSS: '',
      style: {
        width: `${EXPORT_WIDTH}px`,
        height: `${EXPORT_HEIGHT}px`,
      },
    });

    const blob = dataUrlToBlob(dataUrl);
    return blob;
  } catch (err) {
    console.error('Erro ao exportar card de tratamento para PNG:', err);
    throw new Error('Não foi possível gerar a imagem do plano de tratamento.');
  } finally {
    document.body.removeChild(clone);
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  if (!(blob instanceof Blob)) {
    console.error('downloadBlob recebeu um valor que não é Blob:', blob);
    throw new Error('Falha ao fazer download: tipo de arquivo inválido.');
  }

  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('Erro ao iniciar download do Blob:', err);
    throw new Error('Não foi possível iniciar o download da imagem.');
  }
}
