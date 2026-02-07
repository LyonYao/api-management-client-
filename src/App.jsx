import React, { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { Layout, Menu, Button, Space, message, Avatar, Dropdown } from 'antd'
import { AppstoreOutlined, ApiOutlined, LinkOutlined, ClusterOutlined, AimOutlined, HeartOutlined, FileTextOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import Systems from './pages/Systems'
import Apis from './pages/Apis'
import Endpoints from './pages/Endpoints'
import Relationships from './pages/Relationships'
import Topology from './pages/Topology'
import HealthCheck from './pages/HealthCheck'
import Profile from './pages/Profile'
import Login from './pages/Login'
import API, { getErrorMessage } from './api'

const { Sider, Content, Header } = Layout

export default function App(){
  const location = useLocation()
  const navigate = useNavigate()
  const selected = location.pathname || '/systems'
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // 检查登录状态
  useEffect(() => {
    checkAuth()
  }, [])

  // 检查认证状态
  async function checkAuth() {
    const token = localStorage.getItem('token')
    if (!token) {
      setUser(null)
      setLoading(false)
      return
    }

    try {
      const res = await API.get('/api/v1/auth/me')
      if (res.data) {
        setUser(res.data)
      }
    } catch (err) {
      console.error('Auth check failed:', err)
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  // 登出函数
  function handleLogout() {
    localStorage.removeItem('token')
    setUser(null)
    message.success('Logged out successfully')
    navigate('/login')
  }

  // 渲染用户菜单
  const userMenu = (
    <Menu>
      <Menu.Item key="user" onClick={() => navigate('/profile')}>
        <Space>
          <UserOutlined />
          <span>Profile</span>
        </Space>
      </Menu.Item>
      <Menu.Divider />
      <Menu.Item key="logout" onClick={handleLogout}>
        <Space>
          <LogoutOutlined />
          <span>Logout</span>
        </Space>
      </Menu.Item>
    </Menu>
  )

  // 路由保护组件
  function ProtectedRoute({ children }) {
    if (loading) {
      return <div>Loading...</div>
    }
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return null
    }
    // 如果有token但没有user，尝试获取用户信息
    if (!user) {
      checkAuth()
    }
    return children
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {user ? (
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
          </Menu>
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <Dropdown overlay={userMenu} placement="topRight">
              <Space style={{ color: '#fff', cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
                <Avatar icon={<UserOutlined />} />
                <span>{user.username || 'User'}</span>
              </Space>
            </Dropdown>
          </div>
        </Sider>
      ) : (
        <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 1000 }}>
          <Link to="/login">
            <Button type="primary">Login</Button>
          </Link>
        </div>
      )}
      <Layout>
        <Content className="main" style={{ margin: user ? 0 : '20px' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/systems" element={<ProtectedRoute><Systems /></ProtectedRoute>} />
            <Route path="/apis" element={<ProtectedRoute><Apis /></ProtectedRoute>} />
            <Route path="/endpoints" element={<ProtectedRoute><Endpoints /></ProtectedRoute>} />
            <Route path="/relationships" element={<ProtectedRoute><Relationships /></ProtectedRoute>} />
            <Route path="/topology" element={<ProtectedRoute><Topology /></ProtectedRoute>} />
            <Route path="/health-check" element={<ProtectedRoute><HealthCheck /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/" element={<ProtectedRoute><Systems /></ProtectedRoute>} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}
