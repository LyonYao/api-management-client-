import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

// 添加请求拦截器，携带认证token
API.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  error => {
    return Promise.reject(error)
  }
)

API.interceptors.response.use(
  res => {
    // 保持原始的字段名格式，不进行转换
    return res
  },
  err => {
    if (err.response) {
      // 处理401未授权错误
      if (err.response.status === 401) {
        // 清除本地存储的token
        localStorage.removeItem('token')
        // 显示登录过期提示
        if (typeof window !== 'undefined') {
          // 直接显示alert提示，避免require导致的问题
          alert('登录已过期，请重新登录')
          // 跳转到登录页面
          window.location.href = '/login'
          // 终止Promise链，防止后续错误处理覆盖跳转
          return new Promise(() => {})
        }
      }
      
      const e = new Error(err.response.statusText || 'API Error')
      e.status = err.response.status
      e.body = err.response.data
      return Promise.reject(e)
    }
    return Promise.reject(err)
  }
)

export function getErrorMessage(err) {
  if (!err) return 'Unknown error'
  if (err.body && err.body.detail) return err.body.detail
  if (err.body && err.body.message) return err.body.message
  if (err.message) return err.message
  try { return JSON.stringify(err.body || err) } catch { return String(err) }
}

export default API

// Simple in-memory cache for single-record lookups to avoid fetching full lists
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const cache = {
  systems: new Map(),
  apis: new Map(),
  endpoints: new Map()
}

async function fetchAndCache(map, key, url) {
  if (!key) return null
  const now = Date.now()
  const entry = map.get(key)
  if (entry && (now - entry.ts) < CACHE_TTL) return entry.data
  const res = await API.get(url)
  const data = res.data
  map.set(key, { ts: now, data })
  return data
}

export async function getSystemById(id, force = false) {
  if (!id) return null
  if (!force) {
    const e = cache.systems.get(id)
    if (e && (Date.now() - e.ts) < CACHE_TTL) return e.data
  }
  return fetchAndCache(cache.systems, id, `/api/v1/systems/${encodeURIComponent(id)}`)
}

export async function getApiById(id, force = false) {
  if (!id) return null
  if (!force) {
    const e = cache.apis.get(id)
    if (e && (Date.now() - e.ts) < CACHE_TTL) return e.data
  }
  return fetchAndCache(cache.apis, id, `/api/v1/apis/${encodeURIComponent(id)}`)
}

export async function getEndpointById(id, force = false) {
  if (!id) return null
  if (!force) {
    const e = cache.endpoints.get(id)
    if (e && (Date.now() - e.ts) < CACHE_TTL) return e.data
  }
  return fetchAndCache(cache.endpoints, id, `/api/v1/endpoints/${encodeURIComponent(id)}`)
}

// attach helpers on default export for convenience
API.getSystemById = getSystemById
API.getApiById = getApiById
API.getEndpointById = getEndpointById
 
