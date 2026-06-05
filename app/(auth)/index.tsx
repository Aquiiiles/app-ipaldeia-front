import { useEffect } from 'react';
import { View, Image, StyleSheet, Platform } from 'react-native';
import { router } from 'expo-router';

import logoIgreja from '../../assets/images_igreja/logo_igreja.jpg';

export default function SplashScreen() {
  useEffect(() => {
    const delay = Platform.OS === 'web' ? 1000 : 2500;
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, delay);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Image source={logoIgreja} style={styles.logo} resizeMode="contain" />
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
  logo: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
});
