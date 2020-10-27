import { baseParams, dynamicParams } from '../utils/params'
import * as dom from '../utils/dom'
import { PDFPageView } from '../pdf'
const urlFast = 'http://0.0.0.0:3000/heiheihei'
const urlSlow = 'http://0.0.0.0:3000/hahaha'

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

  const scaledViewport = pdfPage.getViewport({ scale: scale, rotation: rotation })

  return scaledViewport
}

export function initPagesConfig(scaledViewport) {
  const pdfPageCount = baseParams.pdfPageCount
  const pages = []

  // this.divWidth = (this.horizontal ? this.bodyClientWidth : Math.floor(scaledViewport.width)) + 'px'
  // this.divHeight = (this.horizontal ? this.bodyClientHeight : Math.floor(scaledViewport.height)) + 'px'
  baseParams.divWidth = baseParams.bodyClientWidth
  baseParams.divHeight = baseParams.bodyClientHeight

  PDFPageView.prototype.scaledViewport = scaledViewport

  for (let i = 0, len = pdfPageCount; i < len; i++) {
    pages[i] = new PDFPageView({
      pageNum: i + 1
    })
  }

  baseParams.pages = pages
}

export function getVisiblePages(index) {
  // index = this.vertical ? this.pdfPageCount - index : index
  const pdfPageCount = baseParams.pdfPageCount

  if (!dynamicParams.count) {
    const _count = Math.max(10, Math.floor(baseParams.el.clientHeight / baseParams.divHeight))
    baseParams.visibleCount = _count + (_count % 2 === 1)
  }

  const visibleCount = baseParams.visibleCount
  dynamicParams.oldStart = dynamicParams.start
  dynamicParams.oldEnd = dynamicParams.end

  let start = Math.max(0, index - visibleCount / 2)
  let end = Math.min(start + visibleCount, pdfPageCount)
  if (end === pdfPageCount) {
    start = Math.max(0, end - visibleCount)
  }

  dynamicParams.start = start
  dynamicParams.end = end
}

export function initDomStruct() {
  const visibleCount = baseParams.visibleCount
  if (!baseParams.finishInitDom) {
    baseParams.finishInitDom = true
    dom.createCanvas(baseParams.el, visibleCount)
    dom.createBlockDom(baseParams.el)
  }
}

export function renderPDF(pdfDocument) {
  const pages = baseParams.pages
  const canvasArr = document.querySelectorAll('.the-canvas')

  for (let i = dynamicParams.start, len = dynamicParams.end; i < len; i++) {
    if (!pages[i].drew) {
      pdfDocument.getPage(pages[i].pageNum).then(pdfPage => {
        pages[i].draw(pdfPage, canvasArr[i - dynamicParams.start])
      })
    }
  }
}
