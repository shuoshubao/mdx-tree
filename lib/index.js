import React, { useRef, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  ConfigProvider,
  Layout,
  Result,
  Card,
  Breadcrumb,
  Tree,
  Typography,
  Space,
  Table,
  Button,
  Tooltip,
  FloatButton,
  theme
} from 'antd'
import {
  HomeOutlined,
  FileOutlined,
  FolderOpenOutlined,
  CaretRightOutlined,
  CaretLeftOutlined
} from '@ant-design/icons'
import { Resizable } from 're-resizable'
import { map, last } from 'lodash-es'
import { name as pkgName } from '../package'
import { isDark, addListenerPrefersColorScheme, pathsToTree, getHashs } from './util'
import { MarkdownItHighlight } from './markdown'
import './index.css'

const { Sider, Content } = Layout
const { BackTop } = FloatButton
const { Text, Link } = Typography
const { useToken } = theme

const { defaultAlgorithm, darkAlgorithm } = theme

const { code, files } = data

const CollapsedKey = 'collapsed'
const SiderWidthKey = [pkgName, 'sider-width'].join('-')

const FilesTreeData = pathsToTree(files.map(v => v.name))

const getInitExpandedKeys = () => {
  const path = getHashs().join('/')
  if (path.length === 0) {
    return map(files, 'name')
  }
  return map(files, 'name').filter(v => {
    return v.startsWith(path)
  })
}

const App = () => {
  const { token } = useToken()

  const resizableRef = useRef()

  const [collapsed, setCollapsed] = useState(JSON.parse(window.localStorage.getItem(CollapsedKey) || 'false'))

  const [siderWidth, setSiderWidth] = useState(JSON.parse(window.localStorage.getItem(SiderWidthKey)) || 300)

  const [expandedKeys, setExpandedKeys] = useState(getInitExpandedKeys())

  const [html, setHtml] = useState('')

  const fetchData = async () => {
    const hashs = getHashs()
    if (hashs.length === 0) {
      setHtml('')
      return
    }
    if (!last(hashs).endsWith('.md')) {
      setHtml('')
      return
    }
    const md = await fetch(`/${hashs.join('/')}`).then(res => res.text())
    const htmlStr = MarkdownItHighlight.render(md)
    setHtml(htmlStr)
  }

  useEffect(() => {
    fetchData()
  }, [setHtml])

  useEffect(() => {
    window.addEventListener('hashchange', () => {
      fetchData()
      // setExpandedKeys(getInitExpandedKeys())
    })
  }, [setHtml])

  return (
    <>
      <Resizable
        ref={resizableRef}
        defaultSize={{ width: collapsed ? 0 : siderWidth }}
        onResizeStop={(event, direction, refToElement, delta) => {
          const width = siderWidth + delta.width
          setSiderWidth(width)
          window.localStorage.setItem(SiderWidthKey, width)
        }}
        minWidth={collapsed ? 0 : 200}
        maxWidth={500}
        enable={{
          right: true,
          top: false,
          bottom: false,
          left: false,
          topRight: false,
          bottomRight: false,
          bottomLeft: false,
          topLeft: false
        }}
      >
        <Sider
          width={siderWidth}
          theme="light"
          collapsible
          collapsedWidth={0}
          collapsed={collapsed}
          onCollapse={value => {
            setCollapsed(value)
            window.localStorage.setItem(CollapsedKey, JSON.stringify(value))
          }}
          style={{
            height: '100vh',
            overflowY: 'auto',
            borderRight: collapsed ? 'none' : `1px solid ${token.colorBorderSecondary}`
          }}
          zeroWidthTriggerStyle={{
            position: 'fixed',
            top: 'calc(50% - 22px)',
            width: 12,
            height: 44,
            fontSize: 12,
            insetInlineStart: collapsed ? 0 : siderWidth - 12 / 2,
            border: `1px solid ${token.colorBorderSecondary}`,
            borderRadius: collapsed ? '0 6px 6px 0' : 6,
            overflow: 'hidden'
          }}
          trigger={collapsed ? <CaretRightOutlined /> : <CaretLeftOutlined />}
        >
          <Tree
            treeData={FilesTreeData}
            expandedKeys={expandedKeys}
            onSelect={selectedKeys => {
              if (selectedKeys[0]) {
                window.location.hash = selectedKeys[0]
              }
            }}
            onExpand={expandedKeysValue => {
              setExpandedKeys(expandedKeysValue)
            }}
            showIcon
          />
        </Sider>
      </Resizable>
      <Content style={{ padding: token.paddingContentVertical, minHeight: '100vh', overflowY: 'auto' }}>
        <Card title={getHashs().join('/')}>
          <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
        </Card>
        <BackTop />
      </Content>
    </>
  )
}

const Root = () => {
  const [dark, setDark] = useState(isDark())

  useEffect(() => {
    addListenerPrefersColorScheme(value => {
      setDark(value)
    })
  }, [setDark])

  return (
    <ConfigProvider
      componentSize="small"
      theme={{
        algorithm: dark ? darkAlgorithm : defaultAlgorithm
      }}
    >
      <Layout
        style={{
          height: '100vh',
          overflowY: 'auto'
        }}
      >
        {code === 404 ? (
          <Result
            status="404"
            title="404"
            subTitle="Sorry, the file or directory you visited does not exist."
            extra={
              <Button type="primary" href="/">
                Go Root
              </Button>
            }
          />
        ) : (
          <App />
        )}
      </Layout>
    </ConfigProvider>
  )
}

createRoot(document.querySelector('#app')).render(<Root />)
