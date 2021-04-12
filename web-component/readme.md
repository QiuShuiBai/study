# web components

web components 是以原生形式来进行类似 vue 的组件定义。主要是通过 `HTMLElement` 及 `customElements` 两个内置的接口。

整体概念可以通过 [MND](https://developer.mozilla.org/zh-CN/docs/Web/Web_Components) 了解

## 基础介绍

现在假设定义一个简单的 `dialog`

```html
<div class="wrapper">
  <h2 class="title">标题</h2>
  <p class="content">内容</p>
  <button class="button">按钮</button>
</div>
```

如果写成一个 web components 的形式则需要首先在 html 中添加自定义的标签，在这里暂且叫 `custom-dialog`。

```html
<custom-dialog></custom-dialog>
```

接下来需要添加关于 `custom-dialog` 的定义：

```js
class CustomDialog extends HTMLElement {
  constructor() {
    super()

    // 定义
  }
}
```

> HTMLElement介绍 （可忽略这段）
>
> 这里先介绍下 `HTMLElement`，根据上面写法，我们可以先认为这是一个类。所有的 html 元素都是基于这个类来的。
>
> 这里的 html 标签指的是 html 中自有的标签，svg 虽然也能用在 html 中，但它是 svg 元素，其来源于 SVGElement
>
>`HEMLElement` 继承于 `Element` 及 `GlobalEventHandlers`。后者提供了事件接口，比如 `onclick`
>
> GlobalEventHandlers 只提供了 `onclick`、`onkeyup` 等事件，而 touch 事件如 `onTouchStart` 来自于 `HTMLElement`这个类。同时 `addEventListener` 来自于 `EventTarget` 接口
>
> 而 HTMLElement 是基于 `Element` 类来的，层层递归，具体可通过谷歌开发者工具查看：
>
>![图](https://dpubstatic.udache.com/static/dpubimg/4adb1610-02cf-4650-a60d-4e11673864f3.jpeg)

现在已经定义一个 `CustomDialog` 类，并且其继承了 `HTMLElement` 类。（当然在这里可以继承其他标签类，这块内容后续再提。）之后我们需要在类中定义组件的行为。（通过dom操作）

一个 dialog 需要有标题、内容和一个按钮，那么我们先生成这三个元素：

```js
constructor() {
  super()

  const h = document.createElement('h2')
  h.textContent = '标题'
  const p = document.createElement('p')
  p.textContent = '内容'
  const button = document.createElement('button')
  button.textContent = '按钮'

  const wrapper = document.createElement('div')

  wrapper.append(h, p, button)
  this.append(wrapper)
}
```

定义完毕后，还需要通过 `window.customElements.define` 这个 api 进行注册。整体如下：

```html
<custom-dialog></custom-dialog>
<script>
  class CustomDialog extends HTMLElement {
    // 省略 ... 
  }
  // 定义
  window.customElements.define('custom-dialog', CustomDialog)
</script>
```

现在整体上可以理解为，在 html 处添加了自定义的 `custom-dialog` 标签，然后通过继承 `HTMLElement` 基础类定义好了 `CustomDialog` 类，最后通过
`customElements.define` 注册了一个 web components 组件。

### 样式问题

目前为止，一个最基本的内容就出来了，只不过我们的组件暂时还没有样式。现在添加一下简单的样式文件。方式很简单，可以如正常写 css 一般给 web components 组件添加类名。

```js
const wrapper = document.createElement('div')
wrapper.classList.add('custom-dialog-wrapper')
```

```css
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
.custom-dialog-wrapper h {
  font-size: 24px;
}
.custom-dialog-wrapper p {
  margin: 10px 0;
  font-size: 18px;
}
.custom-dialog-wrapper button {
  width: 50px;
}
```

上面是一个简单的样式，效果如下图：

<img src="https://dpubstatic.udache.com/static/dpubimg/eeb60aee-313a-473a-b63a-bd07a35e25fd.png" width = "80%"></img>

这样给带来了一个新问题：如果我把 script 标签里的内容单独抽成 js 文件，那么需要在使用处再单独引入一份 css 文件，这显然是没法接受的。解决办法也很简单，用 js 去写 css 就好了。

```js
constructor() {
  const style = document.createElement('style')
  // 省略部分内容
  style.innerHTML = `
    .custom-dialog-wrapper {
    }
  `
  wrapper.append(h, p, button)
  this.append(style, wrapper)
}
```

> 可访问该 [链接](https://github.com/QiuShuiBai/study/blob/ba9d316bb7c8a0b468eaff2fb9468bf717bdc008/web-component/index.html)查看当前详细代码

如此一来，我们就可以在任意需要使用到 `custom-dialog` 组件的地方，引入该js文件即可。

### customElements.define

上面文章提到，定义完一个 web components 类后，需要调用 `customElements.define` 对其进行注册。

```js
window.customElements.define('custom-dialog', CustomDialog)
```

该方法其实接收3个参数：name —— 自定义元素名、constructor —— 自定义元素构造器和`options` —— 控制元素如何定义。 options 仅有一个选项 extends：表示指定继承的已创建的元素，被用于创建自定义元素。可查看 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/API/CustomElementRegistry/define#%E5%8F%82%E6%95%B0)

还记得我们定义 web components 组件类时，继承了 `HTMLElement` 类吗？在这里是可以继承其他 `HTMLElement子类` 的。比如可以继承 `HTMLButtonElement` 及 `HTMLCanvasElement`。这种继承了其他标签类的 web components 组件，在 html 编写时，不能直接写注册的标签名，需要通过 `is属性` 进行注册：

```html
<input is="custom-input" />
```

注：每中标签可能有自己的一些默认属性及方法，比如 canvas 标签是 `HTMLCanvasElement` 类的实例，有 width、height 属性；而 `HTMLDivElement` 类的实例 div 标签则没有这两属性。

<img src="https://dpubstatic.udache.com/static/dpubimg/f9268990-a875-490b-8281-ac1b5537a30b.jpeg" width = "40%"></img>  <img style="margin-left: 20px" src="https://dpubstatic.udache.com/static/dpubimg/d8201bc0-3183-4249-8d36-50acd08c0cc4.jpeg" width = "40%"></img>

上面两张图很好证明了 canvas 是有 [width、height 属性](https://developer.mozilla.org/zh-CN/docs/Web/API/HTMLCanvasElement#%E5%B1%9E%E6%80%A7)。

继承具体的标签类还需要做一些事情，通过 `define` 方法注册时需要传入第三个参数`extends`。下方代码选择了继承 input，且 `define` 传入 extends 参数。

```html
<input is="custom-input" />
<script>
  class CustomInput extends HTMLInputElement {
  }
  window.customElements.define('custom-input', CustomInput, { extends: 'input'} )
</script>
```

通过继承标签子类，可以省去开发时手动去对一些属性进行传递，有点类似于 vue 语法中的 [v-bind="$attrs"](https://cn.vuejs.org/v2/api/#vm-attrs)。比如上面的 `custom-input` 如果要改变 type 类型，用户在使用时，直接更改 type 就好，而若是通过继承基础类 `HTMLElement`，那么需要人工 `createElement('input')` 一个 input，再获取到用户定义的 type 后手动更新。（关于获取，后续会说到）

注册完毕后，可以通过 `document.createElement('custom-input')` 创建标签实例，或者可以通过 `new CustomInput()` 进行创建一个实例，在通过 dom操作 添加进文档中：

```js
const customInput = document.createElement('custom-input')
// 等同于
const customInput = new CustomInput()
```

### shadow DOM

详细可访问[MDN](https://developer.mozilla.org/zh-CN/docs/Web/Web_Components/Using_shadow_DOM#%E5%9F%BA%E6%9C%AC%E7%94%A8%E6%B3%95)了解。

shadow DOM 主要为了隔离自定义的组件与 dom，起到互不影响的作用，比如确保不受外部的 css 影响。使用也很简单：

```js
constructor() {
  // 省略
  const shadow = this.attachShadow({mode: 'open'})

  // this.append(style, wrapper)  原先
  // 替换成我们定义的 shadow
  shadow.append(style, wrapper)
}
```

这样我们的组件就与dom 文档进行了隔离，成为了一段独立的 dom。`attachShadow` 方法中的 `mode` 有两个值：open 和 closed。当为 open 时，外部 js 可通过 `shadowRoot` 属性访问 shadow 节点；为 closed 则无法访问。下图是为open时的访问结果：

<img src="https://dpubstatic.udache.com/static/dpubimg/2025c43a-4617-404a-95e2-6b375959916e.jpeg">

可以看到 mode 为 open 时，写在外部的 css 已经不能影响到 shadow dom 中的代码，那么如果有定义样式的需求时，该如果做呢？答案也很简单，既然可以拿到 shadowRoot 结点，那么直接定义好 css 样式，在通过 js 添加进去就好。

```js
window.customElements.define('custom-dialog', CustomDialog)

const dialog = document.querySelector('custom-dialog').shadowRoot
const customStyle = document.createElement('style')
customStyle.innerHTML = `
  .custom-dialog-wrapper {
    color: red;
  }`
dialog.append(customStyle)
```

当 mode 为 closed 时，则外部无法通过 shadowRoot 访问，此时外部就无法对组件内容进行操作了

<img src="https://dpubstatic.udache.com/static/dpubimg/80e308bf-5e7c-4189-9748-5ce9eb15d807.jpeg">

不论 attachShadow 中 mode 参数为 open 或 closed，web components 的样式都只能写在自定义组件内，不能再像最开始一样写在全局。

### template

[template](https://developer.mozilla.org/zh-CN/docs/Web/HTML/Element/template) 本身很简单，就是一个不会被渲染的 dom 元素。我们可以在 html 处通过 `template` 标签定义好我们的 dom 结构，这样就不需要通过 `document.createElement` 等操作进行创建了。

```html
<template id="custom-dialog-wrapper">
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
</template>
```

定义好模版后，通过js 获取后，复制一份并添加即可。

```js
constructor() {
  super()

  const shadow = this.attachShadow({mode: 'closed'})
  const template = document.getElementById('custom-dialog-wrapper')
  shadow.append(template.content.cloneNode(true))
}
```

注意，我们这里是复制一份 node，这样做的目的是如果有多例，其中操作不影响初始模版。当我们如果需要更改一下东西时，则需要通过 dom 进行更改。比如更改“内容”文案

```js
const shadow = this.attachShadow({mode: 'closed'})
const dialog = document.getElementById('custom-dialog-wrapper').content.cloneNode(true)
dialog.querySelector('p').textContent = '更新文案'
shadow.append(dialog)
```

现在又出现了和 style 一样的问题，如果 template 写在 html 中，则会出现不能直接引入 js 文件使用，解决也类似。通过 js 进行定义，不过此时既然通过 js 来定义，就可以不使用 template 标签了。

```js
constructor() {
  super()

  const shadow = this.attachShadow({mode: 'open'})
  
  shadow.innerHTML = `
    <style>
    // 省略 css
    </style>
    <div class="custom-dialog-wrapper">
      <h2>标题</h2>
      <p>内容</p>
      <button>按钮</button>
    </div>
  `
}
```

### slot

slot 和 vue 中的 slot 很相似，这里简单提供一个例子，在 custom-dialog 里提供了一个具名插槽 `tips`

```js
constructor() {
  super()
  const shadow = this.attachShadow({mode: 'open'})
  shadow.innerHTML = `
    // 省略 ..
    <div class="custom-dialog-wrapper">
      <h2 class="title">标题</h2>
      <p class="content">内容</p>
      <slot name="tips"></slot>
      <button class="button">按钮</button>
    </div>
  `
}
```

然后在使用处，传入要插入的结点，并且选择 `tips` 插槽

```html
<style>
  .tips {
    color: palevioletred;
  }
</style>
<custom-dialog>
  <p slot="tips" class="tips">补充</p>
</custom-dialog>
```

可以看到 tips 在dom结构中，出现在了 shadow root 之外，所以 tips 这个dom可以由用户自由操作

![slot](https://dpubstatic.udache.com/static/dpubimg/c9ik4-SZoF/slot.jpeg)

### 事件钩子

这里直接引用 [MDN](https://developer.mozilla.org/zh-CN/docs/Web/Web_Components/Using_custom_elements#%E4%BD%BF%E7%94%A8%E7%94%9F%E5%91%BD%E5%91%A8%E6%9C%9F%E5%9B%9E%E8%B0%83%E5%87%BD%E6%95%B0) 描述

>connectedCallback：当 custom element首次被插入文档DOM时，被调用。
>
>disconnectedCallback：当 custom element从文档DOM中删除时，被调用。
>
>adoptedCallback：当 custom element被移动到新的文档时，被调用。
>
>attributeChangedCallback: 当 custom element增加、删除、修改自身属性时，被调用。

有两个需要注意的点：

1. adoptedCallback 这个回调触发可详细查看 [stackoverflow](https://stackoverflow.com/questions/50995139/when-does-webcomponent-adoptedcallback-fire) 中的描述。需要用到 [adoptNode](https://developer.mozilla.org/zh-CN/docs/Web/API/Document/adoptNode) 这个API 去触发。

    我们可以复制一份当前的 html，然后新建一个 `test.html`，然后启动服务，分别运行起当前的 html 文件和 test.html 文件。（我用的是 [live-server](https://www.npmjs.com/package/live-server)

    ```html
    <script>
      const iframe = document.createElement('iframe')
      iframe.src = 'http://127.0.0.1:8080/test.html'
      document.body.append(iframe)
      setTimeout(() => {
        let iframeDialog = iframe.contentWindow.document.querySelector('custom-dialog')
        console.log(iframeDialog)
        document.body.appendChild(document.adoptNode(iframeDialog))  
      }, 1000)
    </script>
    ```

2. attributeChangedCallback 需要被监听的属性才会触发。需使用observedAttributes() get 函数进行配合

    ```js
    class CustomDialog extends HTMLElement {
      static get observedAttributes() {
        return ['content', 'tips']
      }
    }
    ```

    这样当 content 和 tips 属性被修改时，就会触发 `attributeChangedCallback`

    ```html
    <custom-dialog content="新的内容"></custom-dialog>
    ```

## 封装组件

上半篇幅仅是关于如何创建一个 web components 及相关技术介绍，关于运用方面还未提及。既然是一个组件，以常用的 vue 组件为原型需要提供：

1. props 功能让用户修改数据

2. events 供用户监听相关行为

3. api 供用户主动调用组件方法

基于上述，来实现一个简单 dialog，用户可以：

1. 通过修改 html attributes 来达到修改组件值

2. 用户可添加监听事件

3. 能暴露方法供用户主动调用

### 起步

首先拿到上半篇时的代码，然后开始魔改。可通过该 [链接](https://github.com/QiuShuiBai/study/tree/ffa926cb5c4d410a2d91e6bc0b8019c81de393bb/web-component) 获取。

首先进行 html、js 分离，抽离 `CustomDialog` 为一个单独的 js 文件 `custom-dialog.js`。

### 简单封装

基于 vue 习惯，给实例添加两个属性：`data` 和 `methods`，同时通过 `Object.defineProperty` 进行代理：

```js
class CustomDialog extends HTMLElement {
  data = {
    title: '标题',
    content: '内容',
    btnText: '确认'
  }
  methods = {
    // 后续补上
  }
  constructor() {
    super()
    this.proxy()
    // 省略
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
}
```

注意 data 的 set 部分，当我们获取到 CustomDialog 的实例后，可以直接修改实例上的 `title` 属性来触发 `setAttribute` 原生 dom 操作。接下来需要对属性的修改进行监听：

```js
class CustomDialog extends HTMLElement {
  // 省略
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
```

此时，当直接修改实例 title 属性或通过 `setAttribute` 方法修改 html 属性时，都会触发 `attributeChangedCallback` 方法。

```js
document.querySelector('custom-dialog').title = '新的标题'
// 或者
document.querySelector('custom-dialog').setAttribute('title', '新的标题')
```

接着看 `attributeChangedCallback` 方法中，是需要在实例上找到 `titleDom` 或 `contentDom` 这个属性的，很明显现在还没有...我们抽离 constructor 中，初始化 dom 的部分并给实例添加 render 方法

```js
class CustomDialog extends HTMLElement {
  // 省略
  constructor() {
    super()
    this.proxy()
    this.render()
  }
  render() {
    const shadow = this.attachShadow({mode: 'open'})
    shadow.innerHTML = `
      <style> 省略 css </style>
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
}
```

可以看到，因为之前代理了 data 属性，所以在此时可以直接用在模版字符串里（有点类似 vue template 的味道吧）。后续便是定义 `titleDom` 等变量，于此配合 `attributeChangedCallback` 方法，整个组件最基础的部分完成了。

> 注意这类的模版，添加了 title 等 class 变量，单纯便于后续获取 dom

[代码在此](https://github.com/QiuShuiBai/study/blob/master/web-component/custom-dialog.js)
