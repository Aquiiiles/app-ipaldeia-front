/// <reference types="expo/types" />

// Neither expo/types nor react-native ships ambient declarations for image
// imports, so `import logo from './logo.jpg'` fails typecheck on a fresh clone.
// Metro resolves these to an asset id (a number), which is what Image's
// `source` prop accepts.

declare module '*.jpg' {
  const asset: number;
  export default asset;
}

declare module '*.jpeg' {
  const asset: number;
  export default asset;
}

declare module '*.png' {
  const asset: number;
  export default asset;
}

declare module '*.gif' {
  const asset: number;
  export default asset;
}

declare module '*.webp' {
  const asset: number;
  export default asset;
}
