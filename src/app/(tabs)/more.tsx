import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimeField from '../../components/DateTimeField';
import GlobalHeader from '../../components/GlobalHeader';
import SelectField from '../../components/SelectField';
import { COUNTRIES, GENDERS, SPORTS } from '../../constants/gameOptions';
import { useAppTheme } from '../../context/ThemeContext';
import {
  CricketState, emptyCricketState, finalizeCricketGame, finalizeGame,
  Game, gameFromDoc, gamesCollection,
} from '../../models/Game';
import { registerForPush, setNotificationsEnabled } from '../../models/notifications';
import {
  newTeamPayload,
  Team,
  teamDisplayName,
  teamFromDoc,
  teamLocation,
  teamsCollection,
  updateTeamPayload,
} from '../../models/Team';
import { deactivateAccount } from '../../models/User';

export default function MoreScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(false);
  const { colors, theme } = useAppTheme();

  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  // Modal toggle views state
  const [addTeamVisible, setAddTeamVisible] = useState(false);
  const [editTeamsVisible, setEditTeamsVisible] = useState(false);
  const [addResultVisible, setAddResultVisible] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [town, setTown] = useState('');
  const [country, setCountry] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [editForm, setEditForm] = useState({ name: '', shortName: '', town: '', country: '' });
  const [editLogoUri, setEditLogoUri] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Add Result: games + filters
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [fCountry, setFCountry] = useState('');
  const [fSport, setFSport] = useState('');
  const [fGender, setFGender] = useState('');
  const [fLocation, setFLocation] = useState('');
  const [fDate, setFDate] = useState<Date | null>(null);

  const [selectedGame, setSelectedGame] = useState<Game | null>(null);

  // result entry (regular)
  const [resHome, setResHome] = useState('0');
  const [resAway, setResAway] = useState('0');
  const [resWinner, setResWinner] = useState('');

  // result entry (cricket)
  const [resCricket, setResCricket] = useState<CricketState>(emptyCricketState());

  const [savingResult, setSavingResult] = useState(false);

  useEffect(() => {
    setPhoneNumber(auth().currentUser?.phoneNumber ?? null);
  }, []);

  // ---- notification preference (load saved value) ----
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) return;
    const unsub = firestore().collection('Users').doc(uid).onSnapshot(
      (doc) => setNotifications(doc.data()?.notificationsEnabled === true),
      (err) => console.error('Notif pref fetch error:', err)
    );
    return () => unsub();
  }, []);

  // ---- teams subscription ----
  useEffect(() => {
    const uid = auth().currentUser?.uid;
    if (!uid) { setLoadingTeams(false); return; }

    const unsub = teamsCollection()
      .where('createdBy', '==', uid)
      .onSnapshot(
        (snap) => {
          setTeams(snap.docs.map(teamFromDoc).sort((a, b) => a.name.localeCompare(b.name)));
          setLoadingTeams(false);
        },
        (err) => { console.error('Teams fetch error:', err); setLoadingTeams(false); }
      );
    return () => unsub();
  }, []);

  // ---- games subscription (only while the result modal is open) ----
  useEffect(() => {
    if (!addResultVisible) return;
    const unsub = gamesCollection().onSnapshot(
      (snap) => setAllGames(snap.docs.map(gameFromDoc)),
      (err) => console.error('Result games fetch error:', err)
    );
    return () => unsub();
  }, [addResultVisible]);

  const filteredGames = allGames.filter((g) => {
    if (fCountry && g.homeTeam.country !== fCountry && g.awayTeam.country !== fCountry) return false;
    if (fSport && g.sport !== fSport) return false;
    if (fGender && g.gender !== fGender) return false;
    if (fLocation.trim() && !g.location.toLowerCase().includes(fLocation.trim().toLowerCase())) return false;
    if (fDate) {
      const k = g.kickoff?.toDate();
      if (!k || k.toDateString() !== fDate.toDateString()) return false;
    }
    return true;
  });

  // ---- notifications toggle ----
  const onToggleNotifications = async (value: boolean) => {
    setNotifications(value); // optimistic
    try {
      if (value) {
        const token = await registerForPush();
        if (!token) {
          setNotifications(false);
          Alert.alert(
            'Notifications',
            'Enable notifications in your device settings to receive match updates.'
          );
        }
      } else {
        await setNotificationsEnabled(false);
      }
    } catch (error) {
      console.error('Toggle notifications error:', error);
      setNotifications(false);
      Alert.alert('Error', 'Could not update your notification setting.');
    }
  };

  const pickLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to upload a logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setLogoUri(result.assets[0].uri);
    }
  };

  const resetForm = () => {
    setTeamName(''); setShortName(''); setTown(''); setCountry(''); setLogoUri(null);
  };

  const openEmail = async (subject: string) => {
    const to = 'info@myfanscores.com';   
    const url = `mailto:${to}?subject=${encodeURIComponent(subject)}`;
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert('No email app', `Please email us at ${to}`);
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Error', `Could not open your email app. Reach us at ${to}`);
    }
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Missing info', 'Please enter a team name.');
      return;
    }

    setSaving(true);
    try {
      let logoUrl: string | null = null;

      if (logoUri) {
        const uid = auth().currentUser?.uid ?? 'anon';
        const path = `teamLogos/${uid}_${Date.now()}.jpg`;
        const ref = storage().ref(path);
        await ref.putFile(logoUri);
        logoUrl = await ref.getDownloadURL();
      }

      await teamsCollection().add(
        newTeamPayload(
          { name: teamName, shortName, town, country, logoUrl },
          auth().currentUser?.uid ?? null
        )
      );

      Alert.alert('Success', 'Team created successfully.');
      resetForm();
      setAddTeamVisible(false);
    } catch (error) {
      console.error('Save team error:', error);
      Alert.alert('Error', 'Could not save the team. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout from FanScores?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout",
          style: "destructive",
          onPress: async () => {
            try {
              await auth().signOut();
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Could not log out. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeactivate = () => {
    Alert.alert(
      'Deactivate Account',
      'Your account will be deactivated and you will be signed out. You can reactivate by contacting support or signing back in. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This will deactivate your account.',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Yes, deactivate',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deactivateAccount();
                    } catch (error) {
                      console.error('Deactivate error:', error);
                      Alert.alert('Error', 'Could not deactivate your account. Please try again.');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const handleDeleteTeam = (team: Team) => {
    Alert.alert('Delete Team', `Delete "${team.name}"? This can't be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await teamsCollection().doc(team.id).delete();
            if (team.logoUrl) storage().refFromURL(team.logoUrl).delete().catch(() => {});
            if (editingTeamId === team.id) setEditingTeamId(null);
          } catch (error) {
            console.error('Delete team error:', error);
            Alert.alert('Error', 'Could not delete the team.');
          }
        },
      },
    ]);
  };

  const handleUpdateTeam = async () => {
    if (!editForm.name.trim()) {
      Alert.alert('Missing info', 'Team name cannot be empty.');
      return;
    }
    if (!editingTeamId) return;

    setSavingEdit(true);
    try {
      const oldLogoUrl = teams.find((t) => t.id === editingTeamId)?.logoUrl ?? null;

      let newLogoUrl: string | undefined;
      if (editLogoUri) {
        const uid = auth().currentUser?.uid ?? 'anon';
        const ref = storage().ref(`teamLogos/${uid}_${Date.now()}.jpg`);
        await ref.putFile(editLogoUri);
        newLogoUrl = await ref.getDownloadURL();
      }

      await teamsCollection().doc(editingTeamId).update(
        updateTeamPayload({
          name: editForm.name,
          shortName: editForm.shortName,
          town: editForm.town,
          country: editForm.country,
          ...(newLogoUrl !== undefined && { logoUrl: newLogoUrl }),
        })
      );

      if (newLogoUrl && oldLogoUrl && oldLogoUrl !== newLogoUrl) {
        storage().refFromURL(oldLogoUrl).delete().catch(() => {});
      }

      setEditingTeamId(null);
      setEditLogoUri(null);
    } catch (error) {
      console.error('Update team error:', error);
      Alert.alert('Error', 'Could not update the team. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const startEdit = (team: Team) => {
    setEditingTeamId(team.id);
    setEditForm({
      name: team.name ?? '',
      shortName: team.shortName ?? '',
      town: team.town ?? '',
      country: team.country ?? '',
    });
    setEditLogoUri(null);
  };

  const pickEditLogo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access to change the logo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7,
    });
    if (!result.canceled) setEditLogoUri(result.assets[0].uri);
  };

  // ---- Add Result handlers ----
  const openResultFor = (game: Game) => {
    setSelectedGame(game);
    setResWinner(game.winner ?? '');
    if (game.sport === 'Cricket') {
      setResCricket(game.cricket ?? emptyCricketState());
    } else {
      setResHome(String(game.homeScore ?? 0));
      setResAway(String(game.awayScore ?? 0));
    }
  };

  const setInnings = (sideKey: 'home' | 'away', field: 'runs' | 'wickets' | 'overs' | 'balls', val: string) => {
    const n = parseInt(val, 10) || 0;
    setResCricket((c) => ({ ...c, [sideKey]: { ...c[sideKey], [field]: n } }));
  };

  const clearFilters = () => {
    setFCountry(''); setFSport(''); setFGender(''); setFLocation(''); setFDate(null);
  };

  const closeResultModal = () => {
    setSelectedGame(null);
    setAddResultVisible(false);
  };

  const saveRegularResult = async () => {
    if (!selectedGame) return;
    if (!resWinner) {
      Alert.alert('Select winner', 'Please choose the result before saving.');
      return;
    }
    const h = parseInt(resHome, 10) || 0;
    const a = parseInt(resAway, 10) || 0;
    setSavingResult(true);
    try {
      await finalizeGame(selectedGame.id, h, a, resWinner);
      Alert.alert('Saved', 'Result recorded.');
      setSelectedGame(null);
      setAddResultVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save the result.');
    } finally {
      setSavingResult(false);
    }
  };

  const saveCricketResult = async () => {
    if (!selectedGame) return;
    if (!resWinner) {
      Alert.alert('Select winner', 'Please choose the result before saving.');
      return;
    }
    setSavingResult(true);
    try {
      await finalizeCricketGame(selectedGame.id, resCricket, resWinner);
      Alert.alert('Saved', 'Result recorded.');
      setSelectedGame(null);
      setAddResultVisible(false);
    } catch {
      Alert.alert('Error', 'Could not save the result.');
    } finally {
      setSavingResult(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />
      <ScrollView style={{ flex: 1 }}>

        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
              {phoneNumber ?? 'Guest User'}
            </Text>
            <Text style={[styles.userSub, { color: colors.textMuted }]}>Welcome back</Text>
          </View>
        </View>

        {/* Notifications Toggle */}
        <View style={[styles.rowItem, { borderBottomColor: colors.border }]}>
          <View style={styles.leftRow}>
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Notifications</Text>
          </View>
          <Switch
            value={notifications}
            onValueChange={onToggleNotifications}
            trackColor={{
              false: theme === 'dark' ? '#3e3e3f' : '#d1d1d6',
              true: '#3b82f6'
            }}
            thumbColor={
              notifications
                ? '#ffffff'
                : (theme === 'dark' ? '#8e8e93' : '#ffffff')
            }
            ios_backgroundColor={theme === 'dark' ? '#3e3e3f' : '#d1d1d6'}
          />
        </View>

        {/* Action Menu List */}
        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]} onPress={() => setAddTeamVisible(true)}>
          <View style={styles.leftRow}>
            <Ionicons name="people-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Add Team</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]} onPress={() => setEditTeamsVisible(true)}>
          <View style={styles.leftRow}>
            <Ionicons name="create-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Edit Teams</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]} onPress={() => setAddResultVisible(true)}>
          <View style={styles.leftRow}>
            <Ionicons name="trophy-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Add a Result</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]}>
          <View style={styles.leftRow}>
            <Ionicons name="megaphone-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Add adverts - Super Admin</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]} onPress={handleDeactivate}>
          <View style={styles.leftRow}>
            <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
            <Text style={[styles.rowText, styles.redText]}>Deactivate Account</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rowItem, { borderBottomColor: colors.border }]}
          onPress={() => openEmail('FanScores — Contact Us')}
        >
          <View style={styles.leftRow}>
            <Ionicons name="mail-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Contact Us</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rowItem, { borderBottomColor: colors.border }]}
          onPress={() => openEmail('FanScores — Recommend Changes')}
        >
          <View style={styles.leftRow}>
            <Ionicons name="chatbox-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Recommend Changes</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]} onPress={handleLogout}>
          <View style={styles.leftRow}>
            <Ionicons name="log-out-outline" size={20} color="#ef4444" />
            <Text style={[styles.rowText, styles.redText]}>Logout</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL 1: ADD NEW TEAM */}
      <Modal visible={addTeamVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Team</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Create a new team with logo and location details.</Text>
            </View>
            <TouchableOpacity onPress={() => setAddTeamVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollForm}>
            <TouchableOpacity style={[styles.uploadBox, { borderColor: colors.border }]} onPress={pickLogo} activeOpacity={0.7}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} cachePolicy="memory-disk" transition={150} placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
              ) : (
                <>
                  <Ionicons name="arrow-up-outline" size={24} color={colors.textMuted} />
                  <Text style={[styles.uploadText, { color: colors.textMuted }]}>Upload Logo</Text>
                </>
              )}
            </TouchableOpacity>
            {logoUri && (
              <TouchableOpacity onPress={pickLogo}>
                <Text style={[styles.changeLogoText, { color: '#3b82f6' }]}>Change logo</Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Team Name</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="Enter team name"
              placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
              value={teamName}
              onChangeText={setTeamName}
            />

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Short Name (Optional)</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
              placeholder="e.g., ABC"
              placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
              value={shortName}
              onChangeText={setShortName}
              autoCapitalize="characters"
            />

            <View style={styles.gridRow}>
              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Town/City</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter town or city"
                  placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                  value={town}
                  onChangeText={setTown}
                />
              </View>

              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Country</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter country"
                  placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                  value={country}
                  onChangeText={setCountry}
                />
              </View>
            </View>
          </ScrollView>

          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.cancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setAddTeamVisible(false)}
              disabled={saving}
            >
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSaveTeam}
              disabled={saving}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Team</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: EDIT TEAMS */}
      <Modal visible={editTeamsVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Teams</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Edit team details or delete teams from the list.</Text>
            </View>
            <TouchableOpacity onPress={() => { setEditTeamsVisible(false); setEditingTeamId(null); }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
            {loadingTeams ? (
              <ActivityIndicator color="#3b82f6" style={{ marginTop: 40 }} />
            ) : teams.length === 0 ? (
              <Text style={[styles.modalSub, { color: colors.textMuted, textAlign: 'center', marginTop: 40 }]}>
                No teams yet. Add a team to see it here.
              </Text>
            ) : (
              teams.map((team) => (
                <View key={team.id} style={[styles.editTeamCard, { backgroundColor: colors.innerCard, borderColor: colors.border }]}>
                  {editingTeamId === team.id ? (
                    <View style={[styles.editFormActive, { backgroundColor: theme === 'dark' ? '#000000' : '#ffffff' }]}>
                      <View style={styles.editFormTopRow}>
                        <TouchableOpacity
                          style={[styles.logoPlaceholderSmall, { borderColor: '#3b82f6', backgroundColor: colors.inputBg, overflow: 'hidden' }]}
                          onPress={pickEditLogo}
                        >
                          {editLogoUri ? (
                            <Image source={{ uri: editLogoUri }} style={{ width: '100%', height: '100%' }} />
                          ) : team.logoUrl ? (
                            <Image source={{ uri: team.logoUrl }} style={{ width: '100%', height: '100%' }} />
                          ) : (
                            <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                          )}
                        </TouchableOpacity>
                        <TextInput
                          style={[styles.editNameInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                          value={editForm.name}
                          onChangeText={(t) => setEditForm((f) => ({ ...f, name: t }))}
                          placeholder="Team Name"
                          placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                        />
                      </View>

                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                        value={editForm.shortName}
                        onChangeText={(t) => setEditForm((f) => ({ ...f, shortName: t }))}
                        placeholder="Short Name (optional)"
                        placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                        autoCapitalize="characters"
                      />

                      <View style={styles.gridRow}>
                        <TextInput
                          style={[styles.modalInput, { width: '48%', backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                          value={editForm.town}
                          onChangeText={(t) => setEditForm((f) => ({ ...f, town: t }))}
                          placeholder="Town/City"
                          placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                        />
                        <TextInput
                          style={[styles.modalInput, { width: '48%', backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                          value={editForm.country}
                          onChangeText={(t) => setEditForm((f) => ({ ...f, country: t }))}
                          placeholder="Country"
                          placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                        />
                      </View>

                      <View style={styles.editActionButtons}>
                        <TouchableOpacity
                          style={[styles.smallCancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
                          onPress={() => { setEditingTeamId(null); setEditLogoUri(null); }}
                          disabled={savingEdit}
                        >
                          <Ionicons name="close-outline" size={16} color={colors.text} style={{ marginRight: 4 }} />
                          <Text style={[styles.smallBtnText, { color: colors.text }]}>Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.smallSaveBtn, savingEdit && { opacity: 0.6 }]}
                          onPress={handleUpdateTeam}
                          disabled={savingEdit}
                        >
                          {savingEdit ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Ionicons name="save-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                              <Text style={styles.smallBtnText}>Save</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.teamListRow}>
                      <View style={styles.teamInfoSide}>
                        <View style={[styles.logoCircleSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }]}>
                          {team.logoUrl ? (
                            <Image source={{ uri: team.logoUrl }} style={{ width: '100%', height: '100%' }} cachePolicy="memory-disk" transition={150} placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }} />
                          ) : (
                            <Ionicons name="trophy" size={20} color="#facc15" />
                          )}
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                          <Text numberOfLines={1} style={[styles.teamNameTitle, { color: colors.text }]}>{teamDisplayName(team)}</Text>
                          <Text numberOfLines={1} style={[styles.teamLocationSub, { color: colors.textMuted }]}>{teamLocation(team)}</Text>
                        </View>
                      </View>
                      <View style={styles.teamActionSide}>
                        <TouchableOpacity onPress={() => startEdit(team)}>
                          <Ionicons name="create-outline" size={22} color={colors.text} style={{ marginRight: 15 }} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleDeleteTeam(team)}>
                          <Ionicons name="trash-outline" size={22} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <View style={styles.footerDone}>
            <TouchableOpacity style={[styles.doneBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setEditTeamsVisible(false)}>
              <Text style={[styles.btnText, { color: colors.text }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: ADD MATCH RESULT */}
      <Modal visible={addResultVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Add Match Result</Text>
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>
                {selectedGame ? 'Enter the final score and winner.' : 'Filter and pick a match to finalize.'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => { selectedGame ? setSelectedGame(null) : closeResultModal(); }}
              style={styles.closeButton}
            >
              <Ionicons name={selectedGame ? 'arrow-back' : 'close'} size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {!selectedGame ? (
            /* PHASE 1: FILTER + LIST */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <View style={styles.gridRow}>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Country</Text>
                  <SelectField placeholder="Any" title="Country" value={fCountry} options={['Any', ...COUNTRIES]}
                    onSelect={(v) => setFCountry(v === 'Any' ? '' : v)} />
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Sport</Text>
                  <SelectField placeholder="Any" title="Sport" value={fSport} options={['Any', ...SPORTS]}
                    onSelect={(v) => setFSport(v === 'Any' ? '' : v)} />
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Gender</Text>
                  <SelectField placeholder="Any" title="Gender" value={fGender} options={['Any', ...GENDERS]}
                    onSelect={(v) => setFGender(v === 'Any' ? '' : v)} />
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                    placeholder="Any location" placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                    value={fLocation} onChangeText={setFLocation}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Date</Text>
              <DateTimeField mode="date" value={fDate} onChange={setFDate} placeholder="Any date" />

              {(fCountry || fSport || fGender || fLocation || fDate) && (
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={{ color: '#3b82f6', marginTop: 12, fontWeight: '600' }}>Clear filters</Text>
                </TouchableOpacity>
              )}

              <Text style={[styles.modalTitleSection, { color: colors.text }]}>
                Matches ({filteredGames.length})
              </Text>

              {filteredGames.length === 0 ? (
                <Text style={[styles.modalSub, { color: colors.textMuted, textAlign: 'center', marginTop: 20 }]}>
                  No matches fit these filters.
                </Text>
              ) : (
                [...filteredGames]
                  .sort((a, b) => (a.winner ? 1 : 0) - (b.winner ? 1 : 0))
                  .map((g) => {
                    const declared = !!g.winner;
                    return (
                      <TouchableOpacity
                        key={g.id}
                        style={[
                          styles.resultGameRow,
                          { backgroundColor: colors.innerCard, borderColor: colors.border },
                          declared && styles.resultGameRowDone,
                        ]}
                        onPress={() => openResultFor(g)}
                      >
                        <View style={{ flex: 1 }}>
                          <Text
                            style={[styles.teamNameTitle, { color: declared ? colors.textMuted : colors.text }]}
                            numberOfLines={1}
                          >
                            {g.homeTeam.name} vs {g.awayTeam.name}
                          </Text>
                          <Text style={[styles.teamLocationSub, { color: colors.textMuted }]} numberOfLines={1}>
                            {g.sport} · {g.gender} · {g.kickoff?.toDate().toLocaleDateString('en-GB') ?? '--'} · {g.location}
                          </Text>
                          {declared && (
                            <Text style={[styles.winnerLine, { color: '#3b82f6' }]} numberOfLines={1}>
                              Result: {g.winner}
                            </Text>
                          )}
                        </View>
                        <View style={[styles.pill, { backgroundColor: theme === 'dark' ? '#2a2a2d' : '#e5e5ea' }]}>
                          <Text style={{ color: colors.textMuted, fontSize: 12, fontWeight: '600' }}>
                            {declared ? 'Declared' : 'Pending'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
              )}
            </ScrollView>
          ) : selectedGame.sport === 'Cricket' ? (
            /* PHASE 2A: CRICKET RESULT */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.modalTitleSection, { color: colors.text }]}>
                {selectedGame.homeTeam.name} vs {selectedGame.awayTeam.name}
              </Text>

              {(['home', 'away'] as const).map((sideKey) => {
                const inn = resCricket[sideKey];
                const name = sideKey === 'home' ? selectedGame.homeTeam.name : selectedGame.awayTeam.name;
                return (
                  <View key={sideKey} style={{ marginBottom: 16 }}>
                    <Text style={[styles.fieldLabel, { color: colors.text }]}>{name} innings</Text>
                    <View style={styles.gridRow}>
                      {(['runs', 'wickets', 'overs', 'balls'] as const).map((f) => (
                        <View key={f} style={{ width: '23%' }}>
                          <Text style={[styles.smallLabel, { color: colors.textMuted }]}>{f}</Text>
                          <TextInput
                            style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, padding: 8, textAlign: 'center' }]}
                            keyboardType="numeric"
                            value={String(inn[f])}
                            onChangeText={(v) => setInnings(sideKey, f, v)}
                          />
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })}

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Winner</Text>
              <SelectField
                placeholder="Select winner" title="Winner"
                value={resWinner}
                options={[selectedGame.homeTeam.name, selectedGame.awayTeam.name, 'Tie']}
                onSelect={setResWinner}
              />

              <TouchableOpacity style={[styles.saveBtn, { width: '100%', marginTop: 24 }, savingResult && { opacity: 0.6 }]} onPress={saveCricketResult} disabled={savingResult}>
                {savingResult ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Result</Text>}
              </TouchableOpacity>
            </ScrollView>
          ) : (
            /* PHASE 2B: REGULAR RESULT */
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
              <Text style={[styles.modalTitleSection, { color: colors.text }]}>
                {selectedGame.homeTeam.name} vs {selectedGame.awayTeam.name}
              </Text>

              <View style={styles.gridRow}>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{selectedGame.homeTeam.name}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, textAlign: 'center' }]}
                    keyboardType="numeric" value={resHome} onChangeText={setResHome}
                  />
                </View>
                <View style={{ width: '48%' }}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>{selectedGame.awayTeam.name}</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, textAlign: 'center' }]}
                    keyboardType="numeric" value={resAway} onChangeText={setResAway}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.text }]}>Winner</Text>
              <SelectField
                placeholder="Select winner" title="Winner"
                value={resWinner}
                options={[selectedGame.homeTeam.name, selectedGame.awayTeam.name, 'Draw']}
                onSelect={setResWinner}
              />

              <TouchableOpacity style={[styles.saveBtn, { width: '100%', marginTop: 24 }, savingResult && { opacity: 0.6 }]} onPress={saveRegularResult} disabled={savingResult}>
                {savingResult ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Save Result</Text>}
              </TouchableOpacity>
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  userCard: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, marginHorizontal: 16, marginTop: 8, marginBottom: 12, borderRadius: 12, alignItems: 'center' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#3b82f6', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userName: { fontSize: 18, fontWeight: 'bold' },
  userSub: { fontSize: 13 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', padding: 18, borderBottomWidth: 1, alignItems: 'center' },
  leftRow: { flexDirection: 'row', alignItems: 'center' },
  rowText: { fontSize: 15, marginLeft: 12 },
  redText: { color: '#ef4444' },

  modalContent: { flex: 1, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  modalTitleSection: { fontSize: 16, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  modalSub: { fontSize: 13, marginTop: 4, marginBottom: 24 },
  uploadBox: { borderStyle: 'dashed', borderWidth: 1, borderRadius: 8, height: 100, width: 100, alignSelf: 'center', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 12 },
  modalInput: { borderRadius: 8, padding: 12, borderWidth: 1 },
  dummySelect: { borderRadius: 8, padding: 14, borderWidth: 1 },
  checkboxContainer: { flexDirection: 'row', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  footerButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 'auto', paddingBottom: 24 },
  cancelBtn: { width: '48%', padding: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  saveBtn: { backgroundColor: '#3b82f6', width: '48%', padding: 16, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

  scrollForm: { paddingBottom: 24 },
  closeButton: { padding: 4 },
  uploadText: { fontSize: 13, marginTop: 6, fontWeight: '500' },
  activeInputBorder: { borderWidth: 1.5 },
  modalDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 14 },
  dropdownText: { fontSize: 14 },
  disabledDropdown: { borderLeftWidth: 1, borderRightWidth: 1 },
  disabledDropdownText: { fontSize: 14 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },

  logoPreview: { width: '100%', height: '100%', borderRadius: 8, resizeMode: 'cover' },
  changeLogoText: { fontSize: 13, fontWeight: '600', marginTop: 6, marginBottom: 4, textAlign: 'center' },

  editTeamCard: { borderRadius: 12, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  teamListRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  teamInfoSide: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 },
  teamActionSide: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  logoCircleSmall: { width: 45, height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  teamNameTitle: { fontSize: 16, fontWeight: 'bold' },
  teamLocationSub: { fontSize: 12, marginTop: 2 },
  editFormActive: { padding: 16 },
  editFormTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  logoPlaceholderSmall: { width: 50, height: 50, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  editNameInput: { flex: 1, borderRadius: 8, padding: 10, borderWidth: 1 },
  editActionButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  smallCancelBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginRight: 8, borderWidth: 1 },
  smallSaveBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, backgroundColor: '#3b82f6' },
  smallBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  footerDone: { paddingTop: 20, paddingBottom: 10, alignItems: 'flex-end' },
  doneBtn: { paddingHorizontal: 30, paddingVertical: 12, borderRadius: 8, borderWidth: 1 },

  inputIconWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  iconInput: { flex: 1, padding: 14, fontSize: 14 },
  inputIcon: { paddingRight: 14 },

  // Add Result
  resultGameRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  resultGameRowDone: { opacity: 0.55 },
  winnerLine: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  smallLabel: { fontSize: 11, marginBottom: 4, textTransform: 'capitalize' },
  pill: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
});