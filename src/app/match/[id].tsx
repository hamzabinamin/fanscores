import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator, Alert, FlatList, Image, KeyboardAvoidingView, Modal, Platform,
    ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppFilter } from '../../context/AppFilterContext';
import { useAppTheme } from '../../context/ThemeContext';
import {
    ChatMessage, messageFromDoc, messagesCollection, reportMessage, sendMessage,
} from '../../models/ChatMessage';
import {
    CricketInnings, CricketState,
    emptyCricketState,
    Game,
    gameFromDoc, gamesCollection,
    inningsLabel, MATCH_STATUSES, sideLabel, updateCricketState, updateGameScore, updateGameStatus,
} from '../../models/Game';

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

  // quick-select picker: which field, and whether it's open
  const [picker, setPicker] = useState<null | 'wickets' | 'overs'>(null);

  const currentUser = auth().currentUser;
  const isLoggedIn = !!currentUser;

  // subscribe to the game
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

  // subscribe to messages (oldest → newest)
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
  const cricket: CricketState = game.cricket ?? emptyCricketState();
  const battingSide = cricket.battingSide;
  const activeInnings: CricketInnings | null = battingSide ? cricket[battingSide] : null;

  // --- score with confirmation (non-cricket) ---
  const changeScore = (side: 'home' | 'away', delta: number) => {
    const newHome = side === 'home' ? Math.max(0, (game.homeScore ?? 0) + delta) : (game.homeScore ?? 0);
    const newAway = side === 'away' ? Math.max(0, (game.awayScore ?? 0) + delta) : (game.awayScore ?? 0);
    if (newHome === game.homeScore && newAway === game.awayScore) return; // no-op (e.g. minus at 0)

    const verb = delta > 0 ? 'increase' : 'decrease';
    const teamName = side === 'home' ? game.homeTeam.name : game.awayTeam.name;
    Alert.alert(
      'Update Score',
      `Are you sure you want to ${verb} ${teamName}'s score?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => updateGameScore(game.id, newHome, newAway).catch(() => Alert.alert('Error', 'Could not update score.')),
        },
      ]
    );
  };

  // --- cricket: write a patch to the batting side's innings ---
  const patchInnings = (title: string, msg: string, patch: Partial<CricketInnings>) => {
    if (!battingSide) {
      Alert.alert('Select batting team', 'Choose which team is batting first.');
      return;
    }
    const current = cricket[battingSide];
    const next: CricketState = { ...cricket, [battingSide]: { ...current, ...patch } };
    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateCricketState(game.id, next).catch(() => Alert.alert('Error', 'Could not update.')) },
    ]);
  };

  const addRuns = (n: number) => {
    if (!activeInnings) return;
    patchInnings('Add Runs', `Add ${n} run${n > 1 ? 's' : ''}?`, { runs: activeInnings.runs + n });
  };

  const addWicket = () => {
    if (!activeInnings || activeInnings.wickets >= 10) return;
    patchInnings('Wicket', 'Record a wicket?', { wickets: activeInnings.wickets + 1 });
  };

  const addBall = () => {
    if (!activeInnings) return;
    let overs = activeInnings.overs;
    let balls = activeInnings.balls + 1;
    if (balls >= 6) { overs += 1; balls = 0; }
    patchInnings('Next Ball', 'Advance one ball?', { overs, balls });
  };

  const undoBall = () => {
    if (!activeInnings || (activeInnings.overs === 0 && activeInnings.balls === 0)) return;
    let overs = activeInnings.overs;
    let balls = activeInnings.balls - 1;
    if (balls < 0) { overs -= 1; balls = 5; }
    patchInnings('Undo Ball', 'Go back one ball?', { overs, balls });
  };

  // --- quick-select: jump wickets or overs to a chosen value ---
  const openPicker = (field: 'wickets' | 'overs') => {
    if (!battingSide) {
      Alert.alert('Select batting team', 'Choose which team is batting first.');
      return;
    }
    setPicker(field);
  };

  const pickValue = (value: number) => {
    if (!picker || !activeInnings) { setPicker(null); return; }
    const field = picker;
    setPicker(null);
    if (activeInnings[field] === value) return; // no change

    const label = field === 'wickets' ? 'wickets' : 'overs';
    patchInnings('Set ' + label[0].toUpperCase() + label.slice(1), `Set ${label} to ${value}?`, { [field]: value });
  };

  // switching batting side only changes which innings is active — no score touched
  const setBatting = (side: 'home' | 'away') => {
    if (cricket.battingSide === side) return;
    const name = side === 'home' ? game.homeTeam.name : game.awayTeam.name;
    Alert.alert('Set Batting Side', `Switch to ${name}'s innings?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateCricketState(game.id, { ...cricket, battingSide: side }).catch(() => Alert.alert('Error', 'Could not update.')) },
    ]);
  };

  // --- status with confirmation ---
  const changeStatus = (status: string) => {
    if (status === game.status) return;
    Alert.alert(
      'Are you sure you want to make this change live?',
      `Change match status to "${status}"`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          onPress: () => updateGameStatus(game.id, status).catch(() => Alert.alert('Error', 'Could not update status.')),
        },
      ]
    );
  };

  // --- share ---
  const onShare = async () => {
    try {
      const scoreStr = isCricket
        ? `${game.homeTeam.name} ${inningsLabel(cricket.home)} · ${game.awayTeam.name} ${inningsLabel(cricket.away)}`
        : `${game.homeScore ?? 0}:${game.awayScore ?? 0}`;
      await Share.share({
        message: `${game.homeTeam.name} vs ${game.awayTeam.name} — ${scoreStr} (${game.status})`,
      });
    } catch {}
  };

  // --- send message ---
  const onSend = async () => {
    if (!draft.trim()) return;
    if (!isLoggedIn && !guestName.trim()) {
      Alert.alert('Name required', 'Please enter your name to post a message.');
      return;
    }
    setSending(true);
    try {
      const name = isLoggedIn ? (currentUser?.displayName || currentUser?.phoneNumber || 'User') : guestName;
      await sendMessage(game.id, draft, name, currentUser?.uid ?? null);
      setDraft('');
    } catch (e) {
      console.error('Send message error:', e);
      Alert.alert('Error', 'Could not send message.');
    } finally {
      setSending(false);
    }
  };

  // --- report on long-press ---
  const onReport = (msg: ChatMessage) => {
    Alert.alert('Report message', `Report this message from ${msg.authorName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () =>
          reportMessage(game.id, msg, currentUser?.uid ?? null)
            .then(() => Alert.alert('Reported', 'Thanks — this message has been reported.'))
            .catch(() => Alert.alert('Error', 'Could not report the message.')),
      },
    ]);
  };

  const ScoreButton = ({ symbol, onPress }: { symbol: string; onPress: () => void }) => (
    <TouchableOpacity style={[styles.scoreBtn, { borderColor: colors.border }]} onPress={onPress}>
      <Text style={[styles.scoreBtnText, { color: colors.text }]}>{symbol}</Text>
    </TouchableOpacity>
  );

  const TeamCol = ({ side }: { side: Game['homeTeam'] }) => {
    const logo = logoFor(side.id);
    return (
      <View style={styles.teamCol}>
        <View style={[styles.logoWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {logo ? <Image source={{ uri: logo }} style={styles.logo} />
                : <Text style={styles.logoFallback} numberOfLines={1}>{side.name}</Text>}
        </View>
        <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>{side.name}</Text>
        <View style={[styles.levelPill, { backgroundColor: theme === 'dark' ? '#2a2a2d' : '#e5e5ea' }]}>
          <Text style={[styles.levelPillText, { color: colors.textMuted }]}>{sideLabel(side)}</Text>
        </View>
      </View>
    );
  };

  // options for the active picker
  const pickerOptions =
    picker === 'wickets'
      ? Array.from({ length: 11 }, (_, i) => i)          // 0..10
      : Array.from({ length: 51 }, (_, i) => i);         // 0..50 overs
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
              {/* Status tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusRow}>
                {MATCH_STATUSES.map((s) => {
                  const active = s === game.status;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => changeStatus(s)}
                      style={[
                        styles.statusPill,
                        { borderColor: colors.border },
                        active && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                      ]}
                    >
                      <Text style={[styles.statusText, { color: active ? '#fff' : colors.text }]}>{s}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Score card */}
              <View style={[styles.scoreCard, { borderColor: colors.border }]}>
                <View style={styles.matchRow}>
                  <TeamCol side={game.homeTeam} />
                  <Text style={[styles.vs, { color: colors.textMuted }]}>VS</Text>
                  <TeamCol side={game.awayTeam} />
                </View>
                <View style={[styles.divider, { backgroundColor: colors.border }]} />

                {isCricket ? (
                  <View>
                    {/* Batting toggle */}
                    <View style={styles.battingRow}>
                      {(['home', 'away'] as const).map((s) => {
                        const active = cricket.battingSide === s;
                        const name = s === 'home' ? game.homeTeam.name : game.awayTeam.name;
                        return (
                          <TouchableOpacity
                            key={s}
                            onPress={() => setBatting(s)}
                            style={[styles.battingPill, { borderColor: colors.border }, active && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }]}
                          >
                            <Ionicons name="baseball-outline" size={14} color={active ? '#fff' : colors.textMuted} style={{ marginRight: 6 }} />
                            <Text style={[styles.battingText, { color: active ? '#fff' : colors.text }]} numberOfLines={1}>{name}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Both innings side by side; batting one highlighted */}
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
                        {/* Run buttons */}
                        <View style={styles.runRow}>
                          {[1, 2, 3, 4, 6].map((n) => (
                            <TouchableOpacity key={n} style={[styles.runBtn, { borderColor: colors.border }]} onPress={() => addRuns(n)}>
                              <Text style={[styles.runBtnText, { color: colors.text }]}>+{n}</Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        {/* Wicket + over controls (tap to increment, long-press dots for quick set) */}
                        <View style={styles.cricketActionRow}>
                          <TouchableOpacity
                            style={[styles.cricketAction, { borderColor: '#ef4444' }]}
                            onPress={addWicket}
                            onLongPress={() => openPicker('wickets')}
                          >
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

                        {/* Quick-set row */}
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

              {/* Date / time / location */}
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

              {/* Chat header */}
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
        />

        {/* Composer */}
        <View style={[styles.composer, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          {!isLoggedIn && (
            <TextInput
              style={[styles.nameInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Your name"
              placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
              value={guestName}
              onChangeText={setGuestName}
            />
          )}
          <View style={styles.composerRow}>
            <TextInput
              style={[styles.msgInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Type a message..."
              placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
              value={draft}
              onChangeText={setDraft}
              multiline
            />
            <TouchableOpacity style={[styles.sendBtn, sending && { opacity: 0.6 }]} onPress={onSend} disabled={sending}>
              {sending ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="send" size={18} color="#fff" />}
            </TouchableOpacity>
          </View>
        </View>

        {/* Quick-select picker modal (wickets / overs) */}
        <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
          <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPicker(null)}>
            <View style={[styles.pickerCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {picker === 'wickets' ? 'Set Wickets' : 'Set Overs'}
              </Text>
              <FlatList
                data={pickerOptions}
                keyExtractor={(n) => String(n)}
                numColumns={5}
                columnWrapperStyle={{ justifyContent: 'space-between' }}
                renderItem={({ item }) => {
                  const selected = item === currentPickerValue;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.pickerCell,
                        { borderColor: colors.border },
                        selected && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
                      ]}
                      onPress={() => pickValue(item)}
                    >
                      <Text style={[styles.pickerCellText, { color: selected ? '#fff' : colors.text }]}>{item}</Text>
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          </TouchableOpacity>
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
  statusPill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8 },
  statusText: { fontSize: 14, fontWeight: '600' },

  scoreCard: { borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 12 },
  matchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamCol: { flex: 1, alignItems: 'center' },
  logoWrap: { width: 84, height: 84, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginBottom: 10 },
  logo: { width: '100%', height: '100%', resizeMode: 'cover' },
  logoFallback: { fontSize: 18, fontWeight: 'bold', color: '#3b82f6', paddingHorizontal: 6, textAlign: 'center' },
  teamName: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  levelPill: { borderRadius: 6, paddingHorizontal: 10, paddingVertical: 3 },
  levelPillText: { fontSize: 13, fontWeight: '600' },
  vs: { fontSize: 20, fontWeight: '600', paddingHorizontal: 8 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16 },
  scoreControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  scoreBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  scoreBtnText: { fontSize: 22, fontWeight: '600' },
  scoreNum: { fontSize: 40, fontWeight: 'bold', minWidth: 60, textAlign: 'center' },

  // cricket
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

  // picker modal
  pickerOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 24 },
  pickerCard: { width: '100%', maxWidth: 340, borderRadius: 16, borderWidth: 1, padding: 16, maxHeight: '70%' },
  pickerTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  pickerCell: { width: '18%', aspectRatio: 1, borderWidth: 1, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  pickerCellText: { fontSize: 16, fontWeight: '600' },

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