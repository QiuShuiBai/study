class MyHTMLElement extends HTMLElement {
  constructor() {
    super()
    this.proxy()
  }
  proxy() {
    const { methods, data } = this.constructor
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
}

class CustomDialog extends MyHTMLElement {
  constructor() {
    super()
    this.render()
  }

  static data = {
    title: '标题',
    content: '内容',
    btnText: '按钮'
  }

  static methods = {
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
        .custom-dialog-wrapper .title {
          margin: 0;
          font-size: 24px;
        }
        .custom-dialog-wrapper .content {
          margin: 10px 0;
          font-size: 18px;
        }
        .custom-dialog-wrapper .tips {
          margin-bottom: 10px;
          font-size: 12px;
          color: #333;
        }
        .custom-dialog-wrapper .button {
          width: 50px;
        }
      </style>
      <div class="custom-dialog-wrapper">
        <h2 class="title">${this.title}</h2>
        <p class="content">${this.content}</p>
        <slot name="tips">
        </slot>
        <button class="button">${this.btnText}</button>
      </div>
    `

    this.titleDom = shadow.querySelector('.title')
    this.contentDom = shadow.querySelector('.content')
    this.buttonDom = shadow.querySelector('.button')
  }
  static get observedAttributes() {
    return Object.keys(CustomDialog.data)
  }
  attributeChangedCallback(name, oldValue, newValue) {
    const dom = name + 'Dom'
    if (this[dom]) {
      this[dom].textContent = newValue
    }
  }
  connectedCallback() {
    const catEvent = this.getAttribute('oncat')
    const onCat = this.onCat
    if (onCat) {
      onCat()
    } else if (catEvent) {
      // eval(catEvent)
    }
  }
}
window.customElements.define('custom-dialog', CustomDialog)