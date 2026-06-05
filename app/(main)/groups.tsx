import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { AppColors } from '@/constants/theme';

const GROUPS = [
  { id: '1', name: 'HOMENS' },
  { id: '2', name: 'MULHERES' },
  { id: '3', name: 'JOVENS' },
  { id: '4', name: 'FUTEBOL' },
  { id: '5', name: 'PEDAL' },
];

const churchLogo = require('../../assets/images_igreja/logo_igreja.jpg');

export default function GroupsScreen() {
  const renderItem = ({ item, index }: { item: typeof GROUPS[0]; index: number }) => (
    <View>
      <View style={styles.row}>
        <View style={styles.iconContainer}>
          <Image source={churchLogo} style={styles.icon} />
        </View>
        <Text style={styles.groupName}>{item.name}</Text>
      </View>
      {index < GROUPS.length - 1 && <View style={styles.divider} />}
    </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: AppColors.cardBackground,
    marginRight: 20,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  groupName: {
    fontSize: 20,
    fontWeight: '600',
    color: AppColors.text,
    letterSpacing: 1,
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
  },
});
