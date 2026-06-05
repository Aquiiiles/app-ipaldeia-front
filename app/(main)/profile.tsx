import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { AppColors } from '@/constants/theme';
import { scale } from '@/constants/responsive';
import { auth } from '../../src/services/firebase';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: { label: string; icon: IoniconsName; action?: string }[] = [
  { label: 'Minha conta', icon: 'settings-outline' },
  { label: 'Download', icon: 'download-outline' },
  { label: 'Indicar amigo', icon: 'share-social-outline' },
  { label: 'Fale conosco', icon: 'chatbubble-outline' },
  { label: 'Sair', icon: 'log-out-outline', action: 'logout' },
];

export default function ProfileScreen() {
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || '');
      setUserEmail(user.email || '');
    }
  }, []);

  const handlePress = (action?: string) => {
    if (action === 'logout') {
      Alert.alert('Sair', 'Deseja realmente sair?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await signOut(auth);
            router.replace('/(auth)/login');
          },
        },
      ]);
      return;
    }
    Alert.alert('Em breve!');
  };

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        {userName ? <Text style={styles.userName}>{userName}</Text> : null}
        {userEmail ? <Text style={styles.userEmail}>{userEmail}</Text> : null}
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Membro</Text>
        </View>
      </View>

      <View style={styles.menuContainer}>
        {MENU_ITEMS.map((item, index) => (
          <View key={item.label}>
            {index > 0 && <View style={styles.divider} />}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handlePress(item.action)}
              activeOpacity={0.6}
            >
              <View style={styles.menuIconContainer}>
                <Ionicons
                  name={item.icon}
                  size={scale(20)}
                  color={item.action === 'logout' ? AppColors.error : AppColors.primaryDark}
                />
              </View>
              <Text style={[
                styles.menuLabel,
                item.action === 'logout' && { color: AppColors.error },
              ]}>{item.label}</Text>
              <Ionicons
                name="chevron-forward"
                size={scale(16)}
                color={AppColors.border}
              />
            </TouchableOpacity>
          </View>
        ))}
      </View>

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
    paddingTop: scale(32),
    paddingBottom: scale(24),
  },
  avatarCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: AppColors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  avatarText: {
    fontSize: scale(22),
    color: AppColors.textLight,
    fontWeight: '700',
  },
  userName: {
    fontSize: scale(16),
    fontWeight: '700',
    color: AppColors.textLight,
    marginBottom: scale(2),
  },
  userEmail: {
    fontSize: scale(12),
    color: 'rgba(255,255,255,0.7)',
    marginBottom: scale(10),
  },
  badge: {
    backgroundColor: AppColors.accent,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: scale(4),
  },
  badgeText: {
    color: AppColors.textLight,
    fontSize: scale(12),
    fontWeight: '600',
  },
  menuContainer: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
  },
  menuIconContainer: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(60, 74, 62, 0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  menuLabel: {
    flex: 1,
    fontSize: scale(14),
    color: AppColors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: AppColors.border,
    marginLeft: scale(48),
  },
  footerLogo: {
    alignItems: 'center',
    marginTop: 'auto' as any,
    paddingVertical: scale(24),
  },
  logo: {
    width: scale(48),
    height: scale(48),
    opacity: 0.4,
  },
});
