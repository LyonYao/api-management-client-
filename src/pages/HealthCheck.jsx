import React, { useState } from 'react'
import { Input, Button, Space, Card, message } from 'antd'
import API, { getErrorMessage } from '../api'

export default function HealthCheck(){
  const [endpointIds, setEndpointIds] = useState('')
  const [systemId, setSystemId] = useState('')
  const [historyEndpointId, setHistoryEndpointId] = useState('')
  const [result, setResult] = useState(null)

  async function batchCheck(){
    try{
      const ids = endpointIds.split(',').map(s=>s.trim()).filter(Boolean)
      const res = await API.post('/api/v1/health-check/batch', { endpoint_ids: ids })
      setResult(res.data)
      message.success('Batch check completed')
    }catch(e){ console.error(e); message.error(getErrorMessage(e)) }
  }

  async function systemCheck(){
    if(!systemId) return message.error('System ID required')
    try{
      const res = await API.post(`/api/v1/health-check/system/${encodeURIComponent(systemId)}`)
      setResult(res.data)
      message.success('System check completed')
    }catch(e){ console.error(e); message.error(getErrorMessage(e)) }
  }

  async function loadHistory(){
    if(!historyEndpointId) return message.error('Endpoint ID required')
    try{
      const res = await API.get(`/api/v1/health-check/history/${encodeURIComponent(historyEndpointId)}`)
      setResult(res.data)
      message.success('History loaded')
    }catch(e){ console.error(e); message.error(getErrorMessage(e)) }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>Health Check</h3>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>Batch Check</h4>
          <Space>
            <Input 
              placeholder="Endpoint IDs (comma-separated)" 
              value={endpointIds} 
              onChange={e=>setEndpointIds(e.target.value)} 
              style={{ width: 600 }} 
            />
            <Button type="primary" onClick={batchCheck}>Batch Check</Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>System Check</h4>
          <Space>
            <Input 
              placeholder="System ID" 
              value={systemId} 
              onChange={e=>setSystemId(e.target.value)} 
              style={{ width: 300 }} 
            />
            <Button type="primary" onClick={systemCheck}>System Check</Button>
          </Space>
        </div>

        <div style={{ marginBottom: 16 }}>
          <h4 style={{ marginBottom: 12 }}>History</h4>
          <Space>
            <Input 
              placeholder="Endpoint ID for history" 
              value={historyEndpointId} 
              onChange={e=>setHistoryEndpointId(e.target.value)} 
              style={{ width: 300 }} 
            />
            <Button type="primary" onClick={loadHistory}>Load History</Button>
          </Space>
        </div>
      </div>

      <Card title="Result">
        <pre style={{ whiteSpace: 'pre-wrap', background:'#f6f6f6', padding: 16, borderRadius: 8 }}>
          {result ? JSON.stringify(result, null, 2) : 'No result'}
        </pre>
      </Card>
    </div>
  )
}
