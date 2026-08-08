import { Ionicons } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import DateTimeField from '../../components/DateTimeField';
import GlobalHeader from '../../components/GlobalHeader';
import SelectField from '../../components/SelectField';
import { COUNTRIES, GENDERS, LEVELS, SPORTS, TYPES } from '../../constants/gameOptions';
import { useAppTheme } from '../../context/ThemeContext';
import { Team, teamFromDoc, teamsCollection } from '../../models/Team';

export default function AddGameScreen() {
  const { colors, theme } = useAppTheme();

  const [homeCountry, setHomeCountry] = useState('');
  const [homeTeam, setHomeTeam] = useState('');
  const [homeLevel, setHomeLevel] = useState('');

  const [awayCountry, setAwayCountry] = useState('');
  const [awayTeam, setAwayTeam] = useState('');
  const [awayLevel, setAwayLevel] = useState('');

  const [teams, setTeams] = useState<Team[]>([]);

  const [homeType, setHomeType] = useState('');
  const [awayType, setAwayType] = useState('');

  const [date, setDate] = useState<Date | null>(null);
  const [time, setTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('');

  const [sport, setSport] = useState('Rugby');
  const [gender, setGender] = useState('Men');

  const [isAssociated, setIsAssociated] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const unsub = teamsCollection().onSnapshot(
      (snap) => setTeams(snap.docs.map(teamFromDoc).sort((a, b) => a.name.localeCompare(b.name))),
      (err) => console.error('Teams fetch error:', err)
    );
    return () => unsub();
  }, []);

  const teamOptions = teams.map((t) => t.name);
  const homeTeamDoc = teams.find((t) => t.name === homeTeam);
  const awayTeamDoc = teams.find((t) => t.name === awayTeam);

  const resetForm = () => {
    setHomeCountry(''); setHomeTeam(''); setHomeLevel(''); setHomeType('');
    setAwayCountry(''); setAwayTeam(''); setAwayLevel(''); setAwayType('');
    setDate(null); setTime(null); setLocation('');
    setSport('Rugby'); setGender('Men'); setIsAssociated(false);
  };

  const handleCreate = async () => {
    if (!homeCountry || !awayCountry) {
      Alert.alert('Missing info', 'Please select both a home and away country.'); return;
    }
    if (!homeTeam.trim() || !awayTeam.trim()) {
      Alert.alert('Missing info', 'Please enter a team name for both sides.'); return;
    }
    if (!homeLevel || !awayLevel) {
      Alert.alert('Missing info', 'Please select a level for both teams.'); return;
    }
    if (!homeType || !awayType) {
      Alert.alert('Missing info', 'Please select a type for both teams.'); return;
    }
    if (!date || !time) {
      Alert.alert('Missing info', 'Please choose both a date and a time.'); return;
    }
    if (!location.trim()) {
      Alert.alert('Missing info', 'Please enter a location.'); return;
    }
    if (homeTeamDoc && awayTeamDoc && homeTeamDoc.id === awayTeamDoc.id) {
      Alert.alert('Invalid fixture', 'Home and away teams cannot be the same.'); return;
    }

    // combine date + time into one kickoff timestamp
    const kickoff = new Date(date);
    kickoff.setHours(time.getHours(), time.getMinutes(), 0, 0);

    setSubmitting(true);
    try {
      await firestore().collection('Game').add({
        homeTeam: { id: homeTeamDoc?.id ?? null, country: homeCountry, name: homeTeam.trim(), level: homeLevel, type: homeType },
        awayTeam: { id: awayTeamDoc?.id ?? null, country: awayCountry, name: awayTeam.trim(), level: awayLevel, type: awayType },
        kickoff: firestore.Timestamp.fromDate(kickoff),
        location: location.trim(),
        sport,
        gender,
        isAssociated,
        homeScore: 0,
        awayScore: 0,
        cricket: sport === 'Cricket'
        ? { battingSide: null, runs: 0, wickets: 0, overs: 0, balls: 0 }
        : null,
        status: 'Upcoming',
        createdBy: auth().currentUser?.uid ?? null,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Fixture created successfully.');
      resetForm();
    } catch (error) {
      console.error('Create fixture error:', error);
      Alert.alert('Error', 'Could not create the fixture. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Create New Fixture</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Set up a match between two teams with date, time, and location.
        </Text>

        {/* --- HOME TEAM --- */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Home Team</Text>
        <SelectField
          placeholder="Select country" title="Home Country"
          value={homeCountry} options={COUNTRIES} onSelect={setHomeCountry}
          containerStyle={{ marginBottom: 8 }}
        />
        <View style={styles.gridRow}>
          <SelectField
            placeholder="Team" title="Home Team" small
            value={homeTeam} options={teamOptions} onSelect={setHomeTeam}
            containerStyle={styles.gridItem}
          />
          <SelectField
            placeholder="Level" title="Home Level" small
            value={homeLevel} options={LEVELS} onSelect={setHomeLevel}
            containerStyle={styles.gridItem}
          />
          <SelectField
            placeholder="Type" title="Home Type" small
            value={homeType} options={TYPES} onSelect={setHomeType}
            containerStyle={styles.gridItem}
          />
        </View>

        {/* --- AWAY TEAM --- */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Away Team</Text>
        <SelectField
          placeholder="Select country" title="Away Country"
          value={awayCountry} options={COUNTRIES} onSelect={setAwayCountry}
          containerStyle={{ marginBottom: 8 }}
        />
        <View style={styles.gridRow}>
          <SelectField
            placeholder="Team" title="Away Team" small
            value={awayTeam} options={teamOptions} onSelect={setAwayTeam}
            containerStyle={styles.gridItem}
          />
          <SelectField
            placeholder="Level" title="Away Level" small
            value={awayLevel} options={LEVELS} onSelect={setAwayLevel}
            containerStyle={styles.gridItem}
          />
           <SelectField
              placeholder="Type" title="Away Type" small
              value={awayType} options={TYPES} onSelect={setAwayType}
              containerStyle={styles.gridItem}
          />
        </View>

        {/* --- DATE & TIME --- */}
        <View style={styles.gridRow}>
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Date</Text>
            <DateTimeField mode="date" value={date} onChange={setDate} placeholder="dd/mm/yyyy" />
          </View>
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Time</Text>
            <DateTimeField mode="time" value={time} onChange={setTime} placeholder="--:-- --" />
          </View>
        </View>

        {/* --- LOCATION --- */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
        <TextInput
          style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
          placeholder="e.g., Main Stadium" placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
          value={location} onChangeText={setLocation}
        />

        {/* --- SPORT & GENDER --- */}
        <View style={styles.gridRow}>
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Sport</Text>
            <SelectField placeholder="Select sport" title="Sport" value={sport} options={SPORTS} onSelect={setSport} />
          </View>
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Gender</Text>
            <SelectField placeholder="Select gender" title="Gender" value={gender} options={GENDERS} onSelect={setGender} />
          </View>
        </View>

        {/* --- ASSOCIATION CHECKBOX --- */}
        <TouchableOpacity
          style={[styles.checkboxContainer, { backgroundColor: colors.innerCard, borderColor: colors.border }]}
          activeOpacity={0.8}
          onPress={() => setIsAssociated(!isAssociated)}
        >
          <Ionicons
            name={isAssociated ? 'checkbox' : 'square-outline'} size={22}
            color={isAssociated ? '#3b82f6' : colors.textMuted} style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.checkboxTitle, { color: colors.text }]}>I am associated with this team</Text>
            <Text style={[styles.checkboxSub, { color: colors.textMuted }]}>Check this to display the verified badge on the game ticker</Text>
          </View>
        </TouchableOpacity>

        {/* --- FOOTER --- */}
        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={resetForm} disabled={submitting}
          >
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, submitting && { opacity: 0.6 }]}
            onPress={handleCreate} disabled={submitting}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.submitButtonText}>Create Fixture</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { fontSize: 13, marginBottom: 24, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },

  gridRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridItem: { width: '31%', paddingVertical: 11, paddingHorizontal: 10, marginBottom: 16 },
  gridInput: { width: '31%', borderWidth: 1, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 10, fontSize: 14, marginBottom: 16 },
  naCell: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8 },

  textInput: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 14 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 16, marginTop: 24, marginBottom: 24 },
  checkboxTitle: { fontSize: 14, fontWeight: '600' },
  checkboxSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cancelButton: { width: '32%', borderWidth: 1, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { fontWeight: '600', fontSize: 15 },
  submitButton: { width: '64%', backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});