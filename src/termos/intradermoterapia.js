/**
 * Termo de Consentimento - Intradermoterapia
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – INTRADERMOTERAPIA';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – INTRADERMOTERAPIA

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Eu, {{patient_name}}, CPF {{patient_cpf}}, declaro que recebi informações claras, completas e suficientes sobre o procedimento de Intradermoterapia, suas indicações, benefícios, riscos, possíveis complicações e cuidados necessários, estando ciente e de acordo em realizá-lo conforme orientação do profissional responsável.

Procedimento(s) a ser(em) realizado(s): {{procedure_label}}

Declaro que compreendo que a intradermoterapia consiste na aplicação intradérmica de substâncias específicas, de acordo com a finalidade terapêutica ou estética, podendo incluir ativos lipolíticos, vasodilatadores, regeneradores, bioestimuladores, hidratantes, vitaminas e outros, conforme avaliação individual.

Estou ciente de que os resultados variam de pessoa para pessoa, dependendo de fatores como organismo, estilo de vida, alimentação, prática de atividade física, resposta metabólica e cumprimento das orientações pós-procedimento, não havendo garantia de resultados absolutos ou definitivos.

Benefícios esperados:
Os benefícios podem incluir melhora da aparência da pele, estímulo à circulação local, redução de gordura localizada, melhora da celulite e estrias, fortalecimento capilar, hidratação profunda da pele, melhora da textura cutânea e revitalização, conforme o tratamento escolhido.

Riscos e possíveis complicações:
Fui devidamente informado(a) de que, como qualquer procedimento que envolva injeções, podem ocorrer:
•	Dor ou desconforto no local da aplicação
•	Vermelhidão, inchaço e sensibilidade
•	Hematomas (roxos)
•	Coceira ou ardência local
•	Infecção local
•	Reações alérgicas às substâncias utilizadas
•	Manchas ou hiperpigmentação
•	Nódulos ou endurecimento temporário
•	Resultados insatisfatórios ou diferentes do esperado
•	Necessidade de sessões adicionais
•	Em casos raros: necrose tecidual ou outras intercorrências mais graves

Compreendo que todas as intercorrências serão avaliadas e tratadas pelo profissional responsável, caso ocorram.

Estou ciente de que o não cumprimento dessas orientações pode comprometer os resultados e aumentar o risco de complicações.

Sigilo e privacidade:
Concordo que todas as informações relacionadas ao meu tratamento serão mantidas em sigilo, respeitando as normas éticas e legais vigentes.

Esclarecimentos:
Declaro que tive a oportunidade de fazer perguntas, todas foram devidamente esclarecidas, e que compreendi plenamente a natureza do procedimento, seus riscos, benefícios e limitações.

Assim, por estar plenamente informado(a) e de acordo, autorizo livremente a realização do(s) procedimento(s) acima descrito(s).

Data: {{signed_at}}`;
export const intradermoterapiaTermo = createTermoDefinition('intradermoterapia', 'Intradermoterapia', TITLE, CONTENT);
