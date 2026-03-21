import { createAuthClient } from 'better-auth/react'
import { anonymousClient } from 'better-auth/client/plugins'
import { telegramClient } from 'better-auth-telegram/client'

const baseURL = import.meta.env.VITE_BETTER_AUTH_URL
if (!baseURL) {
  throw new Error(
    'VITE_BETTER_AUTH_URL is not set. Configure VITE_BETTER_AUTH_URL to use authClient.'
  )
}
export const authClient = createAuthClient({
  baseURL,
  fetchOptions: {
    credentials: 'include',
  },
  plugins: [anonymousClient(), telegramClient()],
})

export const { useSession, signIn, signUp, signOut } = authClient
