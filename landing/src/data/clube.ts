export interface ClubePlan {
  name: string;
  procedures: string;
  price: string;
  options: string[];
  months: string;
}

export const CLUBE_PLANS: ClubePlan[] = [
  {
    name: "Essencial",
    procedures: "2 procedimentos no ano",
    price: "12× de R$ 160",
    options: [
      "2 aplicações de toxina botulínica",
      "2 ml de preenchimento",
      "1 aplicação de toxina + 1 ml de preenchimento",
    ],
    months: "Meses de aplicação: junho e dezembro.",
  },
  {
    name: "Constância",
    procedures: "3 procedimentos no ano",
    price: "12× de R$ 225",
    options: [
      "3 aplicações de toxina botulínica",
      "3 ml de preenchimento",
      "2 aplicações de toxina + 1 ml de preenchimento",
    ],
    months: "Meses de aplicação: abril, agosto e dezembro.",
  },
  {
    name: "Áurea",
    procedures: "4 procedimentos no ano",
    price: "12× de R$ 295",
    options: [
      "2 aplicações de toxina + 2 ml de preenchimento",
      "3 aplicações de toxina + 1 ml de preenchimento",
      "4 ml de preenchimento",
    ],
    months:
      "Meses de aplicação: abril, agosto e dezembro, com os quatro procedimentos distribuídos entre esses meses.",
  },
];

export const CLUBE_INTRO =
  "Um plano anual com mensalidades fixas e valores especiais para cuidar de você. Os pagamentos são feitos de janeiro a dezembro, e os procedimentos são realizados exclusivamente nos meses de aplicação de cada plano.";

export const CLUBE_DISCLAIMER =
  "Todos os procedimentos dependem de avaliação e indicação profissional, com agendamento nos meses do plano. Consulte as áreas e quantidades incluídas e as condições de adesão.";
