import type { Context, Next } from 'hono'
import { auth } from '../auth.ts'

/**
 * Hono middleware that requires an authenticated session.
 * Stores `user` and `session` on `c.set()` for downstream handlers.
 *
 * Usage:
 *   app.get('/protected', requireAuth, (c) => {
 *     const user = c.get('user')
 *     return c.json({ hello: user.name })
 *   })
 */
export async function requireAuth(c: Context, next: Next) {
  const session = await auth.api.getSession({ headers: c.req.raw.headers })

  if (!session) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  c.set('user', session.user)
  c.set('session', session.session)
  await next()
}
