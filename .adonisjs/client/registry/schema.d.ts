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
  'pages.update': {
    methods: ["PUT"]
    pattern: '/api/v1/page'
    types: {
      body: ExtractBody<InferInput<(typeof import('#validators/page').pageValidator)>>
      paramsTuple: []
      params: {}
      query: ExtractQuery<InferInput<(typeof import('#validators/page').pageValidator)>>
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
