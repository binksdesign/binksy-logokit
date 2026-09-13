import { language } from "./i18n.js";
// Starter copy is explicitly fictional. Supplied brief and page copy always take priority.
const examples = {
  introduction: [
    [
      "Une idée claire.\nUne présence singulière.",
      "Nous croyons que les idées les plus fortes sont celles que l’on comprend simplement. Notre marque réunit une approche attentive, un goût du détail et l’envie de créer des expériences utiles.\n\nCette identité traduit notre manière d’avancer : avec clarté, caractère et cohérence. Elle nous aide à prendre la parole d’une même voix, quel que soit le support.",
    ],
    [
      "A clear idea.\nA distinct presence.",
      "We believe the strongest ideas are the ones that feel simple. Our brand brings together a thoughtful approach, attention to detail and a desire to create useful experiences.\n\nThis identity reflects how we move forward: with clarity, character and consistency. It helps us speak with one voice, across every touchpoint.",
    ],
  ],
  history: [
    [
      "Tout commence\npar une conviction.",
      "La marque est née d’une envie simple : proposer une autre façon de faire, plus attentive aux personnes et plus exigeante dans les détails.\n\nAu fil des rencontres, cette intuition est devenue une démarche collective. Aujourd’hui, nous conservons l’énergie des premiers jours tout en donnant à notre projet un cadre plus clair et une expression plus affirmée.",
    ],
    [
      "It starts\nwith a conviction.",
      "Our brand began with a simple ambition: to offer a more thoughtful way of doing things, with greater care for people and detail.\n\nThrough each encounter, that intuition became a shared approach. Today, we keep the energy of those early days while giving our project a clearer structure and a more confident expression.",
    ],
  ],
  mission: [
    [
      "Rendre l’essentiel\nplus évident.",
      "Notre mission est de transformer les besoins du quotidien en solutions simples, utiles et durables. Nous prenons le temps de comprendre les attentes pour construire des réponses qui ont du sens.\n\nÀ chaque étape, nous privilégions une relation directe, une exécution soignée et une expérience qui inspire confiance.",
    ],
    [
      "Make the essential\nfeel effortless.",
      "Our mission is to turn everyday needs into simple, useful and lasting solutions. We take time to understand expectations and build responses that make sense.\n\nAt every step, we value a direct relationship, careful execution and an experience that earns trust.",
    ],
  ],
  goals: [
    [
      "Avancer avec\nune direction claire.",
      "01 — Faire connaître notre différence.\nExprimer une proposition claire, immédiatement compréhensible et reconnaissable.\n\n02 — Renforcer la confiance.\nCréer une expérience cohérente, du premier contact à la relation dans le temps.\n\n03 — Grandir sans perdre notre caractère.\nDévelopper la marque en conservant la qualité et la proximité qui la définissent.",
    ],
    [
      "Move forward\nwith a clear direction.",
      "01 — Make our difference known.\nExpress a clear proposition that is immediately understood and recognized.\n\n02 — Build confidence.\nCreate a consistent experience, from first contact to a lasting relationship.\n\n03 — Grow without losing our character.\nDevelop the brand while preserving the quality and closeness that define it.",
    ],
  ],
  values: [
    [
      "Ce qui guide\nnos choix.",
      "La clarté.\nDire les choses simplement et rendre chaque décision compréhensible.\n\nL’attention.\nÉcouter les personnes, observer les usages et soigner les détails.\n\nL’engagement.\nTenir nos promesses et donner à chaque projet l’énergie qu’il mérite.",
    ],
    [
      "What guides\nour choices.",
      "Clarity.\nSpeak simply and make every decision understandable.\n\nCare.\nListen to people, observe how things are used and attend to details.\n\nCommitment.\nKeep our promises and give every project the energy it deserves.",
    ],
  ],
  positioning: [
    [
      "Une place à part,\nsans en faire trop.",
      "Nous nous adressons à celles et ceux qui recherchent une offre soignée, accessible et porteuse de sens. Notre différence tient à l’équilibre entre exigence et simplicité.\n\nLa marque affirme un caractère contemporain, sans suivre les effets de mode. Elle se reconnaît à la justesse de son ton et à la cohérence de ses choix.",
    ],
    [
      "A distinct place,\nwithout excess.",
      "We speak to people looking for a considered, accessible and meaningful offer. Our difference lies in the balance between high standards and simplicity.\n\nThe brand expresses a contemporary character without chasing trends. It is recognized through its considered tone and consistent choices.",
    ],
  ],
  personality: [
    [
      "Affirmée. Attentive.\nToujours accessible.",
      "Notre personnalité associe assurance et proximité. Nous prenons position avec clarté, tout en restant ouverts au dialogue.\n\nNotre ton est direct, chaleureux et précis. Nous évitons les grandes promesses et préférons les mots concrets, les exemples utiles et une manière de parler naturelle.",
    ],
    [
      "Confident. Thoughtful.\nAlways approachable.",
      "Our personality combines confidence with warmth. We express a clear point of view while remaining open to conversation.\n\nOur tone is direct, warm and precise. We avoid grand promises and prefer concrete words, useful examples and a natural way of speaking.",
    ],
  ],
  audience: [
    [
      "Des personnes\navant des profils.",
      "Notre public recherche des repères simples et une expérience sur laquelle il peut compter. Il apprécie les marques qui expliquent leurs choix et accordent de l’importance à la qualité.\n\nNous souhaitons construire avec lui une relation de confiance : attentive à ses attentes, respectueuse de son temps et ouverte à ses retours.",
    ],
    [
      "People\nbefore profiles.",
      "Our audience looks for clear reference points and an experience they can rely on. They appreciate brands that explain their choices and care about quality.\n\nWe aim to build a trusting relationship: attentive to their expectations, respectful of their time and open to their feedback.",
    ],
  ],
  tagline: [
    [
      "L’essentiel,\navec du caractère.",
      "Cette signature fictive exprime une ambition : aller à l’essentiel sans renoncer à une personnalité forte.\n\nCourte et facile à mémoriser, elle accompagne la marque dans ses prises de parole principales. Elle peut être remplacée par votre propre signature, puis ajustée selon les usages.",
    ],
    [
      "The essential,\nwith character.",
      "This fictional tagline expresses an ambition: focus on the essential without giving up a strong personality.\n\nShort and easy to remember, it accompanies the brand in its main communications. Replace it with your own tagline and adapt it to your uses.",
    ],
  ],
};
export function editorialContent(g, page) {
  const sample = examples[page.type]?.[language() === "en" ? 1 : 0];
  if (!sample) return null;
  const source = {
    introduction: "description",
    mission: "goal",
    goals: "goal",
    values: "values",
    audience: "audience",
    tagline: "tagline",
    personality: "tone",
  }[page.type];
  const supplied = page.styles?.body?.text || page.body || g.brief[source];
  return {
    headline: sample[0],
    body: supplied || sample[1],
    example: !supplied,
  };
}
export const editorialTypes = Object.keys(examples);
