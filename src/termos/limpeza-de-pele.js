/**
 * Termo de Consentimento - Limpeza de Pele
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – LIMPEZA DE PELE';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – LIMPEZA DE PELE

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de limpeza de pele, sua finalidade estética, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo e de resultado variável, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento

A limpeza de pele é um procedimento estético que pode envolver higienização, esfoliação, emoliência, extração de comedões/milium (quando indicado), aplicação de máscaras e finalização com produtos específicos, visando desobstrução de poros, controle de oleosidade e melhora do aspecto da pele, conforme avaliação profissional.

2. Benefícios esperados

Estou ciente de que o procedimento pode proporcionar:

Melhora do aspecto geral da pele;

Redução de comedões (cravos) e impurezas;

Sensação de pele mais limpa e uniforme;

Auxílio no controle de oleosidade;

Melhora de textura e viço, conforme indicação.

Os resultados variam conforme tipo de pele, frequência e cuidados domiciliares, não havendo garantia de resultado definitivo.

3. Riscos e possíveis complicações

Estou ciente de que podem ocorrer:

Vermelhidão e sensibilidade temporária;

Ardência ou desconforto durante ou após o procedimento;

Pequenas lesões superficiais;

Edema leve;

Hematomas pontuais (principalmente em extrações);

Irritação cutânea/reação a produtos;

Agravamento temporário de acne em peles muito reativas;

Infecção (rara, geralmente associada a manipulação/contaminação).

4. Resultados e responsabilidade

Estou ciente de que:

Pode ser necessária periodicidade e manutenção;

O profissional se compromete à correta execução técnica;

Não há obrigação de resultado, mas sim de meio.

5. Sigilo e confidencialidade

As informações do atendimento serão mantidas sob sigilo profissional.

6. Consentimento

Declaro que compreendi o procedimento, tive oportunidade de esclarecer dúvidas e autorizo sua realização.

Data: {{signed_at}}`;
export const limpezaDePeleTermo = createTermoDefinition('limpeza-de-pele', 'Limpeza de Pele', TITLE, CONTENT);
