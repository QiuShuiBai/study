import { baseParams } from '../utils/params'

export function createCanvas() {
  const { visibleCount, divHeight, divWidth} = baseParams
  const pdfContainer = document.createElement('div') 
  pdfContainer.className = 'the-container'
  baseParams.container = pdfContainer
  
  for (let i = 0; i < visibleCount; i++) {
    let wrapper = document.createElement('div') 
    wrapper.className = 'the-wrapper'
    wrapper.style.height = divHeight + 'px'
    wrapper.style.width = divWidth + 'px'

    let canvas = document.createElement('canvas')
    canvas.className = 'the-canvas'

    wrapper.appendChild(canvas)
    pdfContainer.appendChild(wrapper)

    wrapper = canvas = null
  }
  baseParams.el.appendChild(pdfContainer)
}

export function createBlockDom() {
  let preDom = document.createElement('div')
  let postDom = document.createElement('div')
  let el = baseParams.el

  preDom.className = 'pre-dom'
  postDom.className = 'post-dom'
  el.insertBefore(preDom, el.firstChild)
  el.appendChild(postDom)
  baseParams.preDom = preDom
  baseParams.postDom = postDom
  
  preDom = postDom = el = null
}
