import React, { useEffect, useState } from 'react'
import { Button, Space, Card, Tabs, message } from 'antd'
import API from '../api'

const { TabPane } = Tabs

export default function Openapi(){
  const [spec, setSpec] = useState(null)
  const [spec1, setSpec1] = useState(null)
  const [loading, setLoading] = useState(false)

  async function loadJson(){
    setLoading(true)
    try{
      const res = await API.get('/api/v1/openapi.json')
      setSpec(res.data)
      message.success('Loaded Java version OpenAPI')
    }catch(e){ 
      console.error(e); 
      message.error('Failed to load openapi.json') 
    }finally{
      setLoading(false)
    }
  }

  async function loadJson1(){
    setLoading(true)
    try{
      const res = await API.get('/api/v1/openapi-1.json')
      setSpec1(res.data)
      message.success('Loaded Python version OpenAPI')
    }catch(e){ 
      console.error(e); 
      message.error('Failed to load openapi-1.json') 
    }finally{
      setLoading(false)
    }
  }

  async function loadYaml(){
    setLoading(true)
    try{
      const res = await API.get('/api/v1/openapi.yaml')
      setSpec(res.data)
      message.success('Loaded YAML version OpenAPI')
    }catch(e){ 
      console.error(e); 
      message.error('Failed to load openapi.yaml') 
    }finally{
      setLoading(false)
    }
  }

  useEffect(()=>{ 
    loadJson()
    loadJson1()
  }, [])

  return (
    <div>
      <h3>OpenAPI Specifications</h3>
      <div style={{ marginBottom: 16 }}>
        <Space>
          <Button 
            type="primary" 
            onClick={loadJson}
            loading={loading}
          >
            Load Java Version (openapi.json)
          </Button>
          <Button 
            type="primary" 
            onClick={loadJson1}
            loading={loading}
          >
            Load Python Version (openapi-1.json)
          </Button>
          <Button 
            onClick={loadYaml}
            loading={loading}
          >
            Load YAML Version
          </Button>
        </Space>
      </div>

      <Tabs defaultActiveKey="java">
        <TabPane tab="Java Version (openapi.json)" key="java">
          <Card>
            <pre style={{ whiteSpace: 'pre-wrap', background:'#fafafa', padding:16, borderRadius: 8, overflowX: 'auto' }}>
              {spec ? (typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)) : 'No spec loaded'}
            </pre>
          </Card>
        </TabPane>
        <TabPane tab="Python Version (openapi-1.json)" key="python">
          <Card>
            <pre style={{ whiteSpace: 'pre-wrap', background:'#fafafa', padding:16, borderRadius: 8, overflowX: 'auto' }}>
              {spec1 ? (typeof spec1 === 'string' ? spec1 : JSON.stringify(spec1, null, 2)) : 'No spec loaded'}
            </pre>
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}
