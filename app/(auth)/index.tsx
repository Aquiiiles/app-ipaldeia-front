import { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated, Text } from 'react-native';
import { router } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../src/services/firebase';
import { useSettings } from '@/src/contexts/SettingsContext';

import logoIgreja from '../../assets/images_igreja/logo_igreja.jpg';

export default function SplashScreen() {
  const { darkMode } = useSettings();
  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(15)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale, { toValue: 1, friction: 6, tension: 40, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 400, useNativeDriver: true }),
      ]),
    ]).start();

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(logoOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.timing(textOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          if (user) {
            router.replace('/(main)');
          } else {
            router.replace('/(auth)/login');
          }
        });
      }, 1800);

      return () => clearTimeout(timer);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={[styles.container, darkMode && { backgroundColor: '#1e2a1f' }]}>
      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={logoIgreja} style={styles.logo} resizeMode="contain" />
      </Animated.View>

      <Animated.View style={[styles.textContainer, { opacity: textOpacity, transform: [{ translateY: textTranslateY }] }]}>
        <Text style={styles.churchName}>IGREJA PRESBITERIANA</Text>
        <Text style={styles.churchSubname}>DE ALDEIA</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#848d7d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logo: {
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  textContainer: {
    alignItems: 'center',
  },
  churchName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  churchSubname: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 3,
    marginTop: 2,
  },
});
