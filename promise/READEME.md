# 手动实现 Promise

手动实现一个简易版 Promise 有助于对 Promise 本身的学习，同时这种分析方法也可以应用在多中其他地方

## 分析原有的 Promise 并实现

首先让我们写一个简单的 Promise 程序

```js
const promise = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('heiheihei')
  }, 3000)
})

promise.then((res) => {
  console.log(res)
})

```

很显然，如果我们要实现一个 Promise 就一定需要向原生看齐。首先 Primise 是一个类。那么自己的 myPromise 首先就是一个构成函数

```js
  function myPromise() {
   return
 }

 const myPromise = new myPromise()
```

很明显，myPromise 首先需要接收一个函数作为参数，且该函数在初始化时直接运行。

```js
function myPromise(fn) {
  fn()
}
```

fn运行时，可以明显看到会接收两个函数，分别是 `resolve` 和 `reject`。那么给 `myPromise` 补充上

```js
function myPromise(fn) {
  const resolve = () => {
  }
  const reject = () => {
  }
  fn(resolve, reject)
}
```

myPromise 的实例化后，实例对象具有 .then 方法，我们可以把该方法添加在原型链中。

```js
myPromise.prototype.then = function(fn) {
}
```

好了，目前为止，我们自己的 `myPromise` 完成了基本骨架，从 new 到 .then，具体的逻辑让我们继续分析。

原生 `.then` 方法运行后，会收集回掉，并且等待 `resolve` 方法运行后再执行。

那么我们可以得出两个结论，`.then` 进行收集， `resolve` 进行执行收集的函数。首先定义两个数组，用于收集.then 及 .catch 中传入的回调

```js
function myPromise(fn) {
  this.successHandler = []
  this.failHandler = []
  const resolve = () => {
  }
  const reject = () => {
  }
  fn(resolve, reject)
}
```

之后在 `.then` 方法运行时，添加在 successHandler 中

```js
myPromise.prototype.then = function(fn) {
  this.successHandler.push(fn)
}
```

在这之后，调用 `resolve` 会触发回调

```js
const resolve = (...res) => {
  this.result = res
  this.successHandler.forEach(cb => cb(...res))
}
```

## 总结

一个超级简易的 Promise 就实现了，当然里面还欠缺着很多功能，如 new myPromise 时，传入的函数同步执行，那么会先执行 `resolve` 后执行 `.then`，这导致 `resolve` 触发回调时，回调集合还没有数据。

主要思想体现在遇见问题，先宏观思索该函数需要实现什么功能。大致列出后，再完善代码细节最后实现功能。这种思路在面对一些编程题时十分有效。
