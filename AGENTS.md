# BINKSY LOGOKIT

Lire les instructions centrales du dossier agent-hub avant toute modification. Préserver l’architecture Vite locale, les assets fournis et la compatibilité `.binksy`.

## Règle permanente de documentation produit

Toute modification d’une fonctionnalité qui change la manière d’utiliser BINKSY LOGOKIT doit mettre à jour la page **RÈGLES AGENT IA**, dans **les deux langues**, au cours de la même tâche. Sa source est `src/agent-doc.js`. La documentation et l’application ne doivent jamais diverger. Décrire uniquement les fonctionnalités réellement disponibles et leurs limites.

Les textes d’interface passent par `src/i18n.js` et `src/locales/en.js`. Ne pas traduire les noms ou les SVG de l’utilisateur. Les traductions des paragraphes agent sont regroupées en paires FR/EN dans `agent-doc.js`.

## Invariants critiques

- Les dimensions du brandmark et du logotype sont indépendantes et proportionnelles.
- X suit uniquement la hauteur du logotype. Le clearspace ne change pas les exports de logos.
- SVG/PNG/PDF transparents ; seul JPEG reçoit un fond et sa marge.
- Ne pas remplacer un rendu vectoriel non pris en charge par un bitmap silencieux.
- Conserver les rôles, les stops, les verrous et les références de peinture. Tester les changements de namespace avec `url(#id)`.
- Le catalogue multicolore est indexé en BigInt ; ne jamais matérialiser son produit cartésien.
- Toute suppression de projet exige une confirmation explicite.
- Les anciennes clés de stockage et fichiers V1/V2 restent migrables vers V3.

## Vérification

`npm test`, `npm run build`, puis `/tests/advanced.html`, `/tests/browser.html` et `/tests/ui.html` dans un navigateur de développement. Utiliser une origine de test distincte de celle du travail utilisateur : les tests UI créent des projets synthétiques.

Les commits/pushs et déploiements ne sont pas implicites dans une modification produit.
