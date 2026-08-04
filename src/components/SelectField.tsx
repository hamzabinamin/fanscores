import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface SelectFieldProps {
  value?: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  small?: boolean;        // smaller chevron for grid cells
  containerStyle?: any;
  title?: string;         // modal title
}

export default function SelectField({
  value, placeholder, options, onSelect, small, containerStyle, title,
}: SelectFieldProps) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const hasValue = !!value;

  return (
    <>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setOpen(true)}
        style={[
          styles.dropdown,
          { backgroundColor: colors.inputBg, borderColor: colors.border },
          containerStyle,
        ]}
      >
        <Text
          numberOfLines={1}
          style={[styles.value, { color: hasValue ? colors.text : colors.textMuted }]}
        >
          {value || placeholder}
        </Text>
        <Ionicons name="chevron-down" size={small ? 14 : 16} color={colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title || placeholder}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={[styles.item, { borderBottomColor: colors.border }]}
                    onPress={() => { onSelect(item); setOpen(false); }}
                  >
                    <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
                    {selected && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14 },
  value: { fontSize: 14, flex: 1, marginRight: 6 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  card: { height: '60%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 'bold' },
  done: { fontSize: 16, fontWeight: '600', color: '#3b82f6' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  itemText: { fontSize: 16 },
});