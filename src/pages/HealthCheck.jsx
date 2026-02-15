import React, { useEffect, useState } from 'react'
import { Table, Modal, Form, Input, Space, Select, Descriptions, message, Button as AntButton, DatePicker, Tag, Spin, Card, Statistic, Collapse } from 'antd'
import API, { getErrorMessage } from '../api'
import Button from '../components/Button'
import { getSystemById, getApiById } from '../utils/cache'

const { Option } = Select
const { RangePicker } = DatePicker
const { Panel } = Collapse

export default function HealthCheck() {
  const [systems, setSystems] = useState([])
  const [selectedSystem, setSelectedSystem] = useState(null)
  const [selectedEnvironment, setSelectedEnvironment] = useState('dev')
  const [batches, setBatches] = useState([])
  const [batchResults, setBatchResults] = useState({})
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [batchLoading, setBatchLoading] = useState({})
  const [detailVisible, setDetailVisible] = useState(false)
  const [detail, setDetail] = useState(null)
  const [dateRange, setDateRange] = useState(null)
  const [batchResult, setBatchResult] = useState(null)

  async function loadSystems() {
    try {
      const res = await API.get('/api/v1/systems')
      setSystems(res.data || [])
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    }
  }

  async function runHealthCheck() {
    if (!selectedSystem) {
      message.warning('Please select a system')
      return
    }

    setChecking(true)
    try {
      const payload = {
        system_id: selectedSystem,
        environment: selectedEnvironment
      }
      const res = await API.post('/api/v1/health/system/environment', payload)
      setBatchResult(res.data)
      message.success('Health check completed')
      loadBatches()
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    } finally {
      setChecking(false)
    }
  }

  async function loadBatches() {
    if (!selectedSystem) {
      message.warning('Please select a system first')
      return
    }

    setLoading(true)
    try {
      const params = {}
      if (dateRange) {
        params.start_date = dateRange[0].toISOString()
        params.end_date = dateRange[1].toISOString()
      }
      if (selectedSystem) {
        params.system_id = selectedSystem
      }
      if (selectedEnvironment) {
        params.environment = selectedEnvironment
      }
      const res = await API.get('/api/v1/health/batches', { params })
      let filteredBatches = res.data?.items || []
      
      // 如果有日期范围，客户端再过滤一次，确保只显示在范围内的batch
      if (dateRange) {
        const startDate = dateRange[0].startOf('day').valueOf()
        const endDate = dateRange[1].endOf('day').valueOf()
        
        filteredBatches = filteredBatches.filter(batch => {
          if (!batch.checked_at) return false
          const batchDate = new Date(batch.checked_at).valueOf()
          return batchDate >= startDate && batchDate <= endDate
        })
      }
      
      setBatches(filteredBatches)
      // 清空之前的batch结果
      setBatchResults({})
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  async function loadBatchResults(batchId) {
    if (!batchId) return

    setBatchLoading(prev => ({ ...prev, [batchId]: true }))
    try {
      const res = await API.get(`/api/v1/health/results/batch/${batchId}`)
      setBatchResults(prev => ({ ...prev, [batchId]: res.data || [] }))
    } catch (err) {
      console.error(err)
      message.error(getErrorMessage(err))
    } finally {
      setBatchLoading(prev => ({ ...prev, [batchId]: false }))
    }
  }

  function showDetail(record) {
    setDetail(record)
    setDetailVisible(true)
  }

  useEffect(() => {
    loadSystems()
  }, [])

  const apiColumns = [
    {
      title: 'API',
      dataIndex: 'api_id',
      key: 'api_id',
      render: (apiId) => {
        if (!apiId) return '-';
        const api = getApiById(apiId);
        return api ? api.name : apiId;
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const color = status === 'SUCCESS' ? 'green' : 'red'
        return <Tag color={color}>{status}</Tag>
      }
    },
    {
      title: 'Response Code',
      dataIndex: 'response_code',
      key: 'response_code'
    },
    {
      title: 'Response Time (ms)',
      dataIndex: 'response_time_ms',
      key: 'response_time_ms'
    },
    {
      title: 'Error Message',
      dataIndex: 'error_message',
      key: 'error_message',
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button type="primary" size="small" onClick={() => showDetail(record)}>
          Details
        </Button>
      )
    }
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3>Health Check</h3>
      </div>

      {batchResult && (
        <Card style={{ marginBottom: 20 }}>
          <h4>Latest Health Check Summary</h4>
          <Space direction="horizontal" style={{ width: '100%', justifyContent: 'space-around', marginTop: 10 }}>
            <Statistic title="Total Checks" value={batchResult.total_count} />
            <Statistic title="Success" value={batchResult.success_count} prefix={<Tag color="green">✓</Tag>} />
            <Statistic title="Failure" value={batchResult.failure_count} prefix={<Tag color="red">✗</Tag>} />
          </Space>
        </Card>
      )}

      <div className="card" style={{ marginBottom: 20 }}>
        <h4>Run Health Check</h4>
        <Form layout="vertical" style={{ maxWidth: 800 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Form.Item label="System">
              <Select
                placeholder="Select a system"
                value={selectedSystem}
                onChange={setSelectedSystem}
                style={{ width: '100%' }}
              >
                {systems.map(system => (
                  <Option key={system.id} value={system.id}>
                    {system.name} ({system.system_code})
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item label="Environment">
              <Select
                placeholder="Select environment"
                value={selectedEnvironment}
                onChange={setSelectedEnvironment}
                style={{ width: '100%' }}
              >
                <Option value="dev">Development</Option>
                <Option value="uat">UAT</Option>
                <Option value="prod">Production</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                onClick={runHealthCheck}
                disabled={!selectedSystem}
                loading={checking}
              >
                Run Health Check
              </Button>
            </Form.Item>
          </Space>
        </Form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4>Health Check Results</h4>
          <Space>
            <RangePicker onChange={(dates) => {
              setDateRange(dates);
              if (dates && selectedSystem) {
                loadBatches();
              }
            }} />
            <Button type="primary" onClick={loadBatches} loading={loading}>
              Load Batches
            </Button>
          </Space>
        </div>

        <Collapse 
          onChange={(keys) => {
            // 当展开面板时，自动加载对应batch的结果
            if (keys.length > 0) {
              const batchId = keys[keys.length - 1];
              if (!batchResults[batchId]) {
                loadBatchResults(batchId);
              }
            }
          }}
        >
          {batches.map(batch => (
            <Panel 
              header={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden' }}>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 16 }}>
                      <strong>Batch ID:</strong> {batch.batch_id}
                    </div>
                    <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginRight: 16 }}>
                      <strong>Checked At:</strong> {batch.checked_at ? new Date(batch.checked_at).toLocaleString() : '-'}
                    </div>
                    <div style={{ whiteSpace: 'nowrap' }}>
                      <strong>Environment:</strong> 
                      <Tag color={batch.environment === 'prod' ? 'blue' : batch.environment === 'uat' ? 'orange' : 'green'}>
                        {batch.environment?.toUpperCase() || '-'}
                      </Tag>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <div style={{ marginRight: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 2 }}>Total</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{batch.total_count || 0}</div>
                    </div>
                    <div style={{ marginRight: 20, textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 2 }}>Success</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'green' }}>{batch.success_count || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: 2 }}>Failure</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'red' }}>{batch.failure_count || 0}</div>
                    </div>
                  </div>
                </div>
              } 
              key={batch.batch_id}
            >
              {batchLoading[batch.batch_id] ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                  <Spin size="small" /> Loading results...
                </div>
              ) : batchResults[batch.batch_id] && batchResults[batch.batch_id].length > 0 ? (
                <Table
                  columns={apiColumns}
                  dataSource={batchResults[batch.batch_id]}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                />
              ) : batchResults[batch.batch_id] && batchResults[batch.batch_id].length === 0 ? (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  No health check results found for this batch
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                  Loading results...
                </div>
              )}
            </Panel>
          ))}
        </Collapse>
      </div>

      <Modal title="Health Check Detail" open={detailVisible} onCancel={() => setDetailVisible(false)} footer={null} width={800} style={{ top: 20, height: '90vh' }}>
        {detail && (
          <div style={{ height: 'calc(90vh - 100px)' }}>
            <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">
              <code style={{ background: '#f5f7fa', padding: '4px 8px', borderRadius: 6 }}>{detail.id}</code>
            </Descriptions.Item>
            <Descriptions.Item label="API">
              {detail.api_id ? (
                <>
                  {getApiById(detail.api_id) ? (
                    <div>
                      {getApiById(detail.api_id).name} <code style={{ background: '#f5f7fa', padding: '2px 6px', borderRadius: 4, fontSize: '12px', marginLeft: '4px' }}>({detail.api_id})</code>
                    </div>
                  ) : (
                    <div>
                      <code style={{ background: '#f5f7fa', padding: '4px 8px', borderRadius: 6 }}>{detail.api_id}</code>
                    </div>
                  )}
                </>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Environment">
              <Tag color={detail.environment === 'prod' ? 'blue' : detail.environment === 'uat' ? 'orange' : 'green'}>
                {detail.environment?.toUpperCase() || '-'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={detail.status === 'SUCCESS' ? 'green' : 'red'}>{detail.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Response Code">{detail.response_code || '-'}</Descriptions.Item>
            <Descriptions.Item label="Response Time">{detail.response_time_ms} ms</Descriptions.Item>
            <Descriptions.Item label="Error Message">{detail.error_message || '-'}</Descriptions.Item>
            <Descriptions.Item label="Response Body">
              {detail.response_body ? (
                <pre style={{ background: '#f5f7fa', padding: '8px', borderRadius: 6, maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {detail.response_body}
                </pre>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Response Headers">
              {detail.response_headers ? (
                <pre style={{ background: '#f5f7fa', padding: '8px', borderRadius: 6, maxHeight: 100, overflow: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {detail.response_headers}
                </pre>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Request URL">
              {detail.request_url ? (
                <a href={detail.request_url} target="_blank" rel="noopener noreferrer" style={{ wordBreak: 'break-all' }}>
                  {detail.request_url}
                </a>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Request Details">
              {detail.request_details ? (
                <pre style={{ background: '#f5f7fa', padding: '8px', borderRadius: 6, maxHeight: 150, overflow: 'auto', whiteSpace: 'pre-wrap', wordWrap: 'break-word' }}>
                  {detail.request_details}
                </pre>
              ) : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Checked At">
              {detail.checked_at ? new Date(detail.checked_at).toLocaleString() : '-'}
            </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  )
}
