import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import FixtureCard from '../../components/FixtureCard';
import GlobalHeader from '../../components/GlobalHeader';
import { useAppFilter } from '../../context/AppFilterContext';
import { useAppTheme } from '../../context/ThemeContext';
import { Game, gameFromDoc, gamesCollection } from '../../models/Game';

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { teams, selectedTeam } = useAppFilter(); // teams for logos, selectedTeam for filtering
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = gamesCollection().onSnapshot(
      (snap) => {
        const list = snap.docs.map(gameFromDoc).sort((a, b) => {
          const at = a.kickoff?.toMillis() ?? 0;
          const bt = b.kickoff?.toMillis() ?? 0;
          return at - bt; // soonest first
        });
        setGames(list);
        setLoading(false);
      },
      (err) => { console.error('Games fetch error:', err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // apply the header's team filter (by id on either side)
  const visibleGames = selectedTeam
    ? games.filter((g) => g.homeTeam.id === selectedTeam.id || g.awayTeam.id === selectedTeam.id)
    : games;

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader />
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (visibleGames.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader />
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
            <Ionicons name="trophy-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>No Fixtures Yet</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            Get started by creating your first fixture. Add some teams first, then schedule a match between them.
          </Text>
          <View style={styles.hintRow}>
            <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
            <Text style={[styles.hintText, { color: colors.textMuted }]}>
              Click "Create Fixture" in the header to begin
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />
      <FlatList
        data={visibleGames}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FixtureCard game={item} teams={teams} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { padding: 16 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  hintRow: { flexDirection: 'row', alignItems: 'center' },
  hintText: { fontSize: 14 },
});