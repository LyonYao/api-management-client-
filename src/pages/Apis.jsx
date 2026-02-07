import React, { useEffect, useState } from 'react'
import { Table, Modal, Form, Input, Space, Popconfirm, Descriptions, message, Select, Tag, Row, Col } from 'antd'
import Button from '../components/Button'
import API, { getErrorMessage } from '../api'

const { Option } = Select

export default function Apis(){
  const [apis, setApis] = useState([])
  const [loading, setLoading] = useState(false)

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(10)

  // modals
  const [createVisible, setCreateVisible] = useState(false)
  const [editVisible, setEditVisible] = useState(false)
  const [detailVisible, setDetailVisible] = useState(false)

  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)

  const [form] = Form.useForm()
  const [editForm] = Form.useForm()
  const [systems, setSystems] = useState([])

  async function loadSystems(){
    try{
      const res = await API.get('/api/v1/systems')
      setSystems((res.data||[]).map(s=>({ label: s.name, value: s.id })))
    }catch(err){ console.error(err) }
  }

  async function load(){
    setLoading(true)
    try{
      const res = await API.get('/api/v1/apis')
      setApis(res.data || [])
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ load() }, [])
  useEffect(()=>{ loadSystems() }, [])

  function filtered(){
    const q = (search||'').trim().toLowerCase()
    return apis.filter(a => !q || (a.name||'').toLowerCase().includes(q) || (a.description||'').toLowerCase().includes(q) || (a.systemName||'').toLowerCase().includes(q))
  }

  const paged = () => {
    const list = filtered()
    const start = (page-1)*pageSize
    return { items: list.slice(start, start+pageSize), total: list.length }
  }

  const emailValidator = (_, value) => {
    const arr = value || []
    if (!arr.length) return Promise.reject(new Error('At least one contact email is required'))
    if (arr.length > 10) return Promise.reject(new Error('Maximum 10 contact emails allowed'))
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    for (const e of arr) if (!re.test(e)) return Promise.reject(new Error(`Invalid email: ${e}`))
    return Promise.resolve()
  }

  async function onCreate(values){
    try{
      const payload = {
        systemId: values.systemId,
        name: values.name.trim(),
        description: values.description,
        apiType: values.apiType || 'S',
        authType: values.authType || 'NONE',
        specLink: values.specLink,
        department: values.department,
        contactName: values.contactName,
        contactEmails: (values.contactEmails || []).slice(0,10),
        tags: (values.tags || [])
      }
      await API.post('/api/v1/apis', payload)
      message.success('API created')
      setCreateVisible(false)
      form.resetFields()
      load()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  function openEdit(record){
    setDetailVisible(false)
    setEditing(record)
    editForm.setFieldsValue({
      systemId: record.systemId,
      name: record.name,
      description: record.description,
      apiType: record.apiType || 'S',
      authType: record.authType || 'NONE',
      specLink: record.specLink,
      department: record.department,
      contactName: record.contactName,
      contactEmails: record.contactEmails || [],
      tags: record.tags || []
    })
    setEditVisible(true)
  }

  async function onEdit(){
    try{
      const values = await editForm.validateFields()
      const payload = {
        name: values.name.trim(),
        description: values.description,
        apiType: values.apiType,
        authType: values.authType || 'NONE',
        specLink: values.specLink,
        department: values.department,
        contactName: values.contactName,
        contactEmails: (values.contactEmails || []).slice(0,10),
        tags: values.tags || []
      }
      await API.put(`/api/v1/apis/${editing.id}`, payload)
      message.success('Updated')
      setEditVisible(false)
      setEditing(null)
      load()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onDelete(id){
    try{
      await API.delete(`/api/v1/apis/${id}`)
      message.success('Deleted')
      load()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function showDetail(record){
    try{
      const res = await API.get(`/api/v1/apis/${record.id}`)
      setDetail(res.data)
      setDetailVisible(true)
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }



  const { items, total } = paged()

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: 240 },
    { title: 'System', dataIndex: 'systemName', key: 'systemName', width: 180 },
    { title: 'API Type', dataIndex: 'apiType', key: 'apiType', width: 120, render: v => v ? v : '-' },
    { title: 'Department', dataIndex: 'department', key: 'department', ellipsis: true },
    { title: 'Contacts', dataIndex: 'contactEmails', key: 'contactEmails', width: 300, ellipsis: true, render: v => (v||[]).slice(0,3).map((e,i)=> <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><a href={`mailto:${e}`}>{e}</a></div>) },
    { title: 'Tags', dataIndex: 'tags', key: 'tags', width: 200, render: v => (v||[]).map(t=> <span key={t} style={{ marginRight:6, display: 'inline-block' }}><Tag>{t}</Tag></span>) },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: v => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Actions', key: 'actions', width: 360,
      onCell: () => ({ className: 'col-actions' }),
      onHeaderCell: () => ({ className: 'col-actions' }),
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={()=>showDetail(record)}>Details</Button>
          <Button type="primary" size="small" onClick={()=>openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this API?" onConfirm={()=>onDelete(record.id)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      ) }
  ]

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h3>API 管理</h3>
        <Space>
          <Input.Search placeholder="Search name, system or description" onSearch={v=>{ setSearch(v); setPage(1) }} allowClear style={{ width:420 }} />
          <Button type="primary" onClick={()=>setCreateVisible(true)}>New API</Button>
        </Space>
      </div>

      <div className="card">
        <div style={{ overflowX: 'auto' }}>
          <Table
            size="middle"
            columns={columns}
            dataSource={items}
            rowKey="id"
            loading={loading}
            pagination={false}
            scroll={{ x: 1100 }}
          />
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

      <Modal title="Create API" open={createVisible} onCancel={()=>setCreateVisible(false)} footer={null} width={760}>
        <Form form={form} layout="vertical" onFinish={onCreate} initialValues={{ authType: 'NONE', apiType: 'S' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="systemId" label="System" rules={[{ required: true, message: 'System is required' }]}>
                <Select showSearch options={systems} placeholder="Search system by name" optionFilterProp="label" filterOption={(input, option)=>option.label.toLowerCase().includes(input.toLowerCase())} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="apiType" label="API Type">
                <Select>
                  <Option value="P">P</Option>
                  <Option value="S">S</Option>
                  <Option value="E">E</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="authType" label="Auth Type">
                <Select>
                  <Option value="NONE">NONE</Option>
                  <Option value="API_KEY">API_KEY</Option>
                  <Option value="OAUTH2">OAUTH2</Option>
                  <Option value="BASIC_AUTH">BASIC_AUTH</Option>
                  <Option value="JWT">JWT</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Input.TextArea rows={1} style={{ resize: 'none' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactEmails" label="Contact Emails" help="Up to 10 emails (comma separated)" rules={[{ validator: emailValidator }]}>
                <Select mode="tags" tokenSeparators={[',']} placeholder="a@x.com, b@x.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="specLink" label="Spec Link">
            <Input.TextArea rows={1} style={{ resize: 'none' }} />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" tokenSeparators={[',']} placeholder="tag1,tag2" />
          </Form.Item>

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

      <Modal title="Edit API" open={editVisible} onCancel={()=>{ setEditVisible(false); setEditing(null) }} footer={null} width={760}>
        <Form form={editForm} layout="vertical" onFinish={onEdit} initialValues={{ authType: 'NONE', apiType: 'S' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="systemId" label="System" rules={[{ required: true, message: 'System is required' }]}>
                <Select showSearch options={systems} placeholder="Search system by name" optionFilterProp="label" filterOption={(input, option)=>option.label.toLowerCase().includes(input.toLowerCase())} allowClear />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="apiType" label="API Type">
                <Select>
                  <Option value="P">P</Option>
                  <Option value="S">S</Option>
                  <Option value="E">E</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="authType" label="Auth Type">
                <Select>
                  <Option value="NONE">NONE</Option>
                  <Option value="API_KEY">API_KEY</Option>
                  <Option value="OAUTH2">OAUTH2</Option>
                  <Option value="BASIC_AUTH">BASIC_AUTH</Option>
                  <Option value="JWT">JWT</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="department" label="Department">
                <Input.TextArea rows={1} style={{ resize: 'none' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="contactName" label="Contact Name">
                <Input.TextArea rows={1} style={{ resize: 'none' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="contactEmails" label="Contact Emails" help="Up to 10 emails (comma separated)" rules={[{ validator: emailValidator }]}>
                <Select mode="tags" tokenSeparators={[',']} placeholder="a@x.com, b@x.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="specLink" label="Spec Link">
            <Input.TextArea rows={1} style={{ resize: 'none' }} />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" tokenSeparators={[',']} placeholder="tag1,tag2" />
          </Form.Item>

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

      <Modal title={detail ? detail.name : 'API Detail'} open={detailVisible} onCancel={()=>setDetailVisible(false)} footer={null} width={720}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <code style={{ background:'#f5f7fa', padding:'4px 8px', borderRadius:6 }}>{detail.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="System">{detail.systemName || detail.systemId}</Descriptions.Item>
            <Descriptions.Item label="API Type">{detail.apiType || '-'}</Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Auth Type">{detail.authType || '-'}</Descriptions.Item>
            <Descriptions.Item label="Spec Link">{detail.specLink ? <a href={detail.specLink} target="_blank" rel="noreferrer">Spec</a> : '-'}</Descriptions.Item>
            <Descriptions.Item label="Department">{detail.department || '-'}</Descriptions.Item>
            <Descriptions.Item label="Contact Name">{detail.contactName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Contact Emails">{(detail.contactEmails||[]).map(e=> <div key={e}><a href={`mailto:${e}`}>{e}</a></div>)}</Descriptions.Item>
            <Descriptions.Item label="Tags">{(detail.tags||[]).map(t=> <span key={t} style={{ marginRight:6 }}><Tag>{t}</Tag></span>)}</Descriptions.Item>
            <Descriptions.Item label="Created">{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Updated">{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
