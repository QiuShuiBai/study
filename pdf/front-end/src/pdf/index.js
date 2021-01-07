import { hideLoading } from '../utils/loading'

export function PDFPageView(options) {
  this.drew = false
  this.pageNum = options.pageNum
  this.pdfPage = null
}

let count = 0
PDFPageView.prototype.draw = function(pdfPage, canvas) {
  count++
  this.pdfPage = pdfPage
  this.drew = true

  const ctx = canvas.getContext('2d')
  const scaledViewport = this.scaledViewport
  canvas.height = scaledViewport.height
  canvas.width = scaledViewport.width
  canvas = null

  pdfPage.render({
    canvasContext: ctx,
    viewport: scaledViewport
  }).promise.then(() => {
    count--
    if (count === 0) {
      hideLoading()
    }
  })
}

PDFPageView.prototype.cleanup = function() {
  this.drew = false
  this.pdfPage.cleanup()
}
