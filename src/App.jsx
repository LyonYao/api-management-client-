import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { Layout, Menu } from 'antd'
import { AppstoreOutlined, ApiOutlined, LinkOutlined, ClusterOutlined, AimOutlined, HeartOutlined, FileTextOutlined } from '@ant-design/icons'
import Systems from './pages/Systems'
import Apis from './pages/Apis'
import Endpoints from './pages/Endpoints'
import Relationships from './pages/Relationships'
import Topology from './pages/Topology'
import HealthCheck from './pages/HealthCheck'
import Openapi from './pages/Openapi'

const { Sider, Content } = Layout

export default function App(){
  const location = useLocation()
  const selected = location.pathname || '/systems'

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider width={240} style={{ background:'#0f1724', paddingTop:18 }}>
        <div style={{ color:'#fff', fontSize:18, fontWeight:700, padding:'0 20px 16px 20px' }}>API Manager</div>
        <Menu theme="dark" mode="inline" selectedKeys={[selected]} style={{ background:'transparent', border:'none' }}>
          <Menu.Item key="/systems" icon={<AppstoreOutlined />}><Link to="/systems">Systems</Link></Menu.Item>
          <Menu.Item key="/apis" icon={<ApiOutlined />}><Link to="/apis">APIs</Link></Menu.Item>
          <Menu.Item key="/endpoints" icon={<LinkOutlined />}><Link to="/endpoints">Endpoints</Link></Menu.Item>
          <Menu.Item key="/relationships" icon={<ClusterOutlined />}><Link to="/relationships">Relationships</Link></Menu.Item>
          <Menu.Item key="/topology" icon={<AimOutlined />}><Link to="/topology">Topology</Link></Menu.Item>
          <Menu.Item key="/health-check" icon={<HeartOutlined />}><Link to="/health-check">Health Check</Link></Menu.Item>
          <Menu.Item key="/openapi" icon={<FileTextOutlined />}><Link to="/openapi">OpenAPI</Link></Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Content style={{ padding:24, background:'#f3f4f6' }}>
          <Routes>
            <Route path="/systems" element={<Systems />} />
            <Route path="/apis" element={<Apis />} />
            <Route path="/endpoints" element={<Endpoints />} />
            <Route path="/relationships" element={<Relationships />} />
            <Route path="/topology" element={<Topology />} />
            <Route path="/health-check" element={<HealthCheck />} />
            <Route path="/openapi" element={<Openapi />} />
            <Route path="/" element={<Systems />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}
