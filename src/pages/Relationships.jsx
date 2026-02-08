import React, { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Space, Popconfirm, Descriptions, message, Select, Row, Col } from 'antd'
import API, { getErrorMessage } from '../api'

const { Option } = Select

export default function Relationships(){
  const [relationships, setRelationships] = useState([])
  const [loading, setLoading] = useState(false)

  const [systems, setSystems] = useState([])
  const [apis, setApis] = useState([])
  const [apiCache, setApiCache] = useState({})
  const [systemCache, setSystemCache] = useState({})
  const [endpointCache, setEndpointCache] = useState({})
  const [callerApis, setCallerApis] = useState([])
  const [calleeApis, setCalleeApis] = useState([])
  const [calleeEndpoints, setCalleeEndpoints] = useState([])

  const [createVisible, setCreateVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)

  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  async function loadRelationships(){
    setLoading(true)
    try{
      const res = await API.get('/api/v1/relationships')
      setRelationships(res.data || [])
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
    finally{ setLoading(false) }
  }

  async function loadSystems(){
    try{ const res = await API.get('/api/v1/systems'); setSystems(res.data || []) }catch(err){ console.error(err) }
  }

  useEffect(()=>{ loadRelationships() }, [])

  async function openCreate(){
    await loadSystems()
    setCreateVisible(true)
  }

  async function loadApis(){
    try{
      const res = await API.get('/api/v1/apis')
      setApis(res.data || [])
    }catch(err){ console.error(err) }
  }

  // do not preload all APIs - we will lazy-load single records where needed

  function mapSystem(id){ return systemCache[id] || systems.find(s=>s.id===id) || null }
  function mapApi(id){
    return apiCache[id] || (apis||[]).find(a=>a.id===id) || callerApis.find(a=>a.id===id) || calleeApis.find(a=>a.id===id) || null
  }

  async function onCreate(values){
    try{
      const payload = {
        caller_type: values.caller_type,
        caller_id: values.caller_type === 'SYSTEM' ? values.caller_system_id : values.caller_api_id,
        callee_type: values.callee_type,
        callee_id: values.callee_type === 'SYSTEM' ? values.callee_system_id : values.callee_api_id,
        endpoint_id: values.endpoint_id,
        auth_type: values.auth_type,
        auth_config: values.auth_config ? JSON.parse(values.auth_config) : undefined,
        description: values.description
      }
      await API.post('/api/v1/relationships', payload)
      message.success('Relationship created')
      setCreateVisible(false)
      form.resetFields()
      loadRelationships()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onDelete(id){
    try{ await API.delete(`/api/v1/relationships/${id}`); message.success('Deleted'); loadRelationships() }
    catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function showDetail(record){
    try{
      const res = await API.get(`/api/v1/relationships/${record.id}`)
      const r = res.data || {}
      // lazy-load related entities for clearer detail view
      let callerSystem = null, callerApi = null, calleeSystem = null, calleeApi = null, endpoint = null
      try{
        if (r.caller_type === 'SYSTEM') callerSystem = await API.getSystemById(r.caller_id)
        else callerApi = await API.getApiById(r.caller_id)
      }catch(e){ console.error('caller fetch', e) }
      try{
        if (r.callee_type === 'SYSTEM') calleeSystem = await API.getSystemById(r.callee_id)
        else calleeApi = await API.getApiById(r.callee_id)
      }catch(e){ console.error('callee fetch', e) }
      try{
        if (r.endpoint_id) endpoint = await API.getEndpointById(r.endpoint_id)
      }catch(e){ console.error('endpoint fetch', e) }

      setDetail({ ...r, callerSystem, callerApi, calleeSystem, calleeApi, endpoint })
      setDetailVisible(true)
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onCallerSystemChange(system_id){
    if(!system_id){ setCallerApis([]); form.setFieldsValue({ caller_api_id: undefined }); return }
    try{
      const res = await API.get('/api/v1/apis/search', { params: { system_id } })
      setCallerApis(res.data || [])
      form.setFieldsValue({ caller_api_id: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onCalleeSystemChange(system_id){
    if(!system_id){ setCalleeApis([]); setCalleeEndpoints([]); form.setFieldsValue({ callee_api_id: undefined, endpoint_id: undefined }); return }
    try{
      const res = await API.get('/api/v1/apis/search', { params: { system_id } })
      setCalleeApis(res.data || [])
      form.setFieldsValue({ callee_api_id: undefined, endpoint_id: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onCalleeApiChange(api_id){
    if(!api_id){ setCalleeEndpoints([]); form.setFieldsValue({ endpoint_id: undefined }); return }
    try{
      const res = await API.get(`/api/v1/endpoints/api/${encodeURIComponent(api_id)}`)
      setCalleeEndpoints(res.data || [])
      form.setFieldsValue({ endpoint_id: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  const columns = [
    { title: 'Caller', key: 'caller', render: (_, r) => (
      r.caller_type === 'SYSTEM'
        ? (mapSystem(r.caller_id)?.name || r.caller_id)
        : (`${mapApi(r.caller_id)?.system_name || '-'} / ${mapApi(r.caller_id)?.name || r.caller_id}`)
    )},
    { title: 'Callee', key: 'callee', render: (_, r) => (
      r.callee_type === 'SYSTEM'
        ? (mapSystem(r.callee_id)?.name || r.callee_id)
        : (`${mapApi(r.callee_id)?.system_name || '-'} / ${mapApi(r.callee_id)?.name || r.callee_id}`)
    )},
    { title: 'Endpoint', dataIndex: 'endpoint_id', key: 'endpoint_id', render: v => (endpointCache[v]?.path || v || '-') },
    { title: 'Auth', dataIndex: 'auth_type', key: 'auth_type' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Button type="primary" size="small" onClick={()=>showDetail(record)}>Details</Button>
        <Popconfirm title="Delete this relationship?" onConfirm={()=>onDelete(record.id)}>
          <Button danger size="small">Delete</Button>
        </Popconfirm>
      </Space>
    )}
  ]

  // ensure visible caller/callee api/system names are cached for friendly list rendering
  useEffect(()=>{
    const visible = relationships || []
    const apiIds = new Set()
    const systemIds = new Set()
    const endpointIds = new Set()
    visible.forEach(r => {
      if(r.caller_type === 'API' && r.caller_id) apiIds.add(r.caller_id)
      if(r.callee_type === 'API' && r.callee_id) apiIds.add(r.callee_id)
      if(r.caller_type === 'SYSTEM' && r.caller_id) systemIds.add(r.caller_id)
      if(r.callee_type === 'SYSTEM' && r.callee_id) systemIds.add(r.callee_id)
      if(r.endpoint_id) endpointIds.add(r.endpoint_id)
    })
    const missingApi = Array.from(apiIds).filter(id => !apiCache[id])
    const missingSys = Array.from(systemIds).filter(id => !systemCache[id])
    const missingEp = Array.from(endpointIds).filter(id => !endpointCache[id])
    let mounted = true
    if(missingApi.length){
      Promise.all(missingApi.map(id => API.getApiById(id).catch(()=>null))).then(results=>{
        if(!mounted) return
        const copy = { ...apiCache }
        results.forEach(r=>{ if(r && r.id) copy[r.id] = r })
        setApiCache(copy)
      })
    }
    if(missingSys.length){
      Promise.all(missingSys.map(id => API.getSystemById(id).catch(()=>null))).then(results=>{
        if(!mounted) return
        const copy = { ...systemCache }
        results.forEach(s=>{ if(s && s.id) copy[s.id] = s })
        setSystemCache(copy)
      })
    }
    if(missingEp.length){
      Promise.all(missingEp.map(id => API.getEndpointById(id).catch(()=>null))).then(results=>{
        if(!mounted) return
        const copy = { ...endpointCache }
        results.forEach(e=>{ if(e && e.id) copy[e.id] = e })
        setEndpointCache(copy)
      })
    }
    return ()=>{ mounted = false }
  }, [relationships])

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h3>Relationship 管理</h3>
        <Space>
          <Button type="primary" onClick={openCreate}>New Relationship</Button>
        </Space>
      </div>

      <div className="card">
        <Table size="middle" columns={columns} dataSource={relationships} rowKey="id" loading={loading} pagination={{ pageSize: 20 }} />
      </div>

      <Modal title="Create Relationship" open={createVisible} onCancel={()=>setCreateVisible(false)} footer={null} width={800}>
        <Form form={form} layout="vertical" onFinish={onCreate} initialValues={{ caller_type: 'SYSTEM', callee_type: 'API' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="caller_type" label="Caller Type">
                <Select onChange={(v)=>{ form.setFieldsValue({ caller_system_id: undefined, caller_api_id: undefined }); if(v==='SYSTEM'){} }}>
                  <Option value="SYSTEM">SYSTEM</Option>
                  <Option value="API">API</Option>
                </Select>
              </Form.Item>

              <Form.Item shouldUpdate={(prev, cur)=>prev.caller_type!==cur.caller_type} noStyle>
                {()=> (
                  form.getFieldValue('caller_type') === 'SYSTEM' ? (
                    <Form.Item name="caller_system_id" label="Caller System" rules={[{ required: true, message: 'System required' }]}>
                      <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="Select System" optionFilterProp="label" />
                    </Form.Item>
                  ) : (
                    <>
                      <Form.Item name="caller_system_id" label="Caller System (filter)" >
                        <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="(optional) filter apis" optionFilterProp="label" onChange={onCallerSystemChange} allowClear />
                      </Form.Item>
                      <Form.Item name="caller_api_id" label="Caller API" rules={[{ required: true, message: 'API required' }]}>
                        <Select showSearch placeholder="Select API" optionFilterProp="label">
                          {(callerApis||[]).map(a=> <Option key={a.id} value={a.id} label={a.name}>{a.name}</Option>)}
                        </Select>
                      </Form.Item>
                    </>
                  )
                )}
              </Form.Item>
            </Col>

            <Col span={12}>
              <Form.Item name="callee_type" label="Callee Type">
                <Select onChange={(v)=>{ form.setFieldsValue({ callee_system_id: undefined, callee_api_id: undefined, endpoint_id: undefined }); if(v==='SYSTEM'){} }}>
                  <Option value="SYSTEM">SYSTEM</Option>
                  <Option value="API">API</Option>
                </Select>
              </Form.Item>

              <Form.Item shouldUpdate={(prev, cur)=>prev.callee_type!==cur.callee_type} noStyle>
                {()=> (
                  form.getFieldValue('callee_type') === 'SYSTEM' ? (
                    <Form.Item name="callee_system_id" label="Callee System" rules={[{ required: true, message: 'System required' }]}>
                      <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="Select System" optionFilterProp="label" />
                    </Form.Item>
                  ) : (
                    <>
                      <Form.Item name="callee_system_id" label="Callee System (filter)" >
                        <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="(optional) filter apis" optionFilterProp="label" onChange={onCalleeSystemChange} allowClear />
                      </Form.Item>
                      <Form.Item name="callee_api_id" label="Callee API" rules={[{ required: true, message: 'API required' }]}>
                        <Select showSearch placeholder="Select API" optionFilterProp="label" onChange={onCalleeApiChange}>
                          {(calleeApis||[]).map(a=> <Option key={a.id} value={a.id} label={a.name}>{a.name}</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item name="endpoint_id" label="Endpoint" rules={[{ required: true, message: 'Endpoint required' }]}>
                        <Select showSearch placeholder="Select endpoint" optionFilterProp="label">
                          {(calleeEndpoints||[]).map(ep=> <Option key={ep.id} value={ep.id} label={`${ep.http_method} ${ep.path}`}>{`${ep.http_method} ${ep.path}`}</Option>)}
                        </Select>
                      </Form.Item>
                    </>
                  )
                )}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="auth_type" label="Auth Type">
                <Select allowClear>
                  <Option value="API_KEY">API_KEY</Option>
                  <Option value="OAUTH2">OAUTH2</Option>
                  <Option value="BASIC_AUTH">BASIC_AUTH</Option>
                  <Option value="JWT">JWT</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auth_config" label="Auth Config (JSON)">
                <Input.TextArea rows={2} placeholder='{"header":"Authorization","prefix":"Bearer"}' />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Create</Button>
              <Button onClick={()=>setCreateVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={detail ? `Relationship: ${detail.id}` : 'Relationship Detail'} open={detailVisible} onCancel={()=>setDetailVisible(false)} footer={null} width={720}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{detail.id}</Descriptions.Item>

            <Descriptions.Item label="Caller Type">{detail.caller_type}</Descriptions.Item>
            {detail.caller_type === 'SYSTEM' ? (
              <Descriptions.Item label="Caller System">{detail.callerSystem?.name || detail.caller_id}</Descriptions.Item>
            ) : (
              <>
                <Descriptions.Item label="Caller System">{detail.callerApi?.system_name || detail.callerApi?.system_id || '-'}</Descriptions.Item>
                <Descriptions.Item label="Caller API">{detail.callerApi?.name || detail.caller_id}</Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Callee Type">{detail.callee_type}</Descriptions.Item>
            {detail.callee_type === 'SYSTEM' ? (
              <Descriptions.Item label="Callee System">{detail.calleeSystem?.name || detail.callee_id}</Descriptions.Item>
            ) : (
              <>
                <Descriptions.Item label="Callee System">{detail.calleeApi?.system_name || detail.calleeApi?.system_id || '-'}</Descriptions.Item>
                <Descriptions.Item label="Callee API">{detail.calleeApi?.name || detail.callee_id}</Descriptions.Item>
                <Descriptions.Item label="Endpoint">{detail.endpoint ? `${detail.endpoint.http_method} ${detail.endpoint.path}` : (detail.endpoint_path ? `${detail.endpoint_method || ''} ${detail.endpoint_path}` : (detail.endpoint_id || '-'))}</Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Auth Type">{detail.auth_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="Auth Config">{detail.auth_config ? (<pre style={{ margin:0 }}>{JSON.stringify(detail.auth_config, null, 2)}</pre>) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
