import type { CapacitorConfig } from '@capacitor/cli'

const hosted =
  process.env.CAP_SERVER_URL ||
  'https://hivenotes-web.onrender.com'

const config: CapacitorConfig = {
  appId: 'app.hivenotes.journal',
  appName: 'HiveNotes',
  webDir: 'www',
  server: {
    url: hosted,
    cleartext: false,
  },
  ios: {
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
    scrollEnabled: true,
  },
}

export default config
