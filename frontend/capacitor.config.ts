import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carepulse.app', // Must match strings.xml package_name & Google Cloud OAuth package
  appName: 'CarePulse',
  webDir: 'dist',
  /**
   * ⚠️ IMPORTANT - DEVELOPMENT ONLY (LIVE RELOAD):
   * This 'server' block enables Hot Module Replacement (HMR) / Live Reload on your physical device
   * during development. Any changes made to .tsx/.css files will reflect immediately on your phone.
   *
   * 🚨 CRITICAL: This block MUST be removed (or commented out) before building any APK intended
   * for demo, submission, production, or distribution to others. Leaving this active makes the app
   * completely dependent on your local development laptop's server being reachable over the network.
   */
  // server: {
  //   url: 'https://straggler-boss-unselect.ngrok-free.dev',
  //   cleartext: true,
  // },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      // MUST BE YOUR WEB CLIENT ID
      serverClientId: '328652220146-7rb9ulr62r40ue0qr3dk7fjo7ba76evb.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;