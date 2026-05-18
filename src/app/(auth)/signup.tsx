import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext'; // 🌟 Import your theme hook

export default function SignupScreen() {
  const { colors, theme } = useAppTheme(); // 🌟 Grab active dynamic colors
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const router = useRouter();

  const handleSignup = () => {
    if (!username || !phone) {
      alert("Please fill out all fields.");
      return;
    }
    // Your custom creation logic will go here
    router.replace('/(tabs)');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Create Account</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Join FanScores to start managing custom games and sports data.
      </Text>

      {/* Username Field */}
      <Text style={[styles.label, { color: colors.text }]}>Username</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} 
        placeholder="e.g., ScoreMaster" 
        placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />

      {/* Phone Field */}
      <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
      <TextInput 
        style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} 
        placeholder="+1 234 567 890" 
        placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
      />

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={handleSignup}
      >
        <Text style={styles.buttonText}>Create Account</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 20 }}>
        <Text style={[styles.linkText, { color: colors.textMuted }]}>
          Already have an account? <Text style={{ color: '#3b82f6', fontWeight: '500' }}>Login</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 }, // Removed static background
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8 }, // Removed static color
  subtitle: { fontSize: 14, marginBottom: 32 }, // Removed static color
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 }, // Removed static color
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 }, // Structural styling only
  primaryButton: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { textAlign: 'center', fontSize: 14 } // Color text explicitly assigned inside node wrappers
});