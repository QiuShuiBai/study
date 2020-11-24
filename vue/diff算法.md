# Diff 算法

> 基于 Vue 2.6.11

## 基本介绍

当组件的数据发生变化时，会触发组件该组件的 `render watcher` 中的 getter 方法 也就是

```js
updateComponent = () => {
  vm._update(vm._render(), hydrating)
}
```

该方法会把 组件（包括子组件）通过 `_render` 方法 转换成 vnode，同时在 `_update` 方法中进行组件 patch 以更新视图。而 `diff算法` 就是在[patch](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L709)  的过程中。

（图.....）

## 关于 diff 的前置了解

diff 发生在 patch 方法，该方法运行在 _update 中，因为在 $mount 挂载后，组件实例上已经有了 `_vnode` 结点所以接收了 旧、新两个vnode 进行diff

ps: 因为组件的必须要有一个根结点且只能有一个根结点，所以我们的组件 vnode 只有一个，这是我们 diff 算法的前提

```js
const prevVnode = vm._vnode
if (!prevVnode) {
  // 省略...
} else {
  vm.$el = vm.__patch__(prevVnode, vnode)
}
```

### patch 中的关键方法

diff 的过程中有几个函数至关重要 [sameVnode](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L35-L50)、[updateChildren](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L404-L474)、[patchVnode](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L501-L574)。

我们知道组件是具有嵌套关系的，自然组件转换为 vnode 后，vnode 也具有这种关系。

`sameVnode` 是用来比较新旧 vnode 是否部分相同，若是则有调用 `patchVnode` 进行深层次的比较。

`patchVnode` 是用来 diff 新旧 vnode 的入口函数。其中做了一些简单的 diff 过程，同时再满足一些条件后，调用`updateChildren`方法进行子节点 diff

`updateChildren` 是用来对子 vnode 列表进行 diff 的方法。通过调用 `sameVnode` 取出值得比较的新旧 vnode后，再调用 `patchVnode` 进行深层次的调用。

sameVnode 是辅助函数，patchVnode 和 updateChildren 则递归调用（禁止套娃）。

### sameVnode 辅助函数

这个函数是我们进行 diff 的关键，首先判断两个 vnode 的 `key` 是否相同，其次判断tag、isComment、dat、input类型等属性；isAsyncPlaceholder 是 ssr 渲染时的异步占位符结点，此时判断异步组件的加载函数是否相同，且 b 参数的异步加载没有失败。

```js
function sameVnode (a, b) {
  return (
    a.key === b.key && (
      (
        a.tag === b.tag &&
        a.isComment === b.isComment &&
        isDef(a.data) === isDef(b.data) &&
        sameInputType(a, b)
      ) || (
        isTrue(a.isAsyncPlaceholder) &&
        a.asyncFactory === b.asyncFactory &&
        isUndef(b.asyncFactory.error)
      )
    )
  )
}
```

函数只判断了两个 vnode 的部分属性，不要求所有属性全部相等。

## patch

整个 diff 从 [patch](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L700) 这个函数就已经开始了。

在 patch 里有两种情况，新旧结点不同，和新旧结点相同。

```js
const isRealElement = isDef(oldVnode.nodeType) // 此时 oldVnode 为虚拟结点，没有nodeType，所以为 false

if (!isRealElement && sameVnode(oldVnode, vnode)) {
  patchVnode(oldVnode, vnode) // 省略其他参数
} else {
  // 省略...
  // create new node
  createElm(vnode)
  // update parent placeholder node element, recursively
  // code 省略，更新父的占位符节点
  // destroy old node
  // code 省略，删除旧 vnode
}
```

不同：可以看到，通过 `sameVnode` 判断新旧结点不同时，简单粗暴的直接创建新的，删除旧的。

相同：则调用上面介绍的 patchVnode 函数，深入 diff 新旧结点的 子vnode。

此时可以看出，vue 的 diff 算法是 `同层比较`。如果同一层级不能被 `sameVnode` 判断为 true，则没有往子结点进行 diff 的必要，会直接更新。

### patchVnode

首先定义 elm ，这个变量是组件的挂载 Dom，再取出新旧子结点列表。从这里开始，只要变量名中有 `old` 字样，那么就代表是旧的内容，如 `oldCh`代表旧子结点列表。

