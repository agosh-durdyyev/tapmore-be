/* eslint-disable prettier/prettier */
/// <reference path="../manifest.d.ts" />

import type { ExtractBody, ExtractErrorResponse, ExtractQuery, ExtractQueryForGet, ExtractRawResponse, ExtractResponse, Method, PathWithRegistry, PatternsByMethod, RouteWithRegistry } from '@tuyau/core/types'
import type { InferInput, SimpleError } from '@vinejs/vine/types'
import type { routes } from './index.ts'

export type ParamValue = string | number | bigint | boolean

export interface Registry {
  'auth.passwordless.google': {
    methods: ["POST"]
    pattern: '/api/v1/auth/google'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['google']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['google']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['google']>>>
    }
  }
  'auth.passwordless.apple': {
    methods: ["POST"]
    pattern: '/api/v1/auth/apple'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['apple']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['apple']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['apple']>>>
    }
  }
  'auth.passwordless.request_code': {
    methods: ["POST"]
    pattern: '/api/v1/auth/email/code'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['requestCode']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['requestCode']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['requestCode']>>>
    }
  }
  'auth.passwordless.verify_code': {
    methods: ["POST"]
    pattern: '/api/v1/auth/email/verify'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['verifyCode']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['verifyCode']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/passwordless_controller').default['verifyCode']>>>
    }
  }
  'profile.profile.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/account/profile'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/profile_controller').default['show']>>>
    }
  }
  'profile.access_tokens.destroy': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/access_tokens_controller').default['destroy']>>>
    }
  }
  'account_settings.request_email': {
    methods: ["POST"]
    pattern: '/api/v1/account/email'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['requestEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['requestEmail']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['requestEmail']>>>
    }
  }
  'account_settings.verify_email': {
    methods: ["POST"]
    pattern: '/api/v1/account/email/verify'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['verifyEmail']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['verifyEmail']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['verifyEmail']>>>
    }
  }
  'account_settings.logout_all': {
    methods: ["POST"]
    pattern: '/api/v1/account/logout-all'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['logoutAll']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['logoutAll']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['logoutAll']>>>
    }
  }
  'account_settings.destroy': {
    methods: ["DELETE"]
    pattern: '/api/v1/account'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['destroy']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['destroy']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/account_settings_controller').default['destroy']>>>
    }
  }
  'pages.availability': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/usernames/:username'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { username: ParamValue }
      query: ExtractQueryForGet<InferInput<(typeof import('#validators/page').usernameValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['availability']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['availability']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['availability']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'pages.public_index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/pages'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publicIndex']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publicIndex']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publicIndex']>>>
    }
  }
  'pages.public_page': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/public/pages/:username'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { username: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publicPage']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publicPage']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publicPage']>>>
    }
  }
  'activity.store': {
    methods: ["POST"]
    pattern: '/api/v1/public/pages/:username/events'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { username: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/activity_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/activity_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/activity_controller').default['store']>>>
    }
  }
  'ai.import': {
    methods: ["POST"]
    pattern: '/api/v1/ai/import'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['import']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['import']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['import']>>>
    }
  }
  'ai.suggest': {
    methods: ["POST"]
    pattern: '/api/v1/ai/suggest'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['suggest']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['suggest']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/ai_controller').default['suggest']>>>
    }
  }
  'pages.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/page'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['show']>>>
    }
  }
  'activity.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/page/activity'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/activity_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/activity_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/activity_controller').default['show']>>>
    }
  }
  'pages.update': {
    methods: ["PUT"]
    pattern: '/api/v1/page'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/page').draftValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/page').draftValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['update']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['update']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'pages.publish': {
    methods: ["POST"]
    pattern: '/api/v1/page/publish'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/page').pageValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/page').pageValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publish']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['publish']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'pages.unpublish': {
    methods: ["DELETE"]
    pattern: '/api/v1/page/publish'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['unpublish']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['unpublish']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/pages_controller').default['unpublish']>>>
    }
  }
  'versions.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/page/versions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['index']>>>
    }
  }
  'versions.store': {
    methods: ["POST"]
    pattern: '/api/v1/page/versions'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['store']>>>
    }
  }
  'versions.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/page/versions/:number'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { number: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['show']>>>
    }
  }
  'versions.restore': {
    methods: ["POST"]
    pattern: '/api/v1/page/versions/:number/restore'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/page').draftValidator)>>
      paramsTuple: [ParamValue]
      params: { number: ParamValue }
      query: ExtractQuery<InferInput<(typeof import('#validators/page').draftValidator)>>
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['restore']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/versions_controller').default['restore']>>> | { status: 422; response: { errors: SimpleError[] } }
    }
  }
  'experiments.show': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/page/experiment'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['show']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['show']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['show']>>>
    }
  }
  'experiments.store': {
    methods: ["POST"]
    pattern: '/api/v1/page/experiment'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['store']>>>
    }
  }
  'experiments.stop': {
    methods: ["POST"]
    pattern: '/api/v1/page/experiment/stop'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['stop']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['stop']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/experiments_controller').default['stop']>>>
    }
  }
  'images.index': {
    methods: ["GET","HEAD"]
    pattern: '/api/v1/images'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/images_controller').default['index']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/images_controller').default['index']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/images_controller').default['index']>>>
    }
  }
  'images.cleanup': {
    methods: ["POST"]
    pattern: '/api/v1/images/cleanup'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/images_controller').default['cleanup']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/images_controller').default['cleanup']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/images_controller').default['cleanup']>>>
    }
  }
  'images.store': {
    methods: ["POST"]
    pattern: '/api/v1/images/uploads'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/images_controller').default['store']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/images_controller').default['store']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/images_controller').default['store']>>>
    }
  }
  'images.import_remote': {
    methods: ["POST"]
    pattern: '/api/v1/images/import'
    types: {
      body: {}
      paramsTuple: []
      params: {}
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/images_controller').default['importRemote']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/images_controller').default['importRemote']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/images_controller').default['importRemote']>>>
    }
  }
  'images.confirm': {
    methods: ["POST"]
    pattern: '/api/v1/images/:id/confirm'
    types: {
      body: {}
      paramsTuple: [ParamValue]
      params: { id: ParamValue }
      query: {}
      response: ExtractResponse<Awaited<ReturnType<import('#controllers/images_controller').default['confirm']>>>
      errorResponse: ExtractErrorResponse<Awaited<ReturnType<import('#controllers/images_controller').default['confirm']>>>
      rawResponse: ExtractRawResponse<Awaited<ReturnType<import('#controllers/images_controller').default['confirm']>>>
    }
  }
}

export namespace Route {
  export type Request<Name extends keyof typeof routes> = RouteWithRegistry.Request<typeof routes, Name>
  export type Response<Name extends keyof typeof routes> = RouteWithRegistry.Response<typeof routes, Name>
  export type Params<Name extends keyof typeof routes> = RouteWithRegistry.Params<typeof routes, Name>
  export type Body<Name extends keyof typeof routes> = RouteWithRegistry.Body<typeof routes, Name>
  export type Query<Name extends keyof typeof routes> = RouteWithRegistry.Query<typeof routes, Name>
  export type Error<Name extends keyof typeof routes> = RouteWithRegistry.Error<typeof routes, Name>
}

export namespace Path {
  export type Request<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Request<typeof routes, M, P>
  export type Response<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Response<typeof routes, M, P>
  export type Params<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Params<typeof routes, M, P>
  export type Body<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Body<typeof routes, M, P>
  export type Query<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Query<typeof routes, M, P>
  export type Error<M extends Method, P extends PatternsByMethod<typeof routes, M>> =
    PathWithRegistry.Error<typeof routes, M, P>
}
