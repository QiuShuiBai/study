# 手动实现 Promise

手动实现一个简易版 Promise 有助于对 Promise 本身的学习，同时这种分析方法也可以应用在多中其他地方

## 分析原有的 Promise

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
