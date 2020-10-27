export function createCanvas(el, count) {
  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas')
    canvas.className = 'the-canvas'
    el.appendChild(canvas)
  }
}

export function createBlockDom(el) {
  const preDom = document.createElement('div')
  preDom.className = 'pre-dom'

  const postDom = document.createElement('div')
  postDom.className = 'post-dom'

  el.insertBefore(preDom, el.firstChild)
  el.appendChild(postDom)
}
