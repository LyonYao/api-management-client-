import { useEffect, useState, useRef } from 'react'
import { Card, Button, message, Modal, Descriptions, Spin, Space, Tag, AutoComplete } from 'antd'
import { ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import G6 from '@antv/g6'
import API, { getErrorMessage } from '../api'

export default function Topology() {
  const [loading, setLoading] = useState(true)
  const [searchSystem, setSearchSystem] = useState('')
  const [allSystems, setAllSystems] = useState([])
  const [focusedSystemId, setFocusedSystemId] = useState(null)
  const [topologyData, setTopologyData] = useState({ systems: [], apis: [], endpoints: [], connections: [] })
  const graphRef = useRef(null)
  const graphInstance = useRef(null)

  // 获取基础数据
  async function fetchBaseData() {
    try {
      const [rRes, sRes, aRes, eRes] = await Promise.all([
        API.get('/api/v1/relationships'), 
        API.get('/api/v1/systems'), 
        API.get('/api/v1/apis'),
        API.get('/api/v1/endpoints')
      ])
      
      const rels = rRes.data || []
      const systems = sRes.data || []
      const apis = aRes.data || []
      const endpoints = eRes.data || []

      console.log('Fetched base data:', {
        relationships: rels.length,
        systems: systems.length,
        apis: apis.length,
        endpoints: endpoints.length
      })

      setAllSystems(systems)
      return { rels, systems, apis, endpoints }
    } catch (err) {
      console.error('Error fetching data:', err)
      return { rels: [], systems: [], apis: [], endpoints: [] }
    }
  }

  // 构建拓扑数据
  async function buildData(focusSystemId = focusedSystemId) {
    try {
      const { rels, systems, apis, endpoints } = await fetchBaseData()

      // 如果没有数据，创建测试数据
      if (systems.length === 0) {
        return createTestData()
      }

      return buildTopologyFromData(rels, systems, apis, endpoints, focusSystemId)
    } catch (err) {
      console.error('Error building data:', err)
      return createTestData()
    }
  }

  // 数据量限制阈值
  const MAX_NODES = 100
  const MAX_EDGES = 200
  
  // 从实际数据构建拓扑图
  function buildTopologyFromData(rels, systems, apis, endpoints, focusSystemId = null) {
    console.log('Building topology from data:', {
      systems: systems.length,
      apis: apis.length,
      endpoints: endpoints.length,
      relationships: rels.length,
      focusSystemId
    })
    
    // 检查数据量是否超过阈值
    const totalPotentialNodes = systems.length + apis.length + endpoints.length
    const totalPotentialEdges = rels.length + apis.length + endpoints.length // 包括层级关系边
    
    if (totalPotentialNodes > MAX_NODES || totalPotentialEdges > MAX_EDGES) {
      console.warn('Data volume exceeds threshold, applying limits:', {
        totalPotentialNodes,
        totalPotentialEdges,
        maxNodes: MAX_NODES,
        maxEdges: MAX_EDGES
      })
      
      // 如果数据量过大且没有焦点系统，提示用户使用搜索功能
      if (!focusSystemId) {
        message.warning('数据量较大，请使用搜索功能聚焦特定系统查看')
      }
    }
    
    // 构建 Map 以提高查找效率
    const apiMap = new Map()
    apis.forEach(api => apiMap.set(api.id, api))
    
    const endpointMap = new Map()
    endpoints.forEach(endpoint => endpointMap.set(endpoint.id, endpoint))
    
    const systemMap = new Map()
    systems.forEach(system => systemMap.set(system.id, system))
    
    let relevantSystemIds = new Set()
    let relevantApiIds = new Set()
    let relevantEndpointIds = new Set()

    // 如果有焦点系统，找到所有相关的系统和API
    if (focusSystemId) {
      relevantSystemIds.add(focusSystemId)
      
      // 添加焦点系统下的所有API
      apis.filter(a => a.system_id === focusSystemId).forEach(a => {
        relevantApiIds.add(a.id)
      })
      
      // 找到所有与焦点系统相关的关系
      rels.forEach(r => {
        let sourceSystemId, targetSystemId, sourceApiId, targetApiId
        
        // 解析调用方
        if (r.caller_type === 'SYSTEM') {
          sourceSystemId = r.caller_id
        } else {
          const callerApi = apiMap.get(r.caller_id)
          sourceApiId = r.caller_id
          sourceSystemId = callerApi?.system_id
        }
        
        // 解析被调用方
        if (r.callee_type === 'SYSTEM') {
          targetSystemId = r.callee_id
        } else {
          const calleeApi = apiMap.get(r.callee_id)
          targetApiId = r.callee_id
          targetSystemId = calleeApi?.system_id
        }
        
        // 如果与焦点系统相关，包含相关的系统和API
        if (sourceSystemId === focusSystemId || targetSystemId === focusSystemId) {
          if (sourceSystemId) relevantSystemIds.add(sourceSystemId)
          if (targetSystemId) relevantSystemIds.add(targetSystemId)
          if (sourceApiId) relevantApiIds.add(sourceApiId)
          if (targetApiId) relevantApiIds.add(targetApiId)
          if (r.endpoint_id) relevantEndpointIds.add(r.endpoint_id)
        }
      })
    } else {
      // 显示所有系统和API
      systems.forEach(s => relevantSystemIds.add(s.id))
      apis.forEach(a => relevantApiIds.add(a.id))
      endpoints.forEach(e => relevantEndpointIds.add(e.id))
    }
    
    // 确保所有在关系中出现的系统和API都被包含
    if (focusSystemId) {
      // 只处理与焦点系统相关的关系
      rels.forEach(r => {
        let sourceSystemId, targetSystemId
        
        // 解析调用方系统ID
        if (r.caller_type === 'SYSTEM') {
          sourceSystemId = r.caller_id
        } else {
          const callerApi = apiMap.get(r.caller_id)
          sourceSystemId = callerApi?.system_id
        }
        
        // 解析被调用方系统ID
        if (r.callee_type === 'SYSTEM') {
          targetSystemId = r.callee_id
        } else {
          const calleeApi = apiMap.get(r.callee_id)
          targetSystemId = calleeApi?.system_id
        }
        
        // 只包含与焦点系统相关的关系
        if (sourceSystemId === focusSystemId || targetSystemId === focusSystemId) {
          // 处理调用方
          if (r.caller_type === 'SYSTEM') {
            relevantSystemIds.add(r.caller_id)
          } else {
            const callerApi = apiMap.get(r.caller_id)
            if (callerApi) {
              relevantSystemIds.add(callerApi.system_id)
              relevantApiIds.add(callerApi.id)
            }
          }
          
          // 处理被调用方
          if (r.callee_type === 'SYSTEM') {
            relevantSystemIds.add(r.callee_id)
          } else {
            const calleeApi = apiMap.get(r.callee_id)
            if (calleeApi) {
              relevantSystemIds.add(calleeApi.system_id)
              relevantApiIds.add(calleeApi.id)
            }
          }
          
          // 处理端点
          if (r.endpoint_id) {
            const endpoint = endpointMap.get(r.endpoint_id)
            if (endpoint) {
              relevantEndpointIds.add(endpoint.id)
              const endpointApi = apiMap.get(endpoint.api_id)
              if (endpointApi) {
                relevantSystemIds.add(endpointApi.system_id)
                relevantApiIds.add(endpointApi.id)
              }
            }
          }
        }
      })
    }
    
    // 确保所有API都被包含在对应的系统中
    apis.forEach(api => {
      if (relevantSystemIds.has(api.system_id)) {
        relevantApiIds.add(api.id)
      }
    })
    
    // 确保所有端点都被包含在对应的API中
    endpoints.forEach(endpoint => {
      if (relevantApiIds.has(endpoint.api_id)) {
        relevantEndpointIds.add(endpoint.id)
      }
    })

    // 计算每个系统的连接数
    const calculateSystemConnections = (systemId) => {
      let connectionCount = 0
      rels.forEach(r => {
        // 检查系统是否是调用方
        if (r.caller_type === 'SYSTEM' && r.caller_id === systemId) {
          connectionCount++
        }
        // 检查系统是否包含被调用的API
        if (r.callee_type === 'API') {
          const calleeApi = apiMap.get(r.callee_id)
          if (calleeApi && calleeApi.system_id === systemId) {
            connectionCount++
          }
        }
      })
      return connectionCount
    }

    // 构建系统数据结构
    const systemData = systems
      .filter(s => relevantSystemIds.has(s.id))
      .map(system => {
        // 计算系统连接数
        const connectionCount = calculateSystemConnections(system.id)
        return {
          ...system,
          connectionCount
        }
      })
    
    // 构建系统数据 Map
    const systemDataMap = new Map()
    systemData.forEach(system => systemDataMap.set(system.id, system))

    // 构建API数据结构
    const apiData = apis
      .filter(a => relevantApiIds.has(a.id))
      .map(api => {
        const system = systemDataMap.get(api.system_id)
        return {
          ...api,
          system_name: system?.name
        }
      })
    
    // 构建API数据 Map
    const apiDataMap = new Map()
    apiData.forEach(api => apiDataMap.set(api.id, api))

    // 构建端点数据结构
    const endpointData = endpoints
      .filter(e => {
        return relevantEndpointIds.has(e.id) && apiDataMap.has(e.api_id)
      })
      .map(endpoint => {
        const api = apiDataMap.get(endpoint.api_id)
        return {
          ...endpoint,
          api_name: api?.name,
          system_name: api?.system_name,
          method: endpoint.http_method || endpoint.method
        }
      })

    // 构建连接数据
    const connections = rels
      .filter(r => {
        // 只包含与焦点系统相关的连接
        if (!focusSystemId) return true
        
        let sourceSystemId, targetSystemId
        
        // 解析调用方系统ID
        if (r.caller_type === 'SYSTEM') {
          sourceSystemId = r.caller_id
        } else {
          const callerApi = apiMap.get(r.caller_id)
          sourceSystemId = callerApi?.system_id
        }
        
        // 解析被调用方系统ID
        if (r.callee_type === 'SYSTEM') {
          targetSystemId = r.callee_id
        } else {
          const calleeApi = apiMap.get(r.callee_id)
          targetSystemId = calleeApi?.system_id
        }
        
        return sourceSystemId === focusSystemId || targetSystemId === focusSystemId
      })
      .map(r => {
        let sourceId, targetId, sourceType, targetType

        // 确定源节点
        if (r.caller_type === 'SYSTEM') {
          sourceId = r.caller_id
          sourceType = 'system'
        } else {
          sourceId = r.caller_id
          sourceType = 'api'
        }

        // 确定目标节点（使用端点）
        targetId = r.endpoint_id
        targetType = 'endpoint'

        return {
          id: r.id,
          source: sourceId,
          target: targetId,
          sourceType,
          targetType,
          method: r.endpoint_method,
          path: r.endpoint_path,
          caller_type: r.caller_type,
          callee_type: r.callee_type,
          caller_name: r.caller_name,
          callee_name: r.callee_name,
          callee_id: r.callee_id
        }
      })

    return { systems: systemData, apis: apiData, endpoints: endpointData, connections }
  }

  // 创建测试数据
  function createTestData() {
    const systems = [
      {
        id: '1',
        name: '用户服务',
        description: '处理用户认证和管理',
        connectionCount: 2
      },
      {
        id: '2',
        name: '订单服务',
        description: '处理订单业务逻辑',
        connectionCount: 1
      }
    ]

    const apis = [
      {
        id: '1-1',
        name: '用户API',
        systemId: '1',
        systemName: '用户服务'
      },
      {
        id: '2-1',
        name: '订单API',
        systemId: '2',
        systemName: '订单服务'
      }
    ]

    const endpoints = [
      {
        id: '1-1-1',
        name: '/api/v1/users',
        method: 'GET',
        path: '/api/v1/users',
        apiId: '1-1',
        apiName: '用户API',
        systemName: '用户服务'
      },
      {
        id: '1-1-2',
        name: '/api/v1/users',
        method: 'POST',
        path: '/api/v1/users',
        apiId: '1-1',
        apiName: '用户API',
        systemName: '用户服务'
      },
      {
        id: '1-1-3',
        name: '/api/v1/login',
        method: 'POST',
        path: '/api/v1/login',
        apiId: '1-1',
        apiName: '用户API',
        systemName: '用户服务'
      }
    ]

    const connections = [
      {
        id: '1',
        source: '2',
        target: '1-1-1',
        sourceType: 'system',
        targetType: 'endpoint',
        method: 'GET',
        path: '/api/v1/users',
        callerType: 'SYSTEM',
        calleeType: 'API',
        callerName: '订单服务',
        calleeName: '用户API'
      },
      {
        id: '2',
        source: '2-1',
        target: '1-1-3',
        sourceType: 'api',
        targetType: 'endpoint',
        method: 'POST',
        path: '/api/v1/login',
        callerType: 'API',
        calleeType: 'API',
        callerName: '订单API',
        calleeName: '用户API'
      }
    ]

    return { systems, apis, endpoints, connections }
  }

  // 转换数据为 G6 格式
  function convertToG6Data(data, focusSystemId = null) {
    const { systems, apis, endpoints, connections } = data
    
    // 创建节点
    const nodes = []
    
    // 计算画布中心
    const centerX = graphRef.current ? graphRef.current.clientWidth / 2 : 400
    const centerY = graphRef.current ? graphRef.current.clientHeight / 2 : 300
    
    // 为节点生成随机初始位置，避免堆积在左上角
    const generateInitialPosition = (index, total) => {
      // 生成围绕中心的随机位置
      const angle = (index / total) * Math.PI * 2
      const radius = Math.sqrt(index) * 50 // 使节点分布更均匀
      
      return {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      }
    }
    
    // 如果没有传入焦点系统ID，尝试自动识别
    if (!focusSystemId) {
      // 简单判断：如果只有一个系统节点，或者有一个系统节点与其他节点有更多连接，将其作为焦点系统
      if (systems.length === 1) {
        focusSystemId = systems[0].id
      } else if (systems.length > 1) {
        // 找到连接数最多的系统
        let maxConnections = -1
        systems.forEach(system => {
          if (system.connectionCount > maxConnections) {
            maxConnections = system.connectionCount
            focusSystemId = system.id
          }
        })
      }
    }
    
    // 添加系统节点
    systems.forEach((system, index) => {
      let x, y
      // 如果是焦点系统，将其放在中心位置
      if (system.id === focusSystemId) {
        x = centerX
        y = centerY
      } else {
        const pos = generateInitialPosition(index, systems.length)
        x = pos.x
        y = pos.y
      }
      
      nodes.push({
        id: system.id,
        type: 'system',
        label: system.name,
        description: system.description,
        connectionCount: system.connectionCount,
        category: 'system',
        size: 80,
        color: system.id === focusSystemId ? '#ff7875' : '#1890ff',
        x: x,
        y: y
      })
    })
    
    // 添加API节点
    apis.forEach((api, index) => {
      const pos = generateInitialPosition(index + systems.length, systems.length + apis.length)
      nodes.push({
        id: api.id,
        type: 'api',
        label: api.name,
        system_id: api.system_id,
        system_name: api.system_name,
        category: 'api',
        size: 40,
        color: '#52c41a',
        x: pos.x,
        y: pos.y
      })
    })
    
    // 添加端点节点
    endpoints.forEach((endpoint, index) => {
      const pos = generateInitialPosition(index + systems.length + apis.length, systems.length + apis.length + endpoints.length)
      nodes.push({
        id: endpoint.id,
        type: 'endpoint',
        label: endpoint.method,
        path: endpoint.path,
        method: endpoint.method,
        api_id: endpoint.api_id,
        api_name: endpoint.api_name,
        system_name: endpoint.system_name,
        category: 'endpoint',
        size: 20,
        color: '#fa8c16',
        x: pos.x,
        y: pos.y
      })
    })
    
    // 添加层级关系边（系统 -> API, API -> 端点）
    const hierarchyEdges = []
    apis.forEach(api => {
      hierarchyEdges.push({
        id: `hierarchy-${api.id}`,
        source: api.system_id,
        target: api.id,
        type: 'hierarchy',
        style: {
          stroke: '#e8e8e8',
          lineWidth: 1,
          endArrow: true
        }
      })
    })
    
    endpoints.forEach(endpoint => {
      hierarchyEdges.push({
        id: `hierarchy-${endpoint.id}`,
        source: endpoint.api_id,
        target: endpoint.id,
        type: 'hierarchy',
        style: {
          stroke: '#e8e8e8',
          lineWidth: 1,
          endArrow: true
        }
      })
    })
    
    // 添加调用关系边
    const callEdges = connections.map(connection => {
      return {
        id: connection.id,
        source: connection.source,
        target: connection.target,
        type: 'call',
        method: connection.method,
        path: connection.path,
        caller_type: connection.callerType,
        callee_type: connection.calleeType,
        caller_name: connection.callerName,
        callee_name: connection.calleeName,
        style: {
          stroke: '#52c41a',
          lineWidth: 1.2,
          endArrow: true,
          lineDash: [8, 4]
        }
      }
    })
    
    return {
      nodes,
      edges: [...hierarchyEdges, ...callEdges]
    }
  }

  // 初始化图表
  function initGraph() {
    if (!graphRef.current) {
      console.error('Graph container not found');
      return null;
    }
    
    // 销毁旧实例
    if (graphInstance.current) {
      graphInstance.current.destroy();
    }
    
    try {
      // 创建新实例
      const graph = new G6.Graph({
        container: graphRef.current,
        width: graphRef.current.clientWidth,
        height: graphRef.current.clientHeight,
        renderer: 'webgl', // 开启 WebGL 渲染以提高性能
        modes: {
          default: ['drag-canvas', 'zoom-canvas', 'drag-node']
        },
        defaultNode: {
          style: {
            fill: '#fff',
            stroke: '#1890ff',
            lineWidth: 1
          }
        },
        defaultEdge: {
          style: {
            stroke: '#91d5ff',
            lineWidth: 1.5,
            endArrow: true
          }
        },
        layout: {
          type: 'force',
          center: [graphRef.current.clientWidth / 2, graphRef.current.clientHeight / 2],
          linkDistance: 80,
          nodeStrength: -400, // 增加节点排斥力，使节点更快散开
          edgeStrength: 0.3, // 增加边的拉力，使布局更快收敛
          preventOverlap: true,
          collisionRadius: 50,
          animate: true, // 启用布局动画，使节点运动更加平滑
          damping: 0.9, // 增加阻尼，减少震荡
          maxIterations: 100, // 适当增加最大迭代次数，确保布局更加稳定
          animationDuration: 1000, // 动画持续时间（毫秒）
          animationEasing: 'ease-in-out-quad' // 动画缓动函数
        }
      });
      
      console.log('Graph instance created successfully');
      
      // 注册自定义节点
      G6.registerNode('system', {
        draw(cfg, group) {
          const size = cfg.size;
          
          // 创建圆形
          const circle = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: size / 2,
              fill: cfg.color,
              stroke: cfg.color,
              lineWidth: 1
            }
          });
          
          // 创建标题
          group.addShape('text', {
            attrs: {
              x: 0,
              y: 4,
              text: cfg.label,
              fontSize: 10,
              fontWeight: 'bold',
              fill: '#fff',
              textAlign: 'center',
              textBaseline: 'middle'
            }
          });
          
          return circle;
        }
      });
      
      G6.registerNode('api', {
        draw(cfg, group) {
          const size = cfg.size;
          
          // 创建圆形
          const circle = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: size / 2,
              fill: cfg.color,
              stroke: cfg.color,
              lineWidth: 1
            }
          });
          
          // 创建标题
          group.addShape('text', {
            attrs: {
              x: 0,
              y: 2,
              text: cfg.label,
              fontSize: 8,
              fontWeight: 'bold',
              fill: '#fff',
              textAlign: 'center',
              textBaseline: 'middle'
            }
          });
          
          return circle;
        }
      });
      
      G6.registerNode('endpoint', {
        draw(cfg, group) {
          const size = cfg.size;
          
          // 创建圆形
          const circle = group.addShape('circle', {
            attrs: {
              x: 0,
              y: 0,
              r: size / 2,
              fill: cfg.color,
              stroke: cfg.color,
              lineWidth: 1
            }
          });
          
          // 创建方法标签
          group.addShape('text', {
            attrs: {
              x: 0,
              y: 2,
              text: cfg.label,
              fontSize: 6,
              fontWeight: 'bold',
              fill: '#fff',
              textAlign: 'center',
              textBaseline: 'middle'
            }
          });
          
          return circle;
        }
      });
      
      // 添加交互
      graph.on('node:click', (e) => {
        const node = e.item;
        const model = node.getModel();
        
        if (model.type === 'system') {
          console.log('System clicked:', model);
        } else if (model.type === 'api') {
          console.log('API clicked:', model);
        } else if (model.type === 'endpoint') {
          console.log('Endpoint clicked:', model);
        }
      });
      
      // 添加悬停提示和节点放大动画
      let tooltipCache = {
        tooltip: null,
        text1: null,
        text2: null,
        text3: null
      };
      let tooltipTimer = null;
      
      graph.on('node:mouseenter', (e) => {
        const node = e.item;
        const model = node.getModel();
        
        graph.get('canvas').setCursor('pointer');
        
        // 清除旧的定时器
        if (tooltipTimer) {
          clearTimeout(tooltipTimer);
        }
        
        // 节点放大动画
        const group = node.get('group');
        if (group) {
          const keyShape = node.get('keyShape');
          if (keyShape) {
            const originalSize = model.size;
            keyShape.animate({
              r: (originalSize / 2) + 2
            }, {
              duration: 200
            });
          }
        }
        
        // 延迟创建 tooltip
        tooltipTimer = setTimeout(() => {
          // 清除旧的 tooltip
          if (tooltipCache.tooltip) {
            if (!tooltipCache.tooltip.destroyed) {
              tooltipCache.tooltip.remove();
            }
            if (tooltipCache.text1 && !tooltipCache.text1.destroyed) {
              tooltipCache.text1.remove();
            }
            if (tooltipCache.text2 && !tooltipCache.text2.destroyed) {
              tooltipCache.text2.remove();
            }
            if (tooltipCache.text3 && !tooltipCache.text3.destroyed) {
              tooltipCache.text3.remove();
            }
            tooltipCache = {
              tooltip: null,
              text1: null,
              text2: null,
              text3: null
            };
          }
          
          const canvas = graph.get('canvas');
          
          // 获取鼠标坐标（使用G6事件对象中已经转换好的画布坐标）
          const mouseX = e.canvasX || e.x;
          const mouseY = e.canvasY || e.y;
          
          // 获取画布大小
          const canvasWidth = graph.get('width');
          const canvasHeight = graph.get('height');
          
          // 计算 tooltip 位置，显示在鼠标左下角
          // 向左偏移210px（tooltip宽度），这样tooltip的右边缘会靠近鼠标
          // 向下偏移10px，确保tooltip显示在鼠标下方
          let tooltipX = mouseX - 210;
          let tooltipY = mouseY + 10;
          
          // 边界检查，确保tooltip不会超出画布范围
          if (tooltipX < 10) {
            tooltipX = 10; // 左边距
          }
          if (tooltipY > canvasHeight - 100) {
            tooltipY = mouseY - 100; // 向上显示，避免超出底部
          }
          if (tooltipY < 10) {
            tooltipY = 10; // 上边距
          }
          
          // 创建 tooltip 容器
          tooltipCache.tooltip = canvas.addShape('rect', {
            attrs: {
              x: tooltipX,
              y: tooltipY,
              width: 200,
              height: 0,
              fill: 'rgba(0, 0, 0, 0.7)',
              radius: 4,
              opacity: 0
            },
            capture: false
          });
          
          // 根据节点类型显示不同的信息
          if (model.type === 'system') {
            tooltipCache.text1 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 20,
                text: model.label,
                fontSize: 12,
                fontWeight: 'bold',
                fill: '#fff',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            tooltipCache.text2 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 40,
                text: `描述: ${model.description || '无'}`,
                fontSize: 10,
                fill: '#ccc',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            tooltipCache.text3 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 60,
                text: `连接数: ${model.connectionCount}`,
                fontSize: 10,
                fill: '#ccc',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            // 添加系统代码（如果有）
            if (model.system_code) {
              tooltipCache.text4 = canvas.addShape('text', {
                attrs: {
                  x: tooltipX + 10,
                  y: tooltipY + 80,
                  text: `系统代码: ${model.system_code}`,
                  fontSize: 10,
                  fill: '#ccc',
                  textAlign: 'left',
                  opacity: 0
                },
                capture: false
              });
            }
            
            // 展开 tooltip
            tooltipCache.tooltip.animate({
              height: model.system_code ? 80 : 60,
              opacity: 1
            }, {
              duration: 200
            });
            
            // 显示文本
            setTimeout(() => {
              if (tooltipCache.text1) {
                tooltipCache.text1.attr('opacity', 1);
              }
              setTimeout(() => {
                if (tooltipCache.text2) {
                  tooltipCache.text2.attr('opacity', 1);
                }
                setTimeout(() => {
                  if (tooltipCache.text3) {
                    tooltipCache.text3.attr('opacity', 1);
                  }
                  setTimeout(() => {
                    if (tooltipCache.text4) {
                      tooltipCache.text4.attr('opacity', 1);
                    }
                    graph.paint();
                  }, 50);
                }, 50);
              }, 50);
            }, 100);
          } else if (model.type === 'api') {
            tooltipCache.text1 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 20,
                text: model.label,
                fontSize: 12,
                fontWeight: 'bold',
                fill: '#fff',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            tooltipCache.text2 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 40,
                text: `系统: ${model.system_name}`,
                fontSize: 10,
                fill: '#ccc',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            // 展开 tooltip
            tooltipCache.tooltip.animate({
              height: 50,
              opacity: 1
            }, {
              duration: 200
            });
            
            // 显示文本
            setTimeout(() => {
              if (tooltipCache.text1) {
                tooltipCache.text1.attr('opacity', 1);
              }
              setTimeout(() => {
                if (tooltipCache.text2) {
                  tooltipCache.text2.attr('opacity', 1);
                }
                graph.paint();
              }, 50);
            }, 100);
          } else if (model.type === 'endpoint') {
            tooltipCache.text1 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 20,
                text: model.path,
                fontSize: 12,
                fill: '#fff',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            tooltipCache.text2 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 40,
                text: `${model.method} | ${model.api_name}`,
                fontSize: 10,
                fill: '#ccc',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            tooltipCache.text3 = canvas.addShape('text', {
              attrs: {
                x: tooltipX + 10,
                y: tooltipY + 60,
                text: `系统: ${model.system_name}`,
                fontSize: 10,
                fill: '#ccc',
                textAlign: 'left',
                opacity: 0
              },
              capture: false
            });
            
            // 展开 tooltip
            tooltipCache.tooltip.animate({
              height: 60,
              opacity: 1
            }, {
              duration: 200
            });
            
            // 显示文本
            setTimeout(() => {
              if (tooltipCache.text1) {
                tooltipCache.text1.attr('opacity', 1);
              }
              setTimeout(() => {
                if (tooltipCache.text2) {
                  tooltipCache.text2.attr('opacity', 1);
                }
                setTimeout(() => {
                  if (tooltipCache.text3) {
                    tooltipCache.text3.attr('opacity', 1);
                  }
                  graph.paint();
                }, 50);
              }, 50);
            }, 100);
          }
        }, 100);
      });
      
      graph.on('node:mouseleave', (e) => {
        const node = e.item;
        const model = node.getModel();
        
        graph.get('canvas').setCursor('default');
        
        // 清除定时器
        if (tooltipTimer) {
          clearTimeout(tooltipTimer);
          tooltipTimer = null;
        }
        
        // 节点恢复原始大小
        const shape = node.get('keyShape');
        if (shape) {
          shape.animate({
            r: model.size / 2
          }, {
            duration: 200
          });
        }
        
        // 隐藏 tooltip
        if (tooltipCache.tooltip && !tooltipCache.tooltip.destroyed) {
          // 淡出文本
          if (tooltipCache.text4 && !tooltipCache.text4.destroyed) {
            tooltipCache.text4.attr('opacity', 0);
          }
          setTimeout(() => {
            if (tooltipCache.text3 && !tooltipCache.text3.destroyed) {
              tooltipCache.text3.attr('opacity', 0);
            }
            setTimeout(() => {
              if (tooltipCache.text2 && !tooltipCache.text2.destroyed) {
                tooltipCache.text2.attr('opacity', 0);
              }
              setTimeout(() => {
                if (tooltipCache.text1 && !tooltipCache.text1.destroyed) {
                  tooltipCache.text1.attr('opacity', 0);
                }
                setTimeout(() => {
                  // 收起 tooltip
                  if (tooltipCache.tooltip && !tooltipCache.tooltip.destroyed) {
                    tooltipCache.tooltip.animate({
                      height: 0,
                      opacity: 0
                    }, {
                      duration: 150,
                      callback: () => {
                        // 动画结束后移除元素
                        if (tooltipCache.tooltip && !tooltipCache.tooltip.destroyed) {
                          tooltipCache.tooltip.remove();
                        }
                        if (tooltipCache.text1 && !tooltipCache.text1.destroyed) {
                          tooltipCache.text1.remove();
                        }
                        if (tooltipCache.text2 && !tooltipCache.text2.destroyed) {
                          tooltipCache.text2.remove();
                        }
                        if (tooltipCache.text3 && !tooltipCache.text3.destroyed) {
                          tooltipCache.text3.remove();
                        }
                        if (tooltipCache.text4 && !tooltipCache.text4.destroyed) {
                          tooltipCache.text4.remove();
                        }
                        tooltipCache = {
                          tooltip: null,
                          text1: null,
                          text2: null,
                          text3: null,
                          text4: null
                        };
                        graph.paint();
                      }
                    });
                  }
                }, 50);
              }, 50);
            }, 50);
          }, 50);
        } else {
          // 直接清理缓存
          tooltipCache = {
            tooltip: null,
            text1: null,
            text2: null,
            text3: null,
            text4: null
          };
        }
      });
      
      graphInstance.current = graph;
      console.log('Graph initialized successfully');
      return graph;
    } catch (error) {
      console.error('Error initializing graph:', error);
      return null;
    }
  }

  // 缓存上一次的 G6 数据，用于比较是否需要重新渲染
  let lastG6Data = null
  
  // 渲染图表
  function renderGraph(data, focusSystemId = null, retryCount = 0) {
    // 确保 graphRef.current 存在
    if (!graphRef.current) {
      // 限制重试次数，避免无限循环
      if (retryCount > 10) {
        console.error('Graph container not ready after multiple attempts, stopping retry');
        return;
      }
      
      console.warn(`Graph container not ready, waiting for DOM to render (attempt ${retryCount + 1}/10)`);
      // 延迟一下再试
      setTimeout(() => {
        renderGraph(data, focusSystemId, retryCount + 1);
      }, 100); // 增加延迟时间，给DOM更多时间渲染
      return;
    }
    
    if (!graphInstance.current) {
      const graph = initGraph()
      if (!graph) {
        // 如果初始化失败，延迟后重试
        console.warn('Graph initialization failed, retrying...');
        setTimeout(() => {
          renderGraph(data, focusSystemId);
        }, 50); // 减少延迟时间
        return;
      }
    }
    
    const graph = graphInstance.current
    if (!graph) {
      // 如果graph仍然不存在，延迟后重试
      console.warn('Graph instance not available, retrying...');
      setTimeout(() => {
        renderGraph(data, focusSystemId);
      }, 50); // 减少延迟时间
      return;
    }
    
    const g6Data = convertToG6Data(data, focusSystemId)
    
    // 简单比较数据是否变化，避免不必要的渲染
    const dataChanged = !lastG6Data || 
      lastG6Data.nodes.length !== g6Data.nodes.length || 
      lastG6Data.edges.length !== g6Data.edges.length
    
    if (dataChanged) {
      console.log('Rendering graph with new data:', {
        nodes: g6Data.nodes.length,
        edges: g6Data.edges.length,
        focusSystemId: focusSystemId
      })
      
      lastG6Data = g6Data
      
      // 启用动画，使图表过渡更加平滑
      graph.set('animate', true)
      
      // 设置新数据
      graph.data(g6Data)
      
      // 执行布局计算
      graph.layout()
      
      // 渲染图表（只渲染一次）
      graph.render()
      
      // 当显示所有节点时，调整视图以确保所有节点都可见
      if (!focusSystemId && g6Data.nodes.length > 0) {
        setTimeout(() => {
          // 使用图表的 fitView 方法自动调整视图，确保所有节点都可见
          graph.fitView({
            padding: 50, // 边距
            animated: true // 启用动画，使视图调整更加平滑
          });
          // 不需要再次调用 render()，fitView 会自动触发渲染
        }, 100); // 减少延迟时间，加快视图调整
      }
    }
  }

  // 初始化数据
  async function initGraphData() {
    setLoading(true)
    try {
      const data = await buildData()
      console.log('Topology data:', data)
      setTopologyData(data)
      
      // 延迟一下再渲染图表，确保DOM已经更新
      setTimeout(() => {
        // 确保DOM元素已经准备好
        if (graphRef.current) {
          renderGraph(data, focusedSystemId)
        } else {
          // 如果DOM元素还没准备好，再延迟一下
          setTimeout(() => {
            renderGraph(data, focusedSystemId)
          }, 50)
        }
        // 渲染完成后再设置loading为false
        setLoading(false)
      }, 150)
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
      setLoading(false)
    }
  }

  // 搜索系统并聚焦显示其关系
  const handleSystemSearch = async (systemId) => {
    if (!systemId) {
      setFocusedSystemId(null)
      initGraphData()
      return
    }

    setFocusedSystemId(systemId)
    setLoading(true)
    
    try {
      const { rels, systems, apis, endpoints } = await fetchBaseData()
      const data = buildTopologyFromData(rels, systems, apis, endpoints, systemId)
      console.log('Search result data:', data)
      setTopologyData(data)
      
      // 延迟一下再渲染图表，确保DOM已经更新
      setTimeout(() => {
        // 确保DOM元素已经准备好
        if (graphRef.current) {
          // 渲染图表，将焦点系统显示在中心
          renderGraph(data, systemId)
        } else {
          // 如果DOM元素还没准备好，再延迟一下
          setTimeout(() => {
            renderGraph(data, systemId)
          }, 50)
        }
        // 渲染完成后再设置loading为false
        setLoading(false)
      }, 150)
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
      setLoading(false)
    }
  }

  // 清除搜索
  const handleClearSearch = () => {
    console.log('=== 开始执行显示全部功能 ===')
    console.log('当前 focusedSystemId:', focusedSystemId)
    setSearchSystem('')
    setFocusedSystemId(null)
    console.log('已设置 focusedSystemId 为 null')
    // 直接调用 buildData 和 renderGraph，确保使用最新的 focusSystemId 值（null）
    setLoading(true)
    console.log('已设置 loading 为 true')
    try {
      console.log('开始调用 buildData(null) 获取所有数据')
      buildData(null).then(data => {
        console.log('=== buildData 返回的数据 ===')
        console.log('系统数量:', data.systems.length)
        console.log('API数量:', data.apis.length)
        console.log('端点数量:', data.endpoints.length)
        console.log('连接数量:', data.connections.length)
        setTopologyData(data)
        console.log('已更新 topologyData 状态')
        
        // 延迟一下再渲染图表，确保DOM已经更新
        setTimeout(() => {
          // 确保DOM元素已经准备好
          if (graphRef.current) {
            console.log('开始调用 renderGraph(data, null) 渲染所有数据')
            renderGraph(data, null) // 直接传递 null，确保显示所有数据
          } else {
            // 如果DOM元素还没准备好，再延迟一下
            setTimeout(() => {
              console.log('DOM元素未准备好，延迟后调用 renderGraph(data, null)')
              renderGraph(data, null) // 直接传递 null，确保显示所有数据
            }, 50)
          }
          // 渲染完成后再设置loading为false
          setLoading(false)
          console.log('已设置 loading 为 false')
          console.log('=== 显示全部功能执行完成 ===')
        }, 150)
      })
    } catch (err) {
      console.error('显示全部功能执行出错:', err)
      message.error(getErrorMessage(err))
      setLoading(false)
      console.log('已设置 loading 为 false')
      console.log('=== 显示全部功能执行失败 ===')
    }
  }

  // 处理窗口大小变化
  const handleResize = () => {
    if (graphInstance.current && graphRef.current) {
      const width = graphRef.current.clientWidth
      const height = graphRef.current.clientHeight
      graphInstance.current.changeSize(width, height)
    }
  }

  // 初始化
  useEffect(() => {
    initGraphData()
    window.addEventListener('resize', handleResize)
    
    return () => {
      window.removeEventListener('resize', handleResize)
      if (graphInstance.current) {
        graphInstance.current.destroy()
      }
    }
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <h3 style={{ margin: 0 }}>系统调用关系拓扑图</h3>
        </div>
        <Space>
          <AutoComplete
            style={{ width: 250 }}
            placeholder="搜索系统查看调用关系"
            value={searchSystem}
            onChange={setSearchSystem}
            onSelect={(value) => {
              const system = allSystems.find(s => s.name === value)
              if (system) {
                handleSystemSearch(system.id)
              }
            }}
            options={allSystems.map(s => ({ value: s.name, label: s.name }))}
            filterOption={(inputValue, option) =>
              option.value.toLowerCase().includes(inputValue.toLowerCase())
            }
          />
          
          {focusedSystemId && (
            <Button
              icon={<ClearOutlined />}
              onClick={handleClearSearch}
              title="清除搜索"
            >
              显示全部
            </Button>
          )}
          
          <Button
            icon={<ReloadOutlined />}
            onClick={initGraphData}
            loading={loading}
          >
            刷新
          </Button>
        </Space>
      </div>

      {focusedSystemId && (
        <div style={{ marginBottom: 16 }}>
          <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px' }}>
            🔍 聚焦系统: {allSystems.find(s => s.id === focusedSystemId)?.name}
          </Tag>
          <span style={{ marginLeft: 8, color: '#666', fontSize: 12 }}>
            显示该系统的调用关系（调用其他系统 + 被其他系统调用）
          </span>
        </div>
      )}

      {/* 连线类型图例 */}
      <div style={{ marginBottom: 16, padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
        <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '8px', color: '#666' }}>
          连线类型说明：
        </div>
        <Space wrap>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '2px', background: '#1890ff', borderStyle: 'dashed' }}></div>
            <span style={{ fontSize: '11px', color: '#1890ff' }}>系统调用</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '2px', background: '#d9d9d9' }}></div>
            <span style={{ fontSize: '11px', color: '#666' }}>层级关系</span>
          </div>
        </Space>
      </div>

      <Card
        style={{ height: 800 }}
        styles={{ body: { padding: 0, height: '100%' } }}
        extra={
          <Space>
            <Tag color="blue">🏢 系统: {topologyData.systems.length}</Tag>
            <Tag color="green">⚡ API: {topologyData.apis.length}</Tag>
            <Tag color="orange">🔌 端点: {topologyData.endpoints.length}</Tag>
            <Tag color="purple">→ 连接: {topologyData.connections.length}</Tag>
          </Space>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin size="large" />
          </div>
        ) : (
          <div
            ref={graphRef}
            style={{ width: '100%', height: '100%' }}
          />
        )}
      </Card>
    </div>
  )
}
