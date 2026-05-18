import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import GlobalHeader from '../../components/GlobalHeader';
import { useAppTheme } from '../../context/ThemeContext'; // 🌟 Import your theme hook

export default function AddGameScreen() {
  const { colors, theme } = useAppTheme(); // 🌟 Grab dynamic color design tokens
  const [isAssociated, setIsAssociated] = useState(false);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={[styles.mainTitle, { color: colors.text }]}>Create New Fixture</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Set up a match between two teams with date, time, and location.
        </Text>

        {/* --- HOME TEAM SECTION --- */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Home Team</Text>
        <TouchableOpacity style={[styles.selectDropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.selectText, { color: colors.text }]}>Australia</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        
        {/* Home Team Sub-attributes Row */}
        <View style={styles.gridRow}>
          <TouchableOpacity style={[styles.selectDropdown, styles.gridItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.selectText, { color: colors.textMuted }]}>Team</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectDropdown, styles.gridItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.selectText, { color: colors.textMuted }]}>Level</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity 
            disabled
            style={[
              styles.selectDropdown, 
              styles.gridItem, 
              { 
                backgroundColor: theme === 'dark' ? '#161618' : '#e5e5ea', 
                borderColor: colors.border 
              }
            ]}
          >
            <Text style={{ color: theme === 'dark' ? '#444' : '#8e8e93', fontSize: 14 }}>N/A</Text>
            <Ionicons name="chevron-down" size={14} color={theme === 'dark' ? '#444' : '#8e8e93'} />
          </TouchableOpacity>
        </View>

        {/* --- AWAY TEAM SECTION --- */}
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Away Team</Text>
        <TouchableOpacity style={[styles.selectDropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
          <Text style={[styles.selectText, { color: colors.text }]}>Australia</Text>
          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
        </TouchableOpacity>
        
        {/* Away Team Sub-attributes Row */}
        <View style={styles.gridRow}>
          <TouchableOpacity style={[styles.selectDropdown, styles.gridItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.selectText, { color: colors.textMuted }]}>Team</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.selectDropdown, styles.gridItem, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
            <Text style={[styles.selectText, { color: colors.textMuted }]}>Level</Text>
            <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity 
            disabled
            style={[
              styles.selectDropdown, 
              styles.gridItem, 
              { 
                backgroundColor: theme === 'dark' ? '#161618' : '#e5e5ea', 
                borderColor: colors.border 
              }
            ]}
          >
            <Text style={{ color: theme === 'dark' ? '#444' : '#8e8e93', fontSize: 14 }}>N/A</Text>
            <Ionicons name="chevron-down" size={14} color={theme === 'dark' ? '#444' : '#8e8e93'} />
          </TouchableOpacity>
        </View>

        {/* --- DATE & TIME FIELDS --- */}
        <View style={styles.gridRow}>
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Date</Text>
            <View style={[styles.inputIconWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput 
                style={[styles.iconInput, { color: colors.text }]} 
                placeholder="dd/mm/yyyy" 
                placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'} 
              />
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            </View>
          </View>
          
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Time</Text>
            <View style={[styles.inputIconWrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <TextInput 
                style={[styles.iconInput, { color: colors.text }]} 
                placeholder="--:-- --" 
                placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'} 
              />
              <Ionicons name="time-outline" size={16} color={colors.textMuted} style={styles.inputIcon} />
            </View>
          </View>
        </View>

        {/* --- LOCATION FIELD --- */}
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
        <TextInput 
          style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} 
          placeholder="e.g., Main Stadium" 
          placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'} 
        />

        {/* --- SPORT & GENDER --- */}
        <View style={styles.gridRow}>
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Sport</Text>
            <TouchableOpacity style={[styles.selectDropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.selectText, { color: colors.text }]}>Rugby</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          
          <View style={{ width: '48%' }}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Gender</Text>
            <TouchableOpacity style={[styles.selectDropdown, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.selectText, { color: colors.text }]}>Men</Text>
              <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* --- VERIFIED ASSOCIATION CHECKBOX --- */}
        <TouchableOpacity 
          style={[styles.checkboxContainer, { backgroundColor: colors.innerCard, borderColor: colors.border }]} 
          activeOpacity={0.8}
          onPress={() => setIsAssociated(!isAssociated)}
        >
          <Ionicons 
            name={isAssociated ? "checkbox" : "square-outline"} 
            size={22} 
            color={isAssociated ? "#3b82f6" : colors.textMuted} 
            style={{ marginRight: 12 }}
          />
          <View style={{ flex: 1 }}>
            <Text style={[styles.checkboxTitle, { color: colors.text }]}>I am associated with this team</Text>
            <Text style={[styles.checkboxSub, { color: colors.textMuted }]}>Check this to display the verified badge on the game ticker</Text>
          </View>
        </TouchableOpacity>

        {/* --- FOOTER FORM ACTIONS --- */}
        <View style={styles.footerRow}>
          <TouchableOpacity style={[styles.cancelButton, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitButton}>
            <Text style={styles.submitButtonText}>Create Fixture</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Static color stripped
  scrollContent: { padding: 20, paddingBottom: 40 },
  mainTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  subtitle: { fontSize: 13, marginBottom: 24, lineHeight: 18 },
  sectionLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8, marginTop: 16 },
  
  selectDropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14, marginBottom: 8 },
  selectText: { fontSize: 14 },
  
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gridItem: { width: '31%', paddingVertical: 10, paddingHorizontal: 10, marginBottom: 16 },

  textInput: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 14 },
  inputIconWrapper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8 },
  iconInput: { flex: 1, padding: 14, fontSize: 14 },
  inputIcon: { paddingRight: 14 },

  checkboxContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 16, marginTop: 24, marginBottom: 24 },
  checkboxTitle: { fontSize: 14, fontWeight: '600' },
  checkboxSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },

  footerRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  cancelButton: { width: '32%', borderWidth: 1, borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  cancelButtonText: { fontWeight: '600', fontSize: 15 },
  submitButton: { width: '64%', backgroundColor: '#3b82f6', borderRadius: 8, paddingVertical: 16, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 }
});