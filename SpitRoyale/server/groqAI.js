/**
 * groqAI.js — Groq API wrapper for survival-mode bot tactics.
 *
 * Called at most once every GROQ_TICK_MS (1.5 s) per survival room.
 * Falls back to deterministic defaults when the API is unreachable or the key
 * is not configured so the game always stays playable.
 */

import Groq from 'groq-sdk';

const MODEL   = 'llama-3.1-8b-instant';
const TACTICS = ['charge', 'flank_left', 'flank_right', 'strafe', 'retreat'];

let _client = null;

function getClient() {
  if (_client) return _client;
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  _client = new Groq({ apiKey: key });
  return _client;
}

/**
 * Ask Groq which tactic each bot should use for the next ~1.5 s.
 *
 * @param {{ x: number, z: number, health: number }} player
 * @param {Array<{ id: string, x: number, z: number, health: number }>} bots
 * @returns {Promise<Record<string, string>>}  botId → tactic
 */
export async function fetchBotTactics(player, bots) {
  const client = getClient();
  if (!client || bots.length === 0) return fallback(bots);

  // Use sequential 0-based indices so the LLM only has to output small numbers.
  const indexed = bots.map((b, i) => ({ idx: i, id: b.id, x: b.x, z: b.z, hp: b.health }));

  const p  = `player x=${player.x.toFixed(1)} z=${player.z.toFixed(1)} hp=${player.health}`;
  const bs = indexed.map(b => `#${b.idx} x=${b.x.toFixed(1)} z=${b.z.toFixed(1)} hp=${b.hp}`).join(', ');

  const prompt =
    `Alpaca arena combat. Arena is a circle radius 18.\n` +
    `${p}\n` +
    `Bots: ${bs}\n` +
    `Assign each bot a tactic so they surround and kill the player from different angles.\n` +
    `Tactics: charge, flank_left, flank_right, strafe, retreat\n` +
    `Reply with a JSON array ONLY — no explanation:\n` +
    `[{"id":"0","tactic":"charge"},{"id":"1","tactic":"flank_left"},...]`;

  try {
    const res = await client.chat.completions.create({
      model:       MODEL,
      messages:    [{ role: 'user', content: prompt }],
      max_tokens:  120,
      temperature: 0.45,
    });

    const text = res.choices[0]?.message?.content ?? '';
    return parse(text, indexed);
  } catch (err) {
    console.warn('[groq] fetch failed:', err.message);
    return fallback(bots);
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function parse(text, indexed) {
  try {
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return fallback(indexed.map(i => ({ id: i.id })));

    const arr = JSON.parse(match[0]);
    const out = {};

    for (const item of arr) {
      const idx  = parseInt(item.id, 10);
      const bot  = indexed[idx];
      const tact = TACTICS.includes(item.tactic) ? item.tactic : 'charge';
      if (bot) out[bot.id] = tact;
    }

    // Guarantee every bot has a tactic even if Groq omitted some.
    for (const bot of indexed) {
      if (!out[bot.id]) out[bot.id] = TACTICS[bot.idx % TACTICS.length];
    }
    return out;
  } catch {
    return fallback(indexed.map(i => ({ id: i.id })));
  }
}

function fallback(bots) {
  const out = {};
  bots.forEach((b, i) => { out[b.id] = TACTICS[i % TACTICS.length]; });
  return out;
}
