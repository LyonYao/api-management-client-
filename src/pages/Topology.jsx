import { useEffect, useState, useRef } from 'react'
import { Card, Button, message, Modal, Descriptions, Spin, Space, Tag, AutoComplete } from 'antd'
import { ReloadOutlined, ClearOutlined } from '@ant-design/icons'
import API, { getErrorMessage } from '../api'

export default function Topology() {
  const [loading, setLoading] = useState(false)
  const [detail, setDetailVisible] = useState(false)
  const [detailData, setDetailData] = useState(null)
  const [searchSystem, setSearchSystem] = useState('')
  const [allSystems, setAllSystems] = useState([])
  const [focusedSystemId, setFocusedSystemId] = useState(null)
  const [topologyData, setTopologyData] = useState({ systems: [], connections: [] })
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [panning, setPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [zoomCenter, setZoomCenter] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)

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
  async function buildData() {
    try {
      const { rels, systems, apis, endpoints } = await fetchBaseData()

      // 如果没有数据，创建测试数据
      if (systems.length === 0) {
        return createTestData()
      }

      return buildTopologyFromData(rels, systems, apis, endpoints, focusedSystemId)
    } catch (err) {
      console.error('Error building data:', err)
      return createTestData()
    }
  }

  // 从实际数据构建拓扑图
  function buildTopologyFromData(rels, systems, apis, endpoints, focusSystemId = null) {
    console.log('Building topology from data:', {
      systems: systems.length,
      apis: apis.length,
      endpoints: endpoints.length,
      relationships: rels.length,
      focusSystemId
    })
    
    let relevantSystemIds = new Set()
    let relevantApiIds = new Set()

    // 如果有焦点系统，找到所有相关的系统和API
    if (focusSystemId) {
      relevantSystemIds.add(focusSystemId)
      
      // 添加焦点系统下的所有API
      apis.filter(a => a.systemId === focusSystemId).forEach(a => {
        relevantApiIds.add(a.id)
      })
      
      // 找到所有与焦点系统相关的关系
      rels.forEach(r => {
        let sourceSystemId, targetSystemId, sourceApiId, targetApiId
        
        // 解析调用方
        if (r.callerType === 'SYSTEM') {
          sourceSystemId = r.callerId
        } else {
          const callerApi = apis.find(a => a.id === r.callerId)
          sourceApiId = r.callerId
          sourceSystemId = callerApi?.systemId
        }
        
        // 解析被调用方
        if (r.calleeType === 'SYSTEM') {
          targetSystemId = r.calleeId
        } else {
          const calleeApi = apis.find(a => a.id === r.calleeId)
          targetApiId = r.calleeId
          targetSystemId = calleeApi?.systemId
        }
        
        // 如果与焦点系统相关，包含相关的系统和API
        if (sourceSystemId === focusSystemId || targetSystemId === focusSystemId) {
          if (sourceSystemId) relevantSystemIds.add(sourceSystemId)
          if (targetSystemId) relevantSystemIds.add(targetSystemId)
          if (sourceApiId) relevantApiIds.add(sourceApiId)
          if (targetApiId) relevantApiIds.add(targetApiId)
        }
      })
    } else {
      // 显示所有系统和API
      systems.forEach(s => relevantSystemIds.add(s.id))
      apis.forEach(a => relevantApiIds.add(a.id))
    }
    
    // 确保所有在关系中出现的系统和API都被包含
    rels.forEach(r => {
      // 处理调用方
      if (r.callerType === 'SYSTEM') {
        relevantSystemIds.add(r.callerId)
      } else {
        const callerApi = apis.find(a => a.id === r.callerId)
        if (callerApi) {
          relevantSystemIds.add(callerApi.systemId)
          relevantApiIds.add(callerApi.id)
        }
      }
      
      // 处理被调用方
      if (r.calleeType === 'SYSTEM') {
        relevantSystemIds.add(r.calleeId)
      } else {
        const calleeApi = apis.find(a => a.id === r.calleeId)
        if (calleeApi) {
          relevantSystemIds.add(calleeApi.systemId)
          relevantApiIds.add(calleeApi.id)
        }
      }
      
      // 处理端点
      if (r.endpointId) {
        const endpoint = endpoints.find(e => e.id === r.endpointId)
        if (endpoint) {
          const endpointApi = apis.find(a => a.id === endpoint.apiId)
          if (endpointApi) {
            relevantSystemIds.add(endpointApi.systemId)
            relevantApiIds.add(endpointApi.id)
          }
        }
      }
    })
    
    // 确保所有API都被包含在对应的系统中
    apis.forEach(api => {
      if (relevantSystemIds.has(api.systemId)) {
        relevantApiIds.add(api.id)
      }
    })

    // 计算每个系统的连接数
    const calculateSystemConnections = (systemId) => {
      let connectionCount = 0
      rels.forEach(r => {
        // 检查系统是否是调用方
        if (r.callerType === 'SYSTEM' && r.callerId === systemId) {
          connectionCount++
        }
        // 检查系统是否包含被调用的API
        if (r.calleeType === 'API') {
          const calleeApi = apis.find(a => a.id === r.calleeId)
          if (calleeApi && calleeApi.systemId === systemId) {
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
      .sort((a, b) => b.connectionCount - a.connectionCount) // 按连接数降序排序
      .map((system, systemIndex) => {
        let systemX, systemY
        
        // 布局算法：连接数最多的系统在中心，其他系统围绕在周围
        if (systemIndex === 0) {
          // 中心系统
          systemX = 400 - 175 // 画布中心减去系统宽度的一半
          systemY = 300 - 100 // 画布中心减去系统高度的一半
        } else {
          // 周围系统 - 使用网格布局，确保所有系统都可见
          const systemRow = Math.floor(systemIndex / 3)
          const systemCol = systemIndex % 3
          systemX = 40 + systemCol * (350 + 80)
          systemY = 40 + systemRow * (200 + 80)
        }

        // 处理系统下的API
        let currentApiY = 50
        const systemApis = apis
          .filter(a => relevantApiIds.has(a.id) && a.systemId === system.id)
          .map((api, apiIndex) => {
            // 计算API位置（相对于系统）
            const apiY = currentApiY

            // 处理API下的端点
                const apiEndpoints = endpoints
                  .filter(e => e.apiId === api.id)
                  .map((endpoint, endpointIndex) => {
                    // 计算端点位置（相对于API），添加15px的padding
                    const endpointCol = endpointIndex % 4
                    const endpointRow = Math.floor(endpointIndex / 4)
                    const endpointX = 15 + endpointCol * (25 + 10) // 添加15px的padding和间距
                    const endpointY = 30 + endpointRow * (25 + 10) // 添加15px的padding和间距

                    return {
                      id: endpoint.id,
                      name: endpoint.path,
                      method: endpoint.httpMethod || endpoint.method,
                      path: endpoint.path,
                      x: endpointX,
                      y: endpointY,
                      width: 20,
                      height: 20
                    }
                  })

            // 计算API高度，基于端点数量
            const numEndpointRows = Math.max(1, Math.floor((apiEndpoints.length - 1) / 4) + 1)
            const apiHeight = 30 + numEndpointRows * (25 + 10) + 15 // 顶部padding + 行高 + 底部padding

            // 更新下一个API的Y位置
            currentApiY += apiHeight + 15

            return {
              id: api.id,
              name: api.name,
              x: 15,
              y: apiY,
              width: 320,
              height: apiHeight,
              endpoints: apiEndpoints
            }
          })

        // 计算系统高度，基于API数量和高度
        const totalApiHeight = systemApis.reduce((total, api) => {
          return total + api.height + 15 // API高度 + 间距
        }, 0)
        const systemHeight = Math.max(200, 50 + totalApiHeight)

        return {
          id: system.id,
          name: system.name,
          description: system.description,
          connectionCount: system.connectionCount,
          x: systemX,
          y: systemY,
          width: 350,
          height: systemHeight,
          apis: systemApis
        }
      })

    // 构建连接数据
    const connections = rels
      .map(r => {
        let sourceId, targetId, sourceType, targetType

        // 确定源节点
        if (r.callerType === 'SYSTEM') {
          sourceId = r.callerId
          sourceType = 'system'
        } else {
          sourceId = r.callerId
          sourceType = 'api'
        }

        // 确定目标节点（使用端点）
        targetId = r.endpointId
        targetType = 'endpoint'

        return {
          id: r.id,
          source: sourceId,
          sourceType,
          target: targetId,
          targetType,
          method: r.endpointMethod,
          path: r.endpointPath,
          callerType: r.callerType,
          calleeType: r.calleeType,
          callerName: r.callerName,
          calleeName: r.calleeName,
          calleeId: r.calleeId // 添加被调用方ID，用于查找对应的API
        }
      })

    // 确保所有关系中的端点都被添加到对应的API容器中
    connections.forEach(connection => {
      const { target: endpointId, calleeId } = connection
      
      // 检查端点是否已经存在于某个API容器中
      let endpointExists = false
      for (const system of systemData) {
        for (const api of system.apis) {
          if (api.endpoints.some(e => e.id === endpointId)) {
            endpointExists = true
            break
          }
        }
        if (endpointExists) break
      }
      
      // 如果端点不存在，找到对应的API并添加
      if (!endpointExists && calleeId) {
        const api = apis.find(a => a.id === calleeId)
        if (api) {
          const system = systemData.find(s => s.id === api.systemId)
          if (system) {
            const apiInSystem = system.apis.find(a => a.id === api.id)
            if (apiInSystem) {
              // 创建新的端点
              const endpointCol = apiInSystem.endpoints.length % 3
              const endpointRow = Math.floor(apiInSystem.endpoints.length / 3)
              const endpointX = 10 + endpointCol * (100 + 10)
              const endpointY = 25 + endpointRow * (35 + 10)
              
              apiInSystem.endpoints.push({
                id: endpointId,
                name: connection.path,
                method: connection.method,
                path: connection.path,
                x: endpointX,
                y: endpointY,
                width: 100,
                height: 35
              })
            }
          }
        }
      }
    })

    return { systems: systemData, connections }
  }

  // 创建测试数据
  function createTestData() {
    const systems = [
      {
        id: '1',
        name: '用户服务',
        description: '处理用户认证和管理',
        x: 40,
        y: 40,
        width: 350,
        height: 200,
        apis: [
          {
            id: '1-1',
            name: '用户API',
            x: 15,
            y: 50,
            width: 320,
            height: 60,
            endpoints: [
              {
                id: '1-1-1',
                name: '/api/v1/users',
                method: 'GET',
                path: '/api/v1/users',
                x: 15,
                y: 30,
                width: 20,
                height: 20
              },
              {
                id: '1-1-2',
                name: '/api/v1/users',
                method: 'POST',
                path: '/api/v1/users',
                x: 45,
                y: 30,
                width: 20,
                height: 20
              },
              {
                id: '1-1-3',
                name: '/api/v1/login',
                method: 'POST',
                path: '/api/v1/login',
                x: 75,
                y: 30,
                width: 20,
                height: 20
              }
            ]
          }
        ]
      },
      {
        id: '2',
        name: '订单服务',
        description: '处理订单业务逻辑',
        x: 470,
        y: 40,
        width: 350,
        height: 200,
        apis: [
          {
            id: '2-1',
            name: '订单API',
            x: 15,
            y: 50,
            width: 320,
            height: 60,
            endpoints: [
              {
                id: '2-1-1',
                name: '/api/v1/orders',
                method: 'GET',
                path: '/api/v1/orders',
                x: 15,
                y: 30,
                width: 20,
                height: 20
              },
              {
                id: '2-1-2',
                name: '/api/v1/orders',
                method: 'POST',
                path: '/api/v1/orders',
                x: 45,
                y: 30,
                width: 20,
                height: 20
              }
            ]
          }
        ]
      }
    ]

    const connections = [
      {
        id: '1',
        source: '2',
        sourceType: 'system',
        target: '1-1-1',
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
        sourceType: 'api',
        target: '1-1-3',
        targetType: 'endpoint',
        method: 'POST',
        path: '/api/v1/login',
        callerType: 'API',
        calleeType: 'API',
        callerName: '订单API',
        calleeName: '用户API'
      }
    ]

    return { systems, connections }
  }

  // 初始化数据
  async function initGraph() {
    setLoading(true)
    try {
      const data = await buildData()
      console.log('Setting topology data:', { systems: data.systems.length, connections: data.connections.length })
      setTopologyData(data)
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // 搜索系统并聚焦显示其关系
  const handleSystemSearch = async (systemId) => {
    if (!systemId) {
      setFocusedSystemId(null)
      initGraph()
      return
    }

    setFocusedSystemId(systemId)
    setLoading(true)
    
    try {
      const { rels, systems, apis, endpoints } = await fetchBaseData()
      const data = buildTopologyFromData(rels, systems, apis, endpoints, systemId)
      console.log('Search result data:', { systems: data.systems.length, connections: data.connections.length })
      setTopologyData(data)
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // 清除搜索
  const handleClearSearch = () => {
    setSearchSystem('')
    setFocusedSystemId(null)
    initGraph()
  }

  // 处理拖动开始
  const handleDragStart = (e, type, id, x, y) => {
    e.preventDefault()
    const rect = svgRef.current.getBoundingClientRect()
    setDragging({ type, id })
    setDragOffset({
      x: e.clientX - rect.left - x,
      y: e.clientY - rect.top - y
    })
  }

  // 处理拖动移动
  const handleDragMove = (e) => {
    if (!dragging) return
    
    e.preventDefault()
    const rect = svgRef.current.getBoundingClientRect()
    const newX = e.clientX - rect.left - dragOffset.x
    const newY = e.clientY - rect.top - dragOffset.y

    // 更新拖动元素的位置
    setTopologyData(prev => {
      const newSystems = prev.systems.map(system => {
        if (dragging.type === 'system' && system.id === dragging.id) {
          return { ...system, x: newX, y: newY }
        }
        return system
      })
      return { ...prev, systems: newSystems }
    })
  }

  // 处理拖动结束
  const handleDragEnd = () => {
    setDragging(null)
    setDragOffset({ x: 0, y: 0 })
  }

  // 处理画布平移开始
  const handlePanStart = (e) => {
    e.preventDefault()
    setPanning(true)
    setPanStart({ x: e.clientX, y: e.clientY })
  }

  // 处理画布平移中
  const handlePanMove = (e) => {
    if (!panning) return
    
    e.preventDefault()
    const deltaX = e.clientX - panStart.x
    const deltaY = e.clientY - panStart.y
    
    setPanOffset(prev => ({
      x: prev.x + deltaX,
      y: prev.y + deltaY
    }))
    
    setPanStart({ x: e.clientX, y: e.clientY })
  }

  // 处理画布平移结束
  const handlePanEnd = () => {
    setPanning(false)
  }

  // 处理鼠标滚轮事件，实现放大和缩小
  const handleWheel = (e) => {
    e.preventDefault()
    
    // 计算缩放因子
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(3, zoom * scaleFactor))
    
    // 计算鼠标在SVG中的位置
    const rect = svgRef.current.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top
    
    // 计算新的缩放中心
    setZoomCenter({ x: mouseX, y: mouseY })
    
    // 更新缩放级别
    setZoom(newZoom)
  }

  // 获取元素的绝对位置
  const getElementPosition = (id, type) => {
    // 查找系统
    for (const system of topologyData.systems) {
      if (type === 'system' && system.id === id) {
        return { x: system.x, y: system.y, width: system.width, height: system.height }
      }

      // 查找API
      for (const api of system.apis) {
        if (type === 'api' && api.id === id) {
          return {
            x: system.x + api.x,
            y: system.y + api.y,
            width: api.width,
            height: api.height
          }
        }

        // 查找端点
        for (const endpoint of api.endpoints) {
          if (type === 'endpoint' && endpoint.id === id) {
            return {
              x: system.x + api.x + endpoint.x,
              y: system.y + api.y + endpoint.y,
              width: endpoint.width,
              height: endpoint.height
            }
          }
        }
      }
    }
    return { x: 0, y: 0, width: 0, height: 0 }
  }

  // 计算元素边缘的点
  const getEdgePoint = (element, targetX, targetY) => {
    const elementCenterX = element.x + element.width / 2
    const elementCenterY = element.y + element.height / 2
    
    // 计算从元素中心到目标点的角度
    const angle = Math.atan2(targetY - elementCenterY, targetX - elementCenterX)
    
    // 计算元素边缘的点
    let edgeX, edgeY
    
    // 确定元素的哪个边缘与目标点最近
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    
    // 计算与元素边界的交点
    const tX = (cosAngle > 0 ? element.width / 2 : -element.width / 2) / cosAngle
    const tY = (sinAngle > 0 ? element.height / 2 : -element.height / 2) / sinAngle
    
    // 选择较小的t值，确保点在元素边界上
    const t = Math.min(Math.abs(tX), Math.abs(tY))
    
    edgeX = elementCenterX + cosAngle * t
    edgeY = elementCenterY + sinAngle * t
    
    return { x: edgeX, y: edgeY }
  }

  // 绘制连接线
  const drawConnections = () => {
    return topologyData.connections.map(connection => {
      const sourcePos = getElementPosition(connection.source, connection.sourceType)
      const targetPos = getElementPosition(connection.target, connection.targetType)

      // 计算目标点（端点边缘）
      const targetCenterX = targetPos.x + targetPos.width / 2
      const targetCenterY = targetPos.y + targetPos.height / 2
      const targetEdgePoint = getEdgePoint(targetPos, sourcePos.x + sourcePos.width / 2, sourcePos.y + sourcePos.height / 2)
      const targetX = targetEdgePoint.x
      const targetY = targetEdgePoint.y

      // 计算源点（源元素的边缘）
      const sourceEdgePoint = getEdgePoint(sourcePos, targetCenterX, targetCenterY)
      const sourceX = sourceEdgePoint.x
      const sourceY = sourceEdgePoint.y

      // 确定线条颜色
      let strokeColor = '#1890ff'
      if (connection.callerType === 'API' && connection.calleeType === 'API') {
        strokeColor = '#52c41a'
      } else if (connection.callerType === 'SYSTEM' && connection.calleeType === 'API') {
        strokeColor = '#fa8c16'
      }

      // 计算平滑曲线的控制点
      const controlOffset = 50
      const dx = targetX - sourceX
      const dy = targetY - sourceY
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      // 基于距离和方向计算控制点
      const control1X = sourceX + (dx > 0 ? controlOffset : -controlOffset)
      const control1Y = sourceY
      const control2X = targetX - (dx > 0 ? controlOffset : -controlOffset)
      const control2Y = targetY

      // 计算箭头角度（基于曲线切线方向）
      // 使用曲线在目标点的切线方向作为箭头方向
      const tangentDx = targetX - control2X
      const tangentDy = targetY - control2Y
      const arrowAngle = Math.atan2(tangentDy, tangentDx) * 180 / Math.PI

      return (
        <g key={connection.id}>
          {/* 平滑曲线 */}
          <path
            d={`M ${sourceX} ${sourceY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${targetX} ${targetY}`}
            stroke={strokeColor}
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
          />
          
          {/* 箭头 - 流程图风格的简单指向 */}
          <g transform={`translate(${targetX}, ${targetY}) rotate(${arrowAngle})`}>
            <polygon
              points="0,0 -8,-4 -8,4"
              fill={strokeColor}
              stroke="none"
            />
          </g>
        </g>
      )
    })
  }

  // 初始化数据
  useEffect(() => {
    initGraph()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0 }}>系统调用关系拓扑图</h3>
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
            onClick={initGraph}
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
            <div style={{ width: '30px', height: '2px', background: '#1890ff' }}></div>
            <span style={{ fontSize: '11px', color: '#1890ff' }}>系统调用</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '2px', background: '#52c41a' }}></div>
            <span style={{ fontSize: '11px', color: '#52c41a' }}>API调用</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '2px', background: '#fa8c16', borderStyle: 'dashed' }}></div>
            <span style={{ fontSize: '11px', color: '#fa8c16' }}>系统→API</span>
          </div>
        </Space>
      </div>

      <Card
        style={{ height: 600 }}
        styles={{ body: { padding: 0, height: '100%' } }}
        extra={
          <Space>
            <Tag color="blue">🏢 系统: {topologyData.systems.length}</Tag>
            <Tag color="green">⚡ API: {topologyData.systems.reduce((sum, s) => sum + s.apis.length, 0)}</Tag>
            <Tag color="orange">🔌 端点: {topologyData.systems.reduce((sum, s) => sum + s.apis.reduce((aSum, a) => aSum + a.endpoints.length, 0), 0)}</Tag>
            <Tag color="purple">→ 连接: {topologyData.connections.length}</Tag>
          </Space>
        }
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spin size="large" />
          </div>
        ) : (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            style={{ overflow: 'hidden' }}
            onWheel={handleWheel}
          >
            {/* 更大的背景区域，用于平移 */}
            <g>
              {/* 背景矩形，用于拖动 */}
              <rect
                width="2000"
                height="2000"
                fill="#fafafa"
                onMouseDown={handlePanStart}
                onMouseMove={handlePanMove}
                onMouseUp={handlePanEnd}
                onMouseLeave={handlePanEnd}
                style={{ cursor: panning ? 'grabbing' : 'grab' }}
              />
              
              {/* 可平移和缩放的内容组 */}
              <g transform={`translate(${panOffset.x}, ${panOffset.y}) scale(${zoom})`}>
                {/* 绘制系统 */}
                {topologyData.systems.map(system => (
                  <g key={system.id}>
                    {/* 系统容器 - 简洁圆角矩形 */}
                    <rect
                      x={system.x}
                      y={system.y}
                      width={system.width}
                      height={system.height}
                      fill="rgba(24, 144, 255, 0.15)"
                      stroke="#1890ff"
                      strokeWidth="1.5"
                      rx="6"
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        handleDragStart(e, 'system', system.id, system.x, system.y)
                      }}
                      onMouseMove={(e) => {
                        e.stopPropagation()
                        handleDragMove(e)
                      }}
                      onMouseUp={(e) => {
                        e.stopPropagation()
                        handleDragEnd()
                      }}
                      onMouseLeave={(e) => {
                        e.stopPropagation()
                        handleDragEnd()
                      }}
                    />
                    
                    {/* 系统标题 */}
                    <text
                      x={system.x + 15}
                      y={system.y + 28}
                      fontSize="12"
                      fontWeight="bold"
                      fill="#1890ff"
                    >
                      🏢 {system.name}
                    </text>
                    
                    {/* 系统描述 */}
                    {system.description && (
                      <text
                        x={system.x + 15}
                        y={system.y + 45}
                        fontSize="9"
                        fill="#666"
                      >
                        {system.description}
                      </text>
                    )}
                    
                    {/* API数量 */}
                    <text
                      x={system.x + system.width - 15}
                      y={system.y + 28}
                      fontSize="10"
                      fill="#666"
                      textAnchor="end"
                    >
                      API: {system.apis.length}
                    </text>

                    {/* 绘制API */}
                    {system.apis.map(api => (
                      <g key={api.id}>
                        {/* API容器 - 简洁矩形 */}
                        <rect
                          x={system.x + api.x}
                          y={system.y + api.y}
                          width={api.width}
                          height={api.height}
                          fill="rgba(82, 196, 26, 0.15)"
                          stroke="#52c41a"
                          strokeWidth="1"
                          rx="4"
                        />
                        
                        {/* API标题 */}
                        <text
                          x={system.x + api.x + 12}
                          y={system.y + api.y + 20}
                          fontSize="10"
                          fontWeight="bold"
                          fill="#52c41a"
                        >
                          ⚡ {api.name}
                        </text>
                        
                        {/* 端点数量 */}
                        <text
                          x={system.x + api.x + api.width - 12}
                          y={system.y + api.y + 20}
                          fontSize="9"
                          fill="#666"
                          textAnchor="end"
                        >
                          端点: {api.endpoints.length}
                        </text>

                        {/* 绘制端点 */}
                        {api.endpoints.map(endpoint => (
                          <g key={endpoint.id}>
                            {/* 端点容器 - 改为圆形 */}
                            <circle
                              cx={system.x + api.x + endpoint.x + endpoint.width / 2}
                              cy={system.y + api.y + endpoint.y + endpoint.height / 2}
                              r={endpoint.width / 2}
                              fill="#f5f5f5"
                              stroke="#d9d9d9"
                              strokeWidth="1"
                            />
                            {/* SVG Title元素 - 鼠标悬停时显示路径 */}
                            <title>{endpoint.path}</title>
                            
                            {/* HTTP方法 */}
                            <text
                              x={system.x + api.x + endpoint.x + endpoint.width / 2}
                              y={system.y + api.y + endpoint.y + endpoint.height / 2 + 3}
                              fontSize="9"
                              fontWeight="bold"
                              fill="#fa8c16"
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              {endpoint.method}
                            </text>
                          </g>
                        ))}
                      </g>
                    ))}
                  </g>
                ))}
                
                {/* 绘制连接线 - 放在最后，确保在最上层 */}
                {drawConnections()}
              </g>
            </g>
          </svg>
        )}
      </Card>
    </div>
  )
}