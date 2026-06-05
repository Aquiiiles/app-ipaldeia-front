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
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

import { auth } from '../../src/services/firebase';
import logoIgreja from '../../assets/images_igreja/logo_igreja.jpg';
import { scale, wp } from '@/constants/responsive';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Atenção', 'Preencha todos os campos.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace('/(main)');
    } catch (error: any) {
      let message = 'Ocorreu um erro ao fazer login. Tente novamente.';
      if (
        error.code === 'auth/user-not-found' ||
        error.code === 'auth/wrong-password' ||
        error.code === 'auth/invalid-credential'
      ) {
        message = 'E-mail ou senha incorretos.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      Alert.alert('Erro', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!email.trim()) {
      Alert.alert('Atenção', 'Digite seu e-mail para redefinir a senha.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Sucesso', 'E-mail de redefinição de senha enviado. Verifique sua caixa de entrada.');
    } catch (error: any) {
      let message = 'Erro ao enviar e-mail de redefinição.';
      if (error.code === 'auth/user-not-found') {
        message = 'Nenhuma conta encontrada com este e-mail.';
      } else if (error.code === 'auth/invalid-email') {
        message = 'E-mail inválido.';
      }
      Alert.alert('Erro', message);
    }
  }

  function handleGmailLogin() {
    Alert.alert('Google', 'Login com Google em breve.');
  }

  function handleFacebookLogin() {
    Alert.alert('Facebook', 'Login com Facebook em breve.');
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <View style={styles.logoContainer}>
            <Image
              source={logoIgreja}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.title}>Bem-Vindo!</Text>
          <Text style={styles.subtitle}>
            Tenha acesso a conteúdos e recursos que facilitam seu dia a dia com
            a igreja
          </Text>

          <View style={styles.form}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="mail-outline"
                size={scale(18)}
                color="#6B6B6B"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="E-mail"
                placeholderTextColor="#9E9E9E"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <View style={styles.inputWrapper}>
              <Ionicons
                name="lock-closed-outline"
                size={scale(18)}
                color="#6B6B6B"
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor="#9E9E9E"
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
                  size={scale(18)}
                  color="#6B6B6B"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={handleForgotPassword}
            >
              <Text style={styles.forgotPasswordText}>Esqueci a senha</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>ENTRAR</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>ou</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.socialButton]}
              onPress={handleGmailLogin}
              activeOpacity={0.8}
            >
              <Ionicons
                name="logo-google"
                size={scale(17)}
                color="#3C4A3E"
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>ENTRAR COM GMAIL</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.socialButton]}
              onPress={handleFacebookLogin}
              activeOpacity={0.8}
            >
              <Ionicons
                name="logo-facebook"
                size={scale(17)}
                color="#3C4A3E"
                style={styles.socialIcon}
              />
              <Text style={styles.socialButtonText}>ENTRAR COM FACEBOOK</Text>
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
    backgroundColor: '#F5F0EB',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  container: {
    paddingHorizontal: wp(7),
    paddingVertical: scale(24),
    alignItems: 'center',
    maxWidth: 480,
    alignSelf: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  logo: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
  },
  title: {
    fontSize: scale(24),
    fontWeight: '700',
    color: '#2C2C2C',
    marginBottom: scale(6),
  },
  subtitle: {
    fontSize: scale(13),
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: scale(18),
    marginBottom: scale(24),
    paddingHorizontal: scale(8),
  },
  form: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CFC8',
    borderRadius: scale(10),
    marginBottom: scale(10),
    paddingHorizontal: scale(12),
    height: scale(46),
  },
  inputIcon: {
    marginRight: scale(8),
  },
  input: {
    flex: 1,
    fontSize: scale(14),
    color: '#2C2C2C',
    height: '100%',
  },
  eyeButton: {
    padding: scale(4),
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: scale(18),
  },
  forgotPasswordText: {
    fontSize: scale(12),
    color: '#6B6B6B',
    textDecorationLine: 'underline',
  },
  button: {
    width: '100%',
    height: scale(44),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primaryButton: {
    backgroundColor: '#3C4A3E',
    marginBottom: scale(16),
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: scale(14),
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#D4CFC8',
  },
  dividerText: {
    marginHorizontal: scale(12),
    fontSize: scale(12),
    color: '#9E9E9E',
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D4CFC8',
    marginBottom: scale(10),
  },
  socialIcon: {
    marginRight: scale(8),
  },
  socialButtonText: {
    color: '#3C4A3E',
    fontSize: scale(13),
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  registerLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(8),
  },
  registerLinkText: {
    fontSize: scale(13),
    color: '#6B6B6B',
  },
  registerLinkAction: {
    fontSize: scale(13),
    fontWeight: '700',
    color: '#3C4A3E',
    textDecorationLine: 'underline',
  },
});
