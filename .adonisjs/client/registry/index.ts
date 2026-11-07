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
  'pages.show': {
    methods: ["GET","HEAD"],
    pattern: '/api/v1/page',
    tokens: [[0,"api"],[0,"v1"],[0,"page"]],
    types: placeholder as Registry['pages.show']['types'],
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
  'images.store': {
    methods: ["POST"],
    pattern: '/api/v1/images/uploads',
    tokens: [[0,"api"],[0,"v1"],[0,"images"],[0,"uploads"]],
    types: placeholder as Registry['images.store']['types'],
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
