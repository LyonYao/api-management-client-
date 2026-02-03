import React, { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Space, Popconfirm, Descriptions, message, Select, Row, Col, Tooltip } from 'antd'
import API, { getErrorMessage } from '../api'

const { Option } = Select

export default function Endpoints(){
  const [endpoints, setEndpoints] = useState([])
  const [loading, setLoading] = useState(false)

  const [systems, setSystems] = useState([])
  const [apis, setApis] = useState([])
  const [apiCache, setApiCache] = useState({})
  const [createApis, setCreateApis] = useState([])
  const [editApis, setEditApis] = useState([])

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  const [createVisible, setCreateVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)

  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  async function loadEndpoints(){
    setLoading(true)
    try{
      const res = await API.get('/api/v1/endpoints')
      setEndpoints(res.data || [])
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
    finally{ setLoading(false) }
  }

  async function loadSystems(){
    try{
      const res = await API.get('/api/v1/systems')
      setSystems(res.data || [])
    }catch(err){ console.error(err) }
  }

  async function loadApis(){
    try{
      const res = await API.get('/api/v1/apis')
      setApis(res.data || [])
    }catch(err){ console.error(err) }
  }

  useEffect(()=>{ loadEndpoints() }, [])

  async function openCreate(){
    await loadSystems()
    setCreateVisible(true)
  }

  function mapApi(id){
    return apiCache[id] || apis.find(a=>a.id===id) || null
  }

  function filtered(){
    const q = (search||'').trim().toLowerCase()
    return endpoints.filter(e => {
      const api = mapApi(e.apiId)
      const systemName = api ? (api.systemName || '') : ''
      const apiName = api ? (api.name || '') : ''
      return !q || (e.path||'').toLowerCase().includes(q) || (apiName||'').toLowerCase().includes(q) || (systemName||'').toLowerCase().includes(q)
    })
  }

  const paged = ()=>{ const list = filtered(); const start=(page-1)*pageSize; return { items: list.slice(start, start+pageSize), total: list.length } }

  async function onCreate(values){
    try{
      const payload = {
        apiId: values.apiId,
        path: values.path.trim(),
        httpMethod: values.httpMethod,
        description: values.description
      }
      await API.post('/api/v1/endpoints', payload)
      message.success('Endpoint created')
      setCreateVisible(false)
      form.resetFields()
      loadEndpoints()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onSystemChangeForCreate(systemId){
    if(!systemId){ setCreateApis([]); form.setFieldsValue({ apiId: undefined }); return }
    try{
      const res = await API.get('/api/v1/apis/search', { params: { systemId } })
      const list = res.data || []
      setCreateApis(list)
      if(list.length) form.setFieldsValue({ apiId: list[0].id })
      else form.setFieldsValue({ apiId: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onSystemChangeForEdit(systemId){
    if(!systemId){ setEditApis([]); editForm.setFieldsValue({ apiId: undefined }); return }
    try{
      const res = await API.get('/api/v1/apis/search', { params: { systemId } })
      const list = res.data || []
      setEditApis(list)
      if(list.length) editForm.setFieldsValue({ apiId: list[0].id })
      else editForm.setFieldsValue({ apiId: undefined })
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function openEdit(record){
    setDetailVisible(false)
    setEditing(record)
    await loadSystems()
    // try to derive systemId from cached apis first, otherwise fetch single api
    let api = mapApi(record.apiId)
    if(!api){
      try{ api = await API.getApiById(record.apiId) }catch(e){ api = null }
    }
    const systemId = api?.systemId
    if(systemId){
      // populate editApis for that system and then set fields
      await onSystemChangeForEdit(systemId)
    }
    editForm.setFieldsValue({ systemId: systemId, apiId: record.apiId, path: record.path, httpMethod: record.httpMethod, description: record.description })
    setEditVisible(true)
  }

  async function onEdit(){
    try{
      const values = await editForm.validateFields()
      const payload = { path: values.path.trim(), httpMethod: values.httpMethod, description: values.description }
      await API.put(`/api/v1/endpoints/${editing.id}`, payload)
      message.success('Updated')
      setEditVisible(false)
      setEditing(null)
      loadEndpoints()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onDelete(id){
    try{
      await API.delete(`/api/v1/endpoints/${id}`)
      message.success('Deleted')
      loadEndpoints()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function showDetail(record){
    try{
      const res = await API.get(`/api/v1/endpoints/${record.id}`)
      const endpoint = res.data || {}
      // lazy-load API and system names for display
      let api = null
      try{ api = await API.getApiById(endpoint.apiId) }catch(e){ api = null }
      let system = null
      try{ system = await API.getSystemById(api?.systemId || endpoint.systemId) }catch(e){ system = null }
      setDetail({ ...endpoint, apiName: api?.name, apiSystemName: api?.systemName || system?.name, apiSystemId: api?.systemId || system?.id })
      setDetailVisible(true)
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  function copyId(id){ navigator.clipboard.writeText(id).then(()=>message.success('ID copied')) }

  const { items, total } = paged()

  // ensure we have API names for visible items (only fetch missing ones)
  useEffect(()=>{
    const visibleApiIds = Array.from(new Set((items||[]).map(i=>i.apiId).filter(Boolean)))
    const missing = visibleApiIds.filter(id => !apiCache[id])
    if(missing.length===0) return
    let mounted = true
    Promise.all(missing.map(id => API.getApiById(id).catch(()=>null))).then(results=>{
      if(!mounted) return
      const copy = { ...apiCache }
      results.forEach(r=>{ if(r && r.id) copy[r.id] = r })
      setApiCache(copy)
    })
    return ()=>{ mounted = false }
  }, [items])

  // createApis / editApis are populated when user selects a System (via API call)

  const columns = [
    { title: 'System', dataIndex: 'apiId', key: 'system', render: v => (mapApi(v)?.systemName || mapApi(v)?.systemId || '-') , width: 200 },
    { title: 'API', dataIndex: 'apiId', key: 'apiId', render: v => (mapApi(v)?.name || v), width: 240 },
    { title: 'Method', dataIndex: 'httpMethod', key: 'httpMethod', width: 100 },
    { title: 'Endpoint', dataIndex: 'path', key: 'path', width: 320, render: v => v },
    { title: 'Description', dataIndex: 'description', key: 'description', width: 360, render: v => (
      v ? (
        <Tooltip title={v} mouseLeaveDelay={0}>
          <div style={{ maxWidth: 320, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</div>
        </Tooltip>
      ) : <span style={{ color:'#9ca3af' }}>-</span>
    ) },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: v => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Actions', key: 'actions', width: 320, onCell: ()=>({ className:'col-actions' }), onHeaderCell: ()=>({ className:'col-actions' }), render: (_, record)=>(
        <Space>
          <Button type="primary" size="small" onClick={()=>copyId(record.id)}>Copy</Button>
          <Button type="primary" size="small" onClick={()=>showDetail(record)}>Details</Button>
          <Button type="primary" size="small" onClick={()=>openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this endpoint?" onConfirm={()=>onDelete(record.id)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
    )}
  ]

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h3>Endpoint 管理</h3>
          <Space>
          <Input.Search placeholder="Search path, api or system" onSearch={v=>{ setSearch(v); setPage(1) }} allowClear style={{ width:420 }} />
          <Button type="primary" onClick={openCreate}>New Endpoint</Button>
        </Space>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <Table size="middle" columns={columns} dataSource={items} rowKey="id" loading={loading} pagination={false} scroll={{ x: 1100 }} />
        </div>

        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:12 }}>
          <div>Showing {items.length} of {total}</div>
          <Space>
            <Button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Prev</Button>
            <div>{page} / {Math.max(1, Math.ceil(total / pageSize))}</div>
            <Button disabled={page>=Math.ceil(total / pageSize)} onClick={()=>setPage(p=>Math.min(Math.ceil(total / pageSize), p+1))}>Next</Button>
          </Space>
        </div>
      </div>

      <Modal title="Create Endpoint" open={createVisible} onCancel={()=>setCreateVisible(false)} footer={null} width={760}>
        <Form form={form} layout="vertical" onFinish={onCreate} initialValues={{ httpMethod: 'GET' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="systemId" label="System" >
                <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="(optional) filter apis by system" optionFilterProp="label" onChange={onSystemChangeForCreate} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="apiId" label="API" rules={[{ required: true, message: 'API is required' }]}>
                <Select showSearch placeholder="Select API" optionFilterProp="label" filterOption={(input, option)=>option.label.toLowerCase().includes(input.toLowerCase())}>
                  {(createApis||[]).map(a=> <Option key={a.id} value={a.id} label={a.name}>{a.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="path" label="Path" rules={[{ required: true, message: 'Path is required' }]}>
                <Input placeholder="/api/v1/..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="httpMethod" label="HTTP Method" rules={[{ required: true, message: 'Method is required' }]}>
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                  <Option value="PATCH">PATCH</Option>
                  <Option value="HEAD">HEAD</Option>
                  <Option value="OPTIONS">OPTIONS</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Create</Button>
              <Button onClick={()=>setCreateVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Edit Endpoint" open={editVisible} onCancel={()=>{ setEditVisible(false); setEditing(null) }} footer={null} width={760}>
        <Form form={editForm} layout="vertical" onFinish={onEdit} initialValues={{ httpMethod: 'GET' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="systemId" label="System" >
                <Select showSearch options={(systems||[]).map(s=>({ label: s.name, value: s.id }))} placeholder="(optional) filter apis by system" optionFilterProp="label" onChange={onSystemChangeForEdit} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="apiId" label="API" rules={[{ required: true, message: 'API is required' }]}>
                <Select showSearch placeholder="Select API" optionFilterProp="label" filterOption={(input, option)=>option.label.toLowerCase().includes(input.toLowerCase())}>
                  {(editApis||[]).map(a=> <Option key={a.id} value={a.id} label={a.name}>{a.name}</Option>)}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="path" label="Path" rules={[{ required: true, message: 'Path is required' }]}>
                <Input placeholder="/api/v1/..." />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="httpMethod" label="HTTP Method" rules={[{ required: true, message: 'Method is required' }]}>
                <Select>
                  <Option value="GET">GET</Option>
                  <Option value="POST">POST</Option>
                  <Option value="PUT">PUT</Option>
                  <Option value="DELETE">DELETE</Option>
                  <Option value="PATCH">PATCH</Option>
                  <Option value="HEAD">HEAD</Option>
                  <Option value="OPTIONS">OPTIONS</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description">
            <Input.TextArea rows={4} />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Save</Button>
              <Button onClick={()=>{ setEditVisible(false); setEditing(null) }}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={detail ? `Endpoint: ${detail.path}` : 'Endpoint Detail'} open={detailVisible} onCancel={()=>setDetailVisible(false)} footer={null} width={720}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <Space>
                <code style={{ background:'#f5f7fa', padding:'4px 8px', borderRadius:6 }}>{detail.id}</code>
                <Button type="link" onClick={()=>copyId(detail.id)}>Copy</Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Path">{detail.path}</Descriptions.Item>
            <Descriptions.Item label="HTTP Method">{detail.httpMethod}</Descriptions.Item>
            <Descriptions.Item label="API">{detail.apiName || mapApi(detail.apiId)?.name || detail.apiId}</Descriptions.Item>
            <Descriptions.Item label="System">{detail.apiSystemName || mapApi(detail.apiId)?.systemName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Created">{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Updated">{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
