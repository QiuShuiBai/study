# vue 中，反常this 原理

vue 中 methods 及 data 中，this指向有些不符合编程思想。比如：

```js
export default {
  data() {
    return {
      name: 'zc'
    }
  },
  methods: {
    getName() {
      return this.name
    }
  },
  create() {
    const name = this.getName()
    console.log(name) // zc
  }
}
```

在 `create` 事件，为什么能直接通过 `this` 访问到 `methods` 中的对象。 `methods` 对象中的方法又如何访问到了 `name` 属性？

带着这些疑问阅读 `vue` 代码，发现如 `data`，vue会做以下处理：

```js
function initData (vm: Component) {
  // ....
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}
  // ....
}
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

简单解释一下：

vue 先把 data 运行得到的对象挂载在 `this._data` 中

`target` 就是我们的 `this`，`key` 就是我们想要访问 data 中的属性。vue 通过代理 this 中对应的 key，让用户在 `this.key` 时，代理访问到 `this._data.key`。这样就达到了代理访问 data 的功能

而 methods 的代理比 data 更加简单

```js
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  // ...
  vm[key] = typeof methods[key] !== 'function' ? noop : bind(methods[key], vm)
}
```

Vue 直接把 methods 中的方法，通过bind 生成方法挂载在 `this` 上。于是 methods 这种方法的 this 都指向实例本身。

其他的 this 指向大同小异。不细说。
