import React, { useEffect, useState } from 'react'
import API from '../api'

export default function Openapi(){
  const [spec, setSpec] = useState(null)

  async function loadJson(){
    try{
      const res = await API.get('/api/v1/openapi.json')
      setSpec(res.data)
    }catch(e){ console.error(e); alert('Failed to load openapi.json') }
  }

  async function loadYaml(){
    try{
      const res = await API.get('/api/v1/openapi.yaml')
      setSpec(res.data)
    }catch(e){ console.error(e); alert('Failed to load openapi.yaml') }
  }

  useEffect(()=>{ loadJson() }, [])

  return (
    <div>
      <h3>OpenAPI</h3>
      <div style={{ marginBottom: 12 }}>
        <button onClick={loadJson}>Load JSON</button>
        <button onClick={loadYaml}>Load YAML</button>
      </div>
      <pre style={{ whiteSpace: 'pre-wrap', background:'#fff', padding:12 }}>{spec ? (typeof spec === 'string' ? spec : JSON.stringify(spec, null, 2)) : 'No spec loaded'}</pre>
    </div>
  )
}
