class CustomDialog extends HTMLElement {
  data = {
    title: '标题',
    content: '内容',
    btnText: '确认'
  }
  methods = {
    show() {
      if (!this.parentNode) {
        document.body.append(this)
      }
      this.style.display = 'block'
    },
    hide() {
      this.style.display = 'none'
    }
  }
  constructor() {
    super()
    this.proxy()
    this.render()
    this.processEvents()
  }
  proxy() {
    const { methods, data } = this
    Object.keys(methods).forEach(key => {
      this[key] = methods[key].bind(this)
    })

    Object.keys(data).forEach(key => {
      Object.defineProperty(this, key, {
        get() {
          return this.getAttribute(key) || data[key]
        },
        set(val) {
          this.setAttribute(key, val)
        }
      })
    })
  }
  render() {
    const shadow = this.attachShadow({mode: 'open'})
    shadow.innerHTML = `
      <style>
        .custom-dialog-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          z-index: 100;
          transform: translate(-50%, -50%);
          box-sizing: border-box;
          padding: 16px;
          width: 300px;
          text-align: center;
          border-radius: 10px;
          box-shadow: 0px 0px 6px 0 rgba(0,0,0,0.20);
        }
        .custom-dialog-wrapper h2 {
          margin: 0;
          font-size: 24px;
        }
        .custom-dialog-wrapper p {
          margin: 10px 0;
          font-size: 18px;
        }
        .custom-dialog-wrapper button {
          width: 50px;
        }
      </style>
      <div class="custom-dialog-wrapper">
        <h2 class="title">${this.title}</h2>
        <p class="content">${this.content}</p>
        <button class="button">${this.btnText}</button>
      </div>
    `
    this.titleDom = shadow.querySelector('.title')
    this.contentDom = shadow.querySelector('.content')
    this.buttonDom = shadow.querySelector('.button')
  }
  processEvents() {
    this.buttonDom.addEventListener('click', () => {
      // DOM 0
      if (this.onConfirm) {
        this.onConfirm()
      } else {
        const htmlEvent = this.getAttribute('onConfirm')
        try {
          eval(htmlEvent)
        } catch {}
      }

      // DOM 2
      this.dispatchEvent(new CustomEvent('confirm'))
    })
  }

  static get observedAttributes() {
    return ['title', 'content', 'btnText']
  }
  attributeChangedCallback(name, oldValue, newValue) {
    const dom = name + 'Dom'
    if (this[dom]) {
      this[dom].textContent = newValue
    }
  }
}
window.customElements.define('custom-dialog', CustomDialog)

