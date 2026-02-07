import React from 'react'
import { Button as AntButton, Spin } from 'antd'

const Button = ({ 
  onClick, 
  loading = false, 
  children, 
  type = 'default', 
  size = 'middle', 
  danger = false,
  htmlType = 'button',
  ...props 
}) => {
  const handleClick = (e) => {
    if (!loading && onClick) {
      onClick(e)
    }
  }

  return (
    <AntButton
      onClick={handleClick}
      loading={loading}
      type={type}
      size={size}
      danger={danger}
      htmlType={htmlType}
      disabled={loading}
      {...props}
    >
      {children}
    </AntButton>
  )
}

export default Button