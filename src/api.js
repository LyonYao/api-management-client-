import axios from 'axios'

const API = axios.create({
  baseURL: 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000
})

// 将下划线分隔的字段名转换为驼峰命名
function snakeToCamel(obj) {
  if (Array.isArray(obj)) {
    return obj.map(item => snakeToCamel(item))
  } else if (obj && typeof obj === 'object') {
    const converted = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
        converted[camelKey] = snakeToCamel(obj[key])
      }
    }
    return converted
  }
  return obj
}

API.interceptors.response.use(
  res => {
    // 转换响应数据中的字段名为驼峰命名
    if (res.data) {
      res.data = snakeToCamel(res.data)
    }
    return res
  },
  err => {
    if (err.response) {
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
 
