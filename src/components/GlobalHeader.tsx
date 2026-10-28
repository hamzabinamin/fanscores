import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COUNTRY_NAMES } from '../constants/countries';
import { useAppFilter } from '../context/AppFilterContext';
import { useAppTheme } from '../context/ThemeContext';

export default function GlobalHeader() {
  const { theme, colors, toggleTheme } = useAppTheme();
  const { teams, selectedTeam, setSelectedTeam, country, setCountry } = useAppFilter();

  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [teamsDropdownVisible, setTeamsDropdownVisible] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');

  // country options: "All Countries" reset + the shared list, filtered by search
  const countryOptions = ['All Countries', ...COUNTRY_NAMES].filter(
    (c) => !countrySearch || c.toLowerCase().includes(countrySearch.toLowerCase())
  );

  // teams shown in the dropdown — filtered by the selected country
  const visibleTeams = country
    ? teams.filter((t) => t.country === country)
    : teams;

  const closeCountry = () => {
    setDropdownVisible(false);
    setCountrySearch('');
  };

  const onPickCountry = (item: string) => {
    const next = item === 'All Countries' ? '' : item;
    setCountry(next);
    // if the currently-selected team isn't in the new country, clear it
    if (selectedTeam && next && selectedTeam.country !== next) {
      setSelectedTeam(null);
    }
    closeCountry();
  };

  // label for the country pill
  const countryLabel = country ? country.substring(0, 2).toUpperCase() : 'ALL';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>

        {/* Left: Country Selector */}
        <TouchableOpacity style={styles.row} onPress={() => setDropdownVisible(true)}>
          <Ionicons name="location-outline" size={18} color={colors.text} />
          <Text style={[styles.headerText, { color: colors.text }]}>{countryLabel}</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Center: Team Selector */}
        <TouchableOpacity style={styles.row} onPress={() => setTeamsDropdownVisible(true)}>
          <Ionicons name="people-outline" size={18} color={colors.text} style={{ marginRight: 6 }} />
          <Text style={[styles.headerText, { color: colors.text }]} numberOfLines={1}>
            {selectedTeam ? selectedTeam.name : 'All Teams'}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Right: Dark Mode Toggle */}
        <TouchableOpacity onPress={toggleTheme} style={styles.toggleButton}>
          <Ionicons
            name={theme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={20}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      {/* Country Dropdown overlay */}
      <Modal visible={dropdownVisible} transparent animationType="fade" onRequestClose={closeCountry}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeCountry}>
          <View style={[styles.dropdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* search box */}
            <View style={[styles.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Ionicons name="search" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search"
                placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                value={countrySearch}
                onChangeText={setCountrySearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>
            <FlatList
              data={countryOptions}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item === 'All Countries' ? !country : item === country;
                return (
                  <TouchableOpacity style={styles.dropdownItem} onPress={() => onPickCountry(item)}>
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>{item}</Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.dropdownItemText, { color: colors.textMuted, padding: 16 }]}>No matches</Text>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Teams Dropdown overlay */}
      <Modal visible={teamsDropdownVisible} transparent animationType="fade" onRequestClose={() => setTeamsDropdownVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setTeamsDropdownVisible(false)}>
          <View style={[styles.teamsDropdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FlatList
              data={[null, ...visibleTeams]}   // null = the "All Teams" reset row
              keyExtractor={(item) => (item ? item.id : 'all')}
              renderItem={({ item }) => {
                const isSelected = item ? selectedTeam?.id === item.id : selectedTeam === null;
                return (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => { setSelectedTeam(item); setTeamsDropdownVisible(false); }}
                  >
                    <Text style={[styles.dropdownItemText, { color: colors.text }]}>
                      {item ? item.name : 'All Teams'}
                    </Text>
                    {isSelected && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <Text style={[styles.dropdownItemText, { color: colors.textMuted, padding: 16 }]}>
                  No teams in this country
                </Text>
              }
              showsVerticalScrollIndicator={false}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {},
  headerContainer: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  headerText: { fontSize: 15, fontWeight: '600', marginLeft: 4 },
  toggleButton: { padding: 6, minWidth: 32, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dropdownCard: { position: 'absolute', top: 90, left: 16, width: 240, borderRadius: 8, paddingVertical: 8, borderWidth: 1, maxHeight: 420 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginHorizontal: 8, marginBottom: 8 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  dropdownItemText: { fontSize: 14 },
  teamsDropdownCard: { position: 'absolute', top: 90, alignSelf: 'center', width: 240, borderRadius: 8, paddingVertical: 8, borderWidth: 1, maxHeight: 420 },
});