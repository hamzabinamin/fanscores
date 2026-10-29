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
  overs: number;
  balls: number;
}

export interface CricketState {
  battingSide: 'home' | 'away' | null;
  totalOvers: number;
  home: CricketInnings;
  away: CricketInnings;
}

// --- Tennis / Padel / Beach Volleyball / Badminton ---
export interface TennisSet {
  home: number;
  away: number;
}

export interface TennisState {
  setsFormat: string;     // "Best of 3" | "Best of 5"
  player1: string;
  player2: string;
  sets: TennisSet[];
  homePoint: number;
  awayPoint: number;
}

export const TENNIS_POINT_LABELS = ['Love', '15', '30', '40', 'Adv'];
export function pointLabel(i: number): string {
  return TENNIS_POINT_LABELS[Math.max(0, Math.min(4, i))];
}

export const RACKET_SPORTS = ['Tennis', 'Padel', 'Beach Volleyball', 'Badminton'];
export function isRacketSport(sport: string): boolean {
  return RACKET_SPORTS.includes(sport);
}
export function usesTennisPoints(sport: string): boolean {
  return sport === 'Tennis' || sport === 'Padel';
}
export function setUnitLabel(sport: string): string {
  return sport === 'Badminton' ? 'Game' : 'Set';
}

export const QUARTER_SPORTS = ['Netball', 'Water Polo'];

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
  cricket: CricketState | null;
  tennis: TennisState | null;
  winner: string | null;
  subscribers: string[];
  status: string;
  lastUpdatedBy: string | null;
  startNotified: boolean;
  createdBy: string | null;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
}

export interface Game extends GameData {
  id: string;
}

export const MATCH_STATUSES = ['Not Started', '1st Half', 'Half Time', '2nd Half', 'Full Time'] as const;
export const CRICKET_STATUSES = ['Not Started', '1st Innings', 'Innings Break', '2nd Innings', 'Finished'] as const;
export const TENNIS_STATUSES = ['Not Started', 'Set 1', 'Set 2', 'Set 3', 'Set 4', 'Set 5', 'Completed'] as const;
export const VOLLEYBALL_STATUSES = ['Not Started', 'Set 1', 'Set 2', 'Set 3', 'Completed'] as const;
export const BADMINTON_STATUSES = ['Not Started', 'Game 1', 'Game 2', 'Game 3', 'Completed'] as const;
export const QUARTER_STATUSES = ['Not Started', 'Q1', 'Q1 Break', 'Q2', 'Half Time', 'Q3', 'Q3 Break', 'Q4', 'Full Time'] as const;
export const BASKETBALL_STATUSES = ['Not Started', 'Q1', 'Q1 Break', 'Q2', 'Half Time', 'Q3', 'Q3 Break', 'Q4', 'Overtime', 'Full Time'] as const;

export type MatchStatus = typeof MATCH_STATUSES[number];
export type CricketStatus = typeof CRICKET_STATUSES[number];
export type TennisStatus = typeof TENNIS_STATUSES[number];
export type QuarterStatus = typeof QUARTER_STATUSES[number];
export type BasketballStatus = typeof BASKETBALL_STATUSES[number];

// statuses that are NOT live (no pulsing dot anywhere)
export const NON_LIVE_STATUSES = ['Not Started', 'Upcoming'];
// statuses that count as "finished" (home screen: muted, no pulse; detail: no pulse)
export const FINISHED_STATUSES = ['Full Time', 'Completed', 'Finished'];

export function isLiveStatus(status: string): boolean {
  return !NON_LIVE_STATUSES.includes(status) && !FINISHED_STATUSES.includes(status);
}
export function isFinishedStatus(status: string): boolean {
  return FINISHED_STATUSES.includes(status);
}
// detail screen: pulse for anything except Not Started/Upcoming (including live AND finished? no — finished no pulse)
export function showsPulse(status: string): boolean {
  return !NON_LIVE_STATUSES.includes(status) && !FINISHED_STATUSES.includes(status);
}

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

  const cricket: CricketState | null = d.cricket
    ? {
        battingSide: d.cricket.battingSide ?? null,
        totalOvers: d.cricket.totalOvers ?? 0,
        home: { ...emptyInnings(), ...(d.cricket.home ?? {}) },
        away: { ...emptyInnings(), ...(d.cricket.away ?? {}) },
      }
    : null;

  const tennis: TennisState | null = d.tennis
    ? {
        setsFormat: d.tennis.setsFormat ?? 'Best of 3',
        player1: d.tennis.player1 ?? '',
        player2: d.tennis.player2 ?? '',
        sets: Array.isArray(d.tennis.sets) && d.tennis.sets.length
          ? d.tennis.sets.map((s: any) => ({ home: s?.home ?? 0, away: s?.away ?? 0 }))
          : Array.from(
              { length: d.tennis.setsFormat === 'Best of 5' ? 5 : 3 },
              () => ({ home: 0, away: 0 })
            ),
        homePoint: d.tennis.homePoint ?? 0,
        awayPoint: d.tennis.awayPoint ?? 0,
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

export function sideLabel(side: GameTeamSide): string {
  return [side.level, side.type].filter(Boolean).join(' ');
}

export function inningsLabel(i: CricketInnings): string {
  return `${i.runs}/${i.wickets} (${i.overs}.${i.balls})`;
}

export function emptyCricketState(): CricketState {
  return { battingSide: null, totalOvers: 0, home: emptyInnings(), away: emptyInnings() };
}

export function emptyTennisState(format: string, p1: string, p2: string): TennisState {
  const numSets = format === 'Best of 5' ? 5 : 3;
  return {
    setsFormat: format,
    player1: p1,
    player2: p2,
    sets: Array.from({ length: numSets }, () => ({ home: 0, away: 0 })),
    homePoint: 0,
    awayPoint: 0,
  };
}

export function tennisSetsWon(t: TennisState): { home: number; away: number } {
  let home = 0, away = 0;
  for (const s of t.sets) {
    if (s.home > s.away) home++;
    else if (s.away > s.home) away++;
  }
  return { home, away };
}

// per-set line for the home card, e.g. "1-2 0-0 0-0 0-0 0-0"
export function tennisSetLine(t: TennisState): string {
  return t.sets.map((s) => `${s.home}-${s.away}`).join(' ');
}

export function statusesForSport(sport: string): readonly string[] {
  if (sport === 'Cricket') return CRICKET_STATUSES;
  if (sport === 'Badminton') return BADMINTON_STATUSES;
  if (sport === 'Beach Volleyball') return VOLLEYBALL_STATUSES;
  if (isRacketSport(sport)) return TENNIS_STATUSES;
  if (sport === 'Basketball') return BASKETBALL_STATUSES;
  if (QUARTER_SPORTS.includes(sport)) return QUARTER_STATUSES;
  return MATCH_STATUSES;
}

export function firstActiveStatus(sport: string): string {
  if (sport === 'Cricket') return '1st Innings';
  if (sport === 'Badminton') return 'Game 1';
  if (isRacketSport(sport)) return 'Set 1';
  if (sport === 'Basketball' || QUARTER_SPORTS.includes(sport)) return 'Q1';
  return '1st Half';
}

// the "completed/final" status for a sport (what the winner dialog sets)
export function finishedStatusForSport(sport: string): string {
  if (sport === 'Cricket') return 'Finished';
  if (isRacketSport(sport)) return 'Completed';
  return 'Full Time';
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

// set winner + finished status in one write (used by the "Which team won?" dialog)
export async function setWinnerAndFinish(gameId: string, winner: string, sport: string) {
  await gamesCollection().doc(gameId).update({
    winner,
    status: finishedStatusForSport(sport),
    lastUpdatedBy: currentUid(),
  });
}

export async function finalizeGame(gameId: string, homeScore: number, awayScore: number, winner: string) {
  await gamesCollection().doc(gameId).update({ homeScore, awayScore, winner, status: 'Full Time', lastUpdatedBy: currentUid() });
}

export async function finalizeCricketGame(gameId: string, cricket: CricketState, winner: string) {
  await gamesCollection().doc(gameId).update({ cricket, winner, status: 'Finished', lastUpdatedBy: currentUid() });
}

export async function finalizeTennisGame(gameId: string, tennis: TennisState, winner: string) {
  await gamesCollection().doc(gameId).update({ tennis, winner, status: 'Completed', lastUpdatedBy: currentUid() });
}