import React, { useState } from 'react'
import { Form, Input, Button, Card, Space, message, Divider } from 'antd'
import API, { getErrorMessage } from '../api'
import { useNavigate } from 'react-router-dom'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [registerMode, setRegisterMode] = useState(false)
  const navigate = useNavigate()
  const [form] = Form.useForm()

  async function handleLogin(values) {
    setLoading(true)
    try {
      const res = await API.post('/api/v1/auth/login', {
        username: values.username,
        password: values.password
      })
      
      if (res.data && res.data.access_token) {
        localStorage.setItem('token', res.data.access_token)
        message.success('Login successful')
        // 使用replace确保用户不能返回登录页面
        navigate('/systems', { replace: true })
      } else {
        message.error('Login failed: Invalid response')
      }
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleRegister(values) {
    setLoading(true)
    try {
      const res = await API.post('/api/v1/auth/register', null, {
        params: {
          username: values.username,
          password: values.password,
          full_name: values.fullName,
          email: values.email
        }
      })
      
      if (res.data) {
        message.success('Registration successful')
        setRegisterMode(false)
        form.resetFields()
      } else {
        message.error('Registration failed: Invalid response')
      }
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <Card title={registerMode ? 'Register' : 'Login'} style={{ width: '100%', maxWidth: 400 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={registerMode ? handleRegister : handleLogin}
          initialValues={{ username: '', password: '', fullName: '', email: '' }}
        >
          <Form.Item
            name="username"
            label="Username"
            rules={[{ required: true, message: 'Username is required' }]}
          >
            <Input placeholder="Enter username" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          {registerMode && (
            <>
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
                rules={[{ required: true, message: 'Email is required' }, { type: 'email', message: 'Invalid email format' }]}
              >
                <Input placeholder="Enter email" />
              </Form.Item>
            </>
          )}

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              {registerMode ? 'Register' : 'Login'}
            </Button>
          </Form.Item>
        </Form>

        <Divider />

        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button 
            type="link" 
            onClick={() => {
              setRegisterMode(!registerMode)
              form.resetFields()
            }}
          >
            {registerMode ? 'Already have an account? Login' : 'Don\'t have an account? Register'}
          </Button>
        </Space>
      </Card>
    </div>
  )
}
