/**
 * Termo de Consentimento - Microagulhamento
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – MICROAGULHAMENTO';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – MICROAGULHAMENTO

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de microagulhamento, sua finalidade estética e/ou terapêutica, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo, de resultado variável e progressivo, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento
O microagulhamento é um procedimento que utiliza microagulhas para promover múltiplas microperfurações controladas na pele, com o objetivo de estimular a renovação celular e a produção natural de colágeno, além de potencializar a permeação de ativos, podendo ser realizado em face, couro cabeludo e áreas corporais, conforme avaliação profissional.

2. Benefícios esperados
Estou ciente de que o procedimento pode proporcionar:
•	Estímulo à produção natural de colágeno;
•	Melhora da textura e da qualidade da pele;
•	Atenuação de linhas finas e rugas;
•	Melhora da aparência de cicatrizes e estrias;
•	Melhora da uniformidade do tom da pele;
•	Auxílio no tratamento da queda capilar e fortalecimento dos fios, quando indicado;
•	Rejuvenescimento e revitalização da pele.

Reconheço que os resultados variam conforme características individuais, tipo de pele, área tratada, número de sessões realizadas e resposta biológica do organismo, não sendo possível garantir resultado exato, permanente ou definitivo.

3. Riscos e possíveis complicações
Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado e com materiais adequados, podem ocorrer intercorrências, incluindo, mas não se limitando a:
•	Dor, ardência ou desconforto durante e após o procedimento;
•	Vermelhidão, inchaço e sensibilidade local;
•	Descamação da pele;
•	Pequenos sangramentos puntiformes;
•	Hematomas;
•	Infecção local (rara);
•	Reações alérgicas aos ativos utilizados;
•	Hiperpigmentação ou manchas temporárias, principalmente em peles mais sensíveis;
•	Resultados inferiores às expectativas.

Declaro ciência de que tais eventos podem ocorrer mesmo com a correta execução técnica do procedimento e não caracterizam, por si só, falha profissional.

4. Resultados e responsabilidade
Estou ciente de que:
•	Os resultados são progressivos e dependem da resposta individual do organismo;
•	Pode ser necessária a realização de mais de uma sessão;
•	Não existe garantia de resultado estético específico ou definitivo;
•	O profissional se compromete à correta execução técnica do procedimento, não se obrigando a resultado determinado.

5. Sigilo e confidencialidade
Autorizo que todas as informações referentes ao meu atendimento sejam mantidas sob sigilo profissional, conforme previsto na legislação vigente, no Código Civil, no Código de Defesa do Consumidor e nos códigos de ética profissional aplicáveis.

6. Consentimento
Declaro que compreendi todas as informações constantes neste termo, tive oportunidade de esclarecer minhas dúvidas, não fui coagido(a) ou induzido(a) à realização do procedimento e autorizo, de forma livre, consciente e voluntária, a realização do procedimento de microagulhamento.

Data: {{signed_at}}`;
export const microagulhamentoTermo = createTermoDefinition('microagulhamento', 'Microagulhamento', TITLE, CONTENT);
