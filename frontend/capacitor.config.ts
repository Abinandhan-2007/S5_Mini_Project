import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.carepulse.app', // Must match strings.xml package_name & Google Cloud OAuth package
  appName: 'CarePulse',
  webDir: 'dist',
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