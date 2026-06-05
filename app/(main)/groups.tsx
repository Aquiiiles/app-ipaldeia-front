import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { AppColors } from '@/constants/theme';

const churchLogo = require('../../assets/images_igreja/logo_igreja.jpg');

const GROUPS = [
  { id: '1', name: 'HOMENS' },
  { id: '2', name: 'MULHERES' },
  { id: '3', name: 'JOVENS' },
  { id: '4', name: 'FUTEBOL' },
  { id: '5', name: 'PEDAL' },
];

export default function GroupsScreen() {
  const handlePress = (name: string) => {
    Alert.alert(name, 'Detalhes do grupo em breve.');
  };

  const renderItem = ({ item, index }: { item: typeof GROUPS[0]; index: number }) => (
    <View>
      <TouchableOpacity
        style={styles.row}
        onPress={() => handlePress(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Image source={churchLogo} style={styles.icon} />
        </View>
        <Text style={styles.groupName}>{item.name}</Text>
      </TouchableOpacity>
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
    backgroundColor: AppColors.headerBg,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginRight: 20,
  },
  icon: {
    width: 48,
    height: 48,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
});
