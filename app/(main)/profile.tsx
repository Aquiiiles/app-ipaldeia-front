import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: { label: string; icon: IoniconsName }[] = [
  { label: 'Login', icon: 'person-outline' },
  { label: 'Minha conta', icon: 'settings-outline' },
  { label: 'Download', icon: 'download-outline' },
  { label: 'Indicar amigo', icon: 'share-social-outline' },
  { label: 'Fale conosco', icon: 'chatbubble-outline' },
];

export default function ProfileScreen() {
  const handlePress = () => {
    Alert.alert('Em breve!');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>Sua foto</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Membro</Text>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item, index) => (
          <View key={item.label}>
            {index > 0 && <View style={styles.divider} />}
            <TouchableOpacity style={styles.menuItem} onPress={handlePress}>
              <Ionicons
                name={item.icon}
                size={24}
                color={AppColors.text}
                style={styles.menuIcon}
              />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={AppColors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>

      {/* Footer logo */}
      <View style={styles.footerLogo}>
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.background,
  },
  contentContainer: {
    flexGrow: 1,
  },
  header: {
    backgroundColor: AppColors.headerBg,
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 32,
  },
  avatarCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AppColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 14,
    color: AppColors.textLight,
    fontWeight: '500',
  },
  badge: {
    backgroundColor: AppColors.accent,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  badgeText: {
    color: AppColors.textLight,
    fontSize: 14,
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
  },
  footerLogo: {
    alignItems: 'center',
    marginTop: 'auto' as any,
    paddingVertical: 32,
  },
  logo: {
    width: 64,
    height: 64,
    opacity: 0.5,
  },
});
