import React, { useState, useEffect } from 'react'
import { Card, Table, Tag, Button, Space, Modal, Descriptions, message, Select, Input, DatePicker } from 'antd'
import API, { getErrorMessage } from '../api'
import { AuditOutlined, EyeOutlined, ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

const { Option } = Select
const { RangePicker } = DatePicker

const operationTypeMap = {
  CREATE: { color: 'green', text: 'Create' },
  UPDATE: { color: 'blue', text: 'Update' },
  DELETE: { color: 'red', text: 'Delete' }
}

const resourceTypeMap = {
  API: 'API',
  SYSTEM: 'System',
  ENDPOINT: 'Endpoint',
  RELATIONSHIP: 'Relationship',
  USER: 'User'
}

export default function AuditLog() {
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [filters, setFilters] = useState({
    operationType: '',
    resourceType: '',
    username: '',
    dateRange: null
  })

  // 获取审计日志列表
  async function loadAuditLogs() {
    setLoading(true)
    try {
      // 构建查询参数
      const params = {
        page: 1,
        page_size: 10
      }
      if (filters.operationType) params.operation_type = filters.operationType
      if (filters.resourceType) params.resource_type = filters.resourceType
      if (filters.username) params.username = filters.username
      if (filters.dateRange && filters.dateRange[0]) {
        try {
          // 确保使用正确的 ISO 格式，并且处理时区问题
          // 对于开始日期，使用东八区的 00:00:00
          params.start_time = dayjs(filters.dateRange[0]).startOf('day').toISOString()
          // 对于结束日期，使用东八区的 23:59:59
          params.end_time = filters.dateRange[1] ? dayjs(filters.dateRange[1]).endOf('day').toISOString() : dayjs().endOf('day').toISOString()
        } catch (error) {
          console.error('Error processing date range:', error)
          // 如果日期处理出错，不设置日期参数，避免整个请求失败
        }
      }

      const res = await API.get('/api/v1/audit', { params })
      if (res.data && res.data.items) {
        setAuditLogs(res.data.items)
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  // 获取单个审计日志详情
  async function loadAuditLogDetail(auditId) {
    setDetailLoading(true)
    try {
      const res = await API.get(`/api/v1/audit/${auditId}`)
      if (res.data) {
        setSelectedLog(res.data)
        setDetailModalVisible(true)
      }
    } catch (err) {
      console.error('Failed to load audit log detail:', err)
      message.error(getErrorMessage(err))
    } finally {
      setDetailLoading(false)
    }
  }

  // 处理筛选条件变化
  function handleFilterChange(key, value) {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  // 应用筛选
  function applyFilters() {
    loadAuditLogs()
  }

  // 重置筛选
  function resetFilters() {
    setFilters({
      operationType: '',
      resourceType: '',
      username: '',
      dateRange: null
    })
    loadAuditLogs()
  }

  // 表格列定义
  const columns = [
    {
      title: 'Operation',
      dataIndex: 'operation_type',
      key: 'operation_type',
      render: (operation_type) => {
        const typeInfo = operationTypeMap[operation_type]
        return (
          <Tag color={typeInfo.color}>
            {typeInfo.text}
          </Tag>
        )
      }
    },
    {
      title: 'Resource Type',
      dataIndex: 'resource_type',
      key: 'resource_type',
      render: (resource_type) => resourceTypeMap[resource_type] || resource_type
    },
    {
      title: 'Resource ID',
      dataIndex: 'resource_id',
      key: 'resource_id',
      ellipsis: true
    },
    {
      title: 'User',
      dataIndex: 'username',
      key: 'username',
      render: (username) => username || 'System'
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip_address',
      render: (ip_address) => ip_address || '-'
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (description) => description || '-'
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (created_at) => created_at ? dayjs(created_at).format('YYYY-MM-DD HH:mm:ss') : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => loadAuditLogDetail(record.id)}
          >
            View
          </Button>
        </Space>
      )
    }
  ]

  useEffect(() => {
    loadAuditLogs()
  }, [])

  return (
    <div>
      <div className="page-header">
        <h3>
          <AuditOutlined /> Audit Logs
        </h3>
        <div>
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={loadAuditLogs}
              loading={loading}
            >
              Refresh
            </Button>
          </Space>
        </div>
      </div>

      <Card className="card" style={{ marginBottom: 24 }}>
        <h4 style={{ marginBottom: 16 }}>Filters</h4>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            placeholder="Operation Type"
            style={{ width: 150 }}
            value={filters.operationType}
            onChange={(value) => handleFilterChange('operationType', value)}
          >
            <Option value="">All</Option>
            <Option value="CREATE">Create</Option>
            <Option value="UPDATE">Update</Option>
            <Option value="DELETE">Delete</Option>
          </Select>
          
          <Select
            placeholder="Resource Type"
            style={{ width: 150 }}
            value={filters.resourceType}
            onChange={(value) => handleFilterChange('resourceType', value)}
          >
            <Option value="">All</Option>
            <Option value="API">API</Option>
            <Option value="SYSTEM">System</Option>
            <Option value="ENDPOINT">Endpoint</Option>
            <Option value="RELATIONSHIP">Relationship</Option>
            <Option value="USER">User</Option>
          </Select>
          
          <Input
            placeholder="Username"
            style={{ width: 150 }}
            value={filters.username}
            onChange={(e) => handleFilterChange('username', e.target.value)}
          />
          
          <RangePicker
            style={{ width: 300 }}
            value={filters.dateRange}
            onChange={(dates) => handleFilterChange('dateRange', dates)}
            placeholder={['Start Date', 'End Date']}
            valueFormat='YYYY-MM-DD'
            format='YYYY-MM-DD'
          />
          
          <Space>
            <Button type="primary" onClick={applyFilters}>Apply</Button>
            <Button onClick={resetFilters}>Reset</Button>
          </Space>
        </Space>
      </Card>

      <Card className="card">
        <Table
          columns={columns}
          dataSource={auditLogs}
          loading={loading}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true
          }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title="Audit Log Detail"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false)
          setSelectedLog(null)
        }}
        footer={[
          <Button key="close" onClick={() => {
            setDetailModalVisible(false)
            setSelectedLog(null)
          }}>
            Close
          </Button>
        ]}
        width={800}
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>Loading...</div>
        ) : selectedLog ? (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Operation">
                {selectedLog.operation_type ? (
                  <Tag color={operationTypeMap[selectedLog.operation_type].color}>
                    {operationTypeMap[selectedLog.operation_type].text}
                  </Tag>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Resource Type">
                {resourceTypeMap[selectedLog.resource_type] || selectedLog.resource_type || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Resource ID">
                {selectedLog.resource_id || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="User">
                {selectedLog.username || 'System'}
              </Descriptions.Item>
              <Descriptions.Item label="IP Address">
                {selectedLog.ip_address || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Created At">
                {selectedLog.created_at ? dayjs(selectedLog.created_at).format('YYYY-MM-DD HH:mm:ss') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                {selectedLog.description || '-'}
              </Descriptions.Item>
            </Descriptions>

            {selectedLog.before_data && (
              <div style={{ marginTop: 24 }}>
                <h4>Before Data</h4>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.before_data, null, 2)}
                </pre>
              </div>
            )}

            {selectedLog.after_data && (
              <div style={{ marginTop: 24 }}>
                <h4>After Data</h4>
                <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4, overflow: 'auto' }}>
                  {JSON.stringify(selectedLog.after_data, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
