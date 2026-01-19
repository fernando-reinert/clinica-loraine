/**
 * Termo de Consentimento - Preenchimento Íntimo
 */

import { createTermoDefinition } from './base';

const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PREENCHIMENTO ÍNTIMO';

const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PREENCHIMENTO ÍNTIMO

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de preenchimento íntimo, sua finalidade estética e/ou funcional, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo, de resultado variável, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento

O preenchimento íntimo consiste na aplicação de substâncias preenchedoras autorizadas pelos órgãos competentes na região íntima externa, com o objetivo de melhorar o contorno, o volume, a hidratação, a simetria e a qualidade da pele local, podendo também contribuir para melhora da autoestima e do conforto íntimo, conforme avaliação profissional individualizada.

2. Benefícios esperados

Estou ciente de que o procedimento pode proporcionar:

Melhora do contorno e do volume da região íntima externa;

Melhora da hidratação e da qualidade da pele local;

Harmonização estética da região;

Melhora da simetria;

Melhora do conforto íntimo;

Melhora da autoestima relacionada à aparência íntima.

Reconheço que os resultados variam conforme características anatômicas individuais, resposta biológica do organismo, técnica empregada e quantidade de produto utilizada, não sendo possível garantir resultado exato, permanente ou definitivo.

3. Riscos e possíveis complicações

Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado, podem ocorrer intercorrências, incluindo, mas não se limitando a:

Dor, sensibilidade ou desconforto local;

Edema (inchaço) e vermelhidão;

Hematomas;

Endurecimento temporário no local da aplicação;

Assimetria temporária ou permanente;

Infecção local (rara);

Reações alérgicas;

Migração ou irregularidade do produto;

Necrose tecidual (evento raro);

Resultados estéticos inferiores às expectativas.

Declaro ciência de que tais intercorrências podem ocorrer mesmo com a correta execução técnica do procedimento e não caracterizam, por si só, erro ou negligência profissional.

4. Resultados e responsabilidade

Estou ciente de que:

O resultado depende da resposta individual do meu organismo;

Pode haver necessidade de sessões complementares ou retoques;

Não existe garantia de resultado estético específico, exato ou definitivo;

O profissional se compromete à correta execução técnica, não se obrigando a resultado determinado.

5. Sigilo e confidencialidade

Todas as informações referentes ao meu atendimento serão mantidas em sigilo profissional, conforme a legislação vigente e os códigos de ética profissional.

6. Consentimento

Declaro que:

Recebi explicações claras e completas;

Tive oportunidade de esclarecer minhas dúvidas;

Estou ciente dos riscos, limitações e benefícios;

Autorizo de forma livre, consciente e voluntária a realização do procedimento de preenchimento íntimo.

Data: {{signed_at}}`;

export const preenchimentoIntimoTermo = createTermoDefinition(
  'preenchimento-intimo',
  'Preenchimento Íntimo',
  TITLE,
  CONTENT
);
