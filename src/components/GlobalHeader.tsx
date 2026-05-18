import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '../context/ThemeContext';

const COUNTRIES = [
  'Hong Kong', 'South Africa', 'United Kingdom', 'United States',
  'Australia', 'New Zealand', 'Singapore', 'Malaysia', 'Japan',
  'China', 'India', 'Germany', 'France', 'Canada'
];

export default function GlobalHeader() {
  // 🌟 Grab your global values directly
  const { theme, colors, toggleTheme } = useAppTheme();
  
  const [country, setCountry] = useState('Australia');
  const [dropdownVisible, setDropdownVisible] = useState(false);

  return (
    // 🌟 Bind style arrays to dynamically switch background & border accents
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={[styles.headerContainer, { borderBottomColor: colors.border }]}>
        
        {/* Left: Country Selector */}
        <TouchableOpacity style={styles.row} onPress={() => setDropdownVisible(true)}>
          <Ionicons name="location-outline" size={18} color={colors.text} />
          <Text style={[styles.headerText, { color: colors.text }]}>
            {country === 'Australia' ? 'AU' : country.substring(0,2).toUpperCase()}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Center: All Teams */}
        <TouchableOpacity style={styles.row}>
          <Ionicons name="people-outline" size={18} color={colors.text} style={{ marginRight: 6 }} />
          <Text style={[styles.headerText, { color: colors.text }]}>All Teams</Text>
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} style={{ marginLeft: 4 }} />
        </TouchableOpacity>

        {/* Right: Dark Mode Toggle */}
        {/* 🌟 Swap out local hook setters for toggleTheme from our context! */}
        <TouchableOpacity onPress={toggleTheme} style={styles.toggleButton}>
          <Ionicons 
            name={theme === 'dark' ? "sunny-outline" : "moon-outline"} 
            size={20} 
            color={colors.text} 
          />
        </TouchableOpacity>
      </View>

      {/* Country Dropdown Menu overlay */}
      <Modal visible={dropdownVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
          <View style={[styles.dropdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.dropdownItem} 
                  onPress={() => { setCountry(item); setDropdownVisible(false); }}
                >
                  <Text style={[styles.dropdownItemText, { color: colors.text }]}>{item}</Text>
                  {item === country && <Ionicons name="checkmark" size={16} color="#3b82f6" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { /* Dynamic backing color applied inline */ },
  headerContainer: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, borderBottomWidth: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  headerText: { fontSize: 15, fontWeight: '600', marginLeft: 4 },
  toggleButton: { padding: 6, minWidth: 32, alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  dropdownCard: { position: 'absolute', top: 90, left: 16, width: 200, borderRadius: 8, paddingVertical: 8, borderWidth: 1, maxHeight: 400 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center' },
  dropdownItemText: { fontSize: 14 }
});