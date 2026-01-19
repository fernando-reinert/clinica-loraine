/**
 * Termo de Consentimento - Peeling Químico
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PEELING QUÍMICO';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PEELING QUÍMICO

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de peeling químico, sua finalidade estética e/ou terapêutica, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo, de resultado variável e progressivo, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento

O peeling químico consiste na aplicação controlada de substâncias químicas na pele, devidamente autorizadas pelos órgãos competentes, com o objetivo de promover renovação celular, melhora da textura, uniformização do tom da pele, estímulo à produção de colágeno e tratamento de alterações cutâneas, podendo ser realizado em face e/ou corpo, conforme avaliação profissional.

2. Benefícios esperados

Estou ciente de que o procedimento pode proporcionar:

Melhora da textura e da qualidade da pele;

Uniformização do tom cutâneo;

Atenuação de manchas e hiperpigmentações;

Redução de linhas finas e rugas superficiais;

Melhora da aparência de acne e cicatrizes superficiais;

Estímulo à renovação celular;

Rejuvenescimento e revitalização da pele.

Reconheço que os resultados variam conforme tipo de pele, profundidade do peeling, produto utilizado, número de sessões e resposta biológica do organismo, não sendo possível garantir resultado exato, permanente ou definitivo.

3. Riscos e possíveis complicações

Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado e com produtos adequados, podem ocorrer intercorrências, incluindo, mas não se limitando a:

Ardência, queimação ou desconforto durante e após a aplicação;

Vermelhidão, inchaço e sensibilidade local;

Descamação intensa da pele;

Ressecamento cutâneo;

Formação de crostas;

Hiperpigmentação ou hipopigmentação temporária ou permanente;

Infecção local (rara);

Reações alérgicas;

Agravamento temporário de manchas ou acne;

Resultados inferiores às expectativas estéticas.

Declaro ciência de que tais intercorrências podem ocorrer mesmo com a correta execução técnica do procedimento e não caracterizam, por si só, falha profissional.

4. Resultados e responsabilidade

Estou ciente de que:

Os resultados dependem da resposta individual do meu organismo;

Pode ser necessária a realização de mais de uma sessão;

Não existe garantia de resultado estético específico, exato ou definitivo;

O profissional se compromete à correta execução técnica do procedimento, não se obrigando a resultado determinado.

5. Sigilo e confidencialidade

Todas as informações referentes ao meu atendimento serão mantidas sob sigilo profissional, conforme a legislação vigente e os códigos de ética profissional aplicáveis.

6. Consentimento

Declaro que compreendi todas as informações constantes neste termo, tive oportunidade de esclarecer minhas dúvidas, não fui coagido(a) ou induzido(a) à realização do procedimento e autorizo, de forma livre, consciente e voluntária, a realização do procedimento de peeling químico.

Data: {{signed_at}}`;
export const peelingQuimicoTermo = createTermoDefinition('peeling-quimico', 'Peeling Químico', TITLE, CONTENT);
