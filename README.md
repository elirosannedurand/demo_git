# demo_git
Une petite demo github qui se passe bien.
Encore une modif à récupérer !!!
Mas aussi depuis mon ordi.

Et de 2 !!! c cool !

---

# Chanson de Famille

Petite application familiale pour écrire des **chansons personnalisées** (anniversaire, mariage,
naissance, fête des mères, retraite, hommage…). On remplit un court questionnaire, et
**Claude Sonnet** écrit les paroles. On peut ensuite les mettre en musique avec un générateur de musique par IA
(par exemple Suno).

## Lancer l'application

Prérequis : [Node.js](https://nodejs.org) 20 ou plus, et une clé d'API Anthropic
(à créer sur https://platform.claude.com, rubrique « API keys »).

```bash
npm install
export ANTHROPIC_API_KEY="votre-clé"   # sous Windows (PowerShell) : $env:ANTHROPIC_API_KEY="votre-clé"
npm start
```

Puis ouvrir http://localhost:3000 dans le navigateur.

## Fonctionnement

- `public/index.html` : la page web (questionnaire, affichage des paroles, retouches, et boutons
  pour copier le titre, le style et les paroles dans les champs du mode « Custom » de Suno).
- `server.js` : un petit serveur qui garde la clé d'API secrète et appelle Claude Sonnet
  (`claude-sonnet-5-5`). Si une demande est refusée par Sonnet, l'API la relance
  automatiquement sur un modèle de secours (option `fallbacks: "default"`).

## Coût

Chaque chanson coûte environ un centime d'euro en appels à l'API (quelques milliers de mots
lus et écrits). La mise en musique dépend du service choisi.

## Mettre l'application en ligne (Render, gratuit)

1. Créez un compte sur https://render.com en vous connectant avec GitHub.
2. Dans Render : **New > Blueprint**, choisissez le dépôt `demo_git` et la branche de l'application.
   Render lit le fichier `render.yaml` et prépare tout.
3. Render demande deux valeurs :
   - `ANTHROPIC_API_KEY` : votre clé d'API Anthropic ;
   - `CODE_FAMILLE` : le code à donner à vos proches (ex. `Crepes2026`).
4. Cliquez sur **Apply**. Après quelques minutes, Render affiche l'adresse du site
   (ex. `https://chanson-de-famille.onrender.com`) : c'est le lien à envoyer à la famille, avec le code.

Protections intégrées :
- sans le code familial, impossible d'écrire une chanson ;
- au plus 20 chansons par heure et par appareil (réglable avec `LIMITE_PAR_HEURE`) ;
- conseillé : fixez aussi une limite de dépense mensuelle dans la console Anthropic
  (Settings > Limits).

Bon à savoir : avec l'offre gratuite, le site se met en veille après 15 minutes sans visite ;
la première ouverture suivante prend alors environ une minute.
