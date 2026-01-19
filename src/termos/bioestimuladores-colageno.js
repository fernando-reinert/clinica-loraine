/**
 * Termo de Consentimento - Bioestimuladores de Colágeno
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – BIOESTIMULADORES DE COLÁGENO';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – BIOESTIMULADORES DE COLÁGENO

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, completas e compreensíveis sobre o procedimento de bioestimulação de colágeno, sua finalidade estética e/ou terapêutica, forma de realização, limitações, benefícios esperados, riscos e possíveis intercorrências, estando ciente de que se trata de procedimento estético eletivo, de resultado progressivo, variável e individual, não havendo garantia de resultado específico, exato ou definitivo.

1. Natureza do procedimento
Os bioestimuladores de colágeno consistem na aplicação de substâncias injetáveis autorizadas pelos órgãos competentes, com a finalidade de estimular a produção natural de colágeno pelo organismo. Podem ser utilizados na face e/ou em áreas corporais, visando melhorar a firmeza, a qualidade da pele, a flacidez e o aspecto geral da região tratada, conforme avaliação profissional individualizada.

2. Benefícios esperados
Estou ciente de que o procedimento pode proporcionar:
•	Estímulo à produção natural de colágeno;
•	Melhora da firmeza e sustentação da pele;
•	Melhora da flacidez facial e/ou corporal;
•	Melhora da textura e qualidade da pele;
•	Rejuvenescimento progressivo e natural;
•	Melhora do contorno facial e corporal;
•	Aspecto mais uniforme e saudável da pele.

Reconheço que os resultados:
•	São progressivos, aparecendo ao longo de semanas ou meses;
•	Dependem da resposta biológica individual;
•	Podem exigir mais de uma sessão;
•	Não são imediatos nem permanentes;
•	Não podem ser garantidos de forma exata ou definitiva.

3. Riscos e possíveis complicações
Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado e com produtos devidamente registrados, podem ocorrer intercorrências, incluindo, mas não se limitando a:
•	Dor, sensibilidade ou desconforto no local das aplicações;
•	Edema (inchaço) e vermelhidão;
•	Hematomas;
•	Endurecimento ou nódulos temporários;
•	Assimetria temporária;
•	Irregularidades na superfície da pele;
•	Reações inflamatórias locais;
•	Reações alérgicas;
•	Infecção local (rara);
•	Necrose tecidual (evento raro);
•	Resultados estéticos inferiores às expectativas.

Declaro ciência de que tais intercorrências podem ocorrer mesmo com a correta execução técnica do procedimento e não caracterizam, por si só, falha, erro ou negligência profissional.

4. Resultados e responsabilidade
Estou ciente de que:
•	Os resultados são progressivos e dependem da resposta individual do meu organismo;
•	Pode haver necessidade de sessões complementares ou manutenção;
•	Não existe garantia de resultado estético específico, exato ou definitivo;
•	O profissional se compromete à correta execução técnica do procedimento, não se obrigando a resultado determinado.

5. Sigilo e confidencialidade
Todas as informações referentes ao meu atendimento serão mantidas sob sigilo profissional, conforme a legislação vigente, o Código Civil, o Código de Defesa do Consumidor e os códigos de ética profissional aplicáveis.

6. Consentimento
Declaro que:
•	Recebi informações claras, completas e suficientes;
•	Tive oportunidade de esclarecer todas as minhas dúvidas;
•	Estou ciente dos riscos, benefícios e limitações;
•	Autorizo de forma livre, consciente e voluntária a realização do procedimento com bioestimuladores de colágeno.

Data: {{signed_at}}`;
export const bioestimuladoresColagenoTermo = createTermoDefinition('bioestimuladores-de-colageno', 'Bioestimuladores de Colágeno', TITLE, CONTENT);
