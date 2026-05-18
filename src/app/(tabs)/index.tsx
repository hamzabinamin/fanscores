import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import GlobalHeader from '../../components/GlobalHeader';
import { useAppTheme } from '../../context/ThemeContext'; // 🌟 Import your theme hook

export default function HomeScreen() {
  const { colors, theme } = useAppTheme(); // 🌟 Grab active dynamic colors
  console.log("HomeScreen thinks the theme is:", theme);

  return (
    // 🌟 Overwrite the main container background
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />
      
      <View style={styles.content}>
        {/* Icon Wrapper Circle - 🌟 Dynamic tint background */}
        <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
          <Ionicons name="trophy-outline" size={40} color={colors.textMuted} />
        </View>

        {/* Heading Text - 🌟 Dynamic main text color */}
        <Text style={[styles.title, { color: colors.text }]}>No Fixtures Yet</Text>
        
        {/* Description Text - 🌟 Dynamic secondary text color */}
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Get started by creating your first fixture. Add some teams first, then schedule a match between them.
        </Text>
        
        {/* Bottom Hint Row */}
        <View style={styles.hintRow}>
          <Ionicons name="calendar-outline" size={16} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={[styles.hintText, { color: colors.textMuted }]}>
            Click "Create Fixture" in the header to begin
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, // Removed hardcoded dark background
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 24 }, // Removed hardcoded #222
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 }, // Removed hardcoded #fff
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 }, // Removed hardcoded #888
  hintRow: { flexDirection: 'row', alignItems: 'center' },
  hintText: { fontSize: 14 } // Removed hardcoded #aaa
});