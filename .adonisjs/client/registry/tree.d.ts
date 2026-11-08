/* eslint-disable prettier/prettier */
import type { routes } from './index.ts'

export interface ApiDefinition {
  auth: {
    passwordless: {
      google: typeof routes['auth.passwordless.google']
      apple: typeof routes['auth.passwordless.apple']
      requestCode: typeof routes['auth.passwordless.request_code']
      verifyCode: typeof routes['auth.passwordless.verify_code']
    }
  }
  profile: {
    profile: {
      show: typeof routes['profile.profile.show']
    }
    accessTokens: {
      destroy: typeof routes['profile.access_tokens.destroy']
    }
  }
  pages: {
    availability: typeof routes['pages.availability']
    publicIndex: typeof routes['pages.public_index']
    publicPage: typeof routes['pages.public_page']
    show: typeof routes['pages.show']
    update: typeof routes['pages.update']
    publish: typeof routes['pages.publish']
    unpublish: typeof routes['pages.unpublish']
  }
  activity: {
    store: typeof routes['activity.store']
    show: typeof routes['activity.show']
  }
  versions: {
    index: typeof routes['versions.index']
    store: typeof routes['versions.store']
    show: typeof routes['versions.show']
    restore: typeof routes['versions.restore']
  }
  experiments: {
    show: typeof routes['experiments.show']
    store: typeof routes['experiments.store']
    stop: typeof routes['experiments.stop']
  }
  images: {
    store: typeof routes['images.store']
    confirm: typeof routes['images.confirm']
  }
}
