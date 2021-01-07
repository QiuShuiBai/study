import { baseParams } from '../utils/params'

export function createCanvas(el, count) {
  const pdfContainer = document.createElement('div') 
  pdfContainer.className = 'the-container'
  baseParams.container = pdfContainer
  
  for (let i = 0; i < count; i++) {
    const wrapper = document.createElement('div') 
    wrapper.className = 'the-wrapper'
    wrapper.style.height = Math.floor(baseParams.scaledViewport.height / 4) + 'px'
    wrapper.style.width = Math.floor(baseParams.scaledViewport.width / 4) + 'px'

    const canvas = document.createElement('canvas')
    canvas.className = 'the-canvas'

    wrapper.appendChild(canvas)
    pdfContainer.appendChild(wrapper)
  }
  el.appendChild(pdfContainer)
}

export function createBlockDom(el) {
  const preDom = document.createElement('div')
  preDom.className = 'pre-dom'

  const postDom = document.createElement('div')
  postDom.className = 'post-dom'

  el.insertBefore(preDom, el.firstChild)
  el.appendChild(postDom)
  return {
    preDom,
    postDom
  }
}
