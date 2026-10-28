export interface Service {
  title: string;
  slug: string;
  description: string;
  icon: string;
  featured?: boolean;
}

const ICON_FACE = "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM8 14s1.5 2 4 2 4-2 4-2";
const ICON_HEART = "M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z";
const ICON_SPARK = "M12 12m-5 0a5 5 0 1 0 10 0 5 5 0 1 0-10 0M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2";
const ICON_LAYERS = "M12 3v18M5.5 8l13 0M5.5 16l13 0";
const ICON_DROP = "M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z";
const ICON_BODY = "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z";

export const SERVICES: Service[] = [
  {
    title: "Harmonização Facial",
    slug: "harmonizacao-facial",
    description: "Planejamento que combina procedimentos para valorizar os traços, melhorar proporções e cuidar da aparência do rosto, respeitando sua identidade.",
    icon: ICON_FACE,
    featured: true,
  },
  {
    title: "Preenchimento Labial",
    slug: "preenchimento-labial",
    description: "Realça o contorno, a definição e o volume dos lábios, com planejamento personalizado para equilibrar suas proporções.",
    icon: ICON_HEART,
    featured: true,
  },
  {
    title: "Rinomodelação",
    slug: "rinomodelacao",
    description: "Preenchimento para suavizar determinadas irregularidades e melhorar o contorno do nariz. Não reduz seu tamanho nem corrige problemas respiratórios.",
    icon: ICON_FACE,
  },
  {
    title: "Toxina Botulínica",
    slug: "toxina-botulinica",
    description: "Suaviza rugas de expressão, como as da testa, entre as sobrancelhas e ao redor dos olhos, por meio do relaxamento temporário de músculos específicos.",
    icon: ICON_LAYERS,
    featured: true,
  },
  {
    title: "Toxina Botulínica Full Face",
    slug: "toxina-botulinica-full-face",
    description: "Avaliação ampliada da face para tratar diferentes pontos de contração muscular, conforme a necessidade. Busca suavizar marcas de expressão e equilibrar a ação dos músculos.",
    icon: ICON_LAYERS,
  },
  {
    title: "Bioestimuladores de Colágeno",
    slug: "bioestimuladores-de-colageno",
    description: "Tratamentos que estimulam a produção de colágeno, contribuindo para melhorar a firmeza e a qualidade da pele de forma gradual.",
    icon: ICON_LAYERS,
    featured: true,
  },
  {
    title: "Laser de CO₂ Híbrido",
    slug: "laser-co2-hibrido",
    description: "Tratamento voltado à renovação da pele e ao estímulo de colágeno, que pode melhorar textura, rugas finas, cicatrizes de acne e determinados graus de flacidez.",
    icon: ICON_SPARK,
    featured: true,
  },
  {
    title: "Microagulhamento",
    slug: "microagulhamento",
    description: "Estimula a renovação da pele e a produção de colágeno por meio de microperfurações controladas. Pode melhorar textura, cicatrizes de acne e estrias.",
    icon: ICON_SPARK,
  },
  {
    title: "Otomodelação",
    slug: "otomodelacao",
    description: "Correção de “orelhas de abano”. Procedimento voltado à correção de determinados casos de orelhas proeminentes, buscando aproximá-las da cabeça e melhorar sua posição, após avaliação individual.",
    icon: ICON_FACE,
  },
  {
    title: "Harmonização Corporal",
    slug: "harmonizacao-corporal",
    description: "Combinação personalizada de tratamentos para melhorar o contorno corporal e a qualidade da pele, considerando proporções, flacidez e necessidades de cada região.",
    icon: ICON_BODY,
    featured: true,
  },
  {
    title: "Harmonização Glútea",
    slug: "harmonizacao-glutea",
    description: "Planejamento para valorizar o formato e as proporções dos glúteos, com tratamentos direcionados ao contorno, ao volume ou à firmeza da pele.",
    icon: ICON_BODY,
  },
  {
    title: "Preenchimento Glúteo",
    slug: "preenchimento-gluteo",
    description: "Tratamento para acrescentar volume e melhorar o contorno dos glúteos, com ácido hialurônico ou plasma gel, utilizando produto indicado para essa região e planejamento individualizado.",
    icon: ICON_BODY,
  },
  {
    title: "Bioestimuladores Corporais",
    slug: "bioestimuladores-corporais",
    description: "Estimulam a produção de colágeno e podem melhorar a firmeza da pele em regiões como glúteos, coxas e abdome.",
    icon: ICON_LAYERS,
  },
  {
    title: "Tratamento para Estrias",
    slug: "tratamento-para-estrias",
    description: "Protocolos que buscam suavizar a aparência das estrias e melhorar a textura da pele. A escolha depende do tipo, da coloração e do tempo de evolução das marcas.",
    icon: ICON_BODY,
  },
  {
    title: "Tratamento para Celulite",
    slug: "tratamento-para-celulite",
    description: "Cuidado direcionado à melhora das irregularidades e do aspecto da pele, com planejamento conforme o grau de celulite e as características da região.",
    icon: ICON_BODY,
  },
  {
    title: "Tratamento para Flacidez",
    slug: "tratamento-para-flacidez",
    description: "Procedimentos voltados à melhora da firmeza da pele por meio do estímulo de colágeno. O planejamento considera a região e a intensidade da flacidez.",
    icon: ICON_BODY,
  },
  {
    title: "PEIM (Secagem de Vasinhos)",
    slug: "peim",
    description: "Procedimento estético para reduzir a aparência de pequenos vasos superficiais.",
    icon: ICON_DROP,
  },
  {
    title: "Intradermoterapia Capilar",
    slug: "intradermoterapia-capilar",
    description: "Aplicação de substâncias selecionadas no couro cabeludo para tratamento de determinados tipos de queda e afinamento dos fios.",
    icon: ICON_DROP,
  },
  {
    title: "Peelings",
    slug: "peelings",
    description: "Promovem renovação da pele e podem melhorar textura, manchas superficiais e sinais de envelhecimento, conforme o tipo de peeling e a indicação.",
    icon: ICON_SPARK,
  },
  {
    title: "Hidratação Profunda da Pele",
    slug: "hidratacao-profunda-da-pele",
    description: "Tratamentos voltados à melhora da hidratação, da textura e do aspecto da pele, com escolha individualizada do procedimento.",
    icon: ICON_DROP,
  },
  {
    title: "DLI: Drenagem Linfática Injetável",
    slug: "dli-drenagem-linfatica-injetavel",
    description: "Ativos usados para realizar uma drenagem linfática, melhorando a circulação, o inchaço e promovendo relaxamento.",
    icon: ICON_DROP,
  },
  {
    title: "Estética Regenerativa",
    slug: "estetica-regenerativa",
    description: "GHK-CU, PDNR, exossomas e hidroxiapatita nano (bioestimulador de colágeno injetável) que favorecem o processo de reparação da pele, melhorando sua qualidade. Podem ser associados ao microagulhamento e ao laser de CO₂ para melhores resultados.",
    icon: ICON_SPARK,
  },
];

export const WHATSAPP_NUMBER = "5535997454406";

export function whatsappLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

export const WHATSAPP_EVALUATION = whatsappLink(
  "Olá, gostaria de agendar uma avaliação na Clínica Áurea"
);
