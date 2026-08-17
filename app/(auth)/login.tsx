import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
  signInWithCredential,
  GoogleAuthProvider,
} from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth, googleProvider } from '../../src/services/firebase';
import { useThemeColors } from '@/src/contexts/SettingsContext';
import logoIgreja from '../../assets/images_igreja/logo_igreja.jpg';
import Toast from '@/components/Toast';

// Required for expo-auth-session to dismiss the in-app browser and hand the
// OAuth result back to the app when it reopens (native only; no-op on web).
WebBrowser.maybeCompleteAuthSession();

// OAuth client IDs live in app.json → expo.extra.googleAuth. Fill them with the
// IDs created in Google Cloud Console (Android + Web at minimum). If they are
// blank the native Google button falls back to a helpful message instead of
// crashing.
const rawGoogleAuth = (Constants.expoConfig?.extra?.googleAuth ?? {}) as {
  androidClientId?: string;
  iosClientId?: string;
  webClientId?: string;
};
// Treat blank strings as "not provided" so expo-auth-session takes its
// unconfigured path (null request) instead of trying to build an OAuth request
// with an empty client id.
const googleAuth = {
  androidClientId: rawGoogleAuth.androidClientId || undefined,
  iosClientId: rawGoogleAuth.iosClientId || undefined,
  webClientId: rawGoogleAuth.webClientId || undefined,
};

export default function LoginScreen() {
  const colors = useThemeColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' as 'success' | 'error' | 'warning' });

  // Native Google sign-in via OAuth (expo-auth-session). `promptAsync` opens the
  // system browser; the result arrives asynchronously in the effect below. Web
  // keeps using signInWithPopup (see handleGoogleLogin).
  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest({
    androidClientId: googleAuth.androidClientId,
    iosClientId: googleAuth.iosClientId,
    webClientId: googleAuth.webClientId,
  });

  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (!googleResponse) return;

    if (googleResponse.type === 'success') {
      const idToken = googleResponse.params?.id_token;
      if (!idToken) {
        setGoogleLoading(false);
        showToast('Não foi possível obter o token do Google.', 'error');
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then(() => router.replace('/(main)'))
        .catch((error: any) => {
          console.log('Google credential error:', error.code, error.message);
          showToast(`Erro ao fazer login com Google. (${error.code || 'unknown'})`, 'error');
        })
        .finally(() => setGoogleLoading(false));
    } else if (googleResponse.type === 'error') {
      console.log('Google auth error:', googleResponse.error);
      showToast('Erro ao autenticar com o Google.', 'error');
      setGoogleLoading(false);
    } else {
      // 'dismiss' / 'cancel' — user closed the browser, just reset the button.
      setGoogleLoading(false);
    }
  }, [googleResponse]);

  function showToast(message: string, type: 'success' | 'error' | 'warning' = 'error') {
    setToast({ visible: true, message, type });
  }

  function hideToast() {
    setToast(prev => ({ ...prev, visible: false }));
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      showToast('Preencha todos os campos.', 'warning');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/(main)');
    } catch (error: any) {
      console.log('Login error:', error.code);
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        showToast('E-mail ou senha incorretos.');
      } else if (error.code === 'auth/invalid-email') {
        showToast('E-mail inválido.');
      } else if (error.code === 'auth/too-many-requests') {
        showToast('Muitas tentativas. Tente novamente mais tarde.', 'warning');
      } else {
        showToast('Erro ao fazer login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      showToast('Digite seu e-mail no campo acima para redefinir a senha.', 'warning');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showToast('Digite um e-mail válido.', 'warning');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
      showToast('E-mail de redefinição enviado! Verifique sua caixa de entrada.', 'success');
    } catch (error: any) {
      console.log('Forgot password error:', error.code);
      if (error.code === 'auth/user-not-found') {
        showToast('Nenhuma conta encontrada com este e-mail.');
      } else if (error.code === 'auth/invalid-email') {
        showToast('E-mail inválido.');
      } else {
        showToast('Erro ao enviar e-mail de redefinição.');
      }
    }
  }

  async function handleGoogleLogin() {
    // Native (Android/iOS): OAuth via the system browser. The result is handled
    // by the effect watching `googleResponse`.
    if (Platform.OS !== 'web') {
      if (!googleAuth.androidClientId && !googleAuth.iosClientId) {
        showToast('Login com Google ainda não configurado nesta versão.', 'warning');
        return;
      }
      setGoogleLoading(true);
      const result = await promptGoogleAsync();
      // If the browser could not even open, reset here (success/cancel are
      // handled in the effect once the redirect comes back).
      if (result?.type !== 'success') {
        setGoogleLoading(false);
      }
      return;
    }

    // Web: popup flow (works only in the browser).
    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace('/(main)');
    } catch (error: any) {
      console.log('Google login error:', error.code, error.message);
      if (error.code === 'auth/popup-closed-by-user') {
        // user closed, do nothing
      } else if (error.code === 'auth/cancelled-popup-request') {
        // duplicate popup, ignore
      } else if (error.code === 'auth/unauthorized-domain') {
        showToast('Domínio não autorizado. Adicione este domínio no Firebase Console → Authentication → Settings → Authorized domains.', 'warning');
      } else {
        showToast(`Erro ao fazer login com Google. (${error.code || 'unknown'})`, 'error');
      }
    } finally {
      setGoogleLoading(false);
    }
  }


  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={hideToast}
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Image
            source={logoIgreja}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.form}>
            <View style={[styles.inputWrapper, { borderBottomColor: colors.border }]}>
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Seu e-mail"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={[styles.inputWrapper, { borderBottomColor: colors.border }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Sua senha"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.enterButton}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.enterButtonText}>ENTRAR</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={[styles.forgotPasswordText, { color: colors.textSecondary }]}>Esqueci a senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.gmailButton, { borderColor: colors.border }]}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.text} />
              ) : (
                <Text style={[styles.gmailButtonText, { color: colors.text }]}>ENTRAR COM GMAIL</Text>
              )}
            </TouchableOpacity>

            <View style={styles.registerLinkContainer}>
              <Text style={[styles.registerLinkText, { color: colors.textSecondary }]}>Não tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={[styles.registerLinkAction, { color: colors.primaryDark }]}>Cadastre-se</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#E8E4DD',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    paddingHorizontal: 36,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 32,
  },
  form: {
    width: '100%',
    maxWidth: 320,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#c5c0b8',
    marginBottom: 16,
    paddingVertical: 8,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#4a4a40',
  },
  eyeButton: {
    padding: 4,
  },
  enterButton: {
    backgroundColor: '#3C4A3E',
    borderRadius: 25,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  enterButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#7a7a70',
    textDecorationLine: 'underline',
  },
  gmailButton: {
    borderWidth: 1,
    borderColor: '#c5c0b8',
    borderRadius: 25,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'transparent',
  },
  gmailButtonText: {
    color: '#4a4a40',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  registerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  registerLinkText: {
    fontSize: 13,
    color: '#7a7a70',
  },
  registerLinkAction: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3C4A3E',
    textDecorationLine: 'underline',
  },
});
