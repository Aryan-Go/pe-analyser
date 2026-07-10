import { treaty } from '@elysia/eden'
import { App } from '../app/api/[[...slugs]]/route'

// .api to enter /api prefix
export const api =
  // process is defined on server side and build time
  typeof process !== 'undefined'
    ? treaty(App).api
    : treaty<typeof App>('localhost:3000').api