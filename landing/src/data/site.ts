export const SITE = {
  name: "Clínica Áurea",
  url: "https://clinica-aurea.com",
  tagline: "Saúde e Estética Avançada",
  phone: "(35) 99745-4406",
  phoneIntl: "+5535997454406",
  instagram: "clinicaaurea_carvalhos",
  address: {
    street: "Rua Dr Ulisses Fabiano Alves, 99, Loja 02",
    district: "Centro",
    city: "Carvalhos",
    state: "MG",
    country: "BR",
  },
  cnpj: "64.351.959/0001-54",
  coren: "COREN-MG 344.168",
  areas: [
    "Carvalhos",
    "Serranos",
    "Seritinga",
    "Liberdade",
    "Cruzília",
    "Minduri",
    "Aiuruoca",
    "São Lourenço",
    "Caxambu",
  ],
  ogImage: "/og-image.png",
};

export function truncate(text: string, max = 155): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
}
