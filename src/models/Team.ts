import firestore, {
    FirebaseFirestoreTypes,
} from '@react-native-firebase/firestore';

// The shape of a Team document in Firestore (no id — that's the doc key)
export interface TeamData {
  name: string;
  shortName: string | null;
  town: string | null;
  county: string | null;
  logoUrl: string | null;
  createdBy: string | null;
  createdAt: FirebaseFirestoreTypes.Timestamp | null;
  updatedAt: FirebaseFirestoreTypes.Timestamp | null;
}

// A Team as used in the app: the data plus its document id
export interface Team extends TeamData {
  id: string;
}

// Input when creating/editing from a form (only what the user controls)
export interface TeamInput {
  name: string;
  shortName?: string;
  town?: string;
  county?: string;
  logoUrl?: string | null;
}

const COLLECTION = 'Team';

export const teamsCollection = () => firestore().collection(COLLECTION);

// Map a raw Firestore doc → a typed Team (single place for the cast)
export function teamFromDoc(
  doc: FirebaseFirestoreTypes.DocumentSnapshot
): Team {
  const data = (doc.data() ?? {}) as Partial<TeamData>;
  return {
    id: doc.id,
    name: data.name ?? '',
    shortName: data.shortName ?? null,
    town: data.town ?? null,
    county: data.county ?? null,
    logoUrl: data.logoUrl ?? null,
    createdBy: data.createdBy ?? null,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

// Build the payload for a new team (normalizes blanks → null)
export function newTeamPayload(input: TeamInput, uid: string | null) {
  return {
    name: input.name.trim(),
    shortName: input.shortName?.trim() || null,
    town: input.town?.trim() || null,
    county: input.county?.trim() || null,
    logoUrl: input.logoUrl ?? null,
    createdBy: uid,
    createdAt: firestore.FieldValue.serverTimestamp(),
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };
}

// Build the payload for an edit (no createdBy/createdAt — those don't change)
export function updateTeamPayload(input: TeamInput) {
  const payload: Record<string, any> = {
    name: input.name.trim(),
    shortName: input.shortName?.trim() || null,
    town: input.town?.trim() || null,
    county: input.county?.trim() || null,
    updatedAt: firestore.FieldValue.serverTimestamp(),
  };
  // only overwrite logoUrl when a new one was provided
  if (input.logoUrl !== undefined) payload.logoUrl = input.logoUrl;
  return payload;
}

// Display helpers — keep formatting logic out of components
export function teamLocation(team: Team): string {
  return [team.town, team.county].filter(Boolean).join(', ') || 'No location set';
}

export function teamDisplayName(team: Team): string {
  return team.shortName ? `${team.name} (${team.shortName})` : team.name;
}