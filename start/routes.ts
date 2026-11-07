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

const Passwordless = () => import('#controllers/passwordless_controller')

router.get('/health', () => ({ status: 'ok', service: 'tapmore-api' }))

router
  .group(() => {
    router
      .group(() => {
        router.post('signup', [controllers.NewAccount, 'store'])
        router.post('login', [controllers.AccessTokens, 'store'])
        // Passwordless sign-in: one tap with Google or Apple, or a 6-digit email code.
        router.post('google', [Passwordless, 'google'])
        router.post('apple', [Passwordless, 'apple'])
        router.post('email/code', [Passwordless, 'requestCode'])
        router.post('email/verify', [Passwordless, 'verifyCode'])
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
router
  .group(() => {
    router.get('/usernames/:username', [Pages, 'availability'])
    router.get('/public/pages/:username', [Pages, 'publicPage'])
    router
      .group(() => {
        router.get('/page', [Pages, 'show'])
        router.put('/page', [Pages, 'update'])
        router.post('/page/publish', [Pages, 'publish'])
        router.delete('/page/publish', [Pages, 'unpublish'])
        router.post('/images/uploads', [Images, 'store'])
        router.post('/images/:id/confirm', [Images, 'confirm'])
      })
      .use(middleware.auth())
  })
  .prefix('/api/v1')
