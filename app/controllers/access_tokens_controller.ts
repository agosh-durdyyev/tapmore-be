import User from '#models/user'
import type { HttpContext } from '@adonisjs/core/http'

/** Sign-in lives in PasswordlessController; this only revokes the current token. */
export default class AccessTokensController {
  async destroy({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    if (user.currentAccessToken) {
      await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    }
    return {
      message: 'Logged out successfully',
    }
  }
}
