import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GlobalHeader from '../../components/GlobalHeader';
import { useAppTheme } from '../../context/ThemeContext';
import {
  newTeamPayload,
  Team,
  teamDisplayName,
  teamFromDoc,
  teamLocation,
  teamsCollection,
  updateTeamPayload,
} from '../../models/Team';

export default function MoreScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(false);
  const { colors, theme } = useAppTheme(); // 🌟 Grab colors and theme state
  
  // Modal toggle views state
  const [addTeamVisible, setAddTeamVisible] = useState(false);
  const [editTeamsVisible, setEditTeamsVisible] = useState(false);
  const [addResultVisible, setAddResultVisible] = useState(false);
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);

  const [teamName, setTeamName] = useState('');
  const [shortName, setShortName] = useState('');
  const [town, setTown] = useState('');
  const [county, setCounty] = useState('');
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [teams, setTeams] = useState<Team[]>([]); 
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [editForm, setEditForm] = useState({ name: '', shortName: '', town: '', county: '' });
  const [editLogoUri, setEditLogoUri] = useState<string | null>(null); // newly picked local image
  const [savingEdit, setSavingEdit] = useState(false);

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
    setTeamName(''); setShortName(''); setTown(''); setCounty(''); setLogoUri(null);
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Missing info', 'Please enter a team name.');
      return;
    }

    setSaving(true);
    try {
      let logoUrl: string | null = null;

      // Upload the logo to Firebase Storage (if one was chosen)
      if (logoUri) {
        const uid = auth().currentUser?.uid ?? 'anon';
        const path = `teamLogos/${uid}_${Date.now()}.jpg`;
        const ref = storage().ref(path);
        await ref.putFile(logoUri);
        logoUrl = await ref.getDownloadURL();
      }

      await teamsCollection().add(
        newTeamPayload(
          { name: teamName, shortName, town, county, logoUrl },
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
              // No router call — RootStack's useEffect redirects to login automatically.
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Could not log out. Please try again.');
            }
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

      let newLogoUrl: string | undefined; // undefined → keep existing logo
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
          county: editForm.county,
          ...(newLogoUrl !== undefined && { logoUrl: newLogoUrl }),
        })
      );

      if (newLogoUrl && oldLogoUrl && oldLogoUrl !== newLogoUrl) {
        console.log('Attempting to delete old logo:', oldLogoUrl);
        storage().refFromURL(oldLogoUrl)
        .delete()
        .then(() => console.log('Old logo deleted ✅'))
        .catch((e) => console.log('Old logo delete failed ❌', e.code, e.message));
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
      county: team.county ?? '',
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

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />
      <ScrollView style={{ flex: 1 }}>
        
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.card }]}>
          <View style={styles.avatar}><Text style={styles.avatarText}>G</Text></View>
          <View>
            <Text style={[styles.userName, { color: colors.text }]}>Guest User</Text>
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
            onValueChange={setNotifications} 
            // 🌟 Keeps the track highly legible across both backgrounds
            trackColor={{ 
              false: theme === 'dark' ? '#3e3e3f' : '#d1d1d6', 
              true: '#3b82f6' 
            }} 
            // 🌟 Switches knob to a distinct dark gray when off in light mode so it stands out
            thumbColor={
              notifications 
                ? '#ffffff' 
                : (theme === 'dark' ? '#8e8e93' : '#ffffff')
            }
            // 🌟 Fixes the track background for iOS frame execution explicitly
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

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]}>
          <View style={styles.leftRow}>
            <Ionicons name="person-remove-outline" size={20} color="#ef4444" />
            <Text style={[styles.rowText, styles.redText]}>Deactivate Account</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color="#ef4444" />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]}>
          <View style={styles.leftRow}>
            <Ionicons name="mail-outline" size={20} color={colors.text} />
            <Text style={[styles.rowText, { color: colors.text }]}>Contact Us</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.rowItem, { borderBottomColor: colors.border }]}>
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
            {/* Logo upload with preview */}
            <TouchableOpacity style={[styles.uploadBox, { borderColor: colors.border }]} onPress={pickLogo} activeOpacity={0.7}>
              {logoUri ? (
                <Image source={{ uri: logoUri }} style={styles.logoPreview} />
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
                <Text style={[styles.fieldLabel, { color: colors.text }]}>County</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                  placeholder="Enter county"
                  placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                  value={county}
                  onChangeText={setCounty}
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
                    /* --- EDIT FORM STATE --- */
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
                          value={editForm.county}
                          onChangeText={(t) => setEditForm((f) => ({ ...f, county: t }))}
                          placeholder="County"
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
                    /* --- LIST VIEW STATE --- */
                    <View style={styles.teamListRow}>
                      <View style={styles.teamInfoSide}>
                        <View style={[styles.logoCircleSmall, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1, overflow: 'hidden' }]}>
                          {team.logoUrl ? (
                            <Image source={{ uri: team.logoUrl }} style={{ width: '100%', height: '100%' }} />
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
              <Text style={[styles.modalSub, { color: colors.textMuted }]}>Add a completed match with final score.</Text>
            </View>
            <TouchableOpacity onPress={() => setAddResultVisible(false)} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
            
            {/* --- HOME TEAM --- */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Home Team</Text>
            <TouchableOpacity style={[styles.modalDropdown, { backgroundColor: colors.inputBg, borderColor: '#3b82f6', borderWidth: 1.5 }]}>
              <Text style={{ color: colors.text }}>Hong Kong</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            
            <View style={[styles.gridRow, { marginTop: 8 }]}>
              <TouchableOpacity style={[styles.modalDropdown, { width: '31%', paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.dropdownText, { color: colors.textMuted }]}>Team</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalDropdown, { width: '31%', paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.dropdownText, { color: colors.textMuted }]}>Level</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalDropdown, { width: '31%', paddingVertical: 12, backgroundColor: theme === 'dark' ? '#161618' : '#e5e5ea', borderColor: colors.border }]}>
                <Text style={{ color: theme === 'dark' ? '#444' : '#8e8e93', fontSize: 12 }}>N/A</Text>
                <Ionicons name="chevron-down" size={12} color={theme === 'dark' ? '#444' : '#8e8e93'} />
              </TouchableOpacity>
            </View>

            {/* --- AWAY TEAM --- */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Away Team</Text>
            <TouchableOpacity style={[styles.modalDropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={{ color: colors.text }}>Hong Kong</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
            
            <View style={[styles.gridRow, { marginTop: 8 }]}>
              <TouchableOpacity style={[styles.modalDropdown, { width: '31%', paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.dropdownText, { color: colors.textMuted }]}>Team</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalDropdown, { width: '31%', paddingVertical: 12, backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Text style={[styles.dropdownText, { color: colors.textMuted }]}>Level</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalDropdown, { width: '31%', paddingVertical: 12, backgroundColor: theme === 'dark' ? '#161618' : '#e5e5ea', borderColor: colors.border }]}>
                <Text style={{ color: theme === 'dark' ? '#444' : '#8e8e93', fontSize: 12 }}>N/A</Text>
                <Ionicons name="chevron-down" size={12} color={theme === 'dark' ? '#444' : '#8e8e93'} />
              </TouchableOpacity>
            </View>

            {/* --- DATE & TIME --- */}
            <View style={[styles.gridRow, { marginTop: 12 }]}>
              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Date</Text>
                <View style={[styles.inputIconWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput style={[styles.iconInput, { color: colors.text }]} placeholder="dd/mm/yyyy" placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'} />
                  <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                </View>
              </View>
              
              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Time</Text>
                <View style={[styles.inputIconWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <TextInput style={[styles.iconInput, { color: colors.text }]} placeholder="--:-- --" placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'} />
                  <Ionicons name="time-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
                </View>
              </View>
            </View>

            {/* --- LOCATION --- */}
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
            <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} placeholder="Match location" placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'} />

            {/* --- SPORT & GENDER --- */}
            <View style={[styles.gridRow, { marginTop: 12 }]}>
              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Sport</Text>
                <TouchableOpacity style={[styles.modalDropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Text style={{ color: colors.text }}>Rugby</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              
              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Gender</Text>
                <TouchableOpacity style={[styles.modalDropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                  <Text style={{ color: colors.text }}>Men</Text>
                  <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* --- ASSOCIATION --- */}
            <View style={[styles.checkboxContainer, { backgroundColor: colors.innerCard }]}>
              <Ionicons name="square-outline" size={20} color="#3b82f6" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>I am associated with this team</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12 }}>Check this to display verified badge on the game ticker</Text>
              </View>
            </View>

            {/* --- SCORES --- */}
            <Text style={[styles.modalTitleSection, { color: colors.text }]}>Final Score</Text>
            <View style={styles.gridRow}>
              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Home Score</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} defaultValue="0" keyboardType="numeric" />
              </View>
              <View style={{ width: '48%' }}>
                <Text style={[styles.fieldLabel, { color: colors.text }]}>Away Score</Text>
                <TextInput style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} defaultValue="0" keyboardType="numeric" />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.text }]}>Winner</Text>
            <View style={[styles.dummySelect, { marginBottom: 30, backgroundColor: colors.inputBg, borderColor: colors.border }]}><Text style={{ color: colors.text }}>Draw</Text></View>
          </ScrollView>

          {/* Fixed Footer Buttons */}
          <View style={styles.footerButtons}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => setAddResultVisible(false)}>
              <Text style={[styles.btnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn}>
              <Text style={styles.btnText}>Save Result</Text>
            </TouchableOpacity>
          </View>
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
  disabledDropdown: { borderLeftWidth: 1, borderRightWidth: 1},
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
});