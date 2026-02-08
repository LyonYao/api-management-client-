import React, { useState, useEffect } from 'react'
import { Card, Descriptions, Button, Space, message, Form, Input, Avatar } from 'antd'
import API, { getErrorMessage } from '../api'
import { UserOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  // 获取用户信息
  async function loadUserInfo() {
    setLoading(true)
    try {
      const res = await API.get('/api/v1/auth/me')
      if (res.data) {
        setUser(res.data)
        form.setFieldsValue({
          username: res.data.username,
          fullName: res.data.full_name,
          email: res.data.email
        })
      }
    } catch (err) {
      console.error('Failed to load user info:', err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // 保存用户信息
  async function saveUserInfo(values) {
    setLoading(true)
    try {
      const res = await API.put('/api/v1/auth/me', {
        username: values.username,
        full_name: values.fullName,
        email: values.email
      })
      if (res.data) {
        setUser(res.data)
        setEditing(false)
        message.success('Profile updated successfully')
      }
    } catch (err) {
      console.error('Failed to update user info:', err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUserInfo()
  }, [])

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>Loading...</div>
  }

  if (!user) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>Failed to load user info</div>
  }

  return (
    <div>
      <div className="page-header">
        <h3>User Profile</h3>
      </div>

      <Card className="card">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 32 }}>
          <Avatar size={80} icon={<UserOutlined />} style={{ marginRight: 24 }} />
          <div>
            <h2 style={{ margin: 0 }}>{user.full_name || user.username}</h2>
            <p style={{ margin: 4, color: '#666' }}>{user.username}</p>
            <p style={{ margin: 4, color: '#666' }}>{user.email}</p>
          </div>
        </div>

        {!editing ? (
          <>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Username">{user.username}</Descriptions.Item>
              <Descriptions.Item label="Full Name">{user.full_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Email">{user.email || '-'}</Descriptions.Item>
              <Descriptions.Item label="Created At">
                {user.created_at ? new Date(user.created_at).toLocaleString() : '-'}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Button 
                type="primary" 
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
              >
                Edit Profile
              </Button>
            </div>
          </>
        ) : (
          <Form form={form} layout="vertical" onFinish={saveUserInfo}>
            <Form.Item
              name="username"
              label="Username"
              rules={[{ required: true, message: 'Username is required' }]}
            >
              <Input disabled />
            </Form.Item>

            <Form.Item
              name="fullName"
              label="Full Name"
              rules={[{ required: true, message: 'Full Name is required' }]}
            >
              <Input placeholder="Enter full name" />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Email is required' },
                { type: 'email', message: 'Invalid email format' }
              ]}
            >
              <Input placeholder="Enter email" />
            </Form.Item>

            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button 
                  onClick={() => {
                    setEditing(false)
                    form.setFieldsValue({
                      username: user.username,
                      fullName: user.full_name,
                      email: user.email
                    })
                  }}
                  icon={<CloseOutlined />}
                >
                  Cancel
                </Button>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  icon={<SaveOutlined />}
                  loading={loading}
                >
                  Save Changes
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Card>
    </div>
  )
}
