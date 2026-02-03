import React, { useState } from 'react'
import API from '../api'

export default function HealthCheck(){
  const [endpointIds, setEndpointIds] = useState('')
  const [systemId, setSystemId] = useState('')
  const [historyEndpointId, setHistoryEndpointId] = useState('')
  const [result, setResult] = useState(null)

  async function batchCheck(e){
    e.preventDefault()
    try{
      const ids = endpointIds.split(',').map(s=>s.trim()).filter(Boolean)
      const res = await API.post('/api/v1/health-check/batch', { endpointIds: ids })
      setResult(res.data)
    }catch(e){ console.error(e); alert('Batch check failed') }
  }

  async function systemCheck(){
    if(!systemId) return alert('System ID required')
    try{
      const res = await API.post(`/api/v1/health-check/system/${encodeURIComponent(systemId)}`)
      setResult(res.data)
    }catch(e){ console.error(e); alert('System check failed') }
  }

  async function loadHistory(){
    if(!historyEndpointId) return alert('Endpoint ID required')
    try{
      const res = await API.get(`/api/v1/health-check/history/${encodeURIComponent(historyEndpointId)}`)
      setResult(res.data)
    }catch(e){ console.error(e); alert('History load failed') }
  }

  return (
    <div>
      <h3>Health Check</h3>
      <form onSubmit={batchCheck} style={{ marginBottom: 12 }}>
        <input placeholder="Endpoint IDs (comma-separated)" value={endpointIds} onChange={e=>setEndpointIds(e.target.value)} style={{ width: '60%' }} />
        <button type="submit">Batch Check</button>
      </form>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="System ID" value={systemId} onChange={e=>setSystemId(e.target.value)} />
        <button onClick={systemCheck}>System Check</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <input placeholder="Endpoint ID for history" value={historyEndpointId} onChange={e=>setHistoryEndpointId(e.target.value)} />
        <button onClick={loadHistory}>Load History</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', background:'#f6f6f6', padding:12 }}>{result ? JSON.stringify(result, null, 2) : 'No result'}</pre>
    </div>
  )
}
