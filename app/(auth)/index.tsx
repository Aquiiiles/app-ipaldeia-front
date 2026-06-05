import { useEffect } from 'react';
import { View, Image, StyleSheet } from 'react-native';
import { router } from 'expo-router';

import logoIgreja from '../../assets/images_igreja/logo_igreja.jpg';
import { scale } from '@/constants/responsive';

export default function SplashScreen() {
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/(auth)/login');
    }, 2500);
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
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
  },
});
