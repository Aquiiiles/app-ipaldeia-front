import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { useThemeColors } from '@/src/contexts/SettingsContext';
import Toast from '@/components/Toast';
import { useState } from 'react';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type Group = {
  id: string;
  name: string;
  icon: IoniconsName;
};

const GROUPS: Group[] = [
  { id: '1', name: 'HOMENS', icon: 'navigate-outline' },
  { id: '2', name: 'MULHERES', icon: 'flower-outline' },
  { id: '3', name: 'JOVENS', icon: 'heart-outline' },
  { id: '4', name: 'FUTEBOL', icon: 'football-outline' },
  { id: '5', name: 'PEDAL', icon: 'bicycle-outline' },
];

export default function GroupsScreen() {
  const colors = useThemeColors();
  const [toast, setToast] = useState({ visible: false, message: '', type: 'warning' as 'success' | 'error' | 'warning' });

  function handlePress(name: string) {
    setToast({ visible: true, message: `Detalhes do grupo ${name} em breve.`, type: 'warning' });
  }

  const renderItem = ({ item, index }: { item: Group; index: number }) => (
    <View>
      {index > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
      <TouchableOpacity
        style={styles.row}
        onPress={() => handlePress(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.shieldContainer}>
          <View style={[styles.shield, { borderColor: colors.border }]}>
            <View style={[styles.shieldTop, { borderBottomColor: colors.border }]} />
            <View style={styles.shieldIconArea}>
              <Ionicons name={item.icon} size={28} color={colors.textSecondary} />
            </View>
          </View>
        </View>
        <Text style={[styles.groupName, { color: colors.textSecondary }]}>{item.name}</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(p => ({ ...p, visible: false }))}
      />
      <FlatList
        data={GROUPS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E4DD',
  },
  listContent: {
    paddingHorizontal: 28,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
  },
  shieldContainer: {
    marginRight: 40,
  },
  shield: {
    width: 70,
    height: 85,
    borderWidth: 2,
    borderColor: '#c5c0b8',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shieldTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    borderBottomWidth: 1.5,
    borderBottomColor: '#c5c0b8',
  },
  shieldIconArea: {
    marginTop: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupName: {
    fontSize: 18,
    fontWeight: '500',
    color: '#8a8a7a',
    letterSpacing: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#d5d0c8',
  },
});
