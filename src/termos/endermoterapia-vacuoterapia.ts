/**
 * Termo de Consentimento - Endermoterapia / Vacuoterapia
 */

import { createTermoDefinition } from './base';

const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – ENDERMOTERAPIA / VACUOTERAPIA';

const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – ENDERMOTERAPIA / VACUOTERAPIA
(TERMO GERAL PARA PROCEDIMENTOS CORPORAIS E FACIAIS COM SUCÇÃO MECÂNICA)

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Procedimento(s) a ser(em) realizado(s): {{procedure_label}}

Área(s) tratadas: {{procedure_label}}

Declaro que recebi informações claras, completas e compreensíveis sobre o(s) procedimento(s) acima descrito(s), enquadrados no método de endermoterapia/vacuoterapia, sua finalidade, forma de realização, indicações, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético e/ou terapêutico eletivo, de resultado progressivo, variável e individual, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento

A endermoterapia, também conhecida como vacuoterapia, consiste na utilização de equipamentos que realizam sucção mecânica controlada, com ou sem roletes, promovendo estímulos nos tecidos cutâneo e subcutâneo, com a finalidade de:
•	Estimular a circulação sanguínea e linfática;
•	Melhorar a oxigenação tecidual;
•	Auxiliar na drenagem de líquidos;
•	Estimular o metabolismo local;
•	Auxiliar no tratamento de gordura localizada, celulite, flacidez, fibroses e irregularidades cutâneas;
•	Melhorar a textura e o aspecto da pele.

O procedimento pode ser aplicado em áreas corporais e, quando indicado, em regiões faciais específicas, sempre após avaliação profissional individualizada e respeitando critérios técnicos e de segurança.

2. Benefícios esperados

Reconheço que os resultados:
•	Variam de pessoa para pessoa;
•	Dependem do número de sessões, regularidade do tratamento e hábitos de vida;
•	Não são imediatos nem permanentes;
•	Não podem ser garantidos de forma exata ou definitiva.

3. Riscos e possíveis complicações

Estou ciente de que, embora seja um procedimento considerado seguro quando realizado por profissional habilitado, podem ocorrer intercorrências, tais como:
•	Vermelhidão local temporária;
•	Sensibilidade ou desconforto;
•	Edema (inchaço);
•	Hematomas;
•	Dor leve ou moderada durante ou após a sessão;
•	Pequenas equimoses;
•	Irritação cutânea;
•	Agravamento temporário de áreas sensíveis;
•	Resultados inferiores às expectativas.

Declaro ciência de que tais intercorrências podem ocorrer mesmo com a correta execução técnica do procedimento, não caracterizando, por si só, erro, negligência ou imperícia profissional.

4. Resultados e responsabilidade profissional

Declaro estar ciente de que:
•	O profissional compromete-se à correta execução técnica do procedimento, respeitando as normas éticas e legais;
•	Não há obrigação de resultado, mas sim de meio;
•	Os resultados dependem da resposta biológica individual do organismo;
•	Pode haver necessidade de múltiplas sessões para obtenção de melhora clínica e estética.

5. Sigilo e confidencialidade

Todas as informações referentes ao meu atendimento serão mantidas sob sigilo profissional, conforme a legislação vigente, o Código Civil, o Código de Defesa do Consumidor e os códigos de ética profissional aplicáveis.

6. Consentimento livre e esclarecido

Declaro que:
•	Recebi explicações claras e suficientes sobre o procedimento;
•	Tive oportunidade de esclarecer todas as minhas dúvidas;
•	Estou ciente dos riscos, benefícios, limitações e possíveis intercorrências;
•	Não fui coagido(a) ou induzido(a) à realização do tratamento;
•	Autorizo, de forma livre, consciente e voluntária, a realização do(s) procedimento(s) descrito(s) neste termo.

Data: {{signed_at}}`;

export const endermoterapiaVacuoterapiaTermo = createTermoDefinition(
  'endermoterapia-vacuoterapia',
  'Endermoterapia / Vacuoterapia',
  TITLE,
  CONTENT
);
