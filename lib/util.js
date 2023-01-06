import React from 'react'
import { last, find } from 'lodash-es'
import { FileOutlined, FolderOpenOutlined } from '@ant-design/icons'

export const isDark = () => {
  const { matchMedia } = window
  return matchMedia('(prefers-color-scheme: dark)').matches
}

export const addListenerPrefersColorScheme = callback => {
  const { matchMedia } = window
  matchMedia('(prefers-color-scheme: dark)').addListener(mediaQueryList => {
    callback(mediaQueryList.matches)
  })
  matchMedia('(prefers-color-scheme: light)').addListener(mediaQueryList => {
    callback(!mediaQueryList.matches)
  })
}

export const pathsToTree = (paths = [], files = []) => {
  const resultKey = Symbol()
  const result = []
  const level = { [resultKey]: result }

  paths.sort().forEach(path => {
    path.split('/').reduce((prev, cur, index, arr) => {
      if (!prev[cur]) {
        prev[cur] = {
          [resultKey]: []
        }

        const curPath = arr.slice(0, index + 1).join('/')

        const item = find(files, { name: curPath })

        prev[resultKey].push({
          key: curPath,
          title: last(curPath.split('/')),
          children: prev[cur][resultKey],
          icon: item?.isFile ? <FileOutlined /> : <FolderOpenOutlined />,
          selectable: !!item?.isFile
        })
      }

      return prev[cur]
    }, level)
  })
  return result
}
