import React, { useEffect, useState } from 'react'
import { Table, Button, Modal, Form, Input, Space, Popconfirm, Descriptions, message } from 'antd'
import API, { getErrorMessage } from '../api'

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

  async function load(){
    setLoading(true)
    try{
      const res = await API.get('/api/v1/systems')
      setSystems(res.data || [])
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
    finally{ setLoading(false) }
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
      await API.post('/api/v1/systems', { name: values.name.trim(), description: values.description })
      message.success('System created')
      setCreateVisible(false)
      form.resetFields()
      load()
    }catch(err){ console.error(err); message.error(getErrorMessage(err)) }
  }

  function openEdit(record){
    setDetailVisible(false)
    setEditing(record)
    editForm.setFieldsValue({ name: record.name, description: record.description })
    setEditVisible(true)
  }

  async function onEdit(){
    try{
      const values = await editForm.validateFields()
      await API.put(`/api/v1/systems/${editing.id}`, { name: values.name.trim(), description: values.description })
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

  function copyId(id){ navigator.clipboard.writeText(id).then(()=>message.success('ID copied')) }

  const { items, total } = paged()

  const columns = [
    { title: 'Name', dataIndex: 'name', key: 'name', width: '30%' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Created', dataIndex: 'createdAt', key: 'createdAt', width: 160, render: v => v ? new Date(v).toLocaleString() : '-' },
    { title: 'Actions', key: 'actions', width: 320,
      onCell: () => ({ className: 'col-actions' }),
      onHeaderCell: () => ({ className: 'col-actions' }),
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" onClick={()=>copyId(record.id)}>Copy</Button>
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
            scroll={{ x: 900 }}
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
              <Space>
                <code style={{ background:'#f5f7fa', padding:'4px 8px', borderRadius:6 }}>{detail.id}</code>
                <Button type="link" onClick={()=>copyId(detail.id)}>Copy</Button>
              </Space>
            </Descriptions.Item>
            <Descriptions.Item label="Name">{detail.name}</Descriptions.Item>
            <Descriptions.Item label="Description">{detail.description || <span style={{ color:'#9ca3af' }}>-</span>}</Descriptions.Item>
            <Descriptions.Item label="Created">{detail.createdAt ? new Date(detail.createdAt).toLocaleString() : '-'}</Descriptions.Item>
            <Descriptions.Item label="Updated">{detail.updatedAt ? new Date(detail.updatedAt).toLocaleString() : '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  )
}

