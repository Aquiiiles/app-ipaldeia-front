import { useState } from 'react';
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
import { signInWithEmailAndPassword, sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth, googleProvider } from '../../src/services/firebase';
import logoIgreja from '../../assets/images_igreja/logo_igreja.jpg';
import Toast from '@/components/Toast';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'error' as 'success' | 'error' | 'warning' });

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
    if (Platform.OS !== 'web') {
      showToast('Login com Google disponível apenas na versão web por enquanto.', 'warning');
      return;
    }

    setGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      router.replace('/(main)');
    } catch (error: any) {
      console.log('Google login error:', error.code);
      if (error.code === 'auth/popup-closed-by-user') {
        // user closed, do nothing
      } else if (error.code === 'auth/cancelled-popup-request') {
        // duplicate popup, ignore
      } else {
        showToast('Erro ao fazer login com Google.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  function handleFacebookLogin() {
    showToast('Login com Facebook estará disponível em breve.', 'warning');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
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
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={18} color="#8a8a7a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Seu e-mail"
                placeholderTextColor="#a0a090"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={18} color="#8a8a7a" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Sua senha"
                placeholderTextColor="#a0a090"
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
                  color="#8a8a7a"
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
              <Text style={styles.forgotPasswordText}>Esqueci a senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gmailButton}
              onPress={handleGoogleLogin}
              disabled={googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color="#4a4a40" />
              ) : (
                <Text style={styles.gmailButtonText}>ENTRAR COM GMAIL</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.facebookButton}
              onPress={handleFacebookLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.facebookButtonText}>ENTRAR COM FACEBOOK</Text>
            </TouchableOpacity>

            <View style={styles.registerLinkContainer}>
              <Text style={styles.registerLinkText}>Não tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
                <Text style={styles.registerLinkAction}>Cadastre-se</Text>
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
    marginBottom: 10,
    backgroundColor: 'transparent',
  },
  gmailButtonText: {
    color: '#4a4a40',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 1,
  },
  facebookButton: {
    backgroundColor: '#3C4A3E',
    borderRadius: 25,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  facebookButtonText: {
    color: '#FFFFFF',
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
