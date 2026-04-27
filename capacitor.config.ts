
interface CapacitorConfig {
  appId: string;
  appName: string;
  webDir: string;
  server?: {
    androidScheme?: string;
  };
  plugins?: Record<string, unknown>;
}

const config: CapacitorConfig = {
  appId: 'com.bacsport.tunisie',
  appName: 'Bac Sport Tunisie 2026',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Configuration future des plugins si nécessaire
  }
};

export default config;
