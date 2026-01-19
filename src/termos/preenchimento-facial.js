/**
 * Termo de Consentimento - Preenchimento Facial
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PREENCHIMENTO FACIAL';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PREENCHIMENTO FACIAL

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de preenchimento facial, incluindo sua finalidade estética, forma de execução, benefícios esperados, riscos, possíveis complicações e limitações.

1. Natureza do procedimento
O preenchimento facial consiste na aplicação de substâncias preenchedoras, como o ácido hialurônico ou outros materiais autorizados pelos órgãos competentes, com a finalidade de restaurar volumes, melhorar contornos faciais, suavizar rugas, sulcos e assimetrias, promovendo harmonização estética.

2. Benefícios esperados
Estou ciente de que o procedimento pode proporcionar:

•	Melhora do contorno e do volume facial;
•	Suavização de rugas e sulcos;
•	Melhora da simetria e da aparência geral da face.

Reconheço que os resultados variam conforme a resposta individual do organismo, não sendo possível garantir resultado exato, definitivo ou permanente.

3. Riscos e possíveis complicações
Estou ciente de que podem ocorrer, entre outros:

•	Dor, inchaço, vermelhidão e hematomas;
•	Assimetria temporária;
•	Infecção local;
•	Formação de nódulos ou irregularidades;
•	Reações inflamatórias;
•	Oclusão vascular (evento raro, porém grave);
•	Necrose tecidual;
•	Alterações de coloração da pele;
•	Necessidade de intervenção médica em casos excepcionais.

Declaro que compreendo que, mesmo com técnica adequada, produtos regularizados e profissional habilitado, intercorrências podem ocorrer.

4. Resultados e responsabilidade
Estou ciente de que:

•	O preenchimento facial não possui resultado permanente;
•	Pode haver necessidade de sessões complementares ou retoques;
•	O resultado final depende da resposta biológica individual.

5. Sigilo e confidencialidade
Autorizo que todas as informações referentes ao meu tratamento sejam mantidas sob sigilo, conforme previsto na legislação vigente e nos códigos de ética profissional.

6. Consentimento
Declaro que compreendi integralmente este termo, tive oportunidade de esclarecer todas as minhas dúvidas e autorizo, de forma livre e consciente, a realização do procedimento.

Data: {{signed_at}}`;
export const preenchimentoFacialTermo = createTermoDefinition('preenchimento-facial', 'Preenchimento Facial', TITLE, CONTENT);
