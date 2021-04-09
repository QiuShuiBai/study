class CustomDialog extends HTMLElement {
  constructor() {
    super()

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
        <h2>标题</h2>
        <p>内容</p>
        <button>按钮</button>
      </div>
    `
  }
}
window.customElements.define('custom-dialog', CustomDialog)
