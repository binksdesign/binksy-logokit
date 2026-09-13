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
- Les anciennes clés de stockage et fichiers V1/V2/V3 restent migrables vers V4.

## Vérification

`npm test`, `npm run build`, puis `/tests/advanced.html`, `/tests/browser.html` et `/tests/ui.html` dans un navigateur de développement. Utiliser une origine de test distincte de celle du travail utilisateur : les tests UI créent des projets synthétiques.

Les commits/pushs et déploiements ne sont pas implicites dans une modification produit.

## Parcours guidé (FR / EN)

Importer → Construire → Variantes → Brand Guideline → Exporter. La configuration manuelle est facultative. Conserver les corrections existantes, proposer des recommandations au premier import et montrer le logo réel pour chaque choix visuel. Les fonctions expertes restent accessibles dans leur étape ; ne pas réintroduire tous les panneaux simultanément.

`workspace.js` compose les étapes ; `main.js` conserve état/historique/événements ; `workshop.js` conserve galerie, catalogue et sélections. `gradient.js` normalise les ajouts V3 ; `gradient-editor.js` édite un brouillon appliqué explicitement. Ne pas ajouter de framework ni réécrire les moteurs SVG, catalogue ou export pour un changement de présentation.

Preserve Import → Build → Variants → Brand Guideline → Export, with automatic recommendations and optional overrides. Keep legacy files readable and retain explicit settings. Preview every visual choice with the actual SVG. Never materialize the BigInt catalog. Global gradients must share coordinates across transformed paths and independently scaled composition parts; use unique SVG namespaces across simultaneous previews. Verify multi-stop gradients and participant exclusions after saving/reopening V3.

Les formats par défaut du nouveau kit sont SVG/PNG/JPEG/PDF ; la migration conserve ceux des anciens projets. Une référence clearspace absente utilise le petit côté visible ; une référence manuelle reste prioritaire. Tester le ZIP réellement téléchargé, les deux langues et les largeurs 1440/1024/390, en plus des tests des moteurs.

## Ajouts V4 — Brand Guideline

Le parcours principal ajoute Brand Guideline avant Exporter ; le mode clearspace conserve Importer → Zone de sécurité → Exporter. `guideline-*.js` isole les données, le rendu commun, l’édition et les exports. V1/V2/V3 migrent avec le guide désactivé. Le PDF/SVG ne doit jamais rasteriser une page entière. Les clés IA restent exclusivement dans le stockage séparé `binksy-ai-provider:*`, jamais dans les objets projet. Ne pas réintroduire OpenCode Go. Vérifier également `/tests/guideline.html` ; les polices de test locales ne sont pas distribuées.

Les textes fictifs des neuf pages éditoriales sont centralisés dans `guideline-content.js` (FR/EN). Ne jamais remplacer le brief ou les textes personnalisés par ces exemples. Instrument Sans est distribuée avec sa licence OFL ; les polices système des tests restent exclues.
