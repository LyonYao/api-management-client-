import React, { useEffect, useState } from 'react'
import { Table, Modal, Form, Input, Space, Popconfirm, Descriptions, message } from 'antd'
import API, { getErrorMessage } from '../api'
import Button from '../components/Button'
import { cacheSystems } from '../utils/cache'

export default function Systems(){
  const [systems, setSystems] = useState([])
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
  const [buttonLoading, setButtonLoading] = useState({})

  function setButtonLoadingState(key, loading) {
    setButtonLoading(prev => ({ ...prev, [key]: loading }))
  }

  async function load() {
    setLoading(true);
    try {
      const res = await API.get('/api/v1/systems');
      const systemsData = res.data || [];
      setSystems(systemsData);
      cacheSystems(systemsData);
    } catch (err) {
      console.error(err);
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(()=>{ load() }, [])

  function filtered(){
    const q = (search||'').trim().toLowerCase()
    return systems.filter(s => !q || (s.name||'').toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q))
  }

  const paged = () => {
    const list = filtered()
    const start = (page-1)*pageSize
    return { items: list.slice(start, start+pageSize), total: list.length }
  }

  async function onCreate(values){
    try{
      await API.post('/api/v1/systems', { name: values.name.trim(), system_code: values.system_code, description: values.description })
      message.success('System created')
      setCreateVisible(false)
      form.resetFields()
      load()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  function openEdit(record){
    setDetailVisible(false)
    setEditing(record)
    editForm.setFieldsValue({ name: record.name, system_code: record.system_code, description: record.description })
    setEditVisible(true)
  }

  async function onEdit(){
    try{
      const values = await editForm.validateFields()
      await API.put(`/api/v1/systems/${editing.id}`, { name: values.name.trim(), system_code: values.system_code, description: values.description })
      message.success('Updated')
      setEditVisible(false)
      setEditing(null)
      load()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function onDelete(id){
    try{
      await API.delete(`/api/v1/systems/${id}`)
      message.success('Deleted')
      load()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  async function showDetail(record){
    try{
      const res = await API.get(`/api/v1/systems/${record.id}`)
      setDetail(res.data)
      setDetailVisible(true)
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }



  const { items, total } = paged()

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: '25%' },
    { title: 'System Code', dataIndex: 'system_code', key: 'system_code', width: '15%' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 160, render: v => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Actions', key: 'actions', width: 320,
      onCell: () => ({ className: 'col-actions' }),
      onHeaderCell: () => ({ className: 'col-actions' }),
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={()=>showDetail(record)}>Details</Button>
          <Button type="primary" size="small" onClick={()=>openEdit(record)}>Edit</Button>
          <Popconfirm title="Delete this system?" onConfirm={()=>onDelete(record.id)}>
            <Button danger size="small">Delete</Button>
          </Popconfirm>
        </Space>
      ) }
  ]

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
        <h3>系统管理</h3>
        <Space>
          <Input.Search placeholder="Search name or description" onSearch={v=>{ setSearch(v); setPage(1) }} allowClear style={{ width:320 }} />
          <Button type="primary" onClick={()=>setCreateVisible(true)}>New System</Button>
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

      <Modal title="Create System" open={createVisible} onCancel={()=>setCreateVisible(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={onCreate}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="system_code" label="System Code" rules={[{ required: true, message: 'System Code is required' }, { min: 5, message: 'System Code must be at least 5 characters' }, { max: 12, message: 'System Code must be at most 12 characters' }]}>
            <Input placeholder="5-12 character system code" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Create</Button>
              <Button onClick={()=>setCreateVisible(false)}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="Edit System" open={editVisible} onCancel={()=>{ setEditVisible(false); setEditing(null) }} footer={null}>
        <Form form={editForm} layout="vertical" onFinish={onEdit}>
          <Form.Item name="name" label="Name" rules={[{ required: true, message: 'Name is required' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="system_code" label="System Code" rules={[{ required: true, message: 'System Code is required' }, { min: 5, message: 'System Code must be at least 5 characters' }, { max: 12, message: 'System Code must be at most 12 characters' }]}>
            <Input placeholder="5-12 character system code" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">Save</Button>
              <Button onClick={()=>{ setEditVisible(false); setEditing(null) }}>Cancel</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title={detail ? detail.name : 'System Detail'} open={detailVisible} onCancel={()=>setDetailVisible(false)} footer={null}>
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <code style={{ background:'#f5f7fa', padding:'4px 8px', borderRadius:6 }}>{detail.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="System Code">{detail.system_code || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Created">{detail.created_at ? new Date(detail.created_at).toLocaleString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Updated">{detail.updated_at ? new Date(detail.updated_at).toLocaleString() : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

