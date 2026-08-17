// Metro config.
//
// The Firebase JS SDK v12 ships a `firebase/auth` wrapper that only resolves to
// the *browser* build under React Native (its package.json has no `react-native`
// export condition). That browser build no longer exports
// `getReactNativePersistence`, so on device it is `undefined` and calling it
// crashes the app on launch.
//
// The fix: on native platforms, redirect every `firebase/auth` import to the
// internal `@firebase/auth` package, which DOES expose a `react-native` build
// (with `getReactNativePersistence`). Doing it at the resolver level keeps the
// whole app on a single auth build, so the `auth` instance and functions that
// operate on it (onAuthStateChanged, signInWithEmailAndPassword, ...) all come
// from the same module and match. On web nothing is redirected.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const upstreamResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const resolve = upstreamResolveRequest ?? context.resolveRequest;
  if (platform !== 'web' && moduleName === 'firebase/auth') {
    return resolve(context, '@firebase/auth', platform);
  }
  return resolve(context, moduleName, platform);
};

module.exports = config;
