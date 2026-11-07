// Chanson de Famille — petit serveur Node.js (aucune dépendance hormis le SDK Anthropic).
// Il sert la page web (dossier public/) et appelle Claude Sonnet pour écrire les paroles.
// La clé d'API reste côté serveur : elle n'est jamais envoyée au navigateur.

import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MODEL = "claude-sonnet-5-5";

// Lit ANTHROPIC_API_KEY dans l'environnement.
const client = new Anthropic();

const SYSTEM_PROMPT = `Tu es un parolier francophone chaleureux et talentueux. Tu écris des chansons
personnalisées, offertes en cadeau à des proches, à partir des informations données par la famille.

Règles :
- Écris une chanson originale ; ne reprends ni ne parodies les paroles d'une chanson existante.
- Utilise les prénoms, anecdotes et détails fournis de façon naturelle et touchante, sans tout entasser.
- Respecte le ton et le style musical demandés.
- Structure : [Couplet 1], [Refrain], [Couplet 2], [Refrain], [Pont], [Refrain final].
  Indique chaque section entre crochets sur sa propre ligne.
- Des vers courts et chantables, avec des rimes ou assonances, et un refrain facile à retenir.
- Commence par une ligne « Titre : ... », puis une ligne « Style : ... » décrivant en quelques mots
  (en anglais) le style musical, l'ambiance, le tempo et le type de voix, prête à être collée
  dans un générateur de musique, puis une ligne vide, puis les paroles.
- N'ajoute aucun commentaire avant ou après.`;

const LABELS = {
  occasion: "Occasion",
  destinataire: "Prénom de la personne",
  lien: "Lien avec l'auteur de la demande",
  auteur: "De la part de",
  souvenirs: "Souvenirs et anecdotes",
  qualites: "Ce qu'on aime chez elle / lui",
  message: "Message principal à faire passer",
  style: "Style musical",
  ton: "Ton",
  langue: "Langue de la chanson",
  modifications: "Retouches demandées par rapport à la version précédente",
};

function buildPrompt(answers) {
  const lines = Object.entries(LABELS)
    .filter(([key]) => key !== "modifications" && answers[key])
    .map(([key, label]) => `${label} : ${String(answers[key]).trim()}`);
  let prompt = `Voici les informations pour la chanson :\n\n${lines.join("\n")}`;
  if (answers.precedente && answers.modifications) {
    prompt += `\n\nVersion précédente :\n${answers.precedente}\n\n` +
      `${LABELS.modifications} : ${answers.modifications}\n` +
      `Réécris la chanson complète en tenant compte de ces retouches.`;
  }
  return prompt;
}

async function writeSong(answers) {
  const response = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // Si Sonnet refuse une demande, l'API la relance automatiquement sur un modèle de secours.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildPrompt(answers) }],
  });

  if (response.stop_reason === "refusal") {
    throw Object.assign(new Error("La demande n'a pas pu être traitée. Essayez de reformuler."), { status: 422 });
  }
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("")
    .trim();
  if (!text) throw new Error("Réponse vide.");
  return text;
}

function sendJson(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 50_000) throw Object.assign(new Error("Texte trop long."), { status: 413 });
  }
  return JSON.parse(data || "{}");
}

function errorMessage(err) {
  if (err instanceof Anthropic.AuthenticationError) return [500, "Clé d'API Anthropic manquante ou invalide (voir le README)."];
  if (err instanceof Anthropic.RateLimitError) return [429, "Trop de demandes en même temps. Réessayez dans une minute."];
  if (err instanceof Anthropic.APIConnectionError) return [502, "Impossible de joindre le service. Vérifiez la connexion Internet."];
  if (err instanceof Anthropic.APIError) return [502, "Le service d'écriture a rencontré un problème. Réessayez."];
  if (err instanceof SyntaxError) return [400, "Requête invalide."];
  return [err.status || 500, err.message || "Erreur inattendue."];
}

const STATIC = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
};

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/chanson") {
      const answers = await readBody(req);
      if (!answers.destinataire || !answers.occasion) {
        return sendJson(res, 400, { error: "Indiquez au moins l'occasion et le prénom." });
      }
      const chanson = await writeSong(answers);
      return sendJson(res, 200, { chanson });
    }
    const file = req.method === "GET" && STATIC[req.url.split("?")[0]];
    if (file) {
      const content = await readFile(path.join(here, "public", file[0]));
      res.writeHead(200, { "Content-Type": file[1] });
      return res.end(content);
    }
    sendJson(res, 404, { error: "Page introuvable." });
  } catch (err) {
    const [status, message] = errorMessage(err);
    if (status >= 500) console.error(err);
    sendJson(res, status, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Chanson de Famille : http://localhost:${PORT}`);
});
