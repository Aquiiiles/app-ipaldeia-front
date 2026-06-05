import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';

const GROUPS = [
  { id: '1', name: 'Homens', icon: 'man-outline' as const },
  { id: '2', name: 'Mulheres', icon: 'woman-outline' as const },
  { id: '3', name: 'Jovens', icon: 'people-outline' as const },
  { id: '4', name: 'Futebol', icon: 'football-outline' as const },
  { id: '5', name: 'Pedal', icon: 'bicycle-outline' as const },
];

export default function GroupsScreen() {
  const handlePress = (groupName: string) => {
    Alert.alert(groupName, 'Detalhes do grupo em breve.');
  };

  const renderItem = ({ item }: { item: typeof GROUPS[0] }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.7}
      onPress={() => handlePress(item.name)}
    >
      <View style={styles.iconContainer}>
        <Ionicons name={item.icon} size={scale(22)} color={AppColors.primaryDark} />
      </View>
      <Text style={styles.groupName}>{item.name}</Text>
      <Ionicons name="chevron-forward" size={scale(16)} color={AppColors.border} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
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
    backgroundColor: AppColors.background,
  },
  listContent: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.cardBackground,
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  iconContainer: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: 'rgba(60, 74, 62, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(14),
  },
  groupName: {
    flex: 1,
    fontSize: scale(15),
    fontWeight: '600',
    color: AppColors.text,
  },
});
