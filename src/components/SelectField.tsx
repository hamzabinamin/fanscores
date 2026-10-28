import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAppTheme } from '../context/ThemeContext';

interface SelectFieldProps {
  value?: string;
  placeholder: string;
  options: string[];
  onSelect: (value: string) => void;
  small?: boolean;
  containerStyle?: any;
  title?: string;
  searchable?: boolean;   // force search on/off; defaults to auto (on when list is long)
}

export default function SelectField({
  value, placeholder, options, onSelect, small, containerStyle, title, searchable,
}: SelectFieldProps) {
  const { colors, theme } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const hasValue = !!value;

  // show the search box when explicitly asked, or automatically for long lists
  const showSearch = searchable ?? options.length > 8;

  const filtered = search
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const close = () => {
    setOpen(false);
    setSearch('');
  };

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

      <Modal visible={open} transparent animationType="slide" onRequestClose={close}>
        <View style={styles.overlay}>
          <View style={[styles.card, { backgroundColor: colors.background }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>{title || placeholder}</Text>
              <TouchableOpacity onPress={close}>
                <Text style={styles.done}>Done</Text>
              </TouchableOpacity>
            </View>

            {showSearch && (
              <View style={[styles.searchWrap, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
                <Ionicons name="search" size={16} color={colors.textMuted} style={{ marginRight: 8 }} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search"
                  placeholderTextColor={theme === 'dark' ? '#555' : '#aaa'}
                  value={search}
                  onChangeText={setSearch}
                  autoCorrect={false}
                  autoCapitalize="none"
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')}>
                    <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.textMuted }]}>No matches</Text>
              }
              renderItem={({ item }) => {
                const selected = item === value;
                return (
                  <TouchableOpacity
                    style={[styles.item, { borderBottomColor: colors.border }]}
                    onPress={() => { onSelect(item); close(); }}
                  >
                    <Text style={[styles.itemText, { color: colors.text }]}>{item}</Text>
                    {selected && <Ionicons name="checkmark" size={20} color="#3b82f6" />}
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
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
  card: { height: '70%', borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 18, fontWeight: 'bold' },
  done: { fontSize: 16, fontWeight: '600', color: '#3b82f6' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 15, padding: 0 },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  itemText: { fontSize: 16 },
  empty: { textAlign: 'center', marginTop: 24, fontSize: 15 },
});