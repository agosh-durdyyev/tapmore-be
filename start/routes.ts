/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import { middleware } from '#start/kernel'
import router from '@adonisjs/core/services/router'
import { controllers } from '#generated/controllers'

// The bare address answers too, so opening api.tapmore.link doesn't look broken.
router.get('/', () => ({
  service: 'tapmore-api',
  status: 'ok',
  site: 'https://www.tapmore.link',
  health: '/health',
}))
router.get('/health', () => ({ status: 'ok', service: 'tapmore-api' }))

router
  .group(() => {
    router
      .group(() => {
        // Passwordless only: one tap with Google or Apple, or a 6-digit email code.
        router.post('google', [controllers.Passwordless, 'google'])
        router.post('apple', [controllers.Passwordless, 'apple'])
        router.post('email/code', [controllers.Passwordless, 'requestCode'])
        router.post('email/verify', [controllers.Passwordless, 'verifyCode'])
      })
      .prefix('auth')
      .as('auth')

    router
      .group(() => {
        router.get('profile', [controllers.Profile, 'show'])
        router.post('logout', [controllers.AccessTokens, 'destroy'])
      })
      .prefix('account')
      .as('profile')
      .use(middleware.auth())
  })
  .prefix('/api/v1')

const Pages = () => import('#controllers/pages_controller')
const Images = () => import('#controllers/images_controller')
const Activity = () => import('#controllers/activity_controller')
const Versions = () => import('#controllers/versions_controller')
const Experiments = () => import('#controllers/experiments_controller')
const Ai = () => import('#controllers/ai_controller')
router
  .group(() => {
    router.get('/usernames/:username', [Pages, 'availability'])
    router.get('/public/pages', [Pages, 'publicIndex'])
    router.get('/public/pages/:username', [Pages, 'publicPage'])
    router.post('/public/pages/:username/events', [Activity, 'store'])
    // AI works signed out too (onboarding comes before sign-in), with tighter limits.
    router.post('/ai/import', [Ai, 'import'])
    router.post('/ai/suggest', [Ai, 'suggest'])
    router
      .group(() => {
        router.get('/page', [Pages, 'show'])
        router.get('/page/activity', [Activity, 'show'])
        router.put('/page', [Pages, 'update'])
        router.post('/page/publish', [Pages, 'publish'])
        router.delete('/page/publish', [Pages, 'unpublish'])
        router.get('/page/versions', [Versions, 'index'])
        router.post('/page/versions', [Versions, 'store'])
        router.get('/page/versions/:number', [Versions, 'show']).where('number', /^\d+$/)
        router
          .post('/page/versions/:number/restore', [Versions, 'restore'])
          .where('number', /^\d+$/)
        router.get('/page/experiment', [Experiments, 'show'])
        router.post('/page/experiment', [Experiments, 'store'])
        router.post('/page/experiment/stop', [Experiments, 'stop'])
        router.post('/images/uploads', [Images, 'store'])
        router.post('/images/:id/confirm', [Images, 'confirm'])
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
