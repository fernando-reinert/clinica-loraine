/*
  # Seed: Templates de Termos de Consentimento
  
  Insere templates básicos de termos de consentimento.
  Execute este SQL após criar as tabelas.
*/

-- Inserir templates (apenas se não existirem)
INSERT INTO consent_templates (procedure_name, title, content, version, is_active)
SELECT 
  'Botox',
  'Termo de Consentimento - Aplicação de Toxina Botulínica',
  'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de aplicação de toxina botulínica (Botox).

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
Registro: {{professional_license}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:
- O procedimento consiste na aplicação de toxina botulínica tipo A
- Os efeitos são temporários, geralmente durando de 3 a 6 meses
- Podem ocorrer efeitos colaterais como dor local, hematomas, ptose palpebral
- O resultado pode variar de acordo com cada paciente

AUTORIZAÇÃO DE USO DE IMAGEM:
Autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica: {{image_authorization}}

Local e Data: {{signed_at_location_date}}

Assinatura do Paciente: _________________________
Assinatura do Profissional: _________________________
',
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM consent_templates WHERE procedure_name = 'Botox' AND version = 1);

INSERT INTO consent_templates (procedure_name, title, content, version, is_active)
SELECT 
  'Preenchimento Labial',
  'Termo de Consentimento - Preenchimento Labial com Ácido Hialurônico',
  'TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de preenchimento labial com ácido hialurônico.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
Registro: {{professional_license}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:
- O procedimento utiliza ácido hialurônico de alta qualidade
- Os resultados são visíveis imediatamente após o procedimento
- Podem ocorrer inchaço, hematomas e sensibilidade nos primeiros dias
- O material é biodegradável e pode ser dissolvido se necessário

AUTORIZAÇÃO DE USO DE IMAGEM:
Autorizo o uso de minhas imagens para fins de documentação clínica e divulgação científica: {{image_authorization}}

Local e Data: {{signed_at_location_date}}

Assinatura do Paciente: _________________________
Assinatura do Profissional: _________________________
',
  1,
  true
WHERE NOT EXISTS (SELECT 1 FROM consent_templates WHERE procedure_name = 'Preenchimento Labial' AND version = 1);

-- Popular procedures básicos (se não existirem)
INSERT INTO procedures (name, description, category, consent_template_id, is_active)
SELECT 
  'Botox',
  'Aplicação de toxina botulínica',
  'Toxina Botulínica',
  (SELECT id FROM consent_templates WHERE procedure_name = 'Botox' LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM procedures WHERE name = 'Botox');

INSERT INTO procedures (name, description, category, consent_template_id, is_active)
SELECT 
  'Preenchimento Labial',
  'Preenchimento com ácido hialurônico',
  'Ácido Hialurônico',
  (SELECT id FROM consent_templates WHERE procedure_name = 'Preenchimento Labial' LIMIT 1),
  true
WHERE NOT EXISTS (SELECT 1 FROM procedures WHERE name = 'Preenchimento Labial');
