/* eslint-disable prettier/prettier */
import type { AdonisEndpoint } from '@tuyau/core/types'
import type { Registry } from './schema.d.ts'
import type { ApiDefinition } from './tree.d.ts'

export type { Route, Path } from './schema.d.ts'

const placeholder: any = {}

const routes = {
  'auth.passwordless.google': {
    methods: ["POST"],
    pattern: '/api/v1/auth/google',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"google"]],
    types: placeholder as Registry['auth.passwordless.google']['types'],
  },
  'auth.passwordless.apple': {
    methods: ["POST"],
    pattern: '/api/v1/auth/apple',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"apple"]],
    types: placeholder as Registry['auth.passwordless.apple']['types'],
  },
  'auth.passwordless.request_code': {
    methods: ["POST"],
    pattern: '/api/v1/auth/email/code',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"email"],[0,"code"]],
    types: placeholder as Registry['auth.passwordless.request_code']['types'],
  },
  'auth.passwordless.verify_code': {
    methods: ["POST"],
    pattern: '/api/v1/auth/email/verify',
    tokens: [[0,"api"],[0,"v1"],[0,"auth"],[0,"email"],[0,"verify"]],
    types: placeholder as Registry['auth.passwordless.verify_code']['types'],
  },
  'profile.profile.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/account/profile',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"profile"]],
    types: placeholder as Registry['profile.profile.show']['types'],
  },
  'profile.access_tokens.destroy': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"logout"]],
    types: placeholder as Registry['profile.access_tokens.destroy']['types'],
  },
  'account_settings.request_email': {
    methods: ["POST"],
    pattern: '/api/v1/account/email',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"email"]],
    types: placeholder as Registry['account_settings.request_email']['types'],
  },
  'account_settings.verify_email': {
    methods: ["POST"],
    pattern: '/api/v1/account/email/verify',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"email"],[0,"verify"]],
    types: placeholder as Registry['account_settings.verify_email']['types'],
  },
  'account_settings.logout_all': {
    methods: ["POST"],
    pattern: '/api/v1/account/logout-all',
    tokens: [[0,"api"],[0,"v1"],[0,"account"],[0,"logout-all"]],
    types: placeholder as Registry['account_settings.logout_all']['types'],
  },
  'account_settings.destroy': {
    methods: ["DELETE"],
    pattern: '/api/v1/account',
    tokens: [[0,"api"],[0,"v1"],[0,"account"]],
    types: placeholder as Registry['account_settings.destroy']['types'],
  },
  'pages.availability': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/usernames/:username',
    tokens: [[0,"api"],[0,"v1"],[0,"usernames"],[1,"username"]],
    types: placeholder as Registry['pages.availability']['types'],
  },
  'pages.public_index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/public/pages',
    tokens: [[0,"api"],[0,"v1"],[0,"public"],[0,"pages"]],
    types: placeholder as Registry['pages.public_index']['types'],
  },
  'pages.public_page': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/public/pages/:username',
    tokens: [[0,"api"],[0,"v1"],[0,"public"],[0,"pages"],[1,"username"]],
    types: placeholder as Registry['pages.public_page']['types'],
  },
  'activity.store': {
    methods: ["POST"],
    pattern: '/api/v1/public/pages/:username/events',
    tokens: [[0,"api"],[0,"v1"],[0,"public"],[0,"pages"],[1,"username"],[0,"events"]],
    types: placeholder as Registry['activity.store']['types'],
  },
  'ai.import': {
    methods: ["POST"],
    pattern: '/api/v1/ai/import',
    tokens: [[0,"api"],[0,"v1"],[0,"ai"],[0,"import"]],
    types: placeholder as Registry['ai.import']['types'],
  },
  'ai.suggest': {
    methods: ["POST"],
    pattern: '/api/v1/ai/suggest',
    tokens: [[0,"api"],[0,"v1"],[0,"ai"],[0,"suggest"]],
    types: placeholder as Registry['ai.suggest']['types'],
  },
  'pages.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/page',
    tokens: [[0,"api"],[0,"v1"],[0,"page"]],
    types: placeholder as Registry['pages.show']['types'],
  },
  'activity.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/page/activity',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"activity"]],
    types: placeholder as Registry['activity.show']['types'],
  },
  'pages.update': {
    methods: ["PUT"],
    pattern: '/api/v1/page',
    tokens: [[0,"api"],[0,"v1"],[0,"page"]],
    types: placeholder as Registry['pages.update']['types'],
  },
  'pages.publish': {
    methods: ["POST"],
    pattern: '/api/v1/page/publish',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"publish"]],
    types: placeholder as Registry['pages.publish']['types'],
  },
  'pages.unpublish': {
    methods: ["DELETE"],
    pattern: '/api/v1/page/publish',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"publish"]],
    types: placeholder as Registry['pages.unpublish']['types'],
  },
  'versions.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/page/versions',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"versions"]],
    types: placeholder as Registry['versions.index']['types'],
  },
  'versions.store': {
    methods: ["POST"],
    pattern: '/api/v1/page/versions',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"versions"]],
    types: placeholder as Registry['versions.store']['types'],
  },
  'versions.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/page/versions/:number',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"versions"],[1,"number"]],
    types: placeholder as Registry['versions.show']['types'],
  },
  'versions.restore': {
    methods: ["POST"],
    pattern: '/api/v1/page/versions/:number/restore',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"versions"],[1,"number"],[0,"restore"]],
    types: placeholder as Registry['versions.restore']['types'],
  },
  'experiments.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/page/experiment',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"experiment"]],
    types: placeholder as Registry['experiments.show']['types'],
  },
  'experiments.store': {
    methods: ["POST"],
    pattern: '/api/v1/page/experiment',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"experiment"]],
    types: placeholder as Registry['experiments.store']['types'],
  },
  'experiments.stop': {
    methods: ["POST"],
    pattern: '/api/v1/page/experiment/stop',
    tokens: [[0,"api"],[0,"v1"],[0,"page"],[0,"experiment"],[0,"stop"]],
    types: placeholder as Registry['experiments.stop']['types'],
  },
  'images.index': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/images',
    tokens: [[0,"api"],[0,"v1"],[0,"images"]],
    types: placeholder as Registry['images.index']['types'],
  },
  'images.cleanup': {
    methods: ["POST"],
    pattern: '/api/v1/images/cleanup',
    tokens: [[0,"api"],[0,"v1"],[0,"images"],[0,"cleanup"]],
    types: placeholder as Registry['images.cleanup']['types'],
  },
  'images.store': {
    methods: ["POST"],
    pattern: '/api/v1/images/uploads',
    tokens: [[0,"api"],[0,"v1"],[0,"images"],[0,"uploads"]],
    types: placeholder as Registry['images.store']['types'],
  },
  'images.import_remote': {
    methods: ["POST"],
    pattern: '/api/v1/images/import',
    tokens: [[0,"api"],[0,"v1"],[0,"images"],[0,"import"]],
    types: placeholder as Registry['images.import_remote']['types'],
  },
  'images.confirm': {
    methods: ["POST"],
    pattern: '/api/v1/images/:id/confirm',
    tokens: [[0,"api"],[0,"v1"],[0,"images"],[1,"id"],[0,"confirm"]],
    types: placeholder as Registry['images.confirm']['types'],
  },
} as const satisfies Record<string, AdonisEndpoint>

export { routes }

export const registry = {
  routes,
  $tree: {} as ApiDefinition,
}

declare module '@tuyau/core/types' {
  export interface UserRegistry {
    routes: typeof routes
    $tree: ApiDefinition
  }
}
