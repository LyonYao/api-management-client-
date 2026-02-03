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
        callerType: values.callerType,
        callerId: values.callerType === 'SYSTEM' ? values.callerSystemId : values.callerApiId,
        calleeType: values.calleeType,
        calleeId: values.calleeType === 'SYSTEM' ? values.calleeSystemId : values.calleeApiId,
        endpointId: values.endpointId,
        authType: values.authType,
        authConfig: values.authConfig ? JSON.parse(values.authConfig) : undefined,
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
        if (r.callerType === 'SYSTEM') callerSystem = await API.getSystemById(r.callerId)
        else callerApi = await API.getApiById(r.callerId)
      }catch(e){ console.error('caller fetch', e) }
      try{
        if (r.calleeType === 'SYSTEM') calleeSystem = await API.getSystemById(r.calleeId)
        else calleeApi = await API.getApiById(r.calleeId)
      }catch(e){ console.error('callee fetch', e) }
      try{
        if (r.endpointId) endpoint = await API.getEndpointById(r.endpointId)
      }catch(e){ console.error('endpoint fetch', e) }

      setDetail({ ...r, callerSystem, callerApi, calleeSystem, calleeApi, endpoint })
      setDetailVisible(true)
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onCallerSystemChange(systemId){
    if(!systemId){ setCallerApis([]); form.setFieldsValue({ callerApiId: undefined }); return }
    try{
      const res = await API.get('/api/v1/apis/search', { params: { systemId } })
      setCallerApis(res.data || [])
      form.setFieldsValue({ callerApiId: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onCalleeSystemChange(systemId){
    if(!systemId){ setCalleeApis([]); setCalleeEndpoints([]); form.setFieldsValue({ calleeApiId: undefined, endpointId: undefined }); return }
    try{
      const res = await API.get('/api/v1/apis/search', { params: { systemId } })
      setCalleeApis(res.data || [])
      form.setFieldsValue({ calleeApiId: undefined, endpointId: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onCalleeApiChange(apiId){
    if(!apiId){ setCalleeEndpoints([]); form.setFieldsValue({ endpointId: undefined }); return }
    try{
      const res = await API.get(`/api/v1/endpoints/api/${encodeURIComponent(apiId)}`)
      setCalleeEndpoints(res.data || [])
      form.setFieldsValue({ endpointId: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  const columns = [
    { title: 'Caller', key: 'caller', render: (_, r) => (
      r.callerType === 'SYSTEM'
        ? (mapSystem(r.callerId)?.name || r.callerId)
        : (`${mapApi(r.callerId)?.systemName || '-'} / ${mapApi(r.callerId)?.name || r.callerId}`)
    )},
    { title: 'Callee', key: 'callee', render: (_, r) => (
      r.calleeType === 'SYSTEM'
        ? (mapSystem(r.calleeId)?.name || r.calleeId)
        : (`${mapApi(r.calleeId)?.systemName || '-'} / ${mapApi(r.calleeId)?.name || r.calleeId}`)
    )},
    { title: 'Endpoint', dataIndex: 'endpointId', key: 'endpointId', render: v => (endpointCache[v]?.path || v || '-') },
    { title: 'Auth', dataIndex: 'authType', key: 'authType' },
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
      if(r.callerType === 'API' && r.callerId) apiIds.add(r.callerId)
      if(r.calleeType === 'API' && r.calleeId) apiIds.add(r.calleeId)
      if(r.callerType === 'SYSTEM' && r.callerId) systemIds.add(r.callerId)
      if(r.calleeType === 'SYSTEM' && r.calleeId) systemIds.add(r.calleeId)
      if(r.endpointId) endpointIds.add(r.endpointId)
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
        <Form form={form} layout="vertical" onFinish={onCreate} initialValues={{ callerType: 'SYSTEM', calleeType: 'API' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="callerType" label="Caller Type">
                <Select onChange={(v)=>{ form.setFieldsValue({ callerSystemId: undefined, callerApiId: undefined }); if(v==='SYSTEM'){} }}>
                  <Option value="SYSTEM">SYSTEM</Option>
                  <Option value="API">API</Option>
                </Select>
              </Form.Item>

              <Form.Item shouldUpdate={(prev, cur)=>prev.callerType!==cur.callerType} noStyle>
                {()=> (
                  form.getFieldValue('callerType') === 'SYSTEM' ? (
                    <Form.Item name="callerSystemId" label="Caller System" rules={[{ required: true, message: 'System required' }]}>
                      <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="Select System" optionFilterProp="label" />
                    </Form.Item>
                  ) : (
                    <>
                      <Form.Item name="callerSystemId" label="Caller System (filter)" >
                        <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="(optional) filter apis" optionFilterProp="label" onChange={onCallerSystemChange} allowClear />
                      </Form.Item>
                      <Form.Item name="callerApiId" label="Caller API" rules={[{ required: true, message: 'API required' }]}>
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
              <Form.Item name="calleeType" label="Callee Type">
                <Select onChange={(v)=>{ form.setFieldsValue({ calleeSystemId: undefined, calleeApiId: undefined, endpointId: undefined }); if(v==='SYSTEM'){} }}>
                  <Option value="SYSTEM">SYSTEM</Option>
                  <Option value="API">API</Option>
                </Select>
              </Form.Item>

              <Form.Item shouldUpdate={(prev, cur)=>prev.calleeType!==cur.calleeType} noStyle>
                {()=> (
                  form.getFieldValue('calleeType') === 'SYSTEM' ? (
                    <Form.Item name="calleeSystemId" label="Callee System" rules={[{ required: true, message: 'System required' }]}>
                      <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="Select System" optionFilterProp="label" />
                    </Form.Item>
                  ) : (
                    <>
                      <Form.Item name="calleeSystemId" label="Callee System (filter)" >
                        <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="(optional) filter apis" optionFilterProp="label" onChange={onCalleeSystemChange} allowClear />
                      </Form.Item>
                      <Form.Item name="calleeApiId" label="Callee API" rules={[{ required: true, message: 'API required' }]}>
                        <Select showSearch placeholder="Select API" optionFilterProp="label" onChange={onCalleeApiChange}>
                          {(calleeApis||[]).map(a=> <Option key={a.id} value={a.id} label={a.name}>{a.name}</Option>)}
                        </Select>
                      </Form.Item>
                      <Form.Item name="endpointId" label="Endpoint" rules={[{ required: true, message: 'Endpoint required' }]}>
                        <Select showSearch placeholder="Select endpoint" optionFilterProp="label">
                          {(calleeEndpoints||[]).map(ep=> <Option key={ep.id} value={ep.id} label={`${ep.httpMethod} ${ep.path}`}>{`${ep.httpMethod} ${ep.path}`}</Option>)}
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
              <Form.Item name="authType" label="Auth Type">
                <Select allowClear>
                  <Option value="API_KEY">API_KEY</Option>
                  <Option value="OAUTH2">OAUTH2</Option>
                  <Option value="BASIC_AUTH">BASIC_AUTH</Option>
                  <Option value="JWT">JWT</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="authConfig" label="Auth Config (JSON)">
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

            <Descriptions.Item label="Caller Type">{detail.callerType}</Descriptions.Item>
            {detail.callerType === 'SYSTEM' ? (
              <Descriptions.Item label="Caller System">{detail.callerSystem?.name || detail.callerId}</Descriptions.Item>
            ) : (
              <>
                <Descriptions.Item label="Caller System">{detail.callerApi?.systemName || detail.callerApi?.systemId || '-'}</Descriptions.Item>
                <Descriptions.Item label="Caller API">{detail.callerApi?.name || detail.callerId}</Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Callee Type">{detail.calleeType}</Descriptions.Item>
            {detail.calleeType === 'SYSTEM' ? (
              <Descriptions.Item label="Callee System">{detail.calleeSystem?.name || detail.calleeId}</Descriptions.Item>
            ) : (
              <>
                <Descriptions.Item label="Callee System">{detail.calleeApi?.systemName || detail.calleeApi?.systemId || '-'}</Descriptions.Item>
                <Descriptions.Item label="Callee API">{detail.calleeApi?.name || detail.calleeId}</Descriptions.Item>
                <Descriptions.Item label="Endpoint">{detail.endpoint ? `${detail.endpoint.httpMethod} ${detail.endpoint.path}` : (detail.endpointPath ? `${detail.endpointMethod || ''} ${detail.endpointPath}` : (detail.endpointId || '-'))}</Descriptions.Item>
              </>
            )}

            <Descriptions.Item label="Auth Type">{detail.authType || '-'}</Descriptions.Item>
            <Descriptions.Item label="Auth Config">{detail.authConfig ? (<pre style={{ margin:0 }}>{JSON.stringify(detail.authConfig, null, 2)}</pre>) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
