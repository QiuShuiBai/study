import { baseParams } from '../utils/params'
import * as Dom from '../utils/dom'
import { PDFPageView } from '../pdf'
import { hideLoading, showLoading } from '../utils/loading'

const urlFast = 'http://0.0.0.0:3000/heiheihei'
const urlSlow = 'http://172.25.162.130:3000/hahaha'

let native = window.location.href
let url = urlSlow

if (native.indexOf('heiheihei') > -1) {
  url = urlFast
}

export function loadPDF(options) {
  const el = options.el
  baseParams.el = document.querySelector(el)
  return Promise.all([
    import(/* webpackChunkName: "pdfjs" */'pdfjs-dist/build/pdf.js'),
    import(/* webpackChunkName: "pdfjs-worker" */'pdfjs-dist/build/pdf.worker.entry')
  ]).then(pdfjsFiles => {
    const pdfjsLib = pdfjsFiles[0]
    const workerEntry = pdfjsFiles[1]
    pdfjsLib.GlobalWorkerOptions.workerSrc = workerEntry
    const loadingTask = pdfjsLib.getDocument(url)
    return Promise.resolve(loadingTask)
  })
}

export async function getPdfViewPort(pdfDocument) {

  baseParams.pdfDocument = pdfDocument
  const pdfPage = await pdfDocument.getPage(1)

  const viewport = pdfPage.getViewport({ scale: 1 }) // pdf的宽高
  let scale = 1
  let rotation = 0
  const desiredWidth = baseParams.bodyClientWidth // 屏幕宽度
  const desiredHeight = baseParams.bodyClientHeight // 屏幕高度

  if (viewport.width <= viewport.height) {
    scale = desiredWidth / viewport.width
  } else {
    // const horizontal = true
    scale = Math.min(desiredHeight / viewport.width, desiredWidth / viewport.height)
    rotation = 90
  }

  const scaledViewport = pdfPage.getViewport({ scale: scale * 4, rotation: rotation })

  baseParams.scaledViewport = scaledViewport
  return scaledViewport
}

export function initPagesConfig(scaledViewport) {
  const pdfPageCount = baseParams.pdfPageCount
  const pages = []

  // this.divWidth = (this.horizontal ? this.bodyClientWidth : Math.floor(scaledViewport.width)) + 'px'
  // this.divHeight = (this.horizontal ? this.bodyClientHeight : Math.floor(scaledViewport.height)) + 'px'
  baseParams.divWidth = Math.floor(scaledViewport.width / 4)
  baseParams.divHeight = Math.floor(scaledViewport.height / 4)

  PDFPageView.prototype.scaledViewport = scaledViewport

  for (let i = 0, len = pdfPageCount; i < len; i++) {
    pages[i] = new PDFPageView({
      pageNum: i
    })
  }

  baseParams.pages = pages
}

export function getVisiblePages(index) {
  // index = this.vertical ? this.pdfPageCount - index : index
  const pdfPageCount = baseParams.pdfPageCount

  if (!baseParams.visibleCount) {
    const _count = Math.max(10, Math.floor(baseParams.el.clientHeight / baseParams.divHeight))
    const visibleCount = _count + (_count % 2 === 1)
    baseParams.visibleCount = visibleCount < baseParams.pdfPageCount ? visibleCount : baseParams.pdfPageCount
  }

  const visibleCount = baseParams.visibleCount
  baseParams.oldStart = baseParams.start
  baseParams.oldEnd = baseParams.end

  let start = Math.max(0, index - visibleCount / 2)
  let end = Math.min(start + visibleCount, pdfPageCount)
  if (end === pdfPageCount) {
    start = Math.max(0, end - visibleCount)
  }

  baseParams.start = start
  baseParams.end = end
}

export function initDomStruct() {
  if (!baseParams.finishInitDom) {
    baseParams.finishInitDom = true
    Dom.createCanvas()
    Dom.createBlockDom()
  }

  let preDom = baseParams.preDom
  let postDom = baseParams.postDom

  const { start, end, pdfPageCount, divHeight } = baseParams
  preDom.style.height = start * divHeight + 'px'
  postDom.style.height = (pdfPageCount - end) * divHeight + 'px'
  preDom = null
  postDom = null
}

export function renderPDF() {
  const { pages, pdfDocument, start, end } = baseParams
  const canvasArr = document.querySelectorAll('.the-canvas')

  for (let i = start, len = end; i < len; i++) {
    if (!pages[i].drew) {
      pdfDocument.getPage(pages[i].pageNum + 1).then(pdfPage => {
        pages[i].draw(pdfPage, canvasArr[i - start])
      })
    }
  }
}

function scrollEnd() {
  baseParams.canCal = false
  let el = baseParams.el
  const { divHeight } = baseParams

  let index = Math.floor(el.scrollTop / divHeight)
  if (index === baseParams.index) {
    baseParams.canCal = true
    return
  }

  baseParams.index = index


  getVisiblePages(index)

  if (baseParams.oldEnd === baseParams.end) {
    baseParams.canCal = true
    return
  }

  const sameIndex = diffIndex()

  cleanup(sameIndex)

  initDomStruct()

  replaceDom(sameIndex)

  el = null
}

function diffIndex() {
  const { start, end, oldStart, oldEnd } = baseParams
  let sameIndex = []
  if (start > oldStart) {
    if (start <= oldEnd) {
      sameIndex = [start, oldEnd, 'down']
    }
  } else if (start < oldStart) {
    if (end > oldStart) {
      sameIndex = [oldStart, end, 'up']
    }
  }
  return sameIndex
}

function cleanup(sameIndex) {
  const { start, oldStart, end, oldEnd, pages } = baseParams
  let cleanStart = 0
  let cleanEnd = 0
  if (sameIndex.length === 0) {
    // 没有一样的序号，全部清楚
    cleanStart = oldStart
    cleanEnd = oldEnd
  } else if (sameIndex[2] === 'up') {
      cleanStart = end
      cleanEnd = oldEnd
  } else if (sameIndex[2] === 'down') {
    cleanStart = oldStart
    cleanEnd = start
  } 
  for (let i = cleanStart; i < cleanEnd; i++) {
    pages[i].cleanup()
  }
}
function replaceDom(sameIndex) {
  if (sameIndex.length === 0) {
    renderPDF()
    return
  }
  const { start, oldStart, end, oldEnd, container, pages } = baseParams
  let replaceStart = 0
  let replaceEnd = 0
  if (sameIndex[2] === 'up') {
    replaceStart = end - oldStart
    replaceEnd = oldEnd - oldStart
  } else if (sameIndex[2] === 'down') {
    replaceStart = oldStart - oldStart
    replaceEnd = start - oldStart
  }
  let pdfWraps = document.querySelectorAll('.the-wrapper')

  if (sameIndex[2] === 'up') {
    for (let i = replaceStart; i < replaceEnd; i++) {
      container.insertBefore(pdfWraps[i], container.firstChild)
    }
  } else if (sameIndex[2] === 'down') {
    for (let i = replaceStart; i < replaceEnd; i++) {
      container.insertBefore(pdfWraps[i], null)
    }
  }
  renderPDF()
}
function loading() {
  let { el, preDom, postDom } = baseParams
  if (el.scrollTop > postDom.offsetTop) {
    showLoading()
  } else if (el.scrollTop < preDom.clientHeight) {
    showLoading()
  } else {
    hideLoading()
  }
  el = preDom = postDom = null
}

export function listerScroll() {
  let el = baseParams.el

  let timer = null

  el.addEventListener('scroll', function(e) {

    loading(e)

    clearTimeout(timer)
    timer = setTimeout(() => {
      baseParams.canCal && scrollEnd()
    }, 200)
  })

  el = null
}
