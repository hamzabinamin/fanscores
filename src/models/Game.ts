import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

const currentUid = () => auth().currentUser?.uid ?? null;

export interface GameTeamSide {
  id: string | null;
  country: string;
  name: string;
  level: string;
  type: string;
}

export interface CricketInnings {
  runs: number;
  wickets: number;
  overs: number;   // whole overs completed
  balls: number;   // 0–5 balls in the current over
}

export interface CricketState {
  battingSide: 'home' | 'away' | null;
  totalOvers: number;     // overs cap for this match (e.g. 20, 50)
  home: CricketInnings;
  away: CricketInnings;
}

// Tennis / Padel
export interface TennisState {
  setsFormat: string;     // "Best of 3" | "Best of 5"
  player1: string;
  player2: string;
  homeSets: number;
  awaySets: number;
}

const emptyInnings = (): CricketInnings => ({ runs: 0, wickets: 0, overs: 0, balls: 0 });

// sports that use the tennis-style sets + two-player format
export const RACKET_SPORTS = ['Tennis', 'Padel'];
export function isRacketSport(sport: string): boolean {
  return RACKET_SPORTS.includes(sport);
}

export interface GameData {
  homeTeam: GameTeamSide;
  awayTeam: GameTeamSide;
  kickoff: FirebaseFirestoreTypes.Timestamp | null;
  location: string;
  sport: string;
  gender: string;
  isAssociated: boolean;
  homeScore: number | null;
  awayScore: number | null;
  cricket: CricketState | null;   // only set for cricket
  tennis: TennisState | null;     // only set for tennis / padel
  winner: string | null;  
  subscribers: string[];  
  status: string;                 // 'Not Started' | '1st Half' | 'Half Time' | '2nd Half' | 'Full Time'
  lastUpdatedBy: string | null,
  startNotified: boolean,
  createdBy: string | null;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
}

export interface Game extends GameData {
  id: string;
}

export const MATCH_STATUSES = ['Not Started', '1st Half', 'Half Time', '2nd Half', 'Full Time'] as const;
export const CRICKET_STATUSES = ['Not Started', '1st Innings', 'Innings Break', '2nd Innings', 'Finished'] as const;
export const TENNIS_STATUSES = ['Not Started', 'In Progress', 'Finished'] as const;
export type MatchStatus = typeof MATCH_STATUSES[number];
export type CricketStatus = typeof CRICKET_STATUSES[number];
export type TennisStatus = typeof TENNIS_STATUSES[number];

const COLLECTION = 'Game';
export const gamesCollection = () => firestore().collection(COLLECTION);

export function gameFromDoc(doc: FirebaseFirestoreTypes.DocumentSnapshot): Game {
  const d = (doc.data() ?? {}) as Partial<GameData>;
  const side = (s?: Partial<GameTeamSide>): GameTeamSide => ({
    id: s?.id ?? null,
    country: s?.country ?? '',
    name: s?.name ?? '',
    level: s?.level ?? '',
    type: s?.type ?? '',
  });

  // normalize cricket into the two-innings shape (handles old/missing data)
  const cricket: CricketState | null = d.cricket
    ? {
        battingSide: d.cricket.battingSide ?? null,
        totalOvers: d.cricket.totalOvers ?? 0,
        home: { ...emptyInnings(), ...(d.cricket.home ?? {}) },
        away: { ...emptyInnings(), ...(d.cricket.away ?? {}) },
      }
    : null;

  // normalize tennis / padel
  const tennis: TennisState | null = d.tennis
    ? {
        setsFormat: d.tennis.setsFormat ?? 'Best of 3',
        player1: d.tennis.player1 ?? '',
        player2: d.tennis.player2 ?? '',
        homeSets: d.tennis.homeSets ?? 0,
        awaySets: d.tennis.awaySets ?? 0,
      }
    : null;

  return {
    id: doc.id,
    homeTeam: side(d.homeTeam),
    awayTeam: side(d.awayTeam),
    kickoff: d.kickoff ?? null,
    location: d.location ?? '',
    sport: d.sport ?? '',
    gender: d.gender ?? '',
    isAssociated: d.isAssociated ?? false,
    homeScore: d.homeScore ?? null,
    awayScore: d.awayScore ?? null,
    cricket,
    tennis,
    winner: d.winner ?? null,
    subscribers: d.subscribers ?? [],  
    status: d.status ?? 'Not Started',
    lastUpdatedBy: d.lastUpdatedBy ?? null,
    startNotified: d.startNotified ?? false,
    createdBy: d.createdBy ?? null,
    createdAt: d.createdAt ?? null,
  };
}

// e.g. "U/5 B"
export function sideLabel(side: GameTeamSide): string {
  return [side.level, side.type].filter(Boolean).join(' ');
}

// the first "active" status for a sport (used to auto-advance from "Not Started")
export function firstActiveStatus(sport: string): string {
  if (sport === 'Cricket') return '1st Innings';
  if (isRacketSport(sport)) return 'In Progress';
  return '1st Half';
}

export async function updateGameScore(gameId: string, homeScore: number, awayScore: number, game: Game) {
  const patch: Record<string, any> = { homeScore, awayScore, lastUpdatedBy: currentUid() };
  if (game.status === 'Not Started') patch.status = firstActiveStatus(game.sport);
  await gamesCollection().doc(gameId).update(patch);
}

export async function updateGameStatus(gameId: string, status: string) {
  await gamesCollection().doc(gameId).update({ status, lastUpdatedBy: currentUid() });
}

export async function updateCricketState(gameId: string, cricket: CricketState, game: Game) {
  const patch: Record<string, any> = { cricket, lastUpdatedBy: currentUid() };
  if (game.status === 'Not Started') patch.status = firstActiveStatus(game.sport);
  await gamesCollection().doc(gameId).update(patch);
}

export async function updateTennisState(gameId: string, tennis: TennisState, game: Game) {
  const patch: Record<string, any> = { tennis, lastUpdatedBy: currentUid() };
  if (game.status === 'Not Started') patch.status = firstActiveStatus(game.sport);
  await gamesCollection().doc(gameId).update(patch);
}

export async function deleteGame(gameId: string) {
  await gamesCollection().doc(gameId).delete();
}

// label for a single innings, e.g. "145/3 (24.2)"
export function inningsLabel(i: CricketInnings): string {
  return `${i.runs}/${i.wickets} (${i.overs}.${i.balls})`;
}

export function emptyCricketState(): CricketState {
  return { battingSide: null, totalOvers: 0, home: emptyInnings(), away: emptyInnings() };
}

export function statusesForSport(sport: string): readonly string[] {
  if (sport === 'Cricket') return CRICKET_STATUSES;
  if (isRacketSport(sport)) return TENNIS_STATUSES;
  return MATCH_STATUSES;
}

export async function finalizeGame(gameId: string, homeScore: number, awayScore: number, winner: string) {
  await gamesCollection().doc(gameId).update({ homeScore, awayScore, winner, status: 'Full Time', lastUpdatedBy: currentUid() });
}

export async function finalizeCricketGame(gameId: string, cricket: CricketState, winner: string) {
  await gamesCollection().doc(gameId).update({ cricket, winner, status: 'Finished', lastUpdatedBy: currentUid() });
}

export async function finalizeTennisGame(gameId: string, tennis: TennisState, winner: string) {
  await gamesCollection().doc(gameId).update({ tennis, winner, status: 'Finished', lastUpdatedBy: currentUid() });
}