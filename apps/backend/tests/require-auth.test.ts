import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'

vi.mock('../src/auth.ts', () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}))

import { auth } from '../src/auth'
import { requireAuth } from '../src/middleware/auth'

describe('requireAuth middleware', () => {
  it('returns 401 when there is no authenticated session', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null)

    const app = new Hono()
    app.get('/protected', requireAuth, c => c.json({ ok: true }))

    const response = await app.request('/protected')

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' })
  })

  it('stores user and session for downstream handlers', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: 'user-1', name: 'Player One' },
      session: { id: 'session-1' },
    } as Awaited<ReturnType<typeof auth.api.getSession>>)

    const app = new Hono()
    app.get('/protected', requireAuth, c => {
      const context = c as typeof c & {
        get(key: 'user'): { id: string }
        get(key: 'session'): { id: string }
      }
      const user = context.get('user')
      const session = context.get('session')

      return c.json({
        userId: user.id,
        sessionId: session.id,
      })
    })

    const response = await app.request('/protected')

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      userId: 'user-1',
      sessionId: 'session-1',
    })
  })
})
