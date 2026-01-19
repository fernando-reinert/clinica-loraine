/**
 * Termo de Consentimento - Toxina Botulínica
 */
import { createTermoDefinition } from './base';
const TITLE = 'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – APLICAÇÃO DE TOXINA BOTULÍNICA';
const CONTENT = `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO – APLICAÇÃO DE TOXINA BOTULÍNICA

Paciente: {{patient_name}}
CPF: {{patient_cpf}}
Data de nascimento: {{patient_birth_date}}

Profissional responsável: {{professional_name}}
Registro profissional: {{professional_license_formatted}}

Declaro que recebi informações claras, suficientes e compreensíveis sobre o procedimento de aplicação de toxina botulínica, sua finalidade estética e/ou terapêutica, forma de aplicação, limitações, riscos, possíveis intercorrências e benefícios esperados, estando ciente de que se trata de um procedimento eletivo e de resultado variável.

1. Natureza do procedimento
A toxina botulínica é um medicamento de uso injetável aplicado em pontos específicos para promover relaxamento muscular temporário, sendo indicada para suavização de rugas dinâmicas, linhas de expressão, correção de assimetrias faciais e outras finalidades estéticas e/ou funcionais, conforme avaliação profissional.

2. Benefícios esperados
Estou ciente de que os benefícios podem incluir melhora da aparência estética, suavização das linhas de expressão, harmonização facial e melhora funcional, quando indicado.
Os resultados não são imediatos, não são permanentes e variam de pessoa para pessoa, não havendo qualquer garantia de resultado específico, duradouro ou definitivo.

3. Riscos e possíveis complicações
Estou ciente de que, apesar de o procedimento ser considerado seguro quando realizado por profissional habilitado, podem ocorrer efeitos adversos, incluindo, mas não se limitando a:

•	Dor, ardência ou desconforto no local da aplicação;
•	Vermelhidão, inchaço ou hematomas;
•	Dor de cabeça;
•	Assimetria facial temporária;
•	Ptose palpebral ou de sobrancelhas;
•	Alterações transitórias da expressão facial;
•	Reações alérgicas;
•	Infecção local (rara);
•	Falha ou resposta inadequada ao tratamento.

Declaro ciência de que tais eventos podem ocorrer mesmo com técnica adequada e uso de produtos regularizados.

4. Resultados e responsabilidade
Reconheço que os resultados dependem de fatores individuais, como metabolismo, características anatômicas, hábitos de vida e resposta biológica.
Estou ciente de que podem ser necessárias reaplicações ou sessões de manutenção para obtenção e preservação dos efeitos desejados.

5. Sigilo e confidencialidade
Autorizo que todas as informações relacionadas ao meu tratamento sejam mantidas sob sigilo profissional, conforme previsto em lei e nos códigos de ética.

6. Consentimento
Declaro que tive oportunidade de fazer perguntas, que todas foram esclarecidas de forma satisfatória e que concordo livremente com a realização do procedimento.

Data: {{signed_at}}`;
export const toxinaBotulinicaTermo = createTermoDefinition('toxina-botulinica', 'Toxina Botulínica', TITLE, CONTENT);
