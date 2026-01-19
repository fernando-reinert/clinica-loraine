/**
 * Termo de Consentimento - Preenchimento Glúteo
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PREENCHIMENTO GLÚTEO';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – PREENCHIMENTO GLÚTEO

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de preenchimento glúteo, sua finalidade estética, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo e de resultado variável, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento
O preenchimento glúteo consiste na aplicação de substâncias preenchedoras autorizadas pelos órgãos competentes, com o objetivo de promover melhora do contorno, projeção, volume, simetria e harmonização estética da região glútea, conforme avaliação profissional individualizada e indicação técnica.

2. Benefícios esperados
Estou ciente de que o procedimento pode proporcionar:
•	Melhora do contorno e da projeção dos glúteos;
•	Aumento de volume de forma controlada;
•	Harmonização estética corporal;
•	Melhora da simetria da região glútea;
•	Melhora da autoestima relacionada à aparência estética.

Reconheço que os resultados variam conforme características anatômicas individuais, resposta biológica do organismo, quantidade de produto utilizado e técnica empregada, não sendo possível garantir resultado exato, permanente ou absolutamente simétrico.

3. Riscos e possíveis complicações
Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado e com produtos regularizados, podem ocorrer intercorrências, incluindo, mas não se limitando a:
•	Dor, ardência ou desconforto no local da aplicação;
•	Inchaço, vermelhidão e hematomas;
•	Assimetria temporária;
•	Formação de nódulos ou irregularidades;
•	Reações inflamatórias;
•	Infecção local (rara);
•	Alterações de sensibilidade na região;
•	Oclusão vascular (evento raro, porém grave);
•	Necrose tecidual (rara);
•	Resultados estéticos insatisfatórios ou diferentes das expectativas.

Declaro ciência de que tais eventos podem ocorrer mesmo com a correta execução técnica e não caracterizam, por si só, falha profissional.

4. Resultados e responsabilidade
Estou ciente de que:
•	O resultado não é permanente;
•	Pode haver necessidade de retoques ou novas sessões;
•	Não há garantia de simetria absoluta ou de resultado estético específico;
•	O profissional se compromete à correta execução técnica, não se obrigando a resultado determinado.

5. Sigilo e confidencialidade
Autorizo que todas as informações referentes ao meu atendimento sejam mantidas sob sigilo profissional, conforme previsto na legislação vigente, no Código Civil, no Código de Defesa do Consumidor e nos códigos de ética profissional aplicáveis.

6. Consentimento
Declaro que compreendi todas as informações constantes neste termo, tive oportunidade de esclarecer minhas dúvidas, não fui coagido(a) ou induzido(a) à realização do procedimento e autorizo, de forma livre, consciente e voluntária, a realização do procedimento de preenchimento glúteo.

Data: {{signed_at}}`;
export const preenchimentoGluteoTermo = createTermoDefinition('preenchimento-gluteo', 'Preenchimento Glúteo', TITLE, CONTENT);