取出后并没有立马对比新旧结点，然后先判断新 vnode 是否是一个是一个文本结点，如果是则判断和旧结点的 text 是否相等，如果不相等则更新dom。

```js
const elm = vnode.elm = oldVnode.elm

const oldCh = oldVnode.children
const ch = vnode.children
if (isUndef(vnode.text)) {
  // 省略..
} else if (oldVnode.text !== vnode.text) {
  nodeOps.setTextContent(elm, vnode.text)
}
```

我们最开始是组件 vnode，不会是文本结点，则会进入到 `isUndef(vnode.text)` 的逻辑。该逻辑会执行以下代码，我们从上往下依次说。

```js
if (isDef(oldCh) && isDef(ch)) {
  if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
} else if (isDef(ch)) {
  if (isDef(oldVnode.text)) nodeOps.setTextContent(elm, '')
  addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
} else if (isDef(oldCh)) {
  removeVnodes(oldCh, 0, oldCh.length - 1)
} else if (isDef(oldVnode.text)) {
  nodeOps.setTextContent(elm, '')
}
```

1. 新旧子结点列表都存在：若两vnode不相等，则调用 updateChildren 方法，进行子结点列表的详细 diff

2. 新子结点列表存在，旧子结点列表不存在：说明是新的 vnode 增加了子结点，同时会判断 oldVnode 是否是文本结点，如果是则把改文本处写成 `空字符串`

3. 旧子结点列表存在，新子结点列表不存在：说明是删除旧结点。此时会通过 `removeVnodes` 方法把 oldVnode 中的 dom 结点删除

4. 如果新旧子结点都不存在，若旧结点是一个 文本结点，则把该文本置为 `空字符串`。 （patch 方法一开始便判断了，新结点是文本结点的情况）

### patchVnode 总结

我们先给做一个小总结：patch 方法判断新旧 vnode，是否有比较的必要，有必要时调用 patchVnode。没必要时，直接根据新vnode 更新 dom。

patchVnode 用来判断新旧 vnode 的子结点列表情况。根据是有否子列表来进行下一步操作：

1. 新有，旧有。调用 updateChildren 方法。（后续说）

2. 新有，旧无。说明是增加dom

3. 新无，旧有。说明是删除dom

4. 新无，旧无。若是文本结点的话，把文本置为 `空字符串`

### updateChildren

updateChildren 就是对子结点列表，进行 diff 的过程。patch 及 patchVnode 方法对比的是新旧根结点，结点数量是`1对1`。而 updateChildren 是对根结点的子结点列表进行新旧diff，结点数量是`多对多`的关系。

ps: 因核心处代码太多，就不贴代码了。建议打开[相关代码链接](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L424-L467)对照着看。

先简要说明一下该方法的diff逻辑：首先通过 `sameVnode` 要找到相似的新旧子结点。把这新旧子结点当作根结点，递归调用 patchVnode 进行深层次比较。由父到子进行 diff。而 updateChildren 的关键便是通过 `sameVnode` 找出相似的结点，以便于最大限度的复用旧结点逻辑。接下来重点描述如果找出相似结点。

分别给新旧列表设置了首位指针，分别指向 “新首、新尾、旧首、旧尾” 四个结点

```js
let oldStartIdx = 0
let newStartIdx = 0
let oldEndIdx = oldCh.length - 1
let newEndIdx = newCh.length - 1
```

每一个新指针指向的结点，都要比对两个旧指针指向的结点。反之，旧指针的逻辑也一致。共会经历5种比较方式：

1. 旧首 与 新首比较

2. 旧尾 与 新尾

3. 旧首 与 新尾

4. 旧尾 与 新首

5. 特殊遍历

```js
// 省略
else if (sameVnode(oldStartVnode, newStartVnode)) {} // 旧首与新首
else if (sameVnode(oldEndVnode, newEndVnode)) {} // 旧尾与新尾
else if (sameVnode(oldStartVnode, newEndVnode)) {} // 旧首与新尾
else if (sameVnode(oldEndVnode, newStartVnode)) {} // 旧尾与新首
else {} // 特殊遍历
```
