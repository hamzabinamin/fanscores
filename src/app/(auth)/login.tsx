import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext'; // 🌟 Import your theme hook

export default function LoginScreen() {
  const { colors, theme } = useAppTheme(); // 🌟 Grab active dynamic colors
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Submit Verification
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        {step === 1 ? 'Welcome to FanScores' : 'Verify Code'}
      </Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Sign in seamlessly using your phone number.
      </Text>

      <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
      <TextInput 
        style={[
          styles.input, 
          { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
          step === 2 && { backgroundColor: theme === 'dark' ? '#161618' : '#e5e5ea', color: colors.textMuted } // Muted input look when disabled
        ]} 
        placeholder="+1 234 567 890" 
        placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        editable={step === 1}
      />

      {step === 2 && (
        <>
          <Text style={[styles.label, { color: colors.text }]}>Enter OTP Code</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]} 
            placeholder="• • • • • •" 
            placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
            keyboardType="number-pad"
            secureTextEntry
            value={otp}
            onChangeText={setOtp}
          />
        </>
      )}

      <TouchableOpacity 
        style={styles.primaryButton} 
        onPress={() => step === 1 ? setStep(2) : router.replace('/(tabs)')}
      >
        <Text style={styles.buttonText}>{step === 1 ? 'Request OTP' : 'Login'}</Text>
      </TouchableOpacity>

      {step === 1 && (
        <TouchableOpacity onPress={() => router.push('/signup')} style={{ marginTop: 20 }}>
          <Text style={[styles.linkText, { color: colors.textMuted }]}>
            Don't have an account? <Text style={{ color: '#3b82f6', fontWeight: '500' }}>Create Account</Text>
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 }, // Removed static background
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8 }, // Removed static color
  subtitle: { fontSize: 14, marginBottom: 32 }, // Removed static color
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 }, // Removed static color
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 }, // Dynamic text color & input structure
  primaryButton: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { textAlign: 'center', fontSize: 14 } // Color driven via layout node props
});