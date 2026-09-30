export type Mood = "calm" | "greedy" | "tilted";

export type CandidateMove = {
  san: string;
  from: string;
  to: string;
  score: number;
  capture: boolean;
};

export type ChainEvent = {
  id: string;
  signature: string;
  mood: Mood;
  lamports: number;
  timestamp: number;
  verified: boolean;
  source: "simulation" | "devnet";
  explorerUrl?: string;
};

export type MoveRecord = {
  id: string;
  ply: number;
  actor: "blunder" | "opponent";
  color: "white" | "black";
  san: string;
  from: string;
  to: string;
  fenBefore: string;
  fenAfter: string;
  evaluation: number;
  mood: Mood;
  candidates: CandidateMove[];
  reason: string;
  timestamp: number;
  trigger?: ChainEvent;
  stateHash?: string;
};

export type SavedGame = {
  version: 1;
  gameId: string;
  startedAt: number;
  moves: MoveRecord[];
  events: ChainEvent[];
  result: string;
};
