import { betterAuth } from 'better-auth'
import { anonymous } from 'better-auth/plugins'
import { telegram } from 'better-auth-telegram'
import { db } from './db.ts'
import { config } from './config.ts'

export const auth = betterAuth({
  database: {
    type: 'sqlite',
    db,
  },
  secret: config.BETTER_AUTH_SECRET,
  baseURL: config.BETTER_AUTH_URL,
  trustedOrigins: [config.CORS_ORIGIN],

  socialProviders: {
    discord: {
      clientId: config.DISCORD_CLIENT_ID,
      clientSecret: config.DISCORD_CLIENT_SECRET,
    },
  },

  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser }) => {
        // When a guest upgrades to a real account (Telegram / Discord),
        // transfer any data here (e.g. game stats, settings).
        // The anonymous user record is deleted by default after linking.
        console.log(`Anonymous user ${anonymousUser.user.id} linked to real account`)
      },
    }),
    telegram({
      botToken: config.TELEGRAM_BOT_TOKEN,
      botUsername: config.TELEGRAM_BOT_USERNAME,
      miniApp: { enabled: true },
    }),
  ],
})
