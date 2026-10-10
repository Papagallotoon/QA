// Adresse ou le serveur quotidien (GitHub Actions) publie ses fichiers.
// Par defaut : le depot GitHub du projet, dossier server/out, branche main.
// Le depot doit etre PUBLIC pour que l'app puisse lire ces fichiers
// (ils ne contiennent aucune donnee personnelle, seulement le modele et ses scores).
// Si tu utilises un autre depot ou Cloudflare Pages, change juste BRAIN_BASE.
export const BRAIN_BASE = "https://raw.githubusercontent.com/Papagallotoon/QA/main/server/out/";

export const MODEL_URL = BRAIN_BASE + "model.json";
export const TRACK_URL = BRAIN_BASE + "track.json";
export const SIGNALS_URL = BRAIN_BASE + "signals.json";
