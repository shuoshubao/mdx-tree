#!/usr/bin/env node
import cors from '@koa/cors'
import chalk from 'chalk'
import { existsSync, lstatSync, readFileSync } from 'fs'
import { globSync } from 'glob'
import Koa from 'koa'
import mime from 'mime-types'
import { dirname, join, resolve } from 'path'
import portfinder from 'portfinder'
import { fileURLToPath } from 'url'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const { argv } = yargs(hideBin(process.argv))

const app = new Koa()

app.use(cors())

const formatTime = time => {
  const dt = new Date(time)
  return [dt.toLocaleDateString(), dt.toLocaleTimeString()].join(' ')
}

const cwd = process.cwd()

const root = resolve(cwd, argv._[0] || '')

const VirtualPath = [Date.now(), Math.random()].join('_')

const JavaScriptVirtualPath = ['', VirtualPath, 'index.js'].join('/')
const CssVirtualPath = ['', VirtualPath, 'index.css'].join('/')

const getHtml = data => {
  data.VirtualPath = VirtualPath
  return `<!DOCTYPE html>
<html>
  <head>
    <title>Mdx Tree</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/svg+xml" href="https://vite.dev/logo-without-border.svg">
    <style>body {margin: 0;}</style>
    <link rel="stylesheet" href="${CssVirtualPath}">
  </head>
  <body>
    <div id="app"></div>
    <script>window.data = ${JSON.stringify(data)}</script>
    <script src="${JavaScriptVirtualPath}"></script>
  </body>
</html>`
}

app.use(async ctx => {
  const time = Date.now()
  const { request } = ctx
  const { method } = request
  const url = decodeURIComponent(request.url)

  if (url === '/favicon.ico') {
    return
  }

  if (url === JavaScriptVirtualPath) {
    ctx.type = 'application/javascript'
    ctx.body = readFileSync(resolve(__dirname, 'dist/index.js'))
    return
  }

  if (url === CssVirtualPath) {
    ctx.type = 'text/css'
    ctx.body = readFileSync(resolve(__dirname, 'dist/index.css'))
    return
  }

  console.log(chalk.cyan(formatTime(time)), chalk.yellow(method.padEnd(4, ' ')), chalk.green(url))

  const absolutePath = join(root, url)

  if (existsSync(absolutePath)) {
    const stats = lstatSync(absolutePath)
    if (stats.isFile()) {
      const type = mime.lookup(absolutePath)
      if (type) {
        ctx.type = type
        ctx.body = readFileSync(absolutePath)
      } else {
        ctx.body = readFileSync(absolutePath).toString()
      }
      return
    }
  }

  const files = globSync('**/*.md', { cwd: root, dot: true, ignore: ['**/node_modules/**', '**/.git/**'] }).map(
    name => {
      const v = join(root, name)
      const stats = lstatSync(v)
      const isFile = stats.isFile()
      return {
        name,
        isFile,
        type: isFile ? mime.lookup(v) || 'text/plain' : 'folder'
      }
    }
  )

  const data = {
    root,
    url,
    files: files.sort((a, b) => a.isFile - b.isFile)
  }
  const html = getHtml(data)
  ctx.body = html
})

const logServerInfo = port => {
  console.log(chalk.green('Directory:'), root)
  console.log(chalk.green('Serving:'), `http://localhost:${port}`)
}

const SpecificPort = argv.p || argv.port

if (SpecificPort) {
  app.listen(SpecificPort)
  logServerInfo(SpecificPort)
} else {
  portfinder.setBasePort(3000)
  portfinder.setHighestPort(4000)
  portfinder
    .getPortPromise()
    .then(port => {
      app.listen(port)
      logServerInfo(port)
    })
    .catch(err => {
      console.log('Could not get a free port.')
      console.log(err)
    })
}
