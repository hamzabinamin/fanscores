import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';

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
  status: string;                 // 'Not Started' | '1st Half' | 'Half Time' | '2nd Half' | 'Full Time'
  createdBy: string | null;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
}

export interface Game extends GameData {
  id: string;
}

export const MATCH_STATUSES = ['Not Started', '1st Half', 'Half Time', '2nd Half', 'Full Time'] as const;
export type MatchStatus = typeof MATCH_STATUSES[number];

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
    status: d.status ?? 'Not Started',
    createdBy: d.createdBy ?? null,
    createdAt: d.createdAt ?? null,
  };
}

// e.g. "U/5 B"
export function sideLabel(side: GameTeamSide): string {
  return [side.level, side.type].filter(Boolean).join(' ');
}

export async function updateGameScore(gameId: string, homeScore: number, awayScore: number) {
  await gamesCollection().doc(gameId).update({ homeScore, awayScore });
}

export async function updateGameStatus(gameId: string, status: string) {
  await gamesCollection().doc(gameId).update({ status });
}

export async function updateCricketState(gameId: string, cricket: CricketState) {
  await gamesCollection().doc(gameId).update({ cricket });
}

// label for a single innings, e.g. "145/3 (24.2)"
export function inningsLabel(i: CricketInnings): string {
  return `${i.runs}/${i.wickets} (${i.overs}.${i.balls})`;
}

export function emptyCricketState(): CricketState {
  return { battingSide: null, home: emptyInnings(), away: emptyInnings() };
}