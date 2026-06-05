import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;
const MAX_SCALE = 1.15;

const rawScale = SCREEN_WIDTH / BASE_WIDTH;
const SCALE_FACTOR = Platform.OS === 'web'
  ? Math.min(rawScale, MAX_SCALE)
  : Math.min(rawScale, MAX_SCALE);

export function wp(widthPercent: number): number {
  const effectiveWidth = Platform.OS === 'web' ? Math.min(SCREEN_WIDTH, 480) : SCREEN_WIDTH;
  return PixelRatio.roundToNearestPixel((effectiveWidth * widthPercent) / 100);
}

export function hp(heightPercent: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * heightPercent) / 100);
}

export function scale(size: number): number {
  return PixelRatio.roundToNearestPixel(size * SCALE_FACTOR);
}

export { SCREEN_WIDTH, SCREEN_HEIGHT };
