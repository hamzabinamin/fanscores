import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef } from 'react';
import { Alert, Animated, Image, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { useAppTheme } from '../context/ThemeContext';
import {
  Game, inningsLabel, isFinishedStatus, isLiveStatus, isRacketSport,
  sideLabel, tennisSetLine, tennisSetsWon,
} from '../models/Game';
import { setGameSubscription } from '../models/notifications';
import { Team } from '../models/Team';

interface FixtureCardProps {
  game: Game;
  teams: Team[];
}

function PulsingDot({ color }: { color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.2, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return <Animated.View style={[styles.liveDot, { backgroundColor: color, opacity }]} />;
}

export default function FixtureCard({ game, teams }: FixtureCardProps) {
  const { colors, theme } = useAppTheme();
  const router = useRouter();
  const cardRef = useRef<View>(null);

  const uid = auth().currentUser?.uid;
  const subscribed = !!uid && (game.subscribers ?? []).includes(uid);

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
  const isRacket = isRacketSport(game.sport);
  const live = isLiveStatus(game.status);
  const finished = isFinishedStatus(game.status);

  const cricketMain = isCricket && game.cricket
    ? (game.cricket.battingSide === 'away' ? game.cricket.away : game.cricket.home)
    : null;

  const racketSets = isRacket && game.tennis ? tennisSetsWon(game.tennis) : null;
  const racketSetLine = isRacket && game.tennis ? tennisSetLine(game.tennis) : null;

  const toggleSubscribe = async () => {
    if (!uid) {
      Alert.alert('Sign in required', 'Please sign in to get notifications for this match.');
      return;
    }
    try {
      await setGameSubscription(game.id, !subscribed);
    } catch {
      Alert.alert('Error', 'Could not update notifications for this game.');
    }
  };

  const shareMessage = () => {
    let scoreStr: string;
    if (isCricket && game.cricket) {
      scoreStr = `${game.homeTeam.name} ${inningsLabel(game.cricket.home)} · ${game.awayTeam.name} ${inningsLabel(game.cricket.away)}`;
    } else if (racketSets) {
      scoreStr = `${racketSets.home} - ${racketSets.away}`;
    } else {
      scoreStr = `${game.homeScore ?? 0}:${game.awayScore ?? 0}`;
    }
    return `${game.homeTeam.name} vs ${game.awayTeam.name} — ${scoreStr} (${game.status})`;
  };

  const onShare = async () => {
    // try to share an image of the card; fall back to text
    try {
      const uriCapture = await captureRef(cardRef, { format: 'png', quality: 1 });
      const canShareFiles = await Sharing.isAvailableAsync();
      if (canShareFiles) {
        await Sharing.shareAsync(uriCapture, {
          mimeType: 'image/png',
          dialogTitle: shareMessage(),
        });
        return;
      }
    } catch {
      // capture failed — fall through to text share
    }
    try {
      await Share.share({ message: shareMessage() });
    } catch {
      // dismissed
    }
  };

  const TeamBlock = ({ side }: { side: Game['homeTeam'] }) => {
    const logo = logoFor(side.id);
    const isWinner = !!game.winner && game.winner === side.name;
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
        <View style={styles.teamNameRow}>
          {isWinner && <Ionicons name="trophy" size={13} color="#f59e0b" style={{ marginRight: 4 }} />}
          <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{side.name}</Text>
        </View>
        <Text style={[styles.teamSub, { color: colors.textMuted }]}>{sideLabel(side)}</Text>
      </View>
    );
  };

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/match/${game.id}`)}
    >
      <View ref={cardRef} collapsable={false} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.sport}>{game.sport.toUpperCase()}</Text>
          <View style={[styles.pill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.pillText, { color: colors.text }]}>{game.gender}</Text>
          </View>
          {live ? (
            <View style={styles.livePill}>
              <PulsingDot color="#fff" />
              <Text style={styles.liveText}>{game.status}</Text>
            </View>
          ) : (
            <View style={[styles.pill, { backgroundColor: theme === 'dark' ? '#2a2a2d' : '#e5e5ea' }]}>
              <Text style={[styles.pillText, { color: colors.textMuted }]}>{game.status}</Text>
            </View>
          )}
          <View style={{ flex: 1 }} />
          {game.isAssociated && (
            <Ionicons name="checkmark-circle" size={22} color="#3b82f6" />
          )}
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
                <Text style={[styles.subScore, { color: colors.textMuted }]}>
                  ({cricketMain.overs}.{cricketMain.balls} ov)
                </Text>
              </>
            ) : racketSets ? (
              <>
                <Text style={[styles.score, { color: colors.text }]}>
                  {racketSets.home} - {racketSets.away}
                </Text>
                {!!racketSetLine && (
                  <Text style={[styles.subScore, { color: colors.textMuted }]} numberOfLines={1}>
                    {racketSetLine}
                  </Text>
                )}
                {!!game.tennis?.setsFormat && (
                  <Text style={[styles.subScore2, { color: colors.textMuted }]}>{game.tennis.setsFormat}</Text>
                )}
              </>
            ) : (
              <Text style={[styles.score, { color: colors.text }]}>
                {game.homeScore ?? 0} - {game.awayScore ?? 0}
              </Text>
            )}
          </View>
          <TeamBlock side={game.awayTeam} />
        </View>

        <View style={[styles.divider, { backgroundColor: colors.border }]} />

        {/* Footer */}
        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>{dateStr}</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="time-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>{timeStr}</Text>
          </View>
          <View style={[styles.footerItem, styles.footerItemFlex]}>
            <Ionicons name="location-outline" size={15} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]} numberOfLines={1}>{game.location}</Text>
          </View>
          <View style={styles.footerActions}>
            <TouchableOpacity onPress={toggleSubscribe} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ marginRight: 16 }}>
              <Ionicons
                name={subscribed ? 'notifications' : 'notifications-outline'}
                size={18}
                color={subscribed ? '#3b82f6' : colors.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShare} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>
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

  livePill: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, marginRight: 8 },
  liveDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  liveText: { color: '#fff', fontSize: 13, fontWeight: '600' },

  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamBlock: { flex: 1, alignItems: 'center' },
  logoWrap: { width: 90, height: 90, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  logo: { width: '100%', height: '100%', resizeMode: 'cover' },
  logoFallback: { fontSize: 20, fontWeight: 'bold', paddingHorizontal: 6, textAlign: 'center' },
  teamNameRow: { flexDirection: 'row', alignItems: 'center' },
  teamName: { fontSize: 16, fontWeight: 'bold' },
  teamSub: { fontSize: 13, marginTop: 2 },
  scoreWrap: { paddingHorizontal: 10, alignItems: 'center', flexShrink: 0 },
  score: { fontSize: 30, fontWeight: 'bold' },
  subScore: { fontSize: 12, fontWeight: '600', marginTop: 4 },
  subScore2: { fontSize: 12, marginTop: 2 },

  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  footerItem: { flexDirection: 'row', alignItems: 'center', marginRight: 14 },
  footerItemFlex: { flexShrink: 1, minWidth: 0 },
  footerActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, marginLeft: 'auto' },
  footerText: { fontSize: 13, marginLeft: 5 },
});