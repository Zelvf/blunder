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
  slot: number;
  timestamp: number;
  verified: boolean;
  source: "mainnet";
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

export type GlobalGameState = {
  network: "mainnet-beta";
  channelAddress: string;
  finalizedSlot: number;
  roundStartSlot: number;
  nextMoveSlot: number;
  slotsUntilNextMove: number;
  moveIntervalSlots: number;
  gameId: string;
  startedAtSlot: number;
  fen: string;
  moves: MoveRecord[];
  events: ChainEvent[];
  mood: Mood;
  moodMovesLeft: number;
  result: string;
  synchronizedAt: number;
};
