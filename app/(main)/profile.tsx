import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  TextInput,
  Modal,
  Platform,
  Linking,
  ActivityIndicator,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { signOut, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { AppColors } from '@/constants/theme';
import { useThemeColors, useSettings } from '@/src/contexts/SettingsContext';
import { auth, db } from '../../src/services/firebase';
import { isAdmin } from '@/src/services/admin';
import Toast from '@/components/Toast';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type MenuItem = {
  label: string;
  icon: IoniconsName;
  action: string;
  color?: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: 'Minha conta', icon: 'person-circle-outline', action: 'account' },
  { label: 'Indicar amigo', icon: 'share-social-outline', action: 'share' },
  { label: 'Quem somos', icon: 'information-circle-outline', action: 'about' },
  { label: 'Sair', icon: 'log-out-outline', action: 'logout', color: '#c0392b' },
];

export default function ProfileScreen() {
  const colors = useThemeColors();
  const { fontSize } = useSettings();
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [showAccount, setShowAccount] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [admin, setAdmin] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'warning' });

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'success') {
    setToast({ visible: true, message, type });
  }

  function hideToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setUserName(user.displayName || '');
      setUserEmail(user.email || '');
      setUserPhoto(user.photoURL);
      getDoc(doc(db, 'usuarios', user.uid)).then((snap) => {
        const data = snap.data();
        if (data?.fotoBase64) setUserPhoto(data.fotoBase64);
      }).catch(() => {});
    }
    setAdmin(isAdmin());
  }, []);

  function handlePress(action: string) {
    switch (action) {
      case 'account':
        setEditName(userName);
        setShowAccount(true);
        break;
      case 'share':
        handleShare();
        break;
      case 'about':
        setShowAbout(true);
        break;
      case 'logout':
        setShowLogoutConfirm(true);
        break;
    }
  }

  async function handleShare() {
    const message = 'Conheça o app da Igreja Presbiteriana de Aldeia! Baixe agora: https://aquiiiles.github.io/app-ipaldeia-front/';
    if (Platform.OS === 'web') {
      if (navigator.share) {
        try {
          await navigator.share({ title: 'IP Aldeia', text: message });
        } catch {}
      } else {
        await navigator.clipboard.writeText(message);
        showToast('Link copiado!', 'success');
      }
    } else {
      Share.share({ message });
    }
  }

  async function handleSaveProfile() {
    const user = auth.currentUser;
    if (!user) return;

    if (!editName.trim()) {
      showToast('Digite seu nome.', 'warning');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(user, { displayName: editName.trim() });
      setUserName(editName.trim());
      setShowAccount(false);
      showToast('Perfil atualizado!', 'success');
    } catch {
      showToast('Erro ao salvar. Tente novamente.', 'error');
    } finally {
      setSaving(false);
    }
  }

  function pickPhoto(): Promise<File | null> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = () => {
        const file = input.files?.[0] ?? null;
        resolve(file);
      };
      input.click();
    });
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const img = new window.Image();
      img.onload = () => {
        const MAX = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
        else { w = Math.round(w * MAX / h); h = MAX; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  async function handlePickPhoto() {
    const user = auth.currentUser;
    if (!user) return;

    try {
      const file = await pickPhoto();
      if (!file) return;

      setUploadingPhoto(true);
      const base64 = await fileToBase64(file);
      await setDoc(doc(db, 'usuarios', user.uid), { fotoBase64: base64 }, { merge: true });
      await updateProfile(user, { photoURL: base64 });
      setUserPhoto(base64);
      showToast('Foto atualizada!', 'success');
    } catch (error: any) {
      console.log('Photo upload error:', error?.code || error?.message || error);
      showToast('Erro ao enviar foto. Tente novamente.', 'error');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace('/(auth)/login');
    } catch {
      showToast('Erro ao sair. Tente novamente.', 'error');
    }
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />

      <View style={styles.header}>
        <TouchableOpacity style={[styles.avatarCircle, { backgroundColor: colors.border }]} onPress={handlePickPhoto} disabled={uploadingPhoto} activeOpacity={0.7}>
          {uploadingPhoto ? (
            <ActivityIndicator color="#999" size="large" />
          ) : userPhoto ? (
            <Image source={{ uri: userPhoto }} style={styles.avatarImage} />
          ) : (
            <Ionicons name="camera-outline" size={24} color="#999" />
          )}
          <View style={[styles.avatarEditBadge, { borderColor: colors.background }]}>
            <Ionicons name="pencil" size={12} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
        <Text style={[styles.userName, { color: colors.primaryDark, fontSize }]}>{userName || 'Seu nome'}</Text>
        <Text style={[styles.userEmail, { color: colors.textSecondary }]}>{userEmail}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{admin ? 'Admin' : 'Membro'}</Text>
        </View>
      </View>

      <View style={styles.menu}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={[styles.menuItem, { borderBottomColor: colors.border }]}
            onPress={() => handlePress(item.action)}
            activeOpacity={0.6}
          >
            <Ionicons name={item.icon} size={20} color={item.color || colors.text} style={styles.menuIcon} />
            <Text style={[styles.menuLabel, { color: colors.text }, item.color ? { color: item.color } : undefined]}>
              {item.label}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={item.color || colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Minha Conta Modal */}
      <Modal visible={showAccount} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Minha Conta</Text>
              <TouchableOpacity onPress={() => setShowAccount(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <View style={styles.editAvatarContainer}>
                <TouchableOpacity style={[styles.editAvatar, { backgroundColor: colors.border }]} onPress={handlePickPhoto} disabled={uploadingPhoto} activeOpacity={0.7}>
                  {uploadingPhoto ? (
                    <ActivityIndicator color="#999" size="large" />
                  ) : userPhoto ? (
                    <Image source={{ uri: userPhoto }} style={styles.editAvatarImage} />
                  ) : (
                    <Ionicons name="person" size={40} color="#999" />
                  )}
                  <View style={[styles.editAvatarBadge, { borderColor: colors.surface }]}>
                    <Ionicons name="camera" size={16} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.editAvatarHint, { color: colors.textSecondary }]}>Toque para alterar a foto</Text>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Nome</Text>
              <TextInput
                style={[styles.fieldInput, { borderBottomColor: colors.border, color: colors.text }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Seu nome"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />

              <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>E-mail</Text>
              <View style={[styles.fieldReadonly, { borderBottomColor: colors.border }]}>
                <Text style={[styles.fieldReadonlyText, { color: colors.textSecondary }]}>{userEmail}</Text>
                <Ionicons name="lock-closed-outline" size={14} color={colors.textSecondary} />
              </View>

              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: colors.primaryDark }]}
                onPress={handleSaveProfile}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveButtonText}>SALVAR</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quem Somos Modal */}
      <Modal visible={showAbout} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Quem Somos</Text>
              <TouchableOpacity onPress={() => setShowAbout(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.aboutContent}>
              <Text style={[styles.aboutTitle, { color: colors.primaryDark }]}>Igreja Presbiteriana de Aldeia</Text>
              <Text style={[styles.aboutText, { color: colors.text }]}>
                Presbiteriana e reformada. Pregando a Palavra de forma integral, buscando exaltar o nome de Cristo e viver o evangelho.
              </Text>

              <View style={styles.aboutInfo}>
                <View style={styles.aboutRow}>
                  <Ionicons name="location-outline" size={18} color={colors.primaryDark} />
                  <Text style={[styles.aboutInfoText, { color: colors.text }]}>Estrada de Aldeia, Km 9,5 - Camaragibe, PE</Text>
                </View>
                <TouchableOpacity
                  style={styles.aboutRow}
                  onPress={() => Linking.openURL('https://www.instagram.com/ip_aldeia/')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-instagram" size={18} color={colors.primaryDark} />
                  <Text style={[styles.aboutInfoText, styles.aboutLink, { color: colors.text }]}>@ip_aldeia</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.aboutRow}
                  onPress={() => Linking.openURL('https://www.youtube.com/@ipaldeia')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="logo-youtube" size={18} color={colors.primaryDark} />
                  <Text style={[styles.aboutInfoText, styles.aboutLink, { color: colors.text }]}>@ipaldeia</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Logout Confirm Modal */}
      <Modal visible={showLogoutConfirm} animationType="fade" transparent>
        <TouchableOpacity style={styles.logoutOverlay} activeOpacity={1} onPress={() => setShowLogoutConfirm(false)}>
          <View style={[styles.logoutModal, { backgroundColor: colors.surface }]}>
            <Text style={[styles.logoutTitle, { color: colors.primaryDark }]}>Deseja sair?</Text>
            <Text style={[styles.logoutDesc, { color: colors.textSecondary }]}>Você precisará fazer login novamente para acessar o app.</Text>
            <View style={styles.logoutButtons}>
              <TouchableOpacity
                style={[styles.logoutCancelBtn, { borderColor: colors.border }]}
                onPress={() => setShowLogoutConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={[styles.logoutCancelText, { color: colors.text }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.logoutConfirmBtn}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.logoutConfirmText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#d5d0c8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#E8E4DD',
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C4A3E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 13,
    color: '#8a8a7a',
    marginBottom: 12,
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
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#d5d0c8',
  },
  menuIcon: {
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: '#4a4a40',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#F5F0EB',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: AppColors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: AppColors.text,
  },
  modalContent: {
    padding: 24,
  },
  editAvatarContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  editAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#d5d0c8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    overflow: 'hidden',
  },
  editAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: AppColors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#F5F0EB',
  },
  editAvatarHint: {
    fontSize: 12,
    color: '#8a8a7a',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8a8a7a',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  fieldInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#c5c0b8',
    paddingVertical: 10,
    fontSize: 15,
    color: '#4a4a40',
    marginBottom: 20,
  },
  fieldReadonly: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0dcd6',
    paddingVertical: 10,
    marginBottom: 28,
  },
  fieldReadonlyText: {
    flex: 1,
    fontSize: 15,
    color: '#a0a090',
  },
  saveButton: {
    backgroundColor: '#3C4A3E',
    borderRadius: 25,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  aboutContent: {
    padding: 24,
  },
  aboutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3C4A3E',
    marginBottom: 12,
  },
  aboutText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#4a4a40',
    marginBottom: 24,
  },
  aboutInfo: {
    gap: 14,
  },
  aboutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  aboutInfoText: {
    fontSize: 14,
    color: '#4a4a40',
  },
  aboutLink: {
    textDecorationLine: 'underline',
  },
  logoutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutModal: {
    backgroundColor: '#F5F0EB',
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 40,
    width: '80%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  logoutTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3C4A3E',
    marginBottom: 8,
  },
  logoutDesc: {
    fontSize: 14,
    color: '#6B6B6B',
    lineHeight: 20,
    marginBottom: 24,
  },
  logoutButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  logoutCancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#c5c0b8',
    borderRadius: 25,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4a4a40',
  },
  logoutConfirmBtn: {
    flex: 1,
    backgroundColor: '#c0392b',
    borderRadius: 25,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutConfirmText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
