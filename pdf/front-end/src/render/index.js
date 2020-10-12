
const urlFast = 'http://172.25.152.69:3000/heiheihei'
const urlSlow = 'http://172.25.152.69:3000/hahaha'

let native = window.location.href
let url = urlSlow

if (native.indexOf('heiheihei') > -1) {
  url = urlFast
}

export function rendPdf() {
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