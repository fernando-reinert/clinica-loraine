/**
 * Registry central de termos de consentimento
 * 
 * Mapeia procedureKey (slug) para definição do termo
 */

import type { TermoDefinition, TermoContext, TermoRenderResult } from './types';

// Importar termos individuais
import { toxinaBotulinicaTermo } from './toxina-botulinica';
import { preenchimentoFacialTermo } from './preenchimento-facial';
import { bioestimuladoresColagenoTermo } from './bioestimuladores-colageno';
import { otomodelacaoTermo } from './otomodelacao';
import { preenchimentoGluteoTermo } from './preenchimento-gluteo';
import { bioestimuladorGluteoTermo } from './bioestimulador-gluteo';
import { microagulhamentoTermo } from './microagulhamento';
import { peelingQuimicoTermo } from './peeling-quimico';
import { preenchimentoIntimoTermo } from './preenchimento-intimo';
import { endermoterapiaVacuoterapiaTermo } from './endermoterapia-vacuoterapia';
import { intradermoterapiaTermo } from './intradermoterapia';
import { limpezaDePeleTermo } from './limpeza-de-pele';

/**
 * Registry de todos os termos disponíveis
 */
const TERMOS_REGISTRY: Map<string, TermoDefinition> = new Map([
  // Toxina Botulínica / Botox (mesmo procedimento)
  ['toxina-botulinica', toxinaBotulinicaTermo],
  ['botox', toxinaBotulinicaTermo], // Alias: Botox usa termo de Toxina Botulínica
  
  // Preenchimento Facial / Labial / Ácido Hialurônico (mesmo procedimento)
  ['preenchimento-facial', preenchimentoFacialTermo],
  ['preenchimento-labial', preenchimentoFacialTermo], // Alias: Preenchimento Labial usa termo de Preenchimento Facial
  ['acido-hialuronico', preenchimentoFacialTermo], // Alias: Ácido Hialurônico usa termo de Preenchimento Facial
  
  // Outros procedimentos
  ['bioestimuladores-de-colageno', bioestimuladoresColagenoTermo],
  ['bioestimuladores-colageno', bioestimuladoresColagenoTermo], // Alias
  ['otomodelacao', otomodelacaoTermo],
  ['preenchimento-gluteo', preenchimentoGluteoTermo],
  ['bioestimulador-gluteo', bioestimuladorGluteoTermo],
  ['microagulhamento', microagulhamentoTermo],
  ['peeling-quimico', peelingQuimicoTermo],
  ['preenchimento-intimo', preenchimentoIntimoTermo],
  ['endermoterapia-vacuoterapia', endermoterapiaVacuoterapiaTermo],
  ['intradermoterapia', intradermoterapiaTermo],
  ['limpeza-de-pele', limpezaDePeleTermo],
]);

/**
 * Obter termo por procedureKey
 * 
 * @param procedureKey - Chave do procedimento (slug)
 * @returns Definição do termo ou null se não encontrado
 */
export function getTermo(procedureKey: string): TermoDefinition | null {
  return TERMOS_REGISTRY.get(procedureKey) || null;
}

/**
 * Alias para getTermo - nome mais claro para uso no MedicalRecordScreen
 */
export function getTermByProcedureKey(procedureKey: string): TermoDefinition | null {
  return getTermo(procedureKey);
}

/**
 * Verificar se existe termo para um procedureKey
 */
export function hasTermo(procedureKey: string): boolean {
  return TERMOS_REGISTRY.has(procedureKey);
}

/**
 * Obter todos os termos disponíveis
 */
export function getAllTermos(): TermoDefinition[] {
  return Array.from(TERMOS_REGISTRY.values());
}

/**
 * Obter apenas termos canônicos únicos (sem aliases duplicados)
 * Retorna apenas os termos principais, ignorando aliases
 */
export function getCanonicalTermos(): TermoDefinition[] {
  const seen = new Set<string>();
  const unique: TermoDefinition[] = [];
  
  // Lista de keys canônicas (sem aliases)
  const canonicalKeys = [
    'toxina-botulinica',
    'preenchimento-facial',
    'bioestimuladores-de-colageno',
    'otomodelacao',
    'preenchimento-gluteo',
    'bioestimulador-gluteo',
    'microagulhamento',
    'peeling-quimico',
    'preenchimento-intimo',
    'endermoterapia-vacuoterapia',
    'intradermoterapia',
    'limpeza-de-pele',
  ];
  
  for (const key of canonicalKeys) {
    const termo = TERMOS_REGISTRY.get(key);
    if (termo && !seen.has(termo.key)) {
      seen.add(termo.key);
      unique.push(termo);
    }
  }
  
  return unique;
}

/**
 * Renderizar termo completo
 * 
 * @param procedureKey - Chave do procedimento
 * @param ctx - Contexto com dados do paciente, profissional, etc.
 * @returns Resultado da renderização ou null se termo não encontrado
 */
export function renderTermo(
  procedureKey: string,
  ctx: TermoContext
): TermoRenderResult | null {
  const termo = getTermo(procedureKey);
  if (!termo) {
    return null;
  }
  
  return termo.render(ctx);
}

/**
 * Listar todas as chaves de procedimentos disponíveis
 */
export function listProcedureKeys(): string[] {
  return Array.from(TERMOS_REGISTRY.keys());
}
