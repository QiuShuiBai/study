# proxy

基于 阮一峰老师的 [es6](https://es6.ruanyifeng.com/#docs/proxy)，简单体验 proxy

## 与Object.defineProperty 不同

index.html 中，与 proxy 与 Object.defineProperty 不同在于：通过 `Reflect.set(target, key, value, receiver)` 给子元素添加完属性后，不会再发生访问到父元素的代理

可以理解为 `Reflect.set` 直接赋值给了子元素，且子元素没有对该值代理。
