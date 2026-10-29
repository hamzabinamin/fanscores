import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, Alert, Animated, FlatList, KeyboardAvoidingView, Modal, Platform,
    ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import { useAppFilter } from '../../context/AppFilterContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
    ChatMessage, messageFromDoc, messagesCollection, reportMessage, sendMessage,
} from '../../models/ChatMessage';
import {
    CricketInnings, CricketState,
    emptyCricketState,
    finishedStatusForSport,
    Game,
    gameFromDoc, gamesCollection,
    inningsLabel,
    isRacketSport,
    setUnitLabel,
    setWinnerAndFinish,
    showsPulse,
    sideLabel,
    statusesForSport,
    TENNIS_POINT_LABELS,
    TennisSet, TennisState,
    updateCricketState, updateGameScore, updateGameStatus, updateTennisState,
    usesTennisPoints
} from '../../models/Game';

// a small pulsing dot (keeps whatever color passed in)
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
  return <Animated.View style={[dotStyles.dot, { backgroundColor: color, opacity }]} />;
}
const dotStyles = StyleSheet.create({ dot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 } });

export default function MatchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors, theme } = useAppTheme();
  const { teams } = useAppFilter();

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [draft, setDraft] = useState('');
  const [guestName, setGuestName] = useState('');
  const [sending, setSending] = useState(false);

  const [picker, setPicker] = useState<null | 'wickets' | 'overs'>(null);

  // winner dialog
  const [winnerDialog, setWinnerDialog] = useState(false);

  // capturable score card for image sharing
  const shareCardRef = useRef<View>(null);

  // racket editing (local until "Update Scores")
  const [tSets, setTSets] = useState<TennisSet[]>([]);
  const [tHomePoint, setTHomePoint] = useState(0);
  const [tAwayPoint, setTAwayPoint] = useState(0);
  const [savingTennis, setSavingTennis] = useState(false);

  const currentUser = auth().currentUser;
  const isLoggedIn = !!currentUser;

  useEffect(() => {
    if (!id) return;
    const unsub = gamesCollection().doc(id).onSnapshot(
      (doc) => {
        setGame(doc.exists() ? gameFromDoc(doc) : null);
        setLoading(false);
      },
      (err) => { console.error('Match fetch error:', err); setLoading(false); }
    );
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!game) return;
    if (game.tennis && game.tennis.sets.length) {
      setTSets(game.tennis.sets.map((s) => ({ ...s })));
      setTHomePoint(game.tennis.homePoint);
      setTAwayPoint(game.tennis.awayPoint);
    } else if (isRacketSport(game.sport)) {
      const n = game.tennis?.setsFormat === 'Best of 5' ? 5 : 3;
      setTSets(Array.from({ length: n }, () => ({ home: 0, away: 0 })));
      setTHomePoint(0);
      setTAwayPoint(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game?.id]);

  useEffect(() => {
    if (!id) return;
    const unsub = messagesCollection(id)
      .orderBy('createdAt', 'asc')
      .onSnapshot(
        (snap) => setMessages(snap.docs.map(messageFromDoc)),
        (err) => console.error('Messages fetch error:', err)
      );
    return () => unsub();
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <ActivityIndicator color="#3b82f6" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }
  if (!game) {
    return (
      <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, textAlign: 'center', marginTop: 60 }}>Match not found.</Text>
      </SafeAreaView>
    );
  }

  const logoFor = (teamId: string | null) =>
    (teamId && teams.find((t) => t.id === teamId)?.logoUrl) || null;

  const kickoff = game.kickoff?.toDate();
  const isCricket = game.sport === 'Cricket';
  const isRacket = isRacketSport(game.sport);
  const tennisPoints = usesTennisPoints(game.sport);
  const unit = setUnitLabel(game.sport);
  const unitLower = unit.toLowerCase();

  const cricket: CricketState = game.cricket ?? emptyCricketState();
  const battingSide = cricket.battingSide;
  const activeInnings: CricketInnings | null = battingSide ? cricket[battingSide] : null;

  const tennis: TennisState = game.tennis ?? {
    setsFormat: 'Best of 3', player1: '', player2: '',
    sets: Array.from({ length: 3 }, () => ({ home: 0, away: 0 })),
    homePoint: 0, awayPoint: 0,
  };

  const statuses = statusesForSport(game.sport);
  const finishedStatus = finishedStatusForSport(game.sport);

  const p1Name = tennis.player1 || game.homeTeam.name;
  const p2Name = tennis.player2 || game.awayTeam.name;

  // --- numeric field edit that strips a leading zero ---
  const cleanNum = (v: string): number => {
    // remove non-digits, strip leading zeros, empty => 0
    const digits = v.replace(/[^0-9]/g, '').replace(/^0+(?=\d)/, '');
    return digits === '' ? 0 : parseInt(digits, 10);
  };

  // --- default sports score ---
  const changeScore = (side: 'home' | 'away', delta: number) => {
    const newHome = side === 'home' ? Math.max(0, (game.homeScore ?? 0) + delta) : (game.homeScore ?? 0);
    const newAway = side === 'away' ? Math.max(0, (game.awayScore ?? 0) + delta) : (game.awayScore ?? 0);
    if (newHome === game.homeScore && newAway === game.awayScore) return;

    const verb = delta > 0 ? 'increase' : 'decrease';
    const teamName = side === 'home' ? game.homeTeam.name : game.awayTeam.name;
    Alert.alert('Update Score', `Are you sure you want to ${verb} ${teamName}'s score?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateGameScore(game.id, newHome, newAway, game).catch(() => Alert.alert('Error', 'Could not update score.')) },
    ]);
  };

  // --- racket: commit local edits with confirmation ---
  const saveTennis = () => {
    Alert.alert('Update Scores', 'Save these scores?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: () => {
          setSavingTennis(true);
          const next: TennisState = { ...tennis, sets: tSets, homePoint: tHomePoint, awayPoint: tAwayPoint };
          updateTennisState(game.id, next, game)
            .catch(() => Alert.alert('Error', 'Could not update scores.'))
            .finally(() => setSavingTennis(false));
        },
      },
    ]);
  };

  const setGameAt = (index: number, side: 'home' | 'away', value: string) => {
    const n = cleanNum(value);
    setTSets((prev) => prev.map((s, i) => (i === index ? { ...s, [side]: n } : s)));
  };

  const liveHomeSets = tSets.filter((s) => s.home > s.away).length;
  const liveAwaySets = tSets.filter((s) => s.away > s.home).length;

  // --- cricket ---
  const patchInnings = (title: string, msg: string, patch: Partial<CricketInnings>) => {
    if (!battingSide) {
      Alert.alert('Select batting team', 'Choose which team is batting first.');
      return;
    }
    const current = cricket[battingSide];
    const next: CricketState = { ...cricket, [battingSide]: { ...current, ...patch } };
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateCricketState(game.id, next, game).catch(() => Alert.alert('Error', 'Could not update.')) },
    ]);
  };
  const addRuns = (n: number) => { if (!activeInnings) return; patchInnings('Add Runs', `Add ${n} run${n > 1 ? 's' : ''}?`, { runs: activeInnings.runs + n }); };
  const addWicket = () => { if (!activeInnings || activeInnings.wickets >= 10) return; patchInnings('Wicket', 'Record a wicket?', { wickets: activeInnings.wickets + 1 }); };
  const addBall = () => {
    if (!activeInnings) return;
    if (cricket.totalOvers > 0 && activeInnings.overs >= cricket.totalOvers) {
      Alert.alert('Overs complete', `This innings has reached its ${cricket.totalOvers}-over limit.`);
      return;
    }
    let overs = activeInnings.overs; let balls = activeInnings.balls + 1;
    if (balls >= 6) { overs += 1; balls = 0; }
    patchInnings('Next Ball', 'Advance one ball?', { overs, balls });
  };
  const undoBall = () => {
    if (!activeInnings || (activeInnings.overs === 0 && activeInnings.balls === 0)) return;
    let overs = activeInnings.overs; let balls = activeInnings.balls - 1;
    if (balls < 0) { overs -= 1; balls = 5; }
    patchInnings('Undo Ball', 'Go back one ball?', { overs, balls });
  };
  const openPicker = (field: 'wickets' | 'overs') => {
    if (!battingSide) { Alert.alert('Select batting team', 'Choose which team is batting first.'); return; }
    setPicker(field);
  };
  const pickValue = (value: number) => {
    if (!picker || !activeInnings) { setPicker(null); return; }
    const field = picker; setPicker(null);
    if (activeInnings[field] === value) return;
    const label = field === 'wickets' ? 'wickets' : 'overs';
    patchInnings('Set ' + label[0].toUpperCase() + label.slice(1), `Set ${label} to ${value}?`, { [field]: value });
  };
  const setBatting = (side: 'home' | 'away') => {
    if (cricket.battingSide === side) return;
    const name = side === 'home' ? game.homeTeam.name : game.awayTeam.name;
    Alert.alert('Set Batting Side', `Switch to ${name}'s innings?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => updateCricketState(game.id, { ...cricket, battingSide: side }, game).catch(() => Alert.alert('Error', 'Could not update.')) },
    ]);
  };

  // --- status change: finished status opens the winner dialog; others confirm normally ---
  const changeStatus = (status: string) => {
    if (status === game.status) return;
    if (status === finishedStatus) {
      setWinnerDialog(true);
      return;
    }
    Alert.alert('Are you sure you want to make this change live?', `Change match status to "${status}"`, [
      { text: 'No', style: 'cancel' },
      { text: 'Yes', onPress: () => updateGameStatus(game.id, status).catch(() => Alert.alert('Error', 'Could not update status.')) },
    ]);
  };

  const chooseWinner = (winner: string) => {
    setWinnerDialog(false);
    setWinnerAndFinish(game.id, winner, game.sport).catch(() => Alert.alert('Error', 'Could not finalize the match.'));
  };

  // --- share (image of the score card, falling back to text) ---
  const shareText = () => {
    let scoreStr: string;
    if (isCricket) {
      scoreStr = `${game.homeTeam.name} ${inningsLabel(cricket.home)} · ${game.awayTeam.name} ${inningsLabel(cricket.away)}`;
    } else if (isRacket) {
      scoreStr = `${p1Name} ${liveHomeSets} - ${liveAwaySets} ${p2Name} (${unitLower}s)`;
    } else {
      scoreStr = `${game.homeScore ?? 0}:${game.awayScore ?? 0}`;
    }
    return `${game.homeTeam.name} vs ${game.awayTeam.name} — ${scoreStr} (${game.status})`;
  };

  const onShare = async () => {
    try {
      const uri = await captureRef(shareCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: shareText() });
        return;
      }
    } catch {
      // capture failed — fall through to text
    }
    try {
      await Share.share({ message: shareText() });
    } catch {
      // dismissed
    }
  };

  const onSend = async () => {
    if (!draft.trim()) return;
    if (!isLoggedIn && !guestName.trim()) { Alert.alert('Name required', 'Please enter your name to post a message.'); return; }
    setSending(true);
    try {
      const name = isLoggedIn ? (currentUser?.displayName || currentUser?.phoneNumber || 'User') : guestName;
      await sendMessage(game.id, draft, name, currentUser?.uid ?? null);
      setDraft('');
    } catch (e) {
      console.error('Send message error:', e);
      Alert.alert('Error', 'Could not send message.');
    } finally { setSending(false); }
  };

  const onReport = (msg: ChatMessage) => {
    Alert.alert('Report message', `Report this message from ${msg.authorName}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Report', style: 'destructive',
        onPress: () => reportMessage(game.id, msg, currentUser?.uid ?? null)
          .then(() => Alert.alert('Reported', 'Thanks — this message has been reported.'))
          .catch(() => Alert.alert('Error', 'Could not report the message.')) },
    ]);
  };

  const ScoreButton = ({ symbol, onPress }: { symbol: string; onPress: () => void }) => (
    <TouchableOpacity style={[styles.scoreBtn, { borderColor: colors.border }]} onPress={onPress}>
      <Text style={[styles.scoreBtnText, { color: colors.text }]}>{symbol}</Text>
    </TouchableOpacity>
  );

  const TeamCol = ({ side }: { side: Game['homeTeam'] }) => {
    const logo = logoFor(side.id);
    const isWinner = !!game.winner && game.winner === side.name;
    return (
      <View style={styles.teamCol}>
        <View style={[styles.logoWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {logo ? <Image source={{ uri: logo }} style={styles.logo} cachePolicy="memory-disk" transition={150} placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
                : <Text style={styles.logoFallback} numberOfLines={1}>{side.name}</Text>}
        </View>
        <View style={styles.teamNameRow}>
          {isWinner && <Ionicons name="trophy" size={14} color="#f59e0b" style={{ marginRight: 4 }} />}
          <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{side.name}</Text>
        </View>
        <View style={[styles.levelPill, { backgroundColor: theme === 'dark' ? '#2a2a2d' : '#e5e5ea' }]}>
          <Text style={[styles.levelPillText, { color: colors.textMuted }]}>{sideLabel(side)}</Text>
        </View>
      </View>
    );
  };

  const oversMax = cricket.totalOvers > 0 ? cricket.totalOvers : 50;
  const pickerOptions =
    picker === 'wickets'
      ? Array.from({ length: 11 }, (_, i) => i)
      : Array.from({ length: oversMax + 1 }, (_, i) => i);
  const currentPickerValue = activeInnings ? (picker === 'wickets' ? activeInnings.wickets : activeInnings.overs) : null;

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.topBar}>
            <Text style={styles.sport}>{game.sport.toUpperCase()}</Text>
            <View style={[styles.genderPill, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.genderText, { color: colors.text }]}>{game.gender}</Text>
            </View>
            <Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1}>Match Details</Text>
            {game.isAssociated && (
                <Ionicons name="checkmark-circle" size={20} color="#3b82f6" style={{ marginLeft: 6 }} />
            )}
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={styles.shareBtn} onPress={onShare}>
                <Ionicons name="share-social-outline" size={16} color={colors.text} />
                <Text style={[styles.shareText, { color: colors.text }]}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
        </View>

        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          ListHeaderComponent={
            <View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
                {statuses.map((s) => {
                  const active = s === game.status;
                  const pulse = active && showsPulse(s);
                  return (
                    <TouchableOpacity key={s} onPress={() => changeStatus(s)}
                      style={[styles.statusPill, { borderColor: colors.border }, active && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}
                    >
                      {pulse && <PulsingDot color="#fff" />}
                      <Text style={[styles.statusText, { color: active ? '#fff' : colors.text }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <View ref={shareCardRef} collapsable={false} style={[styles.scoreCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                <View style={styles.matchRow}>
                  <TeamCol side={game.homeTeam} />
                  <Text style={[styles.vs, { color: colors.textMuted }]}>VS</Text>
                  <TeamCol side={game.awayTeam} />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {isCricket ? (
                  <View>
                    {cricket.totalOvers > 0 && (
                      <Text style={[styles.capLabel, { color: colors.textMuted }]}>{cricket.totalOvers} overs per side</Text>
                    )}
                    <View style={styles.battingRow}>
                      {(['home', 'away'] as const).map((s) => {
                        const active = cricket.battingSide === s;
                        const name = s === 'home' ? game.homeTeam.name : game.awayTeam.name;
                        return (
                          <TouchableOpacity key={s} onPress={() => setBatting(s)}
                            style={[styles.battingPill, { borderColor: colors.border }, active && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}>
                            <Ionicons name="baseball-outline" size={14} color={active ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[styles.battingText, { color: active ? '#fff' : colors.text }]} numberOfLines={1}>{name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <View style={styles.inningsRow}>
                      {(['home', 'away'] as const).map((s) => {
                        const inn = cricket[s];
                        const batting = cricket.battingSide === s;
                        const name = s === 'home' ? game.homeTeam.name : game.awayTeam.name;
                        return (
                          <View key={s} style={[styles.inningsCol, { opacity: batting ? 1 : 0.5 }]}>
                            <Text style={[styles.inningsName, { color: colors.textMuted }]} numberOfLines={1}>{name}</Text>
                            <Text style={[styles.inningsScore, { color: colors.text }]}>{inn.runs}/{inn.wickets}</Text>
                            <Text style={[styles.inningsOvers, { color: colors.textMuted }]}>({inn.overs}.{inn.balls} ov)</Text>
                          </View>
                        );
                      })}
                    </View>
                    {battingSide ? (
                      <>
                        <View style={styles.runRow}>
                          {[1, 2, 3, 4, 6].map((n) => (
                            <TouchableOpacity key={n} style={[styles.runBtn, { borderColor: colors.border }]} onPress={() => addRuns(n)}>
                              <Text style={[styles.runBtnText, { color: colors.text }]}>+{n}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <View style={styles.cricketActionRow}>
                          <TouchableOpacity style={[styles.cricketAction, { borderColor: '#ef4444' }]} onPress={addWicket} onLongPress={() => openPicker('wickets')}>
                            <Text style={[styles.cricketActionText, { color: '#ef4444' }]}>Wicket</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.cricketAction, { borderColor: colors.border }]} onPress={undoBall}>
                            <Ionicons name="arrow-undo-outline" size={16} color={colors.text} />
                            <Text style={[styles.cricketActionText, { color: colors.text, marginLeft: 4 }]}>Ball</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.cricketAction, { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]} onPress={addBall}>
                            <Text style={[styles.cricketActionText, { color: '#fff' }]}>Next Ball</Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.quickRow}>
                          <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.border }]} onPress={() => openPicker('wickets')}>
                            <Ionicons name="list-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[styles.quickBtnText, { color: colors.text }]}>Set Wickets</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.quickBtn, { borderColor: colors.border }]} onPress={() => openPicker('overs')}>
                            <Ionicons name="list-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[styles.quickBtnText, { color: colors.text }]}>Set Overs</Text>
                          </TouchableOpacity>
                        </View>
                      </>
                    ) : (
                      <Text style={{ color: colors.textMuted, textAlign: 'center', marginTop: 4 }}>
                        Select a batting team above to start scoring.
                      </Text>
                    )}
                  </View>
                ) : isRacket ? (
                  <View>
                    <Text style={[styles.capLabel, { color: colors.textMuted }]}>{tennis.setsFormat}</Text>

                    <Text style={[styles.tSectionLabel, { color: colors.text }]}>UPDATE {unit.toUpperCase()} SCORES</Text>
                    <View style={styles.tHeaderRow}>
                      <View style={{ width: 54 }} />
                      <Text style={[styles.tPlayerHead, { color: colors.text }]} numberOfLines={1}>{p1Name}</Text>
                      <View style={{ width: 24 }} />
                      <Text style={[styles.tPlayerHead, { color: colors.text }]} numberOfLines={1}>{p2Name}</Text>
                    </View>

                    {tSets.map((s, i) => (
                      <View key={i} style={styles.tSetRow}>
                        <Text style={[styles.tSetLabel, { color: colors.textMuted }]}>{unit} {i + 1}</Text>
                        <TextInput
                          style={[styles.tSetInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                          keyboardType="number-pad" value={String(s.home)} onChangeText={(v) => setGameAt(i, 'home', v)} selectTextOnFocus
                        />
                        <Text style={[styles.tDash, { color: colors.textMuted }]}>–</Text>
                        <TextInput
                          style={[styles.tSetInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                          keyboardType="number-pad" value={String(s.away)} onChangeText={(v) => setGameAt(i, 'away', v)} selectTextOnFocus
                        />
                      </View>
                    ))}

                    <View style={styles.tSetsWonRow}>
                      <Text style={[styles.tSetsWon, { color: colors.text }]}>{liveHomeSets} {unitLower}s</Text>
                      <Text style={[styles.tSetsWonLabel, { color: colors.textMuted }]}>{unit.toUpperCase()}S WON</Text>
                      <Text style={[styles.tSetsWon, { color: colors.text }]}>{liveAwaySets} {unitLower}s</Text>
                    </View>

                    {tennisPoints ? (
                      <>
                        <Text style={[styles.tSectionLabel, { color: colors.text, marginTop: 18 }]}>
                          CURRENT GAME SCORE{'  '}
                          <Text style={{ color: colors.textMuted }}>
                            {TENNIS_POINT_LABELS[tHomePoint]} – {TENNIS_POINT_LABELS[tAwayPoint]}
                          </Text>
                        </Text>
                        <Text style={[styles.tPointName, { color: colors.text }]}>{p1Name}</Text>
                        <View style={styles.tPointRow}>
                          {TENNIS_POINT_LABELS.map((lbl, i) => (
                            <TouchableOpacity key={lbl} onPress={() => setTHomePoint(i)}
                              style={[styles.tPointBtn, { borderColor: colors.border }, tHomePoint === i && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}>
                              <Text style={[styles.tPointText, { color: tHomePoint === i ? '#fff' : colors.text }]}>{lbl}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                        <Text style={[styles.tPointName, { color: colors.text }]}>{p2Name}</Text>
                        <View style={styles.tPointRow}>
                          {TENNIS_POINT_LABELS.map((lbl, i) => (
                            <TouchableOpacity key={lbl} onPress={() => setTAwayPoint(i)}
                              style={[styles.tPointBtn, { borderColor: colors.border }, tAwayPoint === i && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}>
                              <Text style={[styles.tPointText, { color: tAwayPoint === i ? '#fff' : colors.text }]}>{lbl}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.tSectionLabel, { color: colors.text, marginTop: 18 }]}>
                          CURRENT {unit.toUpperCase()} SCORE (IN PROGRESS)
                        </Text>
                        <View style={styles.curScoreRow}>
                          <View style={styles.curScoreCol}>
                            <Text style={[styles.curScoreName, { color: colors.text }]} numberOfLines={1}>{p1Name}</Text>
                            <View style={styles.curScoreControls}>
                              <ScoreButton symbol="–" onPress={() => setTHomePoint(Math.max(0, tHomePoint - 1))} />
                              <Text style={[styles.curScoreNum, { color: colors.text }]}>{tHomePoint}</Text>
                              <ScoreButton symbol="+" onPress={() => setTHomePoint(tHomePoint + 1)} />
                            </View>
                          </View>
                          <Text style={[styles.curScoreDash, { color: colors.textMuted }]}>–</Text>
                          <View style={styles.curScoreCol}>
                            <Text style={[styles.curScoreName, { color: colors.text }]} numberOfLines={1}>{p2Name}</Text>
                            <View style={styles.curScoreControls}>
                              <ScoreButton symbol="–" onPress={() => setTAwayPoint(Math.max(0, tAwayPoint - 1))} />
                              <Text style={[styles.curScoreNum, { color: colors.text }]}>{tAwayPoint}</Text>
                              <ScoreButton symbol="+" onPress={() => setTAwayPoint(tAwayPoint + 1)} />
                            </View>
                          </View>
                        </View>
                      </>
                    )}

                    <TouchableOpacity style={[styles.tUpdateBtn, savingTennis && { opacity: 0.6 }]} onPress={saveTennis} disabled={savingTennis}>
                      {savingTennis ? <ActivityIndicator color="#fff" /> : <Text style={styles.tUpdateText}>Update Scores</Text>}
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.scoreControls}>
                    <ScoreButton symbol="–" onPress={() => changeScore('home', -1)} />
                    <Text style={[styles.scoreNum, { color: colors.text }]}>{game.homeScore ?? 0}</Text>
                    <ScoreButton symbol="+" onPress={() => changeScore('home', +1)} />
                    <View style={{ width: 24 }} />
                    <ScoreButton symbol="–" onPress={() => changeScore('away', -1)} />
                    <Text style={[styles.scoreNum, { color: colors.text }]}>{game.awayScore ?? 0}</Text>
                    <ScoreButton symbol="+" onPress={() => changeScore('away', +1)} />
                  </View>
                )}
              </View>

              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {kickoff ? kickoff.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '--'}
                </Text>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} style={{ marginLeft: 12 }} />
                <Text style={[styles.metaText, { color: colors.textMuted }]}>
                  {kickoff ? kickoff.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                </Text>
                <Ionicons name="location-outline" size={15} color={colors.textMuted} style={{ marginLeft: 12 }} />
                <Text style={[styles.metaText, { color: colors.textMuted }]} numberOfLines={1}>{game.location}</Text>
              </View>

              <View style={styles.chatHeader}>
                <Text style={[styles.chatTitle, { color: colors.text }]}>Match Chat</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.7} onLongPress={() => onReport(item)} style={styles.msgRow}>
              <View style={[styles.msgAvatar, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={{ color: '#3b82f6', fontWeight: 'bold' }}>{item.authorName.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.msgMetaRow}>
                  <Text style={[styles.msgAuthor, { color: colors.text }]}>{item.authorName}</Text>
                  <Text style={[styles.msgTime, { color: colors.textMuted }]}>
                    {item.createdAt?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) ?? ''}
                  </Text>
                </View>
                <Text style={[styles.msgText, { color: colors.text }]}>{item.text}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: colors.textMuted, textAlign: 'center', marginVertical: 20 }}>
              No messages yet. Be the first to comment.
            </Text>
          }
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {!isLoggedIn && (
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Your name" placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
              value={guestName} onChangeText={setGuestName}
            />
          )}
          <View style={styles.composerRow}>
            <TextInput
              style={[styles.msgInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Type a message..." placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
              value={draft} onChangeText={setDraft} multiline
            />
            <TouchableOpacity style={[styles.sendBtn, sending && { opacity: 0.6 }]} onPress={onSend} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick-select picker modal */}
        <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPicker(null)}>
            <View style={[styles.pickerCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>{picker === 'wickets' ? 'Set Wickets' : 'Set Overs'}</Text>
              <FlatList
                data={pickerOptions} keyExtractor={(n) => String(n)} numColumns={5}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                renderItem={({ item }) => {
                  const selected = item === currentPickerValue;
                  return (
                    <TouchableOpacity
                      style={[styles.pickerCell, { borderColor: colors.border }, selected && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}
                      onPress={() => pickValue(item)}>
                      <Text style={[styles.pickerCellText, { color: selected ? '#fff' : colors.text }]}>{item}</Text>
                    </TouchableOpacity>
                  );
                }}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Winner dialog */}
        <Modal visible={winnerDialog} transparent animationType="fade" onRequestClose={() => setWinnerDialog(false)}>
          <View style={styles.winnerOverlay}>
            <View style={[styles.winnerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.winnerTitle, { color: colors.text }]}>Which team won?</Text>
              <Text style={[styles.winnerSub, { color: colors.textMuted }]}>
                Select the winning team to mark this match as {finishedStatus}
              </Text>

              <TouchableOpacity
                style={[styles.winnerOption, { borderColor: colors.border }]}
                onPress={() => chooseWinner(game.homeTeam.name)}
              >
                <Ionicons name="trophy-outline" size={20} color="#f59e0b" style={{ marginRight: 12 }} />
                <Text style={[styles.winnerName, { color: colors.text }]} numberOfLines={1}>{game.homeTeam.name}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[styles.winnerSide, { color: colors.textMuted }]}>Left</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.winnerOption, { borderColor: colors.border }]}
                onPress={() => chooseWinner(game.awayTeam.name)}
              >
                <Ionicons name="trophy-outline" size={20} color="#f59e0b" style={{ marginRight: 12 }} />
                <Text style={[styles.winnerName, { color: colors.text }]} numberOfLines={1}>{game.awayTeam.name}</Text>
                <View style={{ flex: 1 }} />
                <Text style={[styles.winnerSide, { color: colors.textMuted }]}>Right</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.winnerOption, { borderColor: colors.border }]}
                onPress={() => chooseWinner('Draw / No Winner')}
              >
                <Text style={[styles.winnerName, { color: colors.text }]}>Draw / No Winner</Text>
              </TouchableOpacity>

              <View style={styles.winnerFooter}>
                <TouchableOpacity style={[styles.winnerCancel, { borderColor: colors.border }]} onPress={() => setWinnerDialog(false)}>
                  <Text style={[styles.winnerCancelText, { color: colors.text }]}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12 },
  sport: { color: '#3b82f6', fontWeight: 'bold', fontSize: 14, marginRight: 8 },
  genderPill: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 3, borderWidth: StyleSheet.hairlineWidth, marginRight: 10 },
  genderText: { fontSize: 12, fontWeight: '600' },
  titleText: { fontSize: 18, fontWeight: 'bold', flexShrink: 1 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth, borderColor: '#555', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  shareText: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  closeBtn: { marginLeft: 8, flexShrink: 0 },

  statusRow: { paddingVertical: 12, gap: 8 },
  statusPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '600' },

  scoreCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamCol: { flex: 1, alignItems: 'center' },
  logoWrap: { width: 84, height: 84, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  logo: { width: '100%', height: '100%', resizeMode: 'cover' },
  logoFallback: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6', paddingHorizontal: 6, textAlign: 'center' },
  teamNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  teamName: { fontSize: 16, fontWeight: 'bold' },
  levelPill: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  levelPillText: { fontSize: 13, fontWeight: '600' },
  vs: { fontSize: 20, fontWeight: '600', paddingHorizontal: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  scoreControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  scoreBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  scoreBtnText: { fontSize: 22, fontWeight: '600' },
  scoreNum: { fontSize: 40, fontWeight: 'bold', minWidth: 60, textAlign: 'center' },

  capLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 12 },

  battingRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 16, gap: 8 },
  battingPill: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, maxWidth: '46%' },
  battingText: { fontSize: 13, fontWeight: '600' },
  inningsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  inningsCol: { alignItems: 'center', flex: 1 },
  inningsName: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  inningsScore: { fontSize: 28, fontWeight: 'bold' },
  inningsOvers: { fontSize: 12, marginTop: 2 },
  runRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  runBtn: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  runBtnText: { fontSize: 16, fontWeight: 'bold' },
  cricketActionRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 },
  cricketAction: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  cricketActionText: { fontSize: 14, fontWeight: '600' },
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  quickBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  quickBtnText: { fontSize: 13, fontWeight: '600' },

  tSectionLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 10 },
  tHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tPlayerHead: { flex: 1, fontSize: 13, fontWeight: '600', textAlign: 'center' },
  tSetRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  tSetLabel: { width: 54, fontSize: 13 },
  tSetInput: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, fontSize: 15, textAlign: 'center' },
  tDash: { paddingHorizontal: 10, fontSize: 16 },
  tSetsWonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 8, marginBottom: 4 },
  tSetsWon: { fontSize: 14, fontWeight: 'bold' },
  tSetsWonLabel: { fontSize: 12, fontWeight: '600' },
  tPointName: { fontSize: 13, fontWeight: '600', marginTop: 10, marginBottom: 6 },
  tPointRow: { flexDirection: 'row', gap: 8 },
  tPointBtn: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  tPointText: { fontSize: 13, fontWeight: '600' },
  tUpdateBtn: { backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  tUpdateText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  curScoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 },
  curScoreCol: { flex: 1, alignItems: 'center' },
  curScoreName: { fontSize: 14, fontWeight: '600', marginBottom: 10, textAlign: 'center' },
  curScoreControls: { flexDirection: 'row', alignItems: 'center' },
  curScoreNum: { fontSize: 34, fontWeight: 'bold', minWidth: 46, textAlign: 'center' },
  curScoreDash: { fontSize: 20, paddingHorizontal: 6 },

  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  pickerCard: { width: '100%', maxWidth: 340, borderRadius: 16, borderWidth: 1, padding: 16, maxHeight: '70%' },
  pickerTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  pickerCell: { width: '18%', aspectRatio: 1, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  pickerCellText: { fontSize: 16, fontWeight: '600' },

  // winner dialog
  winnerOverlay: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(0,0,0,0.6)' },
  winnerCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  winnerTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  winnerSub: { fontSize: 14, marginBottom: 20, lineHeight: 20 },
  winnerOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 16, marginBottom: 12 },
  winnerName: { fontSize: 16, fontWeight: '600' },
  winnerSide: { fontSize: 14 },
  winnerFooter: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 4 },
  winnerCancel: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  winnerCancelText: { fontSize: 15, fontWeight: '600' },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 },
  metaText: { fontSize: 13, marginLeft: 5 },

  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#333', paddingTop: 16, marginBottom: 8 },
  chatTitle: { fontSize: 16, fontWeight: 'bold' },

  msgRow: { flexDirection: 'row', paddingVertical: 10 },
  msgAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  msgMetaRow: { flexDirection: 'row', alignItems: 'center' },
  msgAuthor: { fontSize: 14, fontWeight: '600', marginRight: 8 },
  msgTime: { fontSize: 12 },
  msgText: { fontSize: 14, marginTop: 2 },

  composer: { borderTopWidth: 1, padding: 12 },
  nameInput: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 8 },
  composerRow: { flexDirection: 'row', alignItems: 'flex-end' },
  msgInput: { flex: 1, borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 100, marginRight: 8 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center' },
});