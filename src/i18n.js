import { en } from "./locales/en.js";
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
  let text = locale === "en" ? en[message] || dynamic(message) : message;
  for (const [key, value] of Object.entries(values))
    text = text.replaceAll("{" + key + "}", String(value));
  return text;
}
function dynamic(text) {
  return String(text)
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
  if (!root || locale !== "en") return;
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
      const value = el.getAttribute(key);
      if (value) el.setAttribute(key, t(value));
    }
}
