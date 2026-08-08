import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';
import { Game, inningsLabel, sideLabel } from '../models/Game';
import { Team } from '../models/Team';

interface FixtureCardProps {
  game: Game;
  teams: Team[]; // to resolve current logos by team id
}

export default function FixtureCard({ game, teams }: FixtureCardProps) {
  const { colors, theme } = useAppTheme();
  const router = useRouter();

  const logoFor = (id: string | null) =>
    (id && teams.find((t) => t.id === id)?.logoUrl) || null;

  const kickoff = game.kickoff?.toDate();
  const dateStr = kickoff
    ? kickoff.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : '--';
  const timeStr = kickoff
    ? kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : '--:--';

  const isCricket = game.sport === 'Cricket';

  // for cricket, show the batting side's innings as the headline score;
  // fall back to home innings if no side is batting yet
  const cricketMain = isCricket && game.cricket
    ? (game.cricket.battingSide === 'away' ? game.cricket.away : game.cricket.home)
    : null;

  const onShare = async () => {
    try {
      let scoreStr: string;
      if (isCricket && game.cricket) {
        scoreStr = `${game.homeTeam.name} ${inningsLabel(game.cricket.home)} · ${game.awayTeam.name} ${inningsLabel(game.cricket.away)}`;
      } else {
        scoreStr = `${game.homeScore ?? 0}:${game.awayScore ?? 0}`;
      }
      await Share.share({
        message: `${game.homeTeam.name} vs ${game.awayTeam.name} — ${scoreStr} (${game.status})`,
      });
    } catch {
      // user dismissed the share sheet — nothing to do
    }
  };

  const TeamBlock = ({ side }: { side: Game['homeTeam'] }) => {
    const logo = logoFor(side.id);
    return (
      <View style={styles.teamBlock}>
        <View style={[styles.logoWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {logo ? (
            <Image source={{ uri: logo }} style={styles.logo} />
          ) : (
            <Text style={[styles.logoFallback, { color: '#3b82f6' }]} numberOfLines={1}>
              {side.name}
            </Text>
          )}
        </View>
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{side.name}</Text>
        <Text style={[styles.teamSub, { color: colors.textMuted }]}>{sideLabel(side)}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/match/${game.id}`)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header row: sport / gender / status */}
      <View style={styles.headerRow}>
        <Text style={styles.sport}>{game.sport.toUpperCase()}</Text>
        <View style={[styles.pill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.pillText, { color: colors.text }]}>{game.gender}</Text>
        </View>
        <View style={[styles.pill, { backgroundColor: theme === 'dark' ? '#2a2a2d' : '#e5e5ea' }]}>
          <Text style={[styles.pillText, { color: colors.textMuted }]}>{game.status}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name="checkmark-circle-outline" size={22} color="#3b82f6" />
      </View>

      {/* Teams + score */}
      <View style={styles.matchRow}>
        <TeamBlock side={game.homeTeam} />
        <View style={styles.scoreWrap}>
          {isCricket && cricketMain ? (
            <>
              <Text style={[styles.score, { color: colors.text }]}>
                {cricketMain.runs}/{cricketMain.wickets}
              </Text>
              <Text style={[styles.overs, { color: colors.textMuted }]}>
                ({cricketMain.overs}.{cricketMain.balls} ov)
              </Text>
            </>
          ) : (
            <Text style={[styles.score, { color: colors.text }]}>
              {game.homeScore ?? 0} - {game.awayScore ?? 0}
            </Text>
          )}
        </View>
        <TeamBlock side={game.awayTeam} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Footer: date / time / location */}
      <View style={styles.footerRow}>
        <View style={styles.footerItem}>
          <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{dateStr}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="time-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{timeStr}</Text>
        </View>
        <View style={styles.footerItem}>
          <Ionicons name="location-outline" size={15} color={colors.textMuted} />
          <Text style={[styles.footerText, { color: colors.textMuted }]} numberOfLines={1}>{game.location}</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Ionicons name="notifications-outline" size={18} color={colors.textMuted} style={{ marginRight: 16 }} />
        <TouchableOpacity onPress={onShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  sport: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14, marginRight: 10 },
  pill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginRight: 8, borderWidth: StyleSheet.hairlineWidth },
  pillText: { fontSize: 13, fontWeight: '600' },

  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamBlock: { flex: 1, alignItems: 'center' },
  logoWrap: { width: 90, height: 90, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  logo: { width: '100%', height: '100%', resizeMode: 'cover' },
  logoFallback: { fontSize: 20, fontWeight: 'bold', paddingHorizontal: 6, textAlign: 'center' },
  teamName: { fontSize: 16, fontWeight: 'bold' },
  teamSub: { fontSize: 13, marginTop: 2 },
  scoreWrap: { paddingHorizontal: 12, alignItems: 'center' },
  score: { fontSize: 30, fontWeight: 'bold' },
  overs: { fontSize: 12, fontWeight: '600', marginTop: 2 },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  footerText: { fontSize: 13, marginLeft: 5 },
});