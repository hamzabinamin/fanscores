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
  home: CricketInnings;
  away: CricketInnings;
}

const emptyInnings = (): CricketInnings => ({ runs: 0, wickets: 0, overs: 0, balls: 0 });

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
  winner: string | null;  
  subscribers: string[];  
  status: string;                 // 'Not Started' | '1st Half' | 'Half Time' | '2nd Half' | 'Full Time'
  lastUpdatedBy: string | null,
  createdBy: string | null;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
}

export interface Game extends GameData {
  id: string;
}

export const MATCH_STATUSES = ['Not Started', '1st Half', 'Half Time', '2nd Half', 'Full Time'] as const;
export const CRICKET_STATUSES = ['Not Started', '1st Innings', 'Innings Break', '2nd Innings', 'Finished'] as const;
export type MatchStatus = typeof MATCH_STATUSES[number];
export type CricketStatus = typeof CRICKET_STATUSES[number];

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
        home: { ...emptyInnings(), ...(d.cricket.home ?? {}) },
        away: { ...emptyInnings(), ...(d.cricket.away ?? {}) },
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
    winner: d.winner ?? null,
    subscribers: d.subscribers ?? [],  
    status: d.status ?? 'Not Started',
    lastUpdatedBy: d.lastUpdatedBy ?? null,
    createdBy: d.createdBy ?? null,
    createdAt: d.createdAt ?? null,
  };
}

// e.g. "U/5 B"
export function sideLabel(side: GameTeamSide): string {
  return [side.level, side.type].filter(Boolean).join(' ');
}

export async function updateGameScore(gameId: string, homeScore: number, awayScore: number) {
  await gamesCollection().doc(gameId).update({ homeScore, awayScore, lastUpdatedBy: currentUid() });
}

export async function updateGameStatus(gameId: string, status: string) {
  await gamesCollection().doc(gameId).update({ status, lastUpdatedBy: currentUid() });
}

export async function updateCricketState(gameId: string, cricket: CricketState) {
  await gamesCollection().doc(gameId).update({ cricket, lastUpdatedBy: currentUid() });
}

export async function deleteGame(gameId: string) {
  await gamesCollection().doc(gameId).delete();
}

// label for a single innings, e.g. "145/3 (24.2)"
export function inningsLabel(i: CricketInnings): string {
  return `${i.runs}/${i.wickets} (${i.overs}.${i.balls})`;
}

export function emptyCricketState(): CricketState {
  return { battingSide: null, home: emptyInnings(), away: emptyInnings() };
}

export function statusesForSport(sport: string): readonly string[] {
  return sport === 'Cricket' ? CRICKET_STATUSES : MATCH_STATUSES;
}

export async function finalizeGame(gameId: string, homeScore: number, awayScore: number, winner: string) {
  await gamesCollection().doc(gameId).update({ homeScore, awayScore, winner, status: 'Full Time', lastUpdatedBy: currentUid() });
}

export async function finalizeCricketGame(gameId: string, cricket: CricketState, winner: string) {
  await gamesCollection().doc(gameId).update({ cricket, winner, status: 'Finished', lastUpdatedBy: currentUid() });
}