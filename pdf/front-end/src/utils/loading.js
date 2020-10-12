const loadingDom = document.querySelector('.html-popup-content')
let loadingTextDom = document.querySelector('.html-toast-tip')
let isShow = true

export function showLoading(text = '请稍后') {
  loadingTextDom.text = text
  isShow = true
  loadingDom.style.display = 'block'
}

export function hideLoading() {
  isShow = false
  loadingDom.style.display = 'none'
}