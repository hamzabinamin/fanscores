import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';

export default function SignupScreen() {
  const { colors, theme } = useAppTheme(); 
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleCompleteRegistration = async () => {
    if (!username.trim()) {
      Alert.alert("Error", "Please enter a username.");
      return;
    }

    setLoading(true);
    const user = auth().currentUser;

    if (user) {
      try {
        await firestore()
          .collection("Users")
          .doc(user.uid)
          .set({
            username: username.trim(),
            phone: user.phoneNumber,
            createdAt: firestore.FieldValue.serverTimestamp(),
        });
        
        router.replace('/(tabs)');
      } catch (error) {
        Alert.alert("Error", "Could not save profile. Please try again.");
        setLoading(false);
      }
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Complete Registration</Text>
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

      <TouchableOpacity 
        style={[styles.primaryButton, loading && { opacity: 0.7 }]}
        onPress={handleCompleteRegistration}
        disabled={loading}
      >
       {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Continue</Text>
        )}
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