import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BASE_WIDTH = 375;

export function wp(widthPercent: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH * widthPercent) / 100);
}

export function hp(heightPercent: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_HEIGHT * heightPercent) / 100);
}

export function scale(size: number): number {
  return PixelRatio.roundToNearestPixel((SCREEN_WIDTH / BASE_WIDTH) * size);
}

export { SCREEN_WIDTH, SCREEN_HEIGHT };
