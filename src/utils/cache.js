// 客户端缓存管理模块

const CACHE_KEYS = {
  SYSTEMS: 'api_manager_systems',
  APIS: 'api_manager_apis'
};

// 缓存过期时间（毫秒）
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24小时

/**
 * 保存数据到本地存储
 * @param {string} key - 缓存键
 * @param {any} data - 要缓存的数据
 */
export function setCache(key, data) {
  try {
    const cacheData = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

/**
 * 从本地存储获取数据
 * @param {string} key - 缓存键
 * @returns {any|null} - 缓存的数据或null
 */
export function getCache(key) {
  try {
    const cachedItem = localStorage.getItem(key);
    if (!cachedItem) return null;

    const { data, timestamp } = JSON.parse(cachedItem);
    
    // 检查缓存是否过期
    if (Date.now() - timestamp > CACHE_EXPIRY) {
      removeCache(key);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error getting from cache:', error);
    return null;
  }
}

/**
 * 从本地存储移除数据
 * @param {string} key - 缓存键
 */
export function removeCache(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from cache:', error);
  }
}

/**
 * 清理所有缓存
 */
export function clearAllCache() {
  try {
    Object.values(CACHE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * 缓存系统列表
 * @param {Array} systems - 系统列表
 */
export function cacheSystems(systems) {
  setCache(CACHE_KEYS.SYSTEMS, systems);
}

/**
 * 获取缓存的系统列表
 * @returns {Array|null} - 系统列表或null
 */
export function getCachedSystems() {
  return getCache(CACHE_KEYS.SYSTEMS);
}

/**
 * 缓存API列表
 * @param {Array} apis - API列表
 */
export function cacheApis(apis) {
  setCache(CACHE_KEYS.APIS, apis);
}

/**
 * 获取缓存的API列表
 * @returns {Array|null} - API列表或null
 */
export function getCachedApis() {
  return getCache(CACHE_KEYS.APIS);
}

/**
 * 根据系统ID获取系统信息
 * @param {string} systemId - 系统ID
 * @returns {Object|null} - 系统信息或null
 */
export function getSystemById(systemId) {
  const systems = getCachedSystems();
  if (!systems) return null;
  return systems.find(system => system.id === systemId) || null;
}

/**
 * 根据API ID获取API信息
 * @param {string} apiId - API ID
 * @returns {Object|null} - API信息或null
 */
export function getApiById(apiId) {
  const apis = getCachedApis();
  if (!apis) return null;
  return apis.find(api => api.id === apiId) || null;
}

/**
 * 当系统更新时，更新缓存
 * @param {Object} updatedSystem - 更新后的系统信息
 */
export function updateSystemCache(updatedSystem) {
  const systems = getCachedSystems();
  if (!systems) return;
  const updatedSystems = systems.map(system => 
    system.id === updatedSystem.id ? updatedSystem : system
  );
  cacheSystems(updatedSystems);
}

/**
 * 当API更新时，更新缓存
 * @param {Object} updatedApi - 更新后的API信息
 */
export function updateApiCache(updatedApi) {
  const apis = getCachedApis();
  if (!apis) return;
  const updatedApis = apis.map(api => 
    api.id === updatedApi.id ? updatedApi : api
  );
  cacheApis(updatedApis);
}
