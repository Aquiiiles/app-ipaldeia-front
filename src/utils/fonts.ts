import React from 'react';
import { Text as RNText, TextInput as RNTextInput, StyleSheet, type TextStyle } from 'react-native';

// Maps a fontWeight value to the matching Poppins variant so the whole app uses
// Poppins without having to touch every StyleSheet. Loaded weights: 400/500/600/700.
const FONT_BY_WEIGHT: Record<string, string> = {
  '100': 'Poppins_400Regular',
  '200': 'Poppins_400Regular',
  '300': 'Poppins_400Regular',
  '400': 'Poppins_400Regular',
  normal: 'Poppins_400Regular',
  '500': 'Poppins_500Medium',
  '600': 'Poppins_600SemiBold',
  '700': 'Poppins_700Bold',
  '800': 'Poppins_700Bold',
  '900': 'Poppins_700Bold',
  bold: 'Poppins_700Bold',
};

let patched = false;

// Patches the base Text and TextInput components so every text in the app
// renders with Poppins, picking the variant that matches its fontWeight.
export function enableGlobalPoppins() {
  if (patched) return;
  patched = true;
  patchComponent(RNText as any);
  patchComponent(RNTextInput as any);
}

function patchComponent(Component: any) {
  const originalRender = Component.render;
  if (typeof originalRender !== 'function') return;

  Component.render = function patchedRender(props: any, ref: any) {
    const element = originalRender.call(this, props, ref);
    const flattened = StyleSheet.flatten(element.props.style) as TextStyle | undefined;
    const weight = flattened?.fontWeight != null ? String(flattened.fontWeight) : '400';
    const family = flattened?.fontFamily ?? FONT_BY_WEIGHT[weight] ?? FONT_BY_WEIGHT['400'];

    return React.cloneElement(element, {
      style: [{ fontFamily: family }, element.props.style],
    });
  };
}
