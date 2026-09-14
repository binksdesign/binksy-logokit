# Validation locale — 12 septembre 2026

- `npm test` : 39 tests réussis ; `npm run build` réussi.
- Navigateur : browser 21, advanced 35, UI 27, mixed 16 et delivery 6 contrôles réussis.
- Guideline : 23 contrôles réussis, dont les trois formats, les polices réelles, les textes fictifs, la migration V1/V2/V3, Undo/Redo, les opérations de pages, les imports multiples, FR/EN, le stockage durable et les largeurs 1440/1024/390.
- PDF : trois documents de 12 pages ; dimensions vérifiées par pypdf. Deux TTF incorporées dans les fixtures, textes conservés et logos vectoriels. Seule la page Applications place l’image importée. ZIP : 12 SVG et un PDF.
- Exemples éditoriaux : neuf pages préremplies, exportées en 16:9, A4 paysage et A4 portrait avec Instrument Sans. Vérification visuelle du PDF portrait et des planches du guide.
- Démonstrations flou/lueur : rasterisation locale vérifiée ; aucune page entière rasterisée. OTF : tracés vectoriels vérifiés.

Les tests IA utilisent des réponses simulées. Les appels authentifiés aux fournisseurs et l’ouverture dans Illustrator n’ont pas été vérifiés. Aucune publication effectuée.
