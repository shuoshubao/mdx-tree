import React, { useRef, useState, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import {
  Button,
  Card,
  ConfigProvider,
  FloatButton,
  Layout,
  Result,
  Skeleton,
  Tree,
  Typography,
  message,
  theme
} from 'antd'
import copy from 'copy-to-clipboard'
import { CaretRightOutlined, CaretLeftOutlined } from '@ant-design/icons'
import { Resizable } from 're-resizable'
import { map } from 'lodash-es'
import { name as pkgName } from '../package'
import { isDark, addListenerPrefersColorScheme, pathsToTree } from './util'
import { MarkdownItHighlight, getMarkdownTocData } from './markdown'
import './index.css'

const { Sider, Content } = Layout
const { Text } = Typography
const { BackTop } = FloatButton
const { useToken } = theme

const { defaultAlgorithm, darkAlgorithm } = theme

const { code, files = [] } = window.data

const CollapsedKey = [pkgName, 'collapsed'].join('-')
const TocCollapsedKey = [pkgName, 'collapsed', 'toc'].join('-')
const SiderWidthKey = [pkgName, 'sider-width'].join('-')

const FilesTreeData = pathsToTree(
  files.map(v => v.name),
  files
)

const getInitExpandedKeys = () => {
  const pathname = decodeURIComponent(window.location.pathname.slice(1))
  if (pathname.length === 0) {
    return map(files, 'name')
  }
  return map(files, 'name').filter(v => {
    return v.startsWith(pathname)
  })
}

const App = () => {
  const { token } = useToken()

  const resizableRef = useRef()

  const [collapsed, setCollapsed] = useState(JSON.parse(window.localStorage.getItem(CollapsedKey) || 'false'))
  const [tocCollapsed, setTocCollapsed] = useState(JSON.parse(window.localStorage.getItem(TocCollapsedKey) || 'false'))
  const [siderWidth, setSiderWidth] = useState(JSON.parse(window.localStorage.getItem(SiderWidthKey)) || 300)

  const [selectedKeys, setSelectedKeys] = useState([])
  const [expandedKeys, setExpandedKeys] = useState(getInitExpandedKeys())

  const [tocData, setTocData] = useState({ treeData: [] })

  const [isFile, setIsFile] = useState(window.location.pathname.endsWith('.md'))

  const [html, setHtml] = useState('')

  const [messageApi, contextHolder] = message.useMessage()

  const updateSelectedKeys = () => {
    setTimeout(() => {
      document.querySelector(`[id="${window.location.hash}"]`)?.scrollIntoView()
    }, 0)
  }

  const fetchData = async () => {
    const pathname = decodeURIComponent(window.location.pathname.slice(1))
    setIsFile(pathname.endsWith('.md'))
    if (pathname.length === 0) {
      setHtml('')
      return
    }
    const md = await fetch(`/${pathname}.md`).then(res => res.text())
    const htmlStr = MarkdownItHighlight.render(md)
    setHtml(htmlStr)
    const TocData = getMarkdownTocData(htmlStr)
    updateSelectedKeys()
    setTocData(TocData)
    setSelectedKeys([pathname + '.md'])
  }

  useEffect(() => {
    fetchData()
  }, [setHtml, setTocData, setSelectedKeys])

  useEffect(() => {
    window.addEventListener('popstate', () => {
      fetchData()
    })
  }, [setHtml])

  useEffect(() => {
    window.addEventListener('hashchange', updateSelectedKeys)

    return () => {
      window.removeEventListener('hashchange', updateSelectedKeys)
    }
  }, [])

  const handleCopy = e => {
    const { target } = e
    let targetNode
    if (target.classList.contains('anticon-copy')) {
      targetNode = target
    }
    if (target.closest('.markdown-body .anticon-copy')) {
      targetNode = target.closest('.markdown-body .anticon-copy')
    }
    if (targetNode) {
      const code = decodeURIComponent(targetNode.dataset.code)
      copy(code)
      messageApi.success('Copied')
    }
  }

  useEffect(() => {
    document.body.addEventListener('click', handleCopy)

    return () => {
      document.body.removeEventListener('click', handleCopy)
    }
  }, [])

  return (
    <>
      <Resizable
        ref={resizableRef}
        key={collapsed}
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
          width="100%"
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
            showLine
            showIcon
            selectedKeys={selectedKeys}
            expandedKeys={expandedKeys}
            onSelect={keys => {
              const [selectedKey] = keys
              if (selectedKey) {
                if (selectedKey.endsWith('.md')) {
                  window.history.pushState(null, null, `/${selectedKey.replace('.md', '')}`)
                  fetchData()
                }
              }
            }}
            onExpand={expandedKeysValue => {
              setExpandedKeys(expandedKeysValue)
            }}
          />
        </Sider>
      </Resizable>
      <Content style={{ padding: token.paddingContentVertical, minHeight: '100vh', overflowY: 'auto' }}>
        <Skeleton loading={isFile}>
          <Card title={decodeURIComponent(window.location.pathname.slice(1)) + '.md'}>
            <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
          </Card>
        </Skeleton>
        <BackTop />
      </Content>
      <Sider
        theme="light"
        collapsible
        reverseArrow
        collapsedWidth={0}
        collapsed={tocCollapsed}
        onCollapse={value => {
          setTocCollapsed(value)
          window.localStorage.setItem(TocCollapsedKey, JSON.stringify(value))
        }}
        width={300}
        style={{
          height: '100vh',
          overflowY: 'auto',
          borderRight: tocCollapsed ? 'none' : `1px solid ${token.colorBorderSecondary}`
        }}
        zeroWidthTriggerStyle={{
          position: 'fixed',
          top: 'calc(50% - 22px)',
          insetInlineStart: 'auto',
          insetInlineEnd: tocCollapsed ? 0 : 300 - 12 / 2,
          width: 12,
          height: 44,
          fontSize: 12,
          border: `1px solid ${token.colorBorderSecondary}`,
          borderRadius: tocCollapsed ? '0 6px 6px 0' : 6,
          overflow: 'hidden'
        }}
        trigger={tocCollapsed ? <CaretLeftOutlined /> : <CaretRightOutlined />}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 1,
            padding: '6px 10px 6px 28px',
            marginBottom: token.paddingContentVertical,
            background: token.colorBgBase,
            borderBottom: `1px solid ${token.colorBorderSecondary}`
          }}
        >
          <Text strong>大纲</Text>
        </div>
        <Tree
          key={html.slice(0, 1e2)}
          treeData={tocData.treeData}
          onSelect={keys => {
            if (keys[0]) {
              window.location.hash = keys[0]
            }
          }}
          defaultExpandAll
        />
      </Sider>
      {contextHolder}
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
