// src/services/financial/reportService.ts
// Geração de PDF do relatório financeiro mensal (client-side)

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatPct = (value: number): string => `${Number(value).toFixed(1)}%`;

function getMethodLabel(key: string): string {
  const map: Record<string, string> = {
    pix: 'PIX',
    cash: 'Dinheiro',
    credit_card: 'Crédito',
    debit_card: 'Débito',
    infinit_tag: 'Infinit Tag',
    bank_transfer: 'Transferência',
  };
  return map[key] || key;
}

export interface MonthlyReportParams {
  monthYear: string;
  monthLabel: string;
  generatedAt: string;
  clinicName?: string;
  /** Receita paga no mês (por revenueByMethodThisMonth) */
  paidInMonth: { gross: number; fee: number; net: number };
  /** Pendente total */
  pending: { gross: number; fee: number; net: number };
  /** Em atraso (from futureReceivablesCurve first bucket) */
  overdue: { gross: number; fee: number; net: number };
  totalFeesThisMonth: { fees: number; gross: number; pct: number };
  totalProfit: number;
  averageMargin: number;
  averageTicketThisMonth: { avgGross: number; avgNet: number; count: number };
  revenueByMethod: Record<
    string,
    { paid: { gross: number; fee: number; net: number }; expected: { gross: number; fee: number; net: number } }
  >;
  futureCurve: Array<{ label: string; monthYear: string; gross: number; fees: number; net: number }>;
  goal: { target_gross: number; target_net: number; target_profit: number } | null;
  achievedForGoal: { paidGross: number; paidNet: number; totalProfit: number };
  topProcedures: Array<{ name: string; profit: number }>;
  paidInstallmentsInMonth: Array<{
    paid_date: string;
    client_name: string;
    method: string;
    installment_number: number;
    gross: number;
    fee: number;
    net: number;
  }>;
}

export async function generateMonthlyFinancialReportPDF(params: MonthlyReportParams): Promise<Blob> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.getPageWidth();
  let y = 18;

  const title = `Relatório Financeiro - ${params.monthLabel}`;
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, pageW / 2, y, { align: 'center' });
  y += 10;

  if (params.clinicName) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(params.clinicName, pageW / 2, y, { align: 'center' });
    y += 6;
  }
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em ${params.generatedAt}`, pageW / 2, y, { align: 'center' });
  doc.setTextColor(0, 0, 0);
  y += 12;

  const hasData =
    params.paidInMonth.gross > 0 ||
    params.pending.gross > 0 ||
    params.overdue.gross > 0 ||
    params.topProcedures.length > 0;

  if (!hasData) {
    doc.setFontSize(11);
    doc.text('Sem dados para o mês selecionado.', 14, y);
    return doc.output('blob');
  }

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo do mês', 14, y);
  y += 8;

  const summaryRows = [
    ['Receita Paga (Bruto)', formatCurrency(params.paidInMonth.gross), 'Taxas', formatCurrency(params.paidInMonth.fee), 'Líquido', formatCurrency(params.paidInMonth.net)],
    ['Receita Prevista (Pendente)', formatCurrency(params.pending.gross), 'Taxas est.', formatCurrency(params.pending.fee), 'Líquido esp.', formatCurrency(params.pending.net)],
    ['Em atraso', formatCurrency(params.overdue.gross), 'Taxas est.', formatCurrency(params.overdue.fee), 'Líquido esp.', formatCurrency(params.overdue.net)],
  ];
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  summaryRows.forEach((row) => {
    doc.text(`${row[0]}: ${row[1]}  |  ${row[2]}: ${row[3]}  |  ${row[4]}: ${row[5]}`, 14, y);
    y += 5;
  });
  y += 4;

  doc.text(`Taxas totais do mês: ${formatCurrency(params.totalFeesThisMonth.fees)} (${formatPct(params.totalFeesThisMonth.pct)} sobre bruto pago)`, 14, y);
  y += 5;
  doc.text(`Lucro do mês (realizado): ${formatCurrency(params.totalProfit)}  |  Margem média: ${formatPct(params.averageMargin)}`, 14, y);
  y += 5;
  doc.text(
    `Ticket médio: Bruto ${formatCurrency(params.averageTicketThisMonth.avgGross)} | Líquido ${formatCurrency(params.averageTicketThisMonth.avgNet)}  |  ${params.averageTicketThisMonth.count} venda(s)`,
    14,
    y
  );
  y += 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Receita por método', 14, y);
  y += 8;

  const methodKeys = ['pix', 'cash', 'credit_card', 'debit_card', 'infinit_tag', 'bank_transfer'];
  const methodTableBody: string[][] = [];
  methodKeys.forEach((key) => {
    const m = params.revenueByMethod[key];
    if (!m) return;
    const label = getMethodLabel(key);
    methodTableBody.push([
      label,
      formatCurrency(m.paid.gross),
      formatCurrency(m.paid.fee),
      formatCurrency(m.paid.net),
      formatCurrency(m.expected.gross),
      formatCurrency(m.expected.fee),
      formatCurrency(m.expected.net),
    ]);
  });

  if (methodTableBody.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Método', 'Pago Bruto', 'Pago Taxas', 'Pago Líquido', 'Previsto Bruto', 'Previsto Taxas', 'Previsto Líquido']],
      body: methodTableBody,
      theme: 'grid',
      headStyles: { fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    y += 5;
  }

  if (y > 240) {
    doc.addPage();
    y = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Recebimento Futuro (Próximos 6 Meses)', 14, y);
  y += 8;

  const curveBody = params.futureCurve.map((b) => [b.label, formatCurrency(b.gross), formatCurrency(b.fees), formatCurrency(b.net)]);
  if (curveBody.length > 0) {
    autoTable(doc, {
      startY: y,
      head: [['Período', 'Bruto', 'Taxas Est.', 'Líquido Est.']],
      body: curveBody,
      theme: 'grid',
      headStyles: { fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  y += 4;

  if (y > 240) {
    doc.addPage();
    y = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Metas mensais', 14, y);
  y += 8;

  if (params.goal && (params.goal.target_gross > 0 || params.goal.target_net > 0 || params.goal.target_profit > 0)) {
    const g = params.goal;
    const ag = params.achievedForGoal;
    const pctGross = g.target_gross > 0 ? (ag.paidGross / g.target_gross) * 100 : 0;
    const pctNet = g.target_net > 0 ? (ag.paidNet / g.target_net) * 100 : 0;
    const pctProfit = g.target_profit > 0 ? (ag.totalProfit / g.target_profit) * 100 : 0;
    const goalRows = [
      ['Bruto', formatCurrency(ag.paidGross), formatCurrency(g.target_gross), formatPct(pctGross)],
      ['Líquido', formatCurrency(ag.paidNet), formatCurrency(g.target_net), formatPct(pctNet)],
      ['Lucro', formatCurrency(ag.totalProfit), formatCurrency(g.target_profit), formatPct(pctProfit)],
    ];
    autoTable(doc, {
      startY: y,
      head: [['Meta', 'Realizado', 'Meta', '%']],
      body: goalRows,
      theme: 'grid',
      headStyles: { fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Meta não definida para o mês.', 14, y);
    y += 10;
  }

  if (y > 240) {
    doc.addPage();
    y = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Top procedimentos (lucro do mês)', 14, y);
  y += 8;

  if (params.topProcedures.length > 0) {
    const topBody = params.topProcedures.map((p) => [p.name, formatCurrency(p.profit)]);
    autoTable(doc, {
      startY: y,
      head: [['Procedimento', 'Lucro']],
      body: topBody,
      theme: 'grid',
      headStyles: { fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  } else {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nenhum procedimento no mês.', 14, y);
    y += 10;
  }

  if (params.paidInstallmentsInMonth.length > 0 && y < 250) {
    if (y > 220) {
      doc.addPage();
      y = 18;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Parcelas pagas no mês (amostra)', 14, y);
    y += 8;

    const maxRows = Math.min(params.paidInstallmentsInMonth.length, 200);
    const installBody = params.paidInstallmentsInMonth.slice(0, maxRows).map((i) => [
      i.paid_date,
      i.client_name.substring(0, 22),
      getMethodLabel(i.method),
      String(i.installment_number),
      formatCurrency(i.gross),
      formatCurrency(i.fee),
      formatCurrency(i.net),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Data Pgto', 'Paciente', 'Método', 'Parc.', 'Bruto', 'Taxa', 'Líquido']],
      body: installBody,
      theme: 'grid',
      headStyles: { fontSize: 7 },
      bodyStyles: { fontSize: 7 },
      margin: { left: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    if (params.paidInstallmentsInMonth.length > 200) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`(Exibidas até 200 de ${params.paidInstallmentsInMonth.length} parcelas)`, 14, y);
    }
  }

  return doc.output('blob');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
