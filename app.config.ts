import { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Dynamic layer on top of app.json.
 *
 * app.json is the single source of truth for the app config — add new fields
 * there, not here. This file only does the one thing a static config can't:
 * strip `experiments.baseUrl` on native builds.
 *
 * baseUrl '/app-ipaldeia-front' is only needed for the GitHub Pages web
 * deployment. On native the prefix breaks routing, so it has to come out.
 * EAS_BUILD_PLATFORM is set during EAS builds; EXPO_OS during local dev.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const isNativeBuild =
    ['android', 'ios'].includes(process.env.EAS_BUILD_PLATFORM ?? '') ||
    ['android', 'ios'].includes(process.env.EXPO_OS ?? '');

  const { baseUrl, ...experimentsWithoutBaseUrl } = config.experiments ?? {};

  return {
    ...config,
    name: config.name ?? 'IP Aldeia',
    slug: config.slug ?? 'ip-aldeia',
    experiments: isNativeBuild ? experimentsWithoutBaseUrl : config.experiments,
  };
};
