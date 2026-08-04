import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface DateTimeFieldProps {
  mode: 'date' | 'time';
  value: Date | null;
  onChange: (d: Date) => void;
  placeholder: string;
}

export default function DateTimeField({ mode, value, onChange, placeholder }: DateTimeFieldProps) {
  const { colors, theme } = useAppTheme();
  const [show, setShow] = useState(false);
  const [temp, setTemp] = useState<Date>(value ?? new Date());

  const display = value
    ? mode === 'date'
      ? value.toLocaleDateString('en-GB')
      : value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : placeholder;

  const open = () => {
    setTemp(value ?? new Date());
    setShow(true);
  };

  // Android's native dialog handles its own confirm/cancel
  const onAndroidChange = (event: any, selected?: Date) => {
    setShow(false);
    if (event.type === 'set' && selected) onChange(selected);
  };

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={open}
        style={[styles.wrapper, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
      >
        <Text style={[styles.text, { color: value ? colors.text : (theme === 'dark' ? '#555' : '#aaa') }]}>
          {display}
        </Text>
        <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={16} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Android: inline dialog */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker value={value ?? new Date()} mode={mode} is24Hour={false} onChange={onAndroidChange} />
      )}

      {/* iOS: spinner inside a bottom sheet with Done/Cancel */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
          <View style={styles.overlay}>
            <View style={[styles.sheet, { backgroundColor: colors.card }]}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { onChange(temp); setShow(false); }}>
                  <Text style={styles.confirm}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={temp}
                mode={mode}
                display="spinner"
                themeVariant={theme === 'dark' ? 'dark' : 'light'}
                onChange={(_, selected) => selected && setTemp(selected)}
              />
            </View>
          </View>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  wrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14 },
  text: { fontSize: 14 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingBottom: 20 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  cancel: { fontSize: 16, color: '#8e8e93' },
  confirm: { fontSize: 16, fontWeight: '600', color: '#3b82f6' },
});