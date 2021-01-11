# 关于 pdf.js 开源库的实践、优化、代码解读

index.html 是简单demo，可以根据其中思想，改造成对应的 Vue 组件、React 组件

## 实践

<!-- TODO：改为压缩后，代码链接 -->
pdf.js 为移动端提供了一套 css 和 js。已经很好用了，但是有些需求并不能满足，同时如果使用这一套ui，需要引入压缩前 300kb 对应的js功能代码。

出于引入文件大小、实现功能的考虑、及相对应的优化操作。同时在实现过程中进行了项目优化。[代码链接]()

### 需求梳理

pdf 有横屏和竖屏两种尺寸。这两种尺寸的 pdf 内容特点是不一样的：

- 竖屏 pdf 类似简历、文章等，阅读习惯是由上往下，两页间的内容是强连贯的。

- 横屏 pdf 类似 ppt，页与页多为段落关系，连贯不强。

因为有两种尺寸的 pdf，同时内容侧重点不同，我们决定实现下述的交互形式：

- 竖屏 pdf 默认竖屏显示，同时提供旋转视图的功能，可以横屏观看。（宽度放大，内容变大）

- 横屏 pdf 默认横屏显示，不提供旋转功能（没必要..）

- 进度条、页码提示等辅助功能

- 拖动进度条，跳转对应页码

### 加载

首要的就是加载

```js
const loadingTask = pdfjsLib.getDocument(this.url)
loadingTask.onProgress = function(progressData) {
  let text = Math.floor(progressData.loaded / progressData.total * 100)
  if (text <=1) {
    text = '加载中 ' + '1%'
  } else if (text > 1 && text < 100) {
    text = '加载中 ' + text + '%'
  } else if (text === 100) {
    text = '加载中 ' + '99%'
  }
  showLoading(text)
}
```

```js
let loadingDom = document.getElementById('loading')
function showLoading(text) {
  // loading 代码，简单示意
  loadingDom.innerText = text
}
```

#### 加载时的进度提示

[文档](https://mozilla.github.io/pdf.js/api/draft/module-pdfjsLib-PDFDocumentLoadingTask.PDFDocumentLoadingTask.html)中提到了 `onProgress` 方法，方法接收一个对象，该对象有，当前下载`loaded`、总大小`total`两个字段。

这两个参数来源于 XMLHttpRequest对象中的[onprogress](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequestEventTarget/onprogress)事件，同时会通过[lengthComputable](https://developer.mozilla.org/zh-CN/docs/Web/API/ProgressEvent/lengthComputable)参数判断是否能取事件中`total`参数，若不能则降级取 response header 中的 `Content-length`

```js
this.onProgress({
  loaded: data.loaded,
  total: data.lengthComputable ? data.total : this._contentLength,
})
```

这里有一个小细节，当 pdf 下载好后，还需要进行渲染，应该在pdf渲染完毕后再把 loading 取消，所以这段时间提示进度 99%。

PS：如果使用分片加载，loading 不显示当前下载进度。该进度是文件总进度，分片下载时，某部分已经下载并绘制成功但文件并不一定全部下载成功。

### 判断横竖尺寸

`getViewport` 提供了一些关于 pdf 视图的信息。判断宽高即可。此时设置变量 `isVertical` 为 `true`，保存当前 pdf 类型。同时设置`rotation`，用于在绘制时旋转pdf。介绍一下现在有的变量，这些变量将在优化时使用：

- pdfPageCount：pdf页数
- isVertical：是否时横屏的pdf
- scaledViewport：pdf将要渲染的 pdf 尺寸

```js
loadingTask.promise
  .then(async pdfDocument => {

    this.pdfPageCount = pdfDocument.numPages

    const pdfPage = await pdfDocument.getPage(1)

    const desiredWidth = document.body.clientWidth // 屏幕宽度
    const desiredHeight = document.body.clientHeight // 屏幕高度

    const viewport = pdfPage.getViewport({ scale: 1 }) // pdf的宽高

    let scale
    let rotation = 0
    if (viewport.width <= viewport.height) {
      scale = (rotation ? desiredHeight : desiredWidth) / viewport.width
    } else {
      this.horizontal = true
      scale = Math.min(desiredHeight / viewport.width, desiredWidth / viewport.height)
      rotation = 90
      this.isVertical = true
    }
    this.scaledViewport = pdfPage.getViewport({ scale: scale, rotation: rotation })
  })
```

### 绘制

`pdfPage` 是我们调用 getPage(num) 得到的对象，num 代表的是对应 pdf 的页数。

```js
const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
pdfPage.render({
  canvasContext: ctx,
  viewport: this.scaledViewport
}).then(res => {
  hideLoading()
})
```

### 小结

至此我们在页面上绘制好了一页 pdf。下载可以通过分片进行优化，绘制方面则有一个很明显的性能优化点：类似图片的懒加载，用户浏览 pdf 时并不需要把所有的 pdf 内容进行绘制。这是可以转换成长列表的优化问题。

1. 类似于普通的列表页，浏览到下一页时，进行明显的等待绘制。如[pullup](https://better-scroll.github.io/examples/#/pullup/)。这种方式的缺点很明显，比如用户不能直接从 pdf 靠前的部位滑动到靠后的部分。

2. 根据页数生成对应数量的 dom，当该 dom 被阅读时进行 pdf 绘制。

3. 无限滚动，页面只保留固定数量的 dom，阅读到不同 pdf 页时，对 dom 内容进行替换。

这里我们选择第三种，因为有些 pdf 的页数高达 200 页，需要对 dom 数量进行优化。

### 滚动

我们这里使用 10个 dom 来显示pdf，2个占位dom放置在10个显示 dom 的前后

```html
<div id="top-block"></div>
<div class="pdf-wrap"></div>
...
<div class="pdf-wrap"></div>
<div id="under-block"></div>
```

计算出当前阅读的页数后，始终让10个显示dom的第5个位于视图区。同时根据整个列表高度，分别计算出两个占位 dom 的高度，达到撑开页面大小的目的。

(图-dom结构)

```js
// 这里假设
// divHeight 为一页 pdf 的高度
// pdfPageCount 为 pdf 总页数
// startIndex、endIndex 为10个显示 dom 开始、结束的页码(序号)
const topDivHeight = divHeight * startIndex
const underDivHeight = divHeight * (pdfPageCount - endIndex)
document.getElementById('top-block').style.height = topDivHeight + 'px'
document.getElementById('under-block').style.height = underDivHeight + 'px'
```

通过使用占位dom带来的好处有下面几个

- 节约 dom 的数量

- 伪造出整个长列表

- 为后续进度条交互提供便捷

### 滚动条

通过拖动滚动条来使视图滚动时会造成性能上的浪费：当视图滚动到占位 dom 时，内容未渲染但视图dom 跟随进度条的滚动而滚动。此时通过计算，确定用户视图只有占位dom的内容时，可以只做进度条的滚动而不做视图的滚动。

（图-占位dom不进行滚动）

### loading

因为我们使用占位 dom 模拟整个列表长度，而占位dom是没有内容的，所以需要让用户滑动到占位dom时进行loading弹框，减少用户焦虑。

在本次需求的策略是当用户滑动视图后1s及滑动进度条出现占位dom时，进行弹框。关于 1s 有这几点考虑：

- 如果用户滑动的幅度小，在1s内会完成新 pdf 内容的绘制及占位dom的高度更新，这种情况计算的过程对用户无感知

- 滑动幅度大，因为显示dom始终保持在10个视图dom的中间位置，当出现占位dom后，滑动开始后1s弹框不会让单纯的占位dom出现太久

关闭 loading 的时机很简单，绘制完显示的pdf及计算好占位dom的高度后。

### 替换dom

假设一开始显示的是 11 - 20 页，用户滑动后显示的是 14 - 23 页，此时第 14 - 20页部分的dom可以保留，这样只需要更改／替换3个dom。本质上其实是 Vue 的 diff算法。

因本项目使用的是 Vue 框架，可以直接通过 v-for 中 key 关键字进行良好的性能优化

```html
<div class="ppdf-wrapper border-bottom-1px"
  v-for="(item, index) in showPage"
  :key="item.pageNum"
  :style="'width:'+ divWidth + ';height:' + divHeight">
  <canvas :ref="'canvas' + index"></canvas>
</div>
```

showPage 是需要显示pdf内容的一些信息，每一项都有个惟一属性 pageNum，表示当前对象代表的是第几张 pdf，在 showPage 数组变化触发视图更新时，vue 内部通过惟一key可以进行dom复用，达到性能优化的目的。
