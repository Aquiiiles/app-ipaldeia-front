import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut } from 'firebase/auth';
import { AppColors } from '@/constants/theme';
import { auth } from '../../src/services/firebase';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

const MENU_ITEMS: { label: string; icon: IoniconsName; action?: string }[] = [
  { label: 'Login', icon: 'person-outline' },
  { label: 'Minha conta', icon: 'person-circle-outline' },
  { label: 'Download', icon: 'download-outline' },
  { label: 'Indicar amigo', icon: 'share-social-outline' },
  { label: 'Fale conosco', icon: 'chatbubble-outline' },
  { label: 'Sair', icon: 'log-out-outline', action: 'logout' },
];

export default function ProfileScreen() {
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || '');
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Ionicons name="camera-outline" size={24} color="#999" />
        </View>
        <Text style={styles.photoLabel}>Sua foto</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>Membro</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => handlePress(item.action)}
            activeOpacity={0.6}
          >
            <Text style={styles.menuBullet}>•</Text>
            <Text style={[
              styles.menuLabel,
              item.action === 'logout' && { color: '#c0392b' },
            ]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8E4DD',
  },
  content: {
    flexGrow: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#d5d0c8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  photoLabel: {
    fontSize: 12,
    color: '#8a8a7a',
    marginBottom: 10,
  },
  badge: {
    backgroundColor: AppColors.accent,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  menu: {
    paddingHorizontal: 32,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  menuBullet: {
    fontSize: 18,
    color: '#4a4a40',
    marginRight: 12,
  },
  menuLabel: {
    fontSize: 15,
    color: '#4a4a40',
    fontWeight: '400',
  },
});
