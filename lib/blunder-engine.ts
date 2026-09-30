import { Chess, Move, Square } from "chess.js";
import type { CandidateMove, Mood } from "@/lib/types";

const PIECE_VALUE: Record<string, number> = {
  p: 1,
  n: 3.2,
  b: 3.35,
  r: 5,
  q: 9,
  k: 0,
};

const CENTER = new Set(["d4", "e4", "d5", "e5"]);
const NEAR_CENTER = new Set(["c3", "d3", "e3", "f3", "c4", "f4", "c5", "f5", "c6", "d6", "e6", "f6"]);

function positionalValue(square: string) {
  if (CENTER.has(square)) return 0.22;
  if (NEAR_CENTER.has(square)) return 0.09;
  return 0;
}

export function evaluatePosition(game: Chess) {
  let score = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = PIECE_VALUE[piece.type] + positionalValue(piece.square);
      score += piece.color === "w" ? value : -value;
    }
  }

  if (game.isCheckmate()) return game.turn() === "w" ? -100 : 100;
  if (game.inCheck()) score += game.turn() === "w" ? -0.25 : 0.25;
  return Number(score.toFixed(2));
}

function moveScore(game: Chess, move: Move) {
  game.move(move);
  let score = evaluatePosition(game);

  if (!game.isGameOver()) {
    const replies = game.moves({ verbose: true });
    let worstReply = score;
    for (const reply of replies) {
      game.move(reply);
      const replyScore = evaluatePosition(game);
      game.undo();
      worstReply = move.color === "w" ? Math.min(worstReply, replyScore) : Math.max(worstReply, replyScore);
    }
    score = score * 0.35 + worstReply * 0.65;
  }

  game.undo();
  return Number(score.toFixed(2));
}

function seededIndex(seed: string, size: number) {
  let value = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value) % size;
}

export function getDecision(game: Chess, mood: Mood) {
  const turn = game.turn();
  const verboseMoves = game.moves({ verbose: true });
  const scored = verboseMoves.map((move) => ({
    move,
    score: moveScore(game, move),
    captureValue: move.captured ? PIECE_VALUE[move.captured] : 0,
  }));

  const direction = turn === "w" ? 1 : -1;
  scored.sort((a, b) => (b.score - a.score) * direction);
  const objective = scored[0];
  let selected = objective;
  let reason = "CALM selected the engine's highest-rated continuation.";

  if (mood === "greedy") {
    selected = [...scored].sort((a, b) => {
      const aTemptation = a.score * direction + a.captureValue * 0.9;
      const bTemptation = b.score * direction + b.captureValue * 0.9;
      return bTemptation - aTemptation;
    })[0];
    reason = selected.captureValue
      ? `GREEDY chased ${selected.move.captured?.toUpperCase()} material over the cleanest line.`
      : "GREEDY found no capture, so it pressed the most forcing move.";
  }

  if (mood === "tilted") {
    const riskyPool = scored.slice(0, Math.min(6, scored.length));
    selected = riskyPool[seededIndex(`${game.fen()}:${game.history().length}`, riskyPool.length)];
    reason = "TILTED ignored the top line and picked from six barely-defensible ideas.";
  }

  const candidatePool = scored.slice(0, 5);
  if (!candidatePool.includes(selected)) candidatePool.push(selected);
  const candidates: CandidateMove[] = candidatePool.slice(0, 5).map(({ move, score }) => ({
    san: move.san,
    from: move.from,
    to: move.to,
    score,
    capture: Boolean(move.captured),
  }));

  return {
    selected: {
      san: selected.move.san,
      from: selected.move.from as Square,
      to: selected.move.to as Square,
      promotion: selected.move.promotion,
    },
    candidates,
    evaluation: selected.score,
    reason,
  };
}

export function resultLabel(game: Chess) {
  if (game.isCheckmate()) return game.turn() === "w" ? "0–1" : "1–0";
  if (game.isDraw()) return "½–½";
  return "LIVE";
}
