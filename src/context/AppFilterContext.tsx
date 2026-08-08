import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useState } from 'react';
import { Team, teamFromDoc, teamsCollection } from '../models/Team';

const COUNTRY_KEY = '@fanscores/country';
const TEAM_ID_KEY = '@fanscores/selectedTeamId';

interface AppFilterValue {
  teams: Team[];
  selectedTeam: Team | null;      // null = "All Teams"
  setSelectedTeam: (t: Team | null) => void;
  country: string;
  setCountry: (c: string) => void;
  loadingTeams: boolean;
  hydrated: boolean;              // true once persisted values are loaded
}

const AppFilterContext = createContext<AppFilterValue | undefined>(undefined);

export function AppFilterProvider({ children }: { children: React.ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeamState] = useState<Team | null>(null);
  const [country, setCountryState] = useState('Australia');
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  // remember the persisted team id until the teams list arrives to resolve it
  const [pendingTeamId, setPendingTeamId] = useState<string | null>(null);

  // 1. Load persisted values on mount
  useEffect(() => {
    (async () => {
      try {
        const [savedCountry, savedTeamId] = await Promise.all([
          AsyncStorage.getItem(COUNTRY_KEY),
          AsyncStorage.getItem(TEAM_ID_KEY),
        ]);
        if (savedCountry) setCountryState(savedCountry);
        if (savedTeamId) setPendingTeamId(savedTeamId);
      } catch (e) {
        console.error('Filter hydrate error:', e);
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // 2. Subscribe to teams
  useEffect(() => {
    const unsub = teamsCollection().onSnapshot(
      (snap) => {
        const list = snap.docs.map(teamFromDoc).sort((a, b) => a.name.localeCompare(b.name));
        setTeams(list);
        setLoadingTeams(false);

        // resolve a persisted team id → full Team object, once
        if (pendingTeamId) {
          setSelectedTeamState(list.find((t) => t.id === pendingTeamId) ?? null);
          setPendingTeamId(null);
        } else {
          // keep current selection in sync if it was edited/deleted elsewhere
          setSelectedTeamState((prev) => (prev ? list.find((t) => t.id === prev.id) ?? null : null));
        }
      },
      (err) => { console.error('Team filter fetch error:', err); setLoadingTeams(false); }
    );
    return () => unsub();
  }, [pendingTeamId]);

  // 3. Setters that also persist
  const setSelectedTeam = (t: Team | null) => {
    setSelectedTeamState(t);
    AsyncStorage.setItem(TEAM_ID_KEY, t ? t.id : '').catch(() => {});
  };

  const setCountry = (c: string) => {
    setCountryState(c);
    AsyncStorage.setItem(COUNTRY_KEY, c).catch(() => {});
  };

  return (
    <AppFilterContext.Provider
      value={{ teams, selectedTeam, setSelectedTeam, country, setCountry, loadingTeams, hydrated }}
    >
      {children}
    </AppFilterContext.Provider>
  );
}

export function useAppFilter() {
  const ctx = useContext(AppFilterContext);
  if (!ctx) throw new Error('useAppFilter must be used within an AppFilterProvider');
  return ctx;
}