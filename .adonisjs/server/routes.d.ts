import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'auth.passwordless.google': { paramsTuple?: []; params?: {} }
    'auth.passwordless.apple': { paramsTuple?: []; params?: {} }
    'auth.passwordless.request_code': { paramsTuple?: []; params?: {} }
    'auth.passwordless.verify_code': { paramsTuple?: []; params?: {} }
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'pages.availability': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'pages.public_index': { paramsTuple?: []; params?: {} }
    'pages.public_page': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'activity.store': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'ai.import': { paramsTuple?: []; params?: {} }
    'ai.suggest': { paramsTuple?: []; params?: {} }
    'pages.show': { paramsTuple?: []; params?: {} }
    'activity.show': { paramsTuple?: []; params?: {} }
    'pages.update': { paramsTuple?: []; params?: {} }
    'pages.publish': { paramsTuple?: []; params?: {} }
    'pages.unpublish': { paramsTuple?: []; params?: {} }
    'versions.index': { paramsTuple?: []; params?: {} }
    'versions.store': { paramsTuple?: []; params?: {} }
    'versions.show': { paramsTuple: [ParamValue]; params: {'number': ParamValue} }
    'versions.restore': { paramsTuple: [ParamValue]; params: {'number': ParamValue} }
    'experiments.show': { paramsTuple?: []; params?: {} }
    'experiments.store': { paramsTuple?: []; params?: {} }
    'experiments.stop': { paramsTuple?: []; params?: {} }
    'images.store': { paramsTuple?: []; params?: {} }
    'images.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  GET: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'pages.availability': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'pages.public_index': { paramsTuple?: []; params?: {} }
    'pages.public_page': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'pages.show': { paramsTuple?: []; params?: {} }
    'activity.show': { paramsTuple?: []; params?: {} }
    'versions.index': { paramsTuple?: []; params?: {} }
    'versions.show': { paramsTuple: [ParamValue]; params: {'number': ParamValue} }
    'experiments.show': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'profile.profile.show': { paramsTuple?: []; params?: {} }
    'pages.availability': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'pages.public_index': { paramsTuple?: []; params?: {} }
    'pages.public_page': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'pages.show': { paramsTuple?: []; params?: {} }
    'activity.show': { paramsTuple?: []; params?: {} }
    'versions.index': { paramsTuple?: []; params?: {} }
    'versions.show': { paramsTuple: [ParamValue]; params: {'number': ParamValue} }
    'experiments.show': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'auth.passwordless.google': { paramsTuple?: []; params?: {} }
    'auth.passwordless.apple': { paramsTuple?: []; params?: {} }
    'auth.passwordless.request_code': { paramsTuple?: []; params?: {} }
    'auth.passwordless.verify_code': { paramsTuple?: []; params?: {} }
    'profile.access_tokens.destroy': { paramsTuple?: []; params?: {} }
    'activity.store': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'ai.import': { paramsTuple?: []; params?: {} }
    'ai.suggest': { paramsTuple?: []; params?: {} }
    'pages.publish': { paramsTuple?: []; params?: {} }
    'versions.store': { paramsTuple?: []; params?: {} }
    'versions.restore': { paramsTuple: [ParamValue]; params: {'number': ParamValue} }
    'experiments.store': { paramsTuple?: []; params?: {} }
    'experiments.stop': { paramsTuple?: []; params?: {} }
    'images.store': { paramsTuple?: []; params?: {} }
    'images.confirm': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
  PUT: {
    'pages.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'pages.unpublish': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}