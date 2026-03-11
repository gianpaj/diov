import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'
import { telegramClient } from 'better-auth-telegram/client'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL ?? 'http://localhost:3001',
  plugins: [anonymousClient(), telegramClient()],
})

export const {
  useSession,
  signIn,
  signUp,
  signOut,
} = authClient
