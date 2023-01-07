#!/usr/bin/env node

const { existsSync, lstatSync, readFileSync } = require('fs')
const { resolve, join, relative } = require('path')
const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const Koa = require('koa')
const cors = require('@koa/cors')
const portfinder = require('portfinder')
const mime = require('mime-types')
const chalk = require('chalk')
const glob = require('glob')
const { startCase, first, sortBy } = require('lodash')
const { generateDocument } = require('@nbfe/js2html')
const { name: pkgName } = require('./package')

const { argv } = yargs(hideBin(process.argv))

const app = new Koa()

app.use(cors())

const formatTime = time => {
  const dt = new Date(time)
  return [dt.toLocaleDateString(), dt.toLocaleTimeString()].join(' ')
}

const cwd = process.cwd()

const root = resolve(cwd, first(argv._) || '')

const VirtualPath = [Date.now(), Math.random()].join('_')

const JavaScriptVirtualPath = ['', VirtualPath, 'index.js'].join('/')
const CssVirtualPath = ['', VirtualPath, 'index.css'].join('/')

const getHtml = data => {
  data.VirtualPath = VirtualPath
  return generateDocument({
    title: startCase(pkgName),
    meta: [
      {
        charset: 'utf-8'
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1'
      }
    ],
    link: [
      {
        rel: 'shortcut icon',
        href: 'https://nodejs.org/static/images/favicons/favicon.ico'
      }
    ],
    headScript: [],
    style: [
      {
        text: 'body {margin: 0;}'
      },
      CssVirtualPath
    ],
    bodyHtml: ['<div id="app"></div>'],
    script: [
      {
        text: `window.data = ${JSON.stringify(data)}`
      },
      {
        src: JavaScriptVirtualPath
      }
    ]
  })
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

  const files = glob.sync(`${root}/**/*.md`).map(v => {
    const stats = lstatSync(v)
    const isFile = stats.isFile()
    return {
      name: relative(root, v),
      isFile,
      type: isFile ? mime.lookup(v) || 'text/plain' : 'folder'
    }
  })

  const data = {
    root,
    url,
    files: sortBy(files, v => v.isFile)
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
