// src/data/anamneseQuestions.ts
import { Question, Category } from '../types';

export const categories: Category[] = [
  { id: 'geral', name: 'Geral', icon: '📋' },
  { id: 'saude', name: 'Saúde', icon: '❤️' },
  { id: 'pele', name: 'Pele', icon: '✨' },
  { id: 'historico', name: 'Histórico', icon: '📚' },
  { id: 'habitos', name: 'Hábitos', icon: '🏃‍♀️' },
  { id: 'alergias', name: 'Alergias', icon: '⚠️' },
  { id: 'medicamentos', name: 'Medicamentos', icon: '💊' }
];

export const questions: Question[] = [
  // CATEGORIA GERAL
  {
    id: 1, 
    category: 'geral', 
    type: 'boolean',
    question: 'Já fez algum tipo de tratamento estético anteriormente?',
    field: 'previous_treatments'
  },
  {
    id: 2, 
    category: 'geral', 
    type: 'text',
    question: 'Quais tratamentos estéticos já fez?',
    field: 'previous_treatments_details',
    showIf: 'previous_treatments'
  },
  {
    id: 3, 
    category: 'geral', 
    type: 'boolean',
    question: 'Faz uso de algum medicamento atualmente?',
    field: 'medications'
  },
  {
    id: 4, 
    category: 'geral', 
    type: 'text',
    question: 'Quais medicamentos usa?',
    field: 'medications_details',
    showIf: 'medications'
  },

  // CATEGORIA SAÚDE
  {
    id: 5, 
    category: 'saude', 
    type: 'boolean',
    question: 'Tem alguma doença crônica? (hipertensão, diabetes, etc)',
    field: 'chronic_diseases'
  },
  {
    id: 6, 
    category: 'saude', 
    type: 'text',
    question: 'Quais doenças crônicas?',
    field: 'chronic_diseases_details',
    showIf: 'chronic_diseases'
  },
  {
    id: 7, 
    category: 'saude', 
    type: 'boolean',
    question: 'Tem problemas cardíacos?',
    field: 'heart_problems'
  },
  {
    id: 8, 
    category: 'saude', 
    type: 'boolean',
    question: 'Tem problemas de circulação?',
    field: 'circulation_problems'
  },
  {
    id: 9, 
    category: 'saude', 
    type: 'boolean',
    question: 'Tem problemas de tireoide?',
    field: 'thyroid_problems'
  },
  {
    id: 10, 
    category: 'saude', 
    type: 'boolean',
    question: 'É gestante?',
    field: 'pregnant'
  },
  {
    id: 11, 
    category: 'saude', 
    type: 'boolean',
    question: 'É lactante?',
    field: 'breastfeeding'
  },

  // CATEGORIA PELE
  {
    id: 12, 
    category: 'pele', 
    type: 'select',
    question: 'Qual seu tipo de pele?',
    field: 'skin_type',
    options: ['Oleosa', 'Seca', 'Mista', 'Normal', 'Sensível']
  },
  {
    id: 13, 
    category: 'pele', 
    type: 'boolean',
    question: 'Usa ou já usou ácidos na pele?',
    field: 'acid_use'
  },
  {
    id: 14, 
    category: 'pele', 
    type: 'text',
    question: 'Quais ácidos usa/usou?',
    field: 'acid_use_details',
    showIf: 'acid_use'
  },
  {
    id: 15, 
    category: 'pele', 
    type: 'boolean',
    question: 'Tem acne?',
    field: 'acne'
  },
  {
    id: 16, 
    category: 'pele', 
    type: 'boolean',
    question: 'Tem rosácea?',
    field: 'rosacea'
  },
  {
    id: 17, 
    category: 'pele', 
    type: 'boolean',
    question: 'Tem melasma?',
    field: 'melasma'
  },
  {
    id: 18, 
    category: 'pele', 
    type: 'boolean',
    question: 'Tem muitas manchas na pele?',
    field: 'skin_spots'
  },

  // CATEGORIA HISTÓRICO
  {
    id: 19, 
    category: 'historico', 
    type: 'boolean',
    question: 'Já fez alguma cirurgia?',
    field: 'surgeries'
  },
  {
    id: 20, 
    category: 'historico', 
    type: 'text',
    question: 'Quais cirurgias?',
    field: 'surgeries_details',
    showIf: 'surgeries'
  },
  {
    id: 21, 
    category: 'historico', 
    type: 'boolean',
    question: 'Já teve herpes?',
    field: 'herpes'
  },
  {
    id: 22, 
    category: 'historico', 
    type: 'boolean',
    question: 'Tem predisposição para queloides?',
    field: 'keloid_predisposition'
  },
  {
    id: 23, 
    category: 'historico', 
    type: 'boolean',
    question: 'Já sofreu algum trauma na face?',
    field: 'facial_trauma'
  },

  // CATEGORIA HÁBITOS
  {
    id: 24, 
    category: 'habitos', 
    type: 'boolean',
    question: 'Fuma?',
    field: 'smoker'
  },
  {
    id: 25, 
    category: 'habitos', 
    type: 'select',
    question: 'Frequência do fumo?',
    field: 'smoking_frequency',
    options: ['Não fumo', 'Socialmente', 'Diariamente - pouco', 'Diariamente - muito'],
    showIf: 'smoker'
  },
  {
    id: 26, 
    category: 'habitos', 
    type: 'boolean',
    question: 'Consome bebidas alcoólicas?',
    field: 'alcohol'
  },
  {
    id: 27, 
    category: 'habitos', 
    type: 'select',
    question: 'Frequência de consumo de álcool?',
    field: 'alcohol_frequency',
    options: ['Não consumo', 'Socialmente', '1-2x por semana', '3-4x por semana', 'Diariamente'],
    showIf: 'alcohol'
  },
  {
    id: 28, 
    category: 'habitos', 
    type: 'boolean',
    question: 'Pratica exercícios físicos?',
    field: 'exercises'
  },
  {
    id: 29, 
    category: 'habitos', 
    type: 'select',
    question: 'Frequência de exercícios?',
    field: 'exercise_frequency',
    options: ['Não pratica', '1-2x por semana', '3-4x por semana', '5+ vezes por semana'],
    showIf: 'exercises'
  },
  {
    id: 30, 
    category: 'habitos', 
    type: 'select',
    question: 'Qual sua rotina de sono?',
    field: 'sleep_quality',
    options: ['Boa (7-8h/noite)', 'Regular (5-6h/noite)', 'Ruim (menos de 5h/noite)', 'Muito irregular']
  },

  // CATEGORIA ALERGIAS
  {
    id: 31, 
    category: 'alergias', 
    type: 'boolean',
    question: 'Tem alguma alergia?',
    field: 'allergies'
  },
  {
    id: 32, 
    category: 'alergias', 
    type: 'text',
    question: 'Quais alergias?',
    field: 'allergies_details',
    showIf: 'allergies'
  },
  {
    id: 33, 
    category: 'alergias', 
    type: 'boolean',
    question: 'Alergia a ovo?',
    field: 'egg_allergy'
  },
  {
    id: 34, 
    category: 'alergias', 
    type: 'boolean',
    question: 'Alergia a picada de abelha?',
    field: 'bee_allergy'
  },
  {
    id: 35, 
    category: 'alergias', 
    type: 'boolean',
    question: 'Alergia a látex?',
    field: 'latex_allergy'
  },
  {
    id: 36, 
    category: 'alergias', 
    type: 'boolean',
    question: 'Alergia a anestésicos?',
    field: 'anesthetic_allergy'
  },

  // CATEGORIA MEDICAMENTOS
  {
    id: 37, 
    category: 'medicamentos', 
    type: 'boolean',
    question: 'Faz uso de Roacutan (Isotretinoína)?',
    field: 'roacutan_use'
  },
  {
    id: 38, 
    category: 'medicamentos', 
    type: 'boolean',
    question: 'Faz reposição hormonal?',
    field: 'hormonal_replacement'
  },
  {
    id: 39, 
    category: 'medicamentos', 
    type: 'boolean',
    question: 'Usa anticoagulantes?',
    field: 'anticoagulants'
  },
  {
    id: 40, 
    category: 'medicamentos', 
    type: 'boolean',
    question: 'Usa anti-inflamatórios frequentemente?',
    field: 'anti_inflammatories'
  },
  {
    id: 41, 
    category: 'medicamentos', 
    type: 'boolean',
    question: 'Faz uso de aspirina?',
    field: 'aspirin_use'
  }
];

// Função auxiliar para filtrar perguntas por categoria
export const getQuestionsByCategory = (categoryId: string): Question[] => {
  return questions.filter(q => q.category === categoryId);
};

// Função para calcular progresso
export const calculateProgress = (answers: { [key: string]: any }): number => {
  const completedQuestions = questions.filter(q => {
    const answer = answers[q.field];
    return answer !== undefined && answer !== null && answer !== '';
  }).length;

  return Math.round((completedQuestions / questions.length) * 100);
};