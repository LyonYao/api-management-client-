import React, { useEffect, useState } from 'react'
import { Table, Modal, Form, Input, Space, Popconfirm, Descriptions, message, Select, Tag, Row, Col } from 'antd'
import Button from '../components/Button'
import API, { getErrorMessage } from '../api'
import { cacheApis } from '../utils/cache'

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

  async function load() {
    setLoading(true);
    try {
      const res = await API.get('/api/v1/apis');
      const apisData = res.data || [];
      setApis(apisData);
      cacheApis(apisData);
    } catch (err) {
      console.error(err);
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
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
        system_id: values.system_id,
        name: values.name.trim(),
        description: values.description,
        api_type: values.api_type || 'S',
        auth_type: values.auth_type || 'NONE',
        spec_link: values.spec_link,
        department: values.department,
        contact_name: values.contact_name,
        contact_emails: (values.contact_emails || []).slice(0,10),
        tags: (values.tags || []),
        dev_host: values.dev_host,
        uat_host: values.uat_host,
        prod_host: values.prod_host,
        health_check_path: values.health_check_path,
        health_check_rule: values.health_check_rule
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
      system_id: record.system_id,
      name: record.name,
      description: record.description,
      api_type: record.api_type || 'S',
      auth_type: record.auth_type || 'NONE',
      spec_link: record.spec_link,
      department: record.department,
      contact_name: record.contact_name,
      contact_emails: record.contact_emails || [],
      tags: record.tags || [],
      dev_host: record.dev_host,
      uat_host: record.uat_host,
      prod_host: record.prod_host,
      health_check_path: record.health_check_path,
      health_check_rule: record.health_check_rule
    })
    setEditVisible(true)
  }

  async function onEdit() {
    try {
      const values = await editForm.validateFields()
      const payload = {
        system_id: values.system_id,
        name: values.name.trim(),
        description: values.description,
        api_type: values.api_type,
        auth_type: values.auth_type || 'NONE',
        spec_link: values.spec_link,
        department: values.department,
        contact_name: values.contact_name,
        contact_emails: (values.contact_emails || []).slice(0,10),
        tags: values.tags || [],
        dev_host: values.dev_host,
        uat_host: values.uat_host,
        prod_host: values.prod_host,
        health_check_path: values.health_check_path,
        health_check_rule: values.health_check_rule
      }
      console.log('Updating API with payload:', payload)
      await API.put(`/api/v1/apis/${editing.id}`, payload)
      message.success('Updated')
      setEditVisible(false)
      setEditing(null)
      load()
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    }
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
    { title: 'System', dataIndex: 'system_name', key: 'system_name', width: 180 },
    { title: 'API Type', dataIndex: 'api_type', key: 'api_type', width: 120, render: v => v ? v : '-' },
    { title: 'Department', dataIndex: 'department', key: 'department', ellipsis: true },
    { title: 'Contacts', dataIndex: 'contact_emails', key: 'contact_emails', width: 300, ellipsis: true, render: v => (v||[]).slice(0,3).map((e,i)=> <div key={i} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}><a href={`mailto:${e}`}>{e}</a></div>) },
    { title: 'Tags', dataIndex: 'tags', key: 'tags', width: 200, render: v => (v||[]).map(t=> <span key={t} style={{ marginRight:6, display: 'inline-block' }}><Tag>{t}</Tag></span>) },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 160, render: v => v ? new Date(v).toLocaleString() : '-' },
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
        <Form form={form} layout="vertical" onFinish={onCreate} initialValues={{ auth_type: 'NONE', api_type: 'S' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="system_id" label="System" rules={[{ required: true, message: 'System is required' }]}>
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
              <Form.Item name="api_type" label="API Type">
                <Select>
                  <Option value="P">P</Option>
                  <Option value="S">S</Option>
                  <Option value="E">E</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auth_type" label="Auth Type">
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
              <Form.Item name="contact_emails" label="Contact Emails" help="Up to 10 emails (comma separated)" rules={[{ validator: emailValidator }]}>
                <Select mode="tags" tokenSeparators={[',']} placeholder="a@x.com, b@x.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="spec_link" label="Spec Link">
            <Input.TextArea rows={1} style={{ resize: 'none' }} />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" tokenSeparators={[',']} placeholder="tag1,tag2" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="dev_host" label="Dev Host">
                <Input placeholder="Development environment host" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="uat_host" label="UAT Host">
                <Input placeholder="Testing environment host" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="prod_host" label="Prod Host">
                <Input placeholder="Production environment host" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="health_check_path" label="Health Check Path">
                <Input placeholder="Health check path (e.g., /health)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="health_check_rule" label="Health Check Rule">
                <Input.TextArea rows={2} placeholder="Health check rule (JSON format)" />
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

      <Modal title="Edit API" open={editVisible} onCancel={()=>{ setEditVisible(false); setEditing(null) }} footer={null} width={760}>
        <Form form={editForm} layout="vertical" onFinish={onEdit} initialValues={{ auth_type: 'NONE', api_type: 'S' }}>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="system_id" label="System" rules={[{ required: true, message: 'System is required' }]}>
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
              <Form.Item name="api_type" label="API Type">
                <Select>
                  <Option value="P">P</Option>
                  <Option value="S">S</Option>
                  <Option value="E">E</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="auth_type" label="Auth Type">
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
              <Form.Item name="contact_name" label="Contact Name">
                <Input.TextArea rows={1} style={{ resize: 'none' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="contact_emails" label="Contact Emails" help="Up to 10 emails (comma separated)" rules={[{ validator: emailValidator }]}>
                <Select mode="tags" tokenSeparators={[',']} placeholder="a@x.com, b@x.com" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="spec_link" label="Spec Link">
            <Input.TextArea rows={1} style={{ resize: 'none' }} />
          </Form.Item>

          <Form.Item name="tags" label="Tags">
            <Select mode="tags" tokenSeparators={[',']} placeholder="tag1,tag2" />
          </Form.Item>

          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="dev_host" label="Dev Host">
                <Input placeholder="Development environment host" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="uat_host" label="UAT Host">
                <Input placeholder="Testing environment host" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="prod_host" label="Prod Host">
                <Input placeholder="Production environment host" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="health_check_path" label="Health Check Path">
                <Input placeholder="Health check path (e.g., /health)" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="health_check_rule" label="Health Check Rule">
                <Input.TextArea rows={2} placeholder="Health check rule (JSON format)" />
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

      <Modal title={detail ? detail.name : 'API Detail'} open={detailVisible} onCancel={()=>setDetailVisible(false)} footer={null} width={720}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <code style={{ background:'#f5f7fa', padding:'4px 8px', borderRadius:6 }}>{detail.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="System">{detail.system_name || detail.system_id}</Descriptions.Item>
            <Descriptions.Item label="API Type">{detail.api_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Auth Type">{detail.auth_type || '-'}</Descriptions.Item>
            <Descriptions.Item label="Spec Link">{detail.spec_link ? <a href={detail.spec_link} target="_blank" rel="noreferrer">Spec</a> : '-'}</Descriptions.Item>
            <Descriptions.Item label="Department">{detail.department || '-'}</Descriptions.Item>
            <Descriptions.Item label="Contact Name">{detail.contact_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Contact Emails">{(detail.contact_emails||[]).map(e=> <div key={e}><a href={`mailto:${e}`}>{e}</a></div>)}</Descriptions.Item>
            <Descriptions.Item label="Tags">{(detail.tags||[]).map(t=> <span key={t} style={{ marginRight:6 }}><Tag>{t}</Tag></span>)}</Descriptions.Item>
            <Descriptions.Item label="Dev Host">{detail.dev_host || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="UAT Host">{detail.uat_host || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Prod Host">{detail.prod_host || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Health Check Path">{detail.health_check_path || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Health Check Rule">{detail.health_check_rule ? <pre style={{ margin:0, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{(() => {
              console.log('Health Check Rule type:', typeof detail.health_check_rule);
              console.log('Health Check Rule value:', detail.health_check_rule);
              
              // 确保我们处理所有可能的情况
              if (detail.health_check_rule === null || detail.health_check_rule === undefined) {
                return '-';
              }
              
              if (typeof detail.health_check_rule === 'string') {
                try {
                  // 尝试解析字符串为JSON
                  const parsed = JSON.parse(detail.health_check_rule);
                  return JSON.stringify(parsed, null, 2);
                } catch (e) {
                  // 如果解析失败，直接显示字符串
                  return detail.health_check_rule;
                }
              }
              
              if (typeof detail.health_check_rule === 'object') {
                // 对于对象，直接使用JSON.stringify
                return JSON.stringify(detail.health_check_rule, null, 2);
              }
              
              // 其他类型，直接显示
              return String(detail.health_check_rule);
            })()}</pre> : <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Created">{detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Updated">{detail.updated_at ? new Date(detail.updated_at).toLocaleString() : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}
