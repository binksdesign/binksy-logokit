import { en } from "./locales/en.js";
const vocabulary = {
  background: "Fond principal",
  secondary: "Fond secondaire",
  text: "Texte",
  muted: "Texte secondaire",
  accent: "Accent",
  margin: "Marges",
  spacing: "Espacement",
  grid: "Grille",
  title: "Titre principal",
  subtitle: "Titre secondaire",
  heading: "Sous-titre",
  body: "Corps de texte",
  small: "Petit texte",
  caption: "Légende",
  size: "Taille",
  weight: "Graisse",
  leading: "Interlignage",
  tracking: "Espacement des lettres",
  description: "Description",
  activity: "Activité",
  audience: "Cible",
  values: "Valeurs",
  goal: "Objectif",
  tone: "Ton",
  tagline: "Baseline",
  keywords: "Mots-clés",
  minimal: "Minimal",
  typographic: "Typographique",
  image: "Image",
  dominant: "Logo dominant",
  full: "Pleine page",
  two: "Deux images",
  three: "Trois images",
  mixed: "Grande et petite",
  mosaic: "Mosaïque",
  Variantes: "Versions du logo",
  "Variantes du logo": "Versions du logo",
  Construction: "Version",
  "Couleurs simples": "Une seule couleur",
  "Variantes multicolores": "Plusieurs couleurs",
  "Rôles colorimétriques": "Couleurs du logo",
  "Fonds recommandés": "Logo sur fond",
  "Sélection finale": "Fichiers à exporter",
  Clearspace: "Zone de sécurité",
  CLEARSPACE: "ZONE DE SÉCURITÉ",
  Référence: "Mesure utilisée",
  "Centrage géométrique": "Centrage exact",
  "Centrage optique": "Centrage visuel",
  "Zone de protection": "Zone de sécurité",
  "Nom de la variante": "Nom de la version",
  "Toutes les constructions": "Toutes les versions",
  "Ajuster la protection": "Définir la zone de sécurité",
  "Réglages avancés": "Plus de réglages",
  "Full System": "Système complet",
  "Inclure les planches clearspace": "Inclure les planches de zone de sécurité",
  "VARIANTES IMPORTÉES": "VERSIONS IMPORTÉES",
  "Un SVG par construction. Nommez chaque variante.":
    "Un SVG = une version du logo.",
  "Importez vos constructions. Générez les couleurs, clearspaces et fichiers de livraison.":
    "Importez vos versions assemblées. Préparez leurs couleurs et leurs fichiers.",
  "Largeur du brandmark": "Largeur de l’icône",
  "Hauteur du brandmark": "Hauteur de l’icône",
  "Largeur du brandmark · px": "Largeur de l’icône · px",
  Continuer: "Étape suivante",
};
let locale = "fr";
try {
  if (typeof window !== "undefined")
    locale = localStorage.getItem("binksy-locale") === "en" ? "en" : "fr";
} catch {}
export const language = () => locale;
export function setLanguage(value) {
  locale = value === "en" ? "en" : "fr";
  try {
    localStorage.setItem("binksy-locale", locale);
  } catch {}
  document.documentElement.lang = locale;
}
export function t(message, values = {}) {
  let text =
    locale === "en"
      ? en[vocabulary[message] || message] || en[message] || dynamic(message)
      : vocabulary[message] || message;
  for (const [key, value] of Object.entries(values))
    text = text.replaceAll("{" + key + "}", String(value));
  return text;
}
function dynamic(text) {
  return String(text)
    .replace(/^Police illisible : (.*)$/, "Unreadable font: $1")
    .replace(/^Élément hors page : (\d+)\.$/, "Element outside page $1.")
    .replace(
      /^Texte trop long sur la page (\d+)\. Agrandissez son bloc ou raccourcissez le texte\.$/,
      "Text is too long on page $1. Enlarge its box or shorten the text.",
    )
    .replace(
      /^Import refusé : (.*)$/,
      (_, message) => "Import rejected: " + t(message),
    )
    .replace(
      /^Clearspace de « (.*) » : mesure de référence manquante\.$/,
      (_, name) => `Clearspace for “${name}”: missing reference measurement.`,
    )
    .replace(/^(\d+) variante\(s\) importée\(s\)\.$/, "$1 variant(s) imported.")
    .replace(
      /^(Icône|Logotype) importé · formes vectorielles conservées\.$/,
      (_, name) =>
        (name === "Icône" ? "Icon" : "Wordmark") +
        " imported · vector shapes preserved.",
    )
    .replace(/^Activer /, "Enable ")
    .replace(/^Retirer /, "Remove ")
    .replace(/^Déplacer /, "Move ")
    .replace(/^Couleur /, "Colour ")
    .replace(/ unités SVG/g, " SVG units")
    .replace(/ unités$/, " units")
    .replace(/ · Logo /g, " · Logo ")
    .replace(/^Valeur conservée du projet : /, "Saved project value: ")
    .replace(/ précis$/, " — precise");
}
// Adapter for the existing HTML templates. New UI uses t() directly. Never translate SVG content or input values.
export function translateDOM(root = document.querySelector("#app")) {
  document.documentElement.lang = locale;
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.parentElement.closest("svg,script,style,code,[data-no-i18n]"))
      continue;
    const value = node.textContent.trim();
    const translated = t(value);
    if (translated !== value)
      node.textContent = node.textContent.replace(value, translated);
  }
  for (const el of root.querySelectorAll("[aria-label],[title],[placeholder]"))
    for (const key of ["aria-label", "title", "placeholder"]) {
      if (el.closest("[data-no-i18n]")) continue;
      const value = el.getAttribute(key);
      if (value) el.setAttribute(key, t(value));
    }
}
