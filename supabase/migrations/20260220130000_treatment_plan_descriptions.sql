-- 20260220130000_treatment_plan_descriptions.sql
-- Descrições de procedimentos e snapshots por item de plano

-- A) SCHEMA CHANGES

-- 1) Garantir coluna description em procedure_catalog (default de marketing)
ALTER TABLE public.procedure_catalog
  ADD COLUMN IF NOT EXISTS description text;

-- 2) Garantir coluna de snapshot de descrição em treatment_plan_items
-- (já existe na migration original como procedure_description_snapshot, mas deixamos idempotente)
ALTER TABLE public.treatment_plan_items
  ADD COLUMN IF NOT EXISTS procedure_description_snapshot text;

-- 3) Backfill seguro: normalizar NULL para string vazia quando desejado
UPDATE public.treatment_plan_items
SET procedure_description_snapshot = ''
WHERE procedure_description_snapshot IS NULL;


-- B) DATA SEED – descrições padrão de marketing
-- Apenas preenche quando description está NULL ou vazia.

-- Botox / Toxina Botulínica
UPDATE public.procedure_catalog
SET description = 'Tratamento com toxina botulínica para suavizar linhas de expressão, mantendo a naturalidade da face e prevenindo o envelhecimento precoce.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%botox%' OR
    name ILIKE '%toxina botul%' OR
    name ILIKE '%toxina%' 
  );

-- Bioestimulador de colágeno
UPDATE public.procedure_catalog
SET description = 'Bioestimulador injetável que ativa a produção natural de colágeno, melhorando firmeza, textura e contorno da pele de forma gradual e duradoura.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%bioestimul%' OR
    name ILIKE '%sculptra%' OR
    name ILIKE '%radiesse%'
  );

-- Skinvive / skinbooster hidratante
UPDATE public.procedure_catalog
SET description = 'Protocolo injetável de hidratação profunda que devolve viço, maciez e luminosidade à pele, com aspecto saudável e natural.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%skinvive%' OR
    name ILIKE '%skin vive%' OR
    name ILIKE '%skinbooster%' OR
    name ILIKE '%skin booster%'
  );

-- Microagulhamento
UPDATE public.procedure_catalog
SET description = 'Técnica de microperfurações controladas que estimula colágeno, melhora textura, poros, cicatrizes de acne e qualidade geral da pele.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%microagulh%' OR
    name ILIKE '%micro-agulh%'
  );

-- Peeling químico
UPDATE public.procedure_catalog
SET description = 'Peeling químico personalizado para renovar a camada superficial da pele, suavizar manchas, linhas finas e melhorar o brilho facial.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%peeling%' OR
    name ILIKE '%peel%'
  );

-- Preenchimento facial / labial / glúteo
UPDATE public.procedure_catalog
SET description = 'Preenchimento com ácido hialurônico para harmonizar contornos, devolver volume perdido e realçar pontos de beleza com naturalidade.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%preenchimento%' OR
    name ILIKE '%filler%' OR
    name ILIKE '%lábio%' OR
    name ILIKE '%labial%' OR
    name ILIKE '%malar%' OR
    name ILIKE '%bigode chin%' OR
    name ILIKE '%glúteo%' OR
    name ILIKE '%harmoniza%' 
  );

-- Intradermo gordura / aplicações para gordura localizada
UPDATE public.procedure_catalog
SET description = 'Aplicações intradérmicas em áreas de gordura localizada para auxiliar na redução de medidas, associando a rotina de cuidados e hábitos saudáveis.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%intradermo%' OR
    name ILIKE '%lipo%' OR
    name ILIKE '%gordura localizada%' OR
    name ILIKE '%enzima%' 
  );

-- DLI / Intradermoterapia corporal
UPDATE public.procedure_catalog
SET description = 'Protocolo injetável personalizado (DLI/intradermoterapia) para tratar gordura localizada, celulite ou flacidez conforme avaliação individual.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%DLI%' OR
    name ILIKE '%intrader%' OR
    name ILIKE '%intradermoter%' 
  );

-- Capilar (queda de cabelo, fortalecimento)
UPDATE public.procedure_catalog
SET description = 'Tratamento capilar para fortalecimento dos fios, estímulo de crescimento e melhora da saúde do couro cabeludo.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%capilar%' OR
    name ILIKE '%capilar%' OR
    name ILIKE '%cabelo%' OR
    name ILIKE '%queda%' 
  );

-- Mesclas para celulite / estria / flacidez
UPDATE public.procedure_catalog
SET description = 'Mescla injetável direcionada para celulite, estrias ou flacidez, combinando ativos que potencializam a qualidade da pele na região tratada.'
WHERE (description IS NULL OR btrim(description) = '')
  AND (
    name ILIKE '%celulit%' OR
    name ILIKE '%estria%' OR
    name ILIKE '%flacid%' OR
    name ILIKE '%mescla%' 
  );

-- Fallback suave: se ainda houver procedimentos sem descrição, mantém NULL ou vazio;
-- não forçamos texto genérico para não poluir o catálogo.

