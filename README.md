# 🎾Padel Tournament Organizer🎾

## Introduction

Bienvenue sur mon application destiné aux juges-arbitres de padel.

## Présentation du projet

Padel Tournament Organizer est une application conçue pour faciliter la vie des organisateurs et juges-arbitres de tournois de padel. L’objectif est simple : permettre de préparer, piloter et clôturer un tournoi sans tableur, sans papier et sans erreurs, du premier match jusqu’à la finale.

Le parcours démarre par la création du tournoi (nom, date, catégorie, nombre d’équipes). L’organisateur enregistre les participants, calcule automatiquement les têtes de série à partir de leur classement, puis génère l’arbre à élimination directe en plaçant correctement les seeds et les éventuels byes quand le nombre d’équipes n’est pas une puissance de deux. Pendant la compétition, il saisit les scores par sets ; l’application propulse automatiquement le vainqueur dans le match suivant et met à jour l’affichage du tableau en temps réel. À la fin, un classement final est produit sans manipulations supplémentaires.

Pensée pour le terrain, l’interface mise sur la lisibilité et la rapidité d’action : on voit d’un coup d’œil les rencontres à venir, on corrige facilement une erreur de saisie, et l’arbre reste clair, y compris sur mobile pour suivre le tournoi depuis les courts. Le projet s’inscrit dans une démarche pragmatique : réduire les tâches répétitives, sécuriser l’organisation sportive et offrir une expérience fluide à ceux qui font vivre les tournois.

Stack principale : Next.js + TypeScript (front) et Supabase (PostgreSQL, Auth, RLS).

## Installation

Clonez ce dépôt sur votre machine locale puis rentrer dedans.
```
git clone git@github.com:ThomasMaingre/PadelTournamentOrganizer.git
cd PadelTournamentOrganizer
```


## Configuration
Node.js ≥ 18 recommandé (18 LTS ou 20 LTS).

Pour configurer le projet, ouvrez votre terminal, à l'emplacement du projet, et faite cette commande
```
npm install
```

## .env

Afin que le projet puisse véritablement être opérationnel en local, il faut ajouter le fichier .env à la racine. Avec comme contenu ceci :
```php
NEXT_PUBLIC_SUPABASE_URL=https://urldemabdd.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
Pour obtenur l'url de Supabase ainsi que la key, merci de mon contacter.


## Lancement

Pour lancer le projet, juste après l'avoir configurer, il vous suffit de faire cette commande  
```
npm run dev
```

Et voilà, à présent vous pouvez vous amuser sur mon site. 😃





