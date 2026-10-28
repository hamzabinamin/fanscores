import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import FixtureCard from '../../components/FixtureCard';
import GlobalHeader from '../../components/GlobalHeader';
import { useAppFilter } from '../../context/AppFilterContext';
import { useAppTheme } from '../../context/ThemeContext';
import { deleteGame, Game, gameFromDoc, gamesCollection } from '../../models/Game';

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const { teams, selectedTeam, country } = useAppFilter();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  // track open swipeables so we can close them after action
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});

  useEffect(() => {
    const unsub = gamesCollection().onSnapshot(
      (snap) => {
        const list = snap.docs.map(gameFromDoc).sort((a, b) => {
          const at = a.kickoff?.toMillis() ?? 0;
          const bt = b.kickoff?.toMillis() ?? 0;
          return at - bt;
        });
        setGames(list);
        setLoading(false);
      },
      (err) => { console.error('Games fetch error:', err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  // apply the header's country + team filters
  const visibleGames = games.filter((g) => {
    // country: either side plays for the selected country
    if (country && g.homeTeam.country !== country && g.awayTeam.country !== country) {
      return false;
    }
    // team: either side is the selected team
    if (selectedTeam && g.homeTeam.id !== selectedTeam.id && g.awayTeam.id !== selectedTeam.id) {
      return false;
    }
    return true;
  });

  const confirmDelete = (game: Game) => {
    swipeRefs.current[game.id]?.close(); // snap the row back
    Alert.alert(
      'Delete Fixture',
      `Delete ${game.homeTeam.name} vs ${game.awayTeam.name}? This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            deleteGame(game.id).catch(() => Alert.alert('Error', 'Could not delete the fixture.')),
        },
      ]
    );
  };

  const renderRightActions = (game: Game) => (
    <TouchableOpacity style={styles.deleteAction} onPress={() => confirmDelete(game)}>
      <Ionicons name="trash-outline" size={24} color="#fff" />
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader />
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 60 }} />
      </View>
    );
  }

  if (visibleGames.length === 0) {
    // tailor the empty message to whether a filter is active
    const filtered = !!country || !!selectedTeam;
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader />
        <View style={styles.content}>
          <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
            <Ionicons name="trophy-outline" size={40} color={colors.textMuted} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>No Fixtures Yet</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {filtered
              ? 'No fixtures match the selected filters. Try choosing a different country or team.'
              : 'Get started by creating your first fixture. Add some teams first, then schedule a match between them.'}
          </Text>
          {!filtered && (
            <View style={styles.hintRow}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.hintText, { color: colors.textMuted }]}>
                Click "Create Fixture" in the header to begin
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <GlobalHeader />
        <FlatList
          data={visibleGames}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Swipeable
              ref={(r) => { swipeRefs.current[item.id] = r; }}
              renderRightActions={() => renderRightActions(item)}
              overshootRight={false}
            >
              <FixtureCard game={item} teams={teams} />
            </Swipeable>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </GestureHandlerRootView>
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
  deleteAction: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    marginBottom: 16,
    borderRadius: 16,
    marginLeft: 8,
  },
  deleteText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 4 },
});