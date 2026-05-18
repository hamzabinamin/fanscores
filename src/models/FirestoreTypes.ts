export interface User {
  uid: string;
  username: string;
  phoneNumber: string;
  createdAt: any;
}

export interface Team {
  id?: string;
  name: string;
  shortName?: string;
  level: string; // e.g., "1st Team", "U19"
  type: string;  // e.g., "Club", "School"
  townCity: string;
  county: string;
  logoUrl?: string;
  country: string; // Used for global header filtering
}

export interface Fixture {
  id?: string;
  homeTeam: {
    id: string;
    name: string;
    teamClass: string; // e.g., "1st Team"
    level: string;
  };
  awayTeam: {
    id: string;
    name: string;
    teamClass: string;
    level: string;
  };
  date: string; // dd/mm/yyyy
  time: string; // hh:mm
  location: string;
  sport: string;  // e.g., "Rugby", "Soccer"
  gender: 'Men' | 'Female' | 'Coed';
  isAssociated: boolean; // "I am associated with this team" checkbox
  status: 'scheduled' | 'live' | 'completed';
  scores?: {
    homeScore: number;
    awayScore: number;
    winner: 'Home' | 'Away' | 'Draw';
  };
}