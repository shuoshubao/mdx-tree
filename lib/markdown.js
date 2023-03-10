import { kebabCase } from 'lodash-es'
import MarkdownIt from 'markdown-it/dist/markdown-it'
import getTocData from 'mdx-toc'
import TaskLists from 'markdown-it-task-lists'
import MarkdownItAttrs from 'markdown-it-attrs'
import MarkdownItAnchor from 'markdown-it-anchor'
import hljs from 'highlight.js'

export const slugify = str => {
  return ['', encodeURIComponent(kebabCase(str))].join('#')
}

export const MarkdownItHighlight = MarkdownIt({
  html: true,
  highlight: (str, lang) => {
    const trimedStr = str.trim()
    if (lang && hljs.getLanguage(lang)) {
      try {
        const { value } = hljs.highlight(trimedStr, { language: lang })
        return [
          '<pre style="background: rgb(24, 24, 27);">',
          `<code class="hljs language-${lang}" lang="${lang}">`,
          value.split('\n').map((v, i, arr) => {
            return `<div ${arr.length < 5 ? '' : 'class="line"'}>${v}</div>`
          }),
          '<span class="markdown-code-btns">',
          `<span class="btn-lang">${lang}</span>`,
          `<span data-code="${encodeURIComponent(
            trimedStr
          )}" class="anticon anticon-copy"><svg viewBox="64 64 896 896" focusable="false" data-icon="copy" width="1em" height="1em" fill="currentColor" aria-hidden="true"><path d="M832 64H296c-4.4 0-8 3.6-8 8v56c0 4.4 3.6 8 8 8h496v688c0 4.4 3.6 8 8 8h56c4.4 0 8-3.6 8-8V96c0-17.7-14.3-32-32-32zM704 192H192c-17.7 0-32 14.3-32 32v530.7c0 8.5 3.4 16.6 9.4 22.6l173.3 173.3c2.2 2.2 4.7 4 7.4 5.5v1.9h4.2c3.5 1.3 7.2 2 11 2H704c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32zM350 856.2L263.9 770H350v86.2zM664 888H414V746c0-22.1-17.9-40-40-40H232V264h432v624z"></path></svg></span>`,
          '</span>',
          '</code>',
          '</pre>'
        ]
          .flat()
          .join('')
      } catch (__) {}
    }
    return `<pre><code class="language-${lang}">${trimedStr}</code></pre>`
  }
})
  .use(TaskLists)
  .use(MarkdownItAttrs)
  .use(MarkdownItAnchor, {
    slugify
  })

const parser = md => {
  return MarkdownIt().render(md)
}

export const getMarkdownTocData = html => {
  return getTocData(html, {
    parser,
    slugify
  })
}
