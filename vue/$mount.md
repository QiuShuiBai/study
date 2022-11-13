# vue 调用 $mount 时发生了什么

`new Vue()` 后，如果传入的 options 里有 `el` 属性，那么 vue 会自动调用 `$mount` 方法，如果没有，则需要手动调用 `$mount` 方法。

```js
Vue.prototype._init = function (options?: Object) {
  // ...
  initLifecycle(vm)
  initEvents(vm)
  // ...
  initState(vm)
  // ...
  if (vm.$options.el) {
    vm.$mount(vm.$options.el)
  }
}
```

可以看到，在 `new Vue()` 调用 _init 方法后执行了一系列的 `init`，最后挂载。带着 `Vue` 是如何实现挂载的好奇，走进了源码。

## 关键步骤

`$mount` 执行调用 `mountComponent` 方法，从该方法名可知实际是对组件的挂载。

```js
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  return mountComponent(this, el, hydrating)
}
```

`mountComponent` 中又定义了一个 名为`updateComponent`的方法。同时 `new Watcher` 时会执行该方法（暂时不用在意 Watcher 逻辑）。

```js
export function mountComponent (
  vm: Component,
  el: ?Element,
  hydrating?: boolean
): Component {
  // ......
  let updateComponent = () => {
    vm._update(vm._render(), hydrating)
  }
  // ......

  new Watcher(vm, updateComponent, noop, {
    before () {
      if (vm._isMounted) {
        callHook(vm, 'beforeUpdate')
      }
    }
  }, true /* isRenderWatcher */)
}
```

`updateComponent` 方法首先调用 `vm._render()`，找到该方法

```js
Vue.prototype._render = function (): VNode {
  const vm: Component = this
  const { render, _parentVnode } = vm.$options
  // ...
  let vnode = render.call(vm._renderProxy, vm.$createElement)
  // set parent
  vnode.parent = _parentVnode
  return vnode
}
```

看到 _render 方法本质就是执行 render 方法得到 vnode。render 或是手写，或是日常开发时经 vue-loader 把 template 转化得到。总之，再这里只要知道 `_render` 方法是得到组件的 vnode

`updateCOmponent` 再把 `vnode` 当作参数，传入 `_update` 方法中

```js
Vue.prototype._update = function (vnode: VNode, hydrating?: boolean) {
  const vm: Component = this

  vm._vnode = vnode
  // ......
  vm.$el = vm.__patch__(vm.$el, vnode, hydrating, false /* removeOnly */)
}
```

`_updata` 本质是做一些逻辑判断，最后得处应该如何把 vnode 转化成真实 dom。核心便是 `__patch__`

省略 `__patch__`的一堆逻辑处理，最后得到执行 `patch` 方法，而 `patch` 最终会执行 `createElm` 方法。通过 `createElm` 方法名可知，离最后的生成、挂载又近了一步

```js
function patch (oldVnode, vnode, hydrating, removeOnly) {
  // ...
  createElm(
    vnode,
    insertedVnodeQueue,
    oldElm._leaveCb ? null : parentElm,
    nodeOps.nextSibling(oldElm)
  )
}
```

```js
function createElm (
  vnode,
  insertedVnodeQueue,
  parentElm,
  refElm,
  nested,
  ownerArray,
  index
) {
  // ...
  if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
    return
  }

  const data = vnode.data
  const children = vnode.children
  const tag = vnode.tag
  if (isDef(tag)) {
    vnode.elm = vnode.ns
      ? nodeOps.createElementNS(vnode.ns, tag)
      : nodeOps.createElement(tag, vnode)

    createChildren(vnode, children, insertedVnodeQueue)
    if (isDef(data)) {
      invokeCreateHooks(vnode, insertedVnodeQueue)
    }
    insert(parentElm, vnode.elm, refElm)

  } else if (isTrue(vnode.isComment)) {
    vnode.elm = nodeOps.createComment(vnode.text)
    insert(parentElm, vnode.elm, refElm)
  } else {
    vnode.elm = nodeOps.createTextNode(vnode.text)
    insert(parentElm, vnode.elm, refElm)
  }
}
```

在 `createElm`时，会先进行 `createComponent` 方法，在这里只简单介绍一下：此方法会优先创建子组件、并且让子组件再次走当前 `new Vue` 逻辑（方式不同）。这样的行为结果就是，先创建、插入子组件dom。

`createComponent` 方法插入子组件结束后，会根据当前 vnode 来创建 文本结点、注释、'div' 等真实dom 元素，最后通过 `insert` 方法再把该组件插入父元素中，以实现挂载。
