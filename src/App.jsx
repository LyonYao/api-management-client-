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
      <Sider width={240} className="sidebar" style={{ paddingTop: 0, overflow: 'auto' }}>
        <div style={{ color: '#fff', fontSize: 18, fontWeight: 700, padding: '24px 20px 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>API Manager</div>
        <Menu 
          theme="dark" 
          mode="inline" 
          selectedKeys={[selected]} 
          style={{ 
            background: 'transparent', 
            border: 'none',
            padding: '16px 0'
          }}
          className="sidebar-menu"
        >
          <Menu.Item key="/systems" icon={<AppstoreOutlined style={{ color: selected === '/systems' ? '#fff' : '#93c5fd' }} />}>
            <Link to="/systems" className={selected === '/systems' ? 'sidebar-link active' : 'sidebar-link'}>Systems</Link>
          </Menu.Item>
          <Menu.Item key="/apis" icon={<ApiOutlined style={{ color: selected === '/apis' ? '#fff' : '#93c5fd' }} />}>
            <Link to="/apis" className={selected === '/apis' ? 'sidebar-link active' : 'sidebar-link'}>APIs</Link>
          </Menu.Item>
          <Menu.Item key="/endpoints" icon={<LinkOutlined style={{ color: selected === '/endpoints' ? '#fff' : '#93c5fd' }} />}>
            <Link to="/endpoints" className={selected === '/endpoints' ? 'sidebar-link active' : 'sidebar-link'}>Endpoints</Link>
          </Menu.Item>
          <Menu.Item key="/relationships" icon={<ClusterOutlined style={{ color: selected === '/relationships' ? '#fff' : '#93c5fd' }} />}>
            <Link to="/relationships" className={selected === '/relationships' ? 'sidebar-link active' : 'sidebar-link'}>Relationships</Link>
          </Menu.Item>
          <Menu.Item key="/topology" icon={<AimOutlined style={{ color: selected === '/topology' ? '#fff' : '#93c5fd' }} />}>
            <Link to="/topology" className={selected === '/topology' ? 'sidebar-link active' : 'sidebar-link'}>Topology</Link>
          </Menu.Item>
          <Menu.Item key="/health-check" icon={<HeartOutlined style={{ color: selected === '/health-check' ? '#fff' : '#93c5fd' }} />}>
            <Link to="/health-check" className={selected === '/health-check' ? 'sidebar-link active' : 'sidebar-link'}>Health Check</Link>
          </Menu.Item>
          <Menu.Item key="/openapi" icon={<FileTextOutlined style={{ color: selected === '/openapi' ? '#fff' : '#93c5fd' }} />}>
            <Link to="/openapi" className={selected === '/openapi' ? 'sidebar-link active' : 'sidebar-link'}>OpenAPI</Link>
          </Menu.Item>
        </Menu>
      </Sider>
      <Layout>
        <Content className="main">
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
