import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import App from './App'
import 'antd/dist/reset.css'
import './styles.css'

// 配置蓝绿色主题
const theme = {
  token: {
    colorPrimary: '#4db6ac',
    colorPrimaryHover: '#64d8cb',
    colorPrimaryActive: '#26a69a',
    colorPrimaryBorder: '#4db6ac',
    colorPrimaryBorderHover: '#64d8cb',
    colorPrimarySolidHover: '#64d8cb',
    colorPrimarySolidPressed: '#26a69a',
    colorSuccess: '#64d8cb',
    colorInfo: '#4db6ac',
  },
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider theme={theme}>
        <App />
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
)
