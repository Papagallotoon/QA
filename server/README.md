# Le "cerveau" de Quantum Algo

Ce dossier tourne **tout seul chaque matin de semaine** sur GitHub (gratuit), pas sur ton téléphone ni ton PC.

Chaque matin vers 7 h 20 (heure de Paris) :

1. il télécharge 3 ans d'historique Yahoo Finance pour les ~67 valeurs et 8 indices suivis ;
2. il **vérifie les prévisions des jours précédents** arrivées à échéance (1 jour, 1 semaine, 1 mois, 3 mois) et met à jour le bilan réel ;
3. il **ré-entraîne le modèle** (pondération des 82 indicateurs directionnels) et compare plusieurs réglages sur les 120 dernières séances, que l'entraînement n'a jamais vues. Le réglage en place n'est remplacé que si le nouveau fait mieux : le modèle ne peut pas se dégrader en silence ;
4. il calcule le **plan de position** de chaque valeur : horizon conseillé, quand entrer, zone d'entrée, stop, objectif, durée de détention ;
5. il envoie **la lettre du matin** par e-mail et/ou WhatsApp ;
6. il publie `out/model.json`, `out/track.json` et `out/signals.json`, que l'app télécharge (onglet BILAN, plan de position, sélection du jour).

## Mise en route (une seule fois, environ 15 minutes)

### 1. Mettre le projet sur GitHub

D'abord, place le fichier de planification au bon endroit (GitHub ne le lit que dans `.github/workflows/`). Dans PowerShell, depuis le dossier du projet :

```powershell
New-Item -ItemType Directory -Force .github\workflows | Out-Null
Copy-Item server\quantum-daily.yml .github\workflows\quantum-daily.yml
```

Puis envoie le projet sur GitHub :

```powershell
git init
git add .
git commit -m "Quantum Algo v6"
git branch -M main
git remote add origin https://github.com/Papagallotoon/QA.git
git push -u origin main --force
```

> `--force` remplace le contenu actuel du dépôt QA par cette version. Si tu veux garder l'ancien, crée plutôt un nouveau dépôt (par ex. `QA-v6`) et change `BRAIN_BASE` dans `src/quantum/config.js`.

Le dépôt doit être **public** pour que l'app puisse lire `server/out/*.json` (GitHub → Settings → General → Change visibility). Ces fichiers ne contiennent aucun secret : les clés restent dans les Secrets GitHub.

### 2. Choisir l'envoi par e-mail : Brevo (conseillé, tu l'utilises déjà)

GitHub → ton dépôt → **Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|---|---|
| `BREVO_API_KEY` | ta clé API Brevo (Brevo → SMTP & API → API Keys) |
| `MAIL_TO` | ton adresse (plusieurs possibles, séparées par des virgules) |
| `MAIL_FROM` | une adresse d'expéditeur **validée dans Brevo** |
| `MAIL_FROM_NAME` | (facultatif) `Quantum Algo` |

Alternative Gmail : `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=465`, `SMTP_USER=ton.adresse@gmail.com`, `SMTP_PASS=` un *mot de passe d'application* Google, plus `MAIL_TO`.

### 3. WhatsApp (facultatif)

**CallMeBot (gratuit)** : ajoute le numéro +34 644 71 81 99 à tes contacts, envoie-lui sur WhatsApp le message `I allow callmebot to send me messages`. Tu reçois une clé API. Puis crée les secrets :

| Secret | Valeur |
|---|---|
| `CALLMEBOT_PHONE` | ton numéro au format international, ex. `+33612345678` |
| `CALLMEBOT_APIKEY` | la clé reçue |

(Twilio est aussi pris en charge : `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_FROM`, `WHATSAPP_TO`.)

### 4. Premier lancement

GitHub → onglet **Actions** → « Quantum Algo - routine du matin » → **Run workflow**.
En 2 à 4 minutes tu reçois la lettre, et `server/out/` se remplit. Ensuite, c'est automatique du lundi au vendredi.

## Personnaliser

`config.json` :
- `watchlist` : les valeurs rappelées dans la section « Ta liste » de la lettre ;
- `maxPicks`, `maxAvoid` : nombre d'opportunités et de valeurs à éviter ;
- `extraSymbols` : symboles Yahoo supplémentaires à analyser (ex. `"ASML.AS"`), avec leur indice de référence dans `extraIndex`.

## Tester sans rien envoyer

```powershell
cd server
node daily.mjs --no-send          # vraies données, aperçu dans out/newsletter.html
node daily.mjs --fake --no-send   # données synthétiques, sans internet
```

## Ce qu'il faut savoir honnêtement

- Les probabilités sont **calibrées sur ce qui s'est réellement passé** : si le modèle dit 56 %, c'est qu'environ 56 % des cas comparables passés ont monté. En bourse, 53 à 56 % de bonnes directions de façon régulière, c'est déjà très bon. Un horizon où aucun réglage ne bat le hasard affiche 50 %, et l'app recommande alors de rester à l'écart.
- L'onglet BILAN affiche le taux de réussite **réel**, mesuré jour après jour. Il faut quelques semaines pour qu'il soit significatif (et 3 mois pour l'horizon 3 mois).
- C'est un outil statistique, pas un conseil en investissement personnalisé.
