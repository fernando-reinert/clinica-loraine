/**
 * Templates completos (texto longo) para termos de consentimento
 *
 * Este arquivo contém os templates completos para cada procedureKey.
 * Estes templates substituem os templates resumidos do banco de dados.
 */
export const FULL_CONSENT_TEMPLATES = {
    'toxina-botulinica': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - TOXINA BOTULÍNICA

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Toxina Botulínica.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

A toxina botulínica é uma neurotoxina produzida pela bactéria Clostridium botulinum. Quando aplicada em pequenas doses, ela bloqueia temporariamente a transmissão nervosa nos músculos, causando relaxamento muscular.

INDICAÇÕES:
- Redução de rugas e linhas de expressão
- Tratamento de hiperidrose (suor excessivo)
- Correção de assimetrias faciais
- Tratamento de bruxismo

RISCOS E EFEITOS COLATERAIS:
- Dor no local da aplicação
- Hematomas e inchaço temporário
- Assimetria facial (se aplicação incorreta)
- Ptose palpebral (queda da pálpebra)
- Visão dupla (raro)
- Reações alérgicas (muito raro)

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Doenças neuromusculares
- Uso de antibióticos aminoglicosídeos
- Alergia aos componentes do produto

RESULTADOS ESPERADOS:
Os resultados aparecem em 3-7 dias e duram em média 4-6 meses. O efeito é temporário e reversível.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'preenchimento-facial': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - PREENCHIMENTO FACIAL

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Preenchimento Facial.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

O preenchimento facial utiliza ácido hialurônico ou outros preenchedores para restaurar volume, suavizar rugas e melhorar contornos faciais.

INDICAÇÕES:
- Preenchimento de sulcos nasolabiais
- Aumento de lábios
- Correção de olheiras
- Melhora de contorno facial
- Preenchimento de cicatrizes

RISCOS E EFEITOS COLATERAIS:
- Dor, inchaço e hematomas no local
- Assimetria
- Nódulos ou granulomas
- Necrose (muito raro)
- Embolia vascular (extremamente raro)
- Reações alérgicas

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Alergia ao ácido hialurônico
- Infecções ativas na área
- Doenças autoimunes descompensadas

RESULTADOS ESPERADOS:
Resultados imediatos, duração de 6-18 meses dependendo do produto e área tratada.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'bioestimuladores-de-colageno': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - BIOESTIMULADORES DE COLÁGENO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Bioestimuladores de Colágeno.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

Os bioestimuladores de colágeno são substâncias injetáveis que estimulam a produção natural de colágeno pelo organismo, promovendo rejuvenescimento e melhora da qualidade da pele.

INDICAÇÕES:
- Rejuvenescimento facial
- Melhora da qualidade da pele
- Preenchimento de sulcos e rugas
- Melhora de textura e firmeza

RISCOS E EFEITOS COLATERAIS:
- Dor, inchaço e hematomas
- Nódulos ou granulomas
- Assimetria
- Reações alérgicas
- Necrose (raro)

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Alergia aos componentes
- Infecções ativas
- Doenças autoimunes descompensadas

RESULTADOS ESPERADOS:
Resultados progressivos, começando em 2-3 meses e melhorando até 6 meses. Duração de 12-24 meses.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'otomodelacao': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - OTOMODELAÇÃO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Otomodelação.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

A otomodelação é uma técnica que utiliza fios de sustentação ou preenchedores para melhorar o contorno e posicionamento das orelhas.

INDICAÇÕES:
- Correção de orelhas de abano
- Melhora de contorno auricular
- Reposicionamento de orelhas

RISCOS E EFEITOS COLATERAIS:
- Dor, inchaço e hematomas
- Assimetria
- Infecção
- Deformidade (raro)

CONTRAINDICAÇÕES:
- Infecções ativas na área
- Alergia aos materiais utilizados

RESULTADOS ESPERADOS:
Resultados visíveis imediatamente, com duração variável conforme técnica utilizada.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'preenchimento-gluteo': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - PREENCHIMENTO GLÚTEO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Preenchimento Glúteo.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

O preenchimento glúteo utiliza ácido hialurônico ou outros preenchedores para aumentar volume e melhorar contorno da região glútea.

INDICAÇÕES:
- Aumento de volume glúteo
- Melhora de contorno
- Correção de assimetrias

RISCOS E EFEITOS COLATERAIS:
- Dor, inchaço e hematomas
- Nódulos ou granulomas
- Assimetria
- Necrose (raro)
- Embolia pulmonar (extremamente raro)

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Alergia aos componentes
- Infecções ativas

RESULTADOS ESPERADOS:
Resultados imediatos, duração de 12-24 meses dependendo do produto.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'bioestimulador-gluteo': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - BIOESTIMULADOR GLÚTEO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Bioestimulador Glúteo.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

Os bioestimuladores glúteos estimulam a produção de colágeno na região, promovendo aumento de volume e melhora da firmeza.

INDICAÇÕES:
- Aumento de volume glúteo
- Melhora de firmeza
- Melhora de contorno

RISCOS E EFEITOS COLATERAIS:
- Dor, inchaço e hematomas
- Nódulos ou granulomas
- Assimetria
- Reações alérgicas

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Alergia aos componentes
- Infecções ativas

RESULTADOS ESPERADOS:
Resultados progressivos, começando em 2-3 meses. Duração de 18-24 meses.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'microagulhamento': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - MICROAGULHAMENTO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Microagulhamento.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

O microagulhamento utiliza agulhas finas para criar microperfurações na pele, estimulando a produção de colágeno e melhorando a absorção de ativos.

INDICAÇÕES:
- Rejuvenescimento facial
- Melhora de cicatrizes de acne
- Redução de estrias
- Melhora de textura da pele
- Tratamento de manchas

RISCOS E EFEITOS COLATERAIS:
- Vermelhidão e inchaço
- Descamação leve
- Infecção (se não houver cuidado adequado)
- Hiperpigmentação (em peles mais escuras)

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Infecções ativas
- Uso de isotretinoína nos últimos 6 meses
- Doenças autoimunes descompensadas

RESULTADOS ESPERADOS:
Resultados progressivos, começando após 2-3 semanas. Múltiplas sessões necessárias para resultados ideais.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'peeling-quimico': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - PEELING QUÍMICO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Peeling Químico.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

O peeling químico utiliza ácidos para promover descamação controlada da pele, estimulando renovação celular e melhorando textura e cor.

INDICAÇÕES:
- Tratamento de acne
- Melhora de manchas
- Rejuvenescimento
- Melhora de textura da pele

RISCOS E EFEITOS COLATERAIS:
- Vermelhidão e descamação
- Sensibilidade temporária
- Hiperpigmentação (em peles mais escuras)
- Cicatrizes (raro, se mal executado)

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Uso de isotretinoína nos últimos 6 meses
- Infecções ativas
- Alergia aos ácidos utilizados

RESULTADOS ESPERADOS:
Resultados visíveis após descamação completa. Múltiplas sessões podem ser necessárias.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'preenchimento-intimo': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - PREENCHIMENTO ÍNTIMO

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Preenchimento Íntimo.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

O preenchimento íntimo utiliza ácido hialurônico para aumentar volume e melhorar sensibilidade da região íntima.

INDICAÇÕES:
- Aumento de volume
- Melhora de sensibilidade
- Correção de assimetrias

RISCOS E EFEITOS COLATERAIS:
- Dor, inchaço e hematomas
- Nódulos
- Infecção
- Necrose (raro)

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Infecções ativas
- Alergia aos componentes

RESULTADOS ESPERADOS:
Resultados imediatos, duração de 12-18 meses.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'endermoterapia-vacuoterapia': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - ENDERMOTERAPIA / VACUOTERAPIA

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Endermoterapia / Vacuoterapia.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

A endermoterapia e vacuoterapia são técnicas que utilizam sucção e massagem para melhorar circulação, reduzir celulite e modelar o corpo.

INDICAÇÕES:
- Redução de celulite
- Modelagem corporal
- Melhora de circulação
- Redução de medidas

RISCOS E EFEITOS COLATERAIS:
- Vermelhidão temporária
- Hematomas leves
- Sensibilidade na área tratada

CONTRAINDICAÇÕES:
- Gravidez
- Trombose
- Infecções ativas
- Doenças de pele na área

RESULTADOS ESPERADOS:
Resultados progressivos com múltiplas sessões. Melhora visível após 4-6 sessões.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
    'intradermoterapia': `TERMO DE CONSENTIMENTO LIVRE E ESCLARECIDO - INTRADERMOTERAPIA

Eu, {{patient_name}}, CPF {{patient_cpf}}, nascido(a) em {{patient_birth_date}}, declaro ter sido informado(a) sobre o procedimento de Intradermoterapia.

PROFISSIONAL RESPONSÁVEL:
Nome: {{professional_name}}
{{professional_license_formatted}}

INFORMAÇÕES SOBRE O PROCEDIMENTO:

A intradermoterapia consiste na aplicação de substâncias ativas através de microinjeções na derme, para tratamento de celulite, gordura localizada e flacidez.

INDICAÇÕES:
- Tratamento de celulite
- Redução de gordura localizada
- Melhora de flacidez
- Modelagem corporal

RISCOS E EFEITOS COLATERAIS:
- Dor, inchaço e hematomas
- Vermelhidão temporária
- Nódulos (raro)
- Infecção (se não houver cuidado adequado)

CONTRAINDICAÇÕES:
- Gravidez e amamentação
- Alergia aos componentes
- Infecções ativas
- Doenças autoimunes descompensadas

RESULTADOS ESPERADOS:
Resultados progressivos com múltiplas sessões. Melhora visível após 4-8 sessões.

AUTORIZAÇÃO DE USO DE IMAGEM:
{{image_authorization_checkbox}}

Data: {{signed_at}}`,
};
/**
 * Obter template completo para um procedureKey
 * Retorna o template completo ou null se não existir
 */
export const getFullConsentTemplate = (procedureKey) => {
    return FULL_CONSENT_TEMPLATES[procedureKey] || null;
};
/**
 * Verificar se existe template completo para um procedureKey
 */
export const hasFullConsentTemplate = (procedureKey) => {
    return procedureKey in FULL_CONSENT_TEMPLATES;
};
