# Liamwork

Application de revision de maths pour iPad.

## Sections

- Nombres relatifs
- Priorites de calcul
- Calculs decimaux
- Complements rapides
- Divisions utiles

Chaque section avance par series de 20 exercices. Une fois une serie terminee, la section passe au niveau suivant :

- Facile
- Intermediaire
- Difficile

Apres le niveau difficile, les exercices continuent au niveau difficile pour garder un entrainement ouvert.

## Recompenses

L'application attribue des XP, suit les combos de bonnes reponses et debloque des badges pour encourager la regularite.

La progression est enregistree dans le navigateur avec `localStorage`.

## Cloudflare Worker

Le Worker sert les fichiers statiques du dossier `public`.

```bash
npm install
npm run dev
npm run deploy
```
