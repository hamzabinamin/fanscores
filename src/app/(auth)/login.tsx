import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert, FlatList, Keyboard, Modal, StyleSheet, Text, TextInput,
  TouchableOpacity, TouchableWithoutFeedback, View,
} from 'react-native';
import { countries, Country } from '../../constants/countries';
import { useAppTheme } from '../../context/ThemeContext';

export default function LoginScreen() {
  const { colors, theme } = useAppTheme();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1: Request OTP, 2: Submit Verification
  const [confirmResult, setConfirmResult] = useState<FirebaseAuthTypes.ConfirmationResult | null>(null);

  // Country picker state — default to Pakistan
  const [country, setCountry] = useState<Country>(
    countries.find((c) => c.code === 'PK') ?? countries[0]
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');

  const router = useRouter();

  const filteredCountries = countries.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search)
  );

  const selectCountry = (c: Country) => {
    setCountry(c);
    setPickerVisible(false);
    setSearch('');
  };

  const handleRequestOTP = async () => {
    // strip non-digits and any leading zero, then prepend dial code
    const localNumber = phone.trim().replace(/\D/g, '').replace(/^0+/, '');
    if (!localNumber) {
      Alert.alert('Error', 'Please enter your phone number.');
      return;
    }
    const fullNumber = `${country.dialCode}${localNumber}`;
    if (!/^\+[1-9]\d{6,14}$/.test(fullNumber)) {
      Alert.alert('Error', "That phone number doesn't look right.");
      return;
    }

    console.log('Attempting to send OTP to:', fullNumber);
    try {
      const confirmation = await auth().signInWithPhoneNumber(fullNumber);
      console.log('OTP successfully sent!');
      setConfirmResult(confirmation);
      setStep(2);
    } catch (error) {
      console.error('Detailed Firebase Error:', error);
      Alert.alert('Error', 'Could not send OTP. Check your phone number.');
    }
  };

  const handleVerifyOTP = async () => {
    if (!confirmResult) {
      Alert.alert('Error', 'Please request an OTP first.');
      return;
    }
    try {
      await confirmResult.confirm(otp);
      const uid = auth().currentUser?.uid;
      if (uid) {
        const userDoc = await firestore().collection('Users').doc(uid).get();
        if (userDoc.exists()) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/signup');
        }
      }
    } catch (error) {
      console.error('OTP verify error:', error);
      Alert.alert('Error', 'Invalid OTP.');
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {step === 1 ? 'Welcome to FanScores' : 'Verify Code'}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Sign in seamlessly using your phone number.
        </Text>

        <Text style={[styles.label, { color: colors.text }]}>Phone Number</Text>
        <View style={styles.phoneRow}>
          <TouchableOpacity
            style={[
              styles.countryButton,
              { backgroundColor: colors.inputBg, borderColor: colors.border },
              step === 2 && { backgroundColor: theme === 'dark' ? '#161618' : '#e5e5ea' },
            ]}
            onPress={() => setPickerVisible(true)}
            disabled={step === 2}
          >
            <Text style={styles.flag}>{country.flag}</Text>
            <Text style={[styles.countryCode, { color: step === 2 ? colors.textMuted : colors.text }]}>
              {country.dialCode}
            </Text>
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              styles.phoneInput,
              { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text },
              step === 2 && {
                backgroundColor: theme === 'dark' ? '#161618' : '#e5e5ea',
                color: colors.textMuted,
              },
            ]}
            placeholder="300 1234567"
            placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={step === 1}
          />
        </View>

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
          onPress={step === 1 ? handleRequestOTP : handleVerifyOTP}
        >
          <Text style={styles.buttonText}>{step === 1 ? 'Request OTP' : 'Login'}</Text>
        </TouchableOpacity>

        {/* Country picker modal */}
        <Modal
          visible={pickerVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPickerVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Country</Text>
                <TouchableOpacity onPress={() => { setPickerVisible(false); setSearch(''); }}>
                  <Text style={[styles.modalClose, { color: '#3b82f6' }]}>Done</Text>
                </TouchableOpacity>
              </View>

              <TextInput
                style={[styles.searchInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                placeholder="Search country or code"
                placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                value={search}
                onChangeText={setSearch}
                autoCorrect={false}
              />

              <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item.code}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.countryItem, { borderBottomColor: colors.border }]}
                    onPress={() => selectCountry(item)}
                  >
                    <Text style={styles.flagLarge}>{item.flag}</Text>
                    <Text style={[styles.countryName, { color: colors.text }]}>{item.name}</Text>
                    <Text style={[styles.countryDial, { color: colors.textMuted }]}>{item.dialCode}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { fontSize: 14, marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 20 },

  // Phone row
  phoneRow: { flexDirection: 'row', marginBottom: 20 },
  countryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  flag: { fontSize: 20, marginRight: 6 },
  countryCode: { fontSize: 16, fontWeight: '600' },
  phoneInput: { flex: 1, marginBottom: 0 },

  primaryButton: { backgroundColor: '#3b82f6', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 10 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  linkText: { textAlign: 'center', fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  modalCard: { height: '70%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalClose: { fontSize: 16, fontWeight: '600' },
  searchInput: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 12 },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  flagLarge: { fontSize: 24, marginRight: 12 },
  countryName: { flex: 1, fontSize: 16 },
  countryDial: { fontSize: 15 },
});