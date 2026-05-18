import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import GlobalHeader from '../../components/GlobalHeader';
import { useAppTheme } from '../../context/ThemeContext'; // 🌟 Import your theme hook

export default function FiltersScreen() {
  const { colors } = useAppTheme(); // 🌟 Grab active dynamic colors
  const [gender, setGender] = useState('All');
  const [sport, setSport] = useState('All');

  const sports = ['All', 'Rugby', 'Soccer', 'Hockey', 'Cricket', 'Netball', 'Basketball', 'Tennis', 'Badminton', 'Beach Volleyball'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />
      <View style={styles.content}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Filter Fixtures</Text>

        {/* Gender Filters */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Gender</Text>
        <View style={styles.chipRow}>
          {['All', 'Men', 'Female', 'Coed'].map((g) => (
            <TouchableOpacity 
              key={g} 
              style={[
                styles.chip, 
                { backgroundColor: colors.inputBg, borderColor: colors.border },
                gender === g && styles.activeChip
              ]} 
              onPress={() => setGender(g)}
            >
              {gender === g && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
              <Text style={[
                styles.chipText, 
                { color: colors.text },
                gender === g && styles.activeChipText
              ]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Sport Filters */}
        <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Sport</Text>
        <View style={styles.chipRow}>
          {sports.map((s) => (
            <TouchableOpacity 
              key={s} 
              style={[
                styles.chip, 
                { backgroundColor: colors.inputBg, borderColor: colors.border },
                sport === s && styles.activeChip
              ]} 
              onPress={() => setSport(s)}
            >
              {sport === s && <Ionicons name="checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />}
              <Text style={[
                styles.chipText, 
                { color: colors.text },
                sport === s && styles.activeChipText
              ]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.applyButton}>
          <Text style={styles.applyButtonText}>Apply Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Static color stripped
  content: { padding: 20 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 24 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 12, marginTop: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  
  // Chip Base Structures
  chip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, marginBottom: 10 },
  activeChip: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }, // Keeps active blue consistent
  chipText: { fontSize: 14 },
  activeChipText: { fontWeight: '600', color: '#fff' }, // Text turns crisp white when selected
  
  // Primary Submit Button Action
  applyButton: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 32 },
  applyButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});