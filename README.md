# BINKSY LOGOKIT

Atelier SVG local, sans compte ni backend. Évolution du moteur BINKSY LOGO SYSTEM, avec compatibilité des projets `.binksy` V1.

## Démarrer

```sh
npm install
npm run dev
```

```sh
npm test
npm run build
npm run preview
```

Cloudflare : `wrangler.jsonc` sert le dossier `dist`. Aucun déploiement n’est effectué par la compilation.

## Organisation

- `src/model.js` : géométrie, grille X, variantes, palette, contraste et historique.
- `src/svg.js` : import sécurisé, limites vectorielles, couleurs et compositions SVG.
- `src/project.js` : validation et migration des fichiers V1/V2.
- `src/clearspace.js` : guides et planches vectorielles transparentes.
- `src/export.js`, `src/raster.js` : SVG/PDF vectoriels, PNG, JPEG, résolution et ZIP.
- `src/main.js`, `src/ui.js`, `src/style.css` : contrôles existants, accueil, modes, règles agent et panneaux indépendants.
- `public/brand` : logo, favicon et flèche fournis par Binks, conservés tels quels.

## Règles de livraison

Les SVG, PNG et PDF sont toujours transparents. Les JPEG utilisent les associations fond/logo recommandées par le ratio de luminance sRGB (3:1 par défaut, réglable). Les choix manuels sont propres à chaque variante, couleur de logo et fond. Le fond du canvas n’influence jamais les exports.

La marge JPEG, indépendante du clearspace, est une fraction du petit côté du logo. La taille raster est un canvas maximal, sans déformation. La résolution est inscrite dans les métadonnées PNG/JPEG.

Les planches de clearspace claire et foncée sont monochromes, sans rectangle de fond. Elles sont générées une fois par construction sélectionnée, dans les formats transparents choisis (SVG si JPEG seul), dans `Clearspace/`. Les recommandations de taille minimale restent séparées des logos.

## Projets

La clé locale historique `binksy-logo-system` est conservée pour retrouver les anciens projets. Le fichier `.binksy` est un JSON version 2 contenant aussi les variantes importées, références du clearspace, choix JPEG et options d’export. Une référence non mesurable automatiquement dans un SVG assemblé doit être renseignée, et n’est jamais inventée.

## Vérification

Les quatre tests Node couvrent les invariants géométriques et l’historique. En développement :

- `/tests/browser.html` : imports, transparence, résolution, contrastes, migration, clearspace et ZIP.
- `/tests/ui.html` : deux parcours, sauvegarde, contrôles, associations JPEG, navigation et maintien du canvas.

Les pages de tests ne font pas partie du build public.

## Limites explicites

- PDF : masques, filtres et motifs complexes refusés, sans rasterisation de secours. SVG conserve les éléments pris en charge par l’import.
- Contours non vectorisés : enveloppe conservatrice pour éviter de couper les traits ; vectoriser les contours si la grille doit suivre exactement leur limite extérieure.
- Texte simple : conversion avec la police OTF/TTF exacte fournie ; constructions typographiques complexes à vectoriser avant import.
- Contraste d’un original multicolore : minimum des peintures identifiées, contrôle visuel nécessaire pour les effets complexes.
- Couleurs RVB, sans conversion ICC/CMJN. Ouverture dans Illustrator, Figma et Affinity non certifiée par un test dans ces logiciels.
- Cache hors ligne disponible avec HTTPS ou localhost une fois les ressources mises en cache. Données locales dépendantes du stockage accordé par le navigateur ; garder un fichier `.binksy` de sauvegarde.
