import { handle } from 'hono/vercel'
import { ensureEconomySchema } from '../src/persistence/economy'
import { app } from '../src/server'

// Vercel imports the app without running the standalone server bootstrap path.
// Initialize the economy schema during cold start so auth/economy routes stay usable.
await ensureEconomySchema()

export default handle(app)
