import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chibishoppu.pos',
  appName: 'Chibishoppu POS',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
