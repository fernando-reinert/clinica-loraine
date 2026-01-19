/**
 * Termo de Consentimento - Otomodelação
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – OTOMODELAÇÃO';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – OTOMODELAÇÃO

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de otomodelação, sua finalidade estética, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo e de resultado variável, não havendo garantia de resultado específico ou definitivo.

1. Natureza do procedimento
A otomodelação consiste na aplicação de substâncias preenchedoras autorizadas pelos órgãos competentes na região das orelhas, com a finalidade de promover harmonização estética, correção de pequenas assimetrias, melhora do contorno, projeção ou posicionamento estético das orelhas, conforme avaliação profissional individualizada.

2. Benefícios esperados

Estou ciente de que o procedimento pode proporcionar:
•	Melhora do contorno e da projeção das orelhas;
•	Harmonização estética facial;
•	Correção de pequenas assimetrias;
•	Melhora da autoestima relacionada à aparência estética.

Reconheço que os resultados variam conforme a anatomia individual, resposta biológica do organismo e técnica empregada, não sendo possível garantir resultado exato, permanente ou absolutamente simétrico.

3. Riscos e possíveis complicações
Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado e com produtos regularizados, podem ocorrer intercorrências, tais como:

•	Dor, ardência ou desconforto no local da aplicação;
•	Inchaço, vermelhidão e hematomas;
•	Sensibilidade aumentada na região;
•	Assimetria temporária;
•	Formação de nódulos ou irregularidades;
•	Reações inflamatórias;
•	Infecção local (rara);
•	Oclusão vascular (evento raro, porém grave);
•	Necrose tecidual (rara);
•	Resultados estéticos insatisfatórios ou diferentes das expectativas.

Declaro ciência de que tais eventos podem ocorrer mesmo com a correta execução técnica do procedimento e não caracterizam, por si só, falha profissional.

4. Resultados e responsabilidade
Estou ciente de que:

•	O resultado não é permanente;
•	Pode haver necessidade de retoques ou novas sessões;
•	Não há garantia de simetria absoluta ou de resultado estético específico;
•	O profissional se compromete à correta execução técnica, não se obrigando a resultado determinado.

5. Sigilo e confidencialidade
Autorizo que todas as informações referentes ao meu atendimento sejam mantidas sob sigilo profissional, conforme previsto na legislação vigente, no Código Civil, no Código de Defesa do Consumidor e nos códigos de ética profissional aplicáveis.

6. Consentimento
Declaro que compreendi todas as informações constantes neste termo, tive oportunidade de esclarecer minhas dúvidas, não fui coagido(a) ou induzido(a) à realização do procedimento e autorizo, de forma livre, consciente e voluntária, a realização do procedimento de otomodelação.

Data: {{signed_at}}`;
export const otomodelacaoTermo = createTermoDefinition('otomodelacao', 'Otomodelação', TITLE, CONTENT);
