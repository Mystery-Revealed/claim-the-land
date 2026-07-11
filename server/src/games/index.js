// games/index.js — registry of playable games. GameManager looks games up here,
// keeping the engine reusable for future Texas History units.

import claimTheLand from './claimTheLand.js';

export const GAMES = {
  [claimTheLand.id]: claimTheLand,
};

export function getGame(id) {
  return GAMES[id] || null;
}
