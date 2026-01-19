/**
 * Termo de Consentimento - Bioestimulador Glúteo
 */

import { createTermoDefinition } from './base';

const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – BIOESTIMULADOR GLÚTEO';

const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – BIOESTIMULADOR GLÚTEO

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de bioestimulação de colágeno na região glútea, sua finalidade estética, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo, de resultado progressivo e variável, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento

O bioestimulador glúteo consiste na aplicação de substâncias bioestimuladoras autorizadas pelos órgãos competentes na região glútea, com a finalidade de estimular a produção natural de colágeno, promovendo melhora da firmeza, qualidade da pele, sustentação e aspecto geral da região, podendo ou não haver discreto ganho de volume conforme a resposta individual do organismo.

2. Benefícios esperados

Estou ciente de que o procedimento pode proporcionar:

Melhora progressiva da firmeza e sustentação da região glútea;

Melhora da qualidade e textura da pele;

Estímulo à produção natural de colágeno;

Melhora do contorno e do aspecto geral dos glúteos;

Melhora da aparência de flacidez;

Melhora da autoestima relacionada à aparência corporal.

Reconheço que os resultados são graduais, não imediatos, e variam conforme características individuais, como idade, metabolismo, hábitos de vida e resposta biológica do organismo, não sendo possível garantir resultado exato, permanente ou definitivo.

3. Riscos e possíveis complicações

Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado e com produtos regularizados, podem ocorrer intercorrências, incluindo, mas não se limitando a:

Dor, ardência ou desconforto no local da aplicação;

Inchaço, vermelhidão e hematomas;

Sensibilidade aumentada na região;

Formação de nódulos ou endurecimento local temporário;

Reações inflamatórias;

Assimetria temporária;

Infecção local (rara);

Alterações temporárias de sensibilidade;

Oclusão vascular (evento raro, porém grave);

Necrose tecidual (rara);

Resultados estéticos insatisfatórios ou diferentes das expectativas.

Declaro ciência de que tais eventos podem ocorrer mesmo com a correta execução técnica e não caracterizam, por si só, falha profissional.

4. Resultados e responsabilidade

Estou ciente de que:

Os resultados são progressivos e dependem da resposta individual do organismo;

Pode ser necessária a realização de mais de uma sessão;

Não há garantia de aumento volumétrico significativo, pois o objetivo principal é a bioestimulação de colágeno;

Não existe garantia de resultado estético específico ou definitivo;

O profissional se compromete à correta execução técnica do procedimento, não se obrigando a resultado determinado.

5. Sigilo e confidencialidade

Todas as informações referentes ao meu atendimento serão mantidas sob sigilo profissional, conforme previsto na legislação vigente e nos códigos de ética profissional aplicáveis.

6. Consentimento

Declaro que compreendi todas as informações constantes neste termo, tive oportunidade de esclarecer minhas dúvidas, não fui coagido(a) ou induzido(a) à realização do procedimento e autorizo, de forma livre, consciente e voluntária, a realização do procedimento de bioestimulação de colágeno na região glútea.

Data: {{signed_at}}`;

export const bioestimuladorGluteoTermo = createTermoDefinition(
  'bioestimulador-gluteo',
  'Bioestimulador Glúteo',
  TITLE,
  CONTENT
);
