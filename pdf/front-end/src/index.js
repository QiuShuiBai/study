import './index.styl'

import * as PDF from './render'
import { baseParams } from './utils/params'

PDF.loadPDF({
  el: '#pdf-wrapper'
}).then((loadingTask) => {

  loadingTask.promise.then(async function(pdfDocument) {

    baseParams.pdfPageCount = pdfDocument.numPages

    const scaledViewport = await PDF.getPdfViewPort(pdfDocument)

    PDF.initPagesConfig(scaledViewport) // 初始化，每一项为 pdf 页

    PDF.getVisiblePages(1) // 得到需要渲染的页数

    PDF.initDomStruct() // 根据需要渲染的页数，初始化dom结构

    PDF.renderPDF() // 渲染 pdf

    PDF.listerScroll() // 监听滚动行为
  })
})


