# Diff 算法

> 基于 Vue 2.6.11

## 基本介绍

当组件的数据发生变化时，会触发组件该组件的 `render watcher` 中的 getter 方法 也就是

```js
updateComponent = () => {
  vm._update(vm._render(), hydrating)
}
```

该方法会把该组件（包括子组件）通过 `_render` 方法 转换成 vnode，同时在 `_update` 方法中进行组件 patch 以更新视图。而 `diff算法` 就是在[patch](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L709)  的过程中。

（图.....）

## 关于 diff 的前置了解

diff 发生在 patch 方法中，该方法通过_update 调用。因为经过 $mount 挂载后，组件实例上已经有了 `_vnode` 结点，所以 patch 方法接收了同一个组件的旧、新两个vnode 当作参数。

ps: 组件的必须有一个根结点且只能有一个根结点，所以组件 vnode 是一个对象而不是一个数组，这是我们 diff 算法的前提

```js
const prevVnode = vm._vnode
if (!prevVnode) {
  // 省略...
} else {
  vm.$el = vm.__patch__(prevVnode, vnode)
}
```

### diff 中的关键方法

diff 的过程中有几个函数至关重要：[sameVnode](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L35-L50)、[updateChildren](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L404-L474)、[patchVnode](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L501-L574)。接下来一一简单介绍：

`sameVnode` 是用来比较 新旧vnode 是否部分相同，若是部分相同则调用 `patchVnode` 进行深层次的比较。

`patchVnode` 是用来 diff 新旧vnode 子列表的方法。根据子列表的有无，选择对 dom 进行增加、删除，或调用`updateChildren`方法对子列表进行 diff

`updateChildren` 是用来对 新旧vnode 子列表进行 diff 的方法。通过调用 `sameVnode` 把新旧子列表中结点当作新旧根结点，传参数给`patchVnode` 递归进行深层次的diff。

总结：sameVnode 是辅助函数，patchVnode  和 updateChildren 递归调用（禁止套娃）。

### sameVnode 辅助函数

这个函数是我们进行 diff 的关键，首先判断两个 vnode 的 `key` 是否相同，其次判断tag、isComment、dat、input类型等属性；isAsyncPlaceholder 是 ssr 渲染时的异步占位符结点，此时判断异步组件的加载函数是否相同，且 b 参数的异步加载没有失败。（没用 srr 时忽略 isAsyncPlaceholder 逻辑）

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

ps: 函数只判断了两个 vnode 的部分属性，不要求所有属性全部相等。

## patch —— 开始 diff

整个 diff 从 [patch](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L700) 这个函数就已经开始了。

首先便是判断是否值得进行diff。判断的方法很简单，通过上面说到的 `sameVnode` 方法。这里有两种情况——新旧结点不同，和新旧结点相同。

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

不同：可以看到，vue 会简单粗暴的直接创建新的，删除旧的，省时省力。比如一个组件更新前以 `div` 为根结点，更新后以 `ul` 为根结点，得出 sameVnode 为 `false`，在 vue 的策略下，其子结点没有下一步 diff 的必要。

相同：则调用上面介绍的 patchVnode 函数，深入 diff 新旧结点的 子vnode。

此时可以看出，vue 的 diff 算法是 `同层比较`。如果同一层级不能被 `sameVnode` 判断为 true，则没有往子结点进行 diff 的必要，会直接更新。

## patchVnode

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

目前为止，patch 判断新旧 vnode 不值得深层次比较，会对 dom 进行更新，而 patchVnode 会根据子列表的有无，对 dom 进行更新。而当新旧子列表都存在时，会调用 updateChildren 进行判断。

## updateChildren

updateChildren 就是对子结点列表进行 diff 的过程。整个方法目的主要是挑选出“新旧结点”，当做新旧根结点进行 patchVnode 的调用。重点是如何找出“新旧结点”

ps: 因核心处代码太多，就不贴代码了。建议打开[相关代码链接](https://github.com/vuejs/vue/blob/dev/src/core/vdom/patch.js#L424-L467)对照着看。

### 变量定义

方法首先分别给新旧列表设置了4个索引，分别指向 “新首、新尾、旧首、旧尾” 对应的 vnode。同时根据这四个索引，赋值了4个对应 vnode 的变量。

```js
let oldStartIdx = 0
let newStartIdx = 0
let oldEndIdx = oldCh.length - 1
let newEndIdx = newCh.length - 1

let oldStartVnode = oldCh[0]
let oldEndVnode = oldCh[oldEndIdx]
let newStartVnode = newCh[0]
let newEndVnode = newCh[newEndIdx]
```

### 比较方式

每一个新索引指向的结点，都要比对两个旧索引指向的结点。反之，旧索引的逻辑也一致。每次循环，这4个索引中总有索引的位置会移动，首尾索引向中间靠拢。当确保新结点全与旧结点遍历完、或旧结点全与新结点遍历完，则退出子结点遍历。

```js
// 省略
while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  // .. 省略
  if (isUndef(oldStartVnode)) {}  // 忽略，暂时用不上
  else if (isUndef(oldEndVnode)) {} // 忽略，暂时用不上
  else if (sameVnode(oldStartVnode, newStartVnode)) {} // 旧首与新首
  else if (sameVnode(oldEndVnode, newEndVnode)) {} // 旧尾与新尾
  else if (sameVnode(oldStartVnode, newEndVnode)) {} // 旧首与新尾
  else if (sameVnode(oldEndVnode, newStartVnode)) {} // 旧尾与新首
  else {} // 特殊遍历
}
```

1. 旧首 与 新首比较

2. 旧尾 与 新尾

3. 旧首 与 新尾

4. 旧尾 与 新首

5. 特殊遍历

### sameVnode 为 true

我们从“同首”，和“首尾”两种情况来介绍一下 sameVnode 为 `true` 会发生什么。前四种的逻辑大同小异。

同首：如果 `sameVnode` 为 true，证明这两个结点是相似结点，有值得比较的必要。同时把新旧 vnode 当做根结点传入 patchVnode，递归调用了 patchVnode 进行是否有子列表流程。当 patchVnode 方法结束后，新旧首结点就已经 diff 完毕，不再需要进行判断了。之后新旧首索引都会向后移动一格，更新当前的新旧首结点。while 循环了一次，进行下一轮循环。

旧首、新尾：与上面的前置流程类似，当新旧结点 patchVnode 完毕后，多一步移动 dom 的操作。因为当前 dom 的顺序是以 oldVnode 顺序来的，需要更新到 新vnode 的顺序，所以多了调用 `insertBefore` 方法的步骤。之后旧首索引后退，新尾索引前进。根据索引位置更新对应的 vnode 变量。

```js
// 同首
if (sameVnode(oldStartVnode, newStartVnode)) {
  patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
  oldStartVnode = oldCh[++oldStartIdx]
  newStartVnode = newCh[++newStartIdx]
}

// 旧首、新尾
if (sameVnode(oldStartVnode, newEndVnode)) {
  patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue, newCh, newEndIdx)
  canMove && nodeOps.insertBefore(parentElm, oldStartVnode.elm, nodeOps.nextSibling(oldEndVnode.elm))
  oldStartVnode = oldCh[++oldStartIdx]
  newEndVnode = newCh[--newEndIdx]
}
```

### 特殊遍历

我们知道了前四种是对首位进行对比，第五种对比方式则是补全剩下遗漏的情况，类似于整体遍历。

```js
else {
  if (isUndef(oldKeyToIdx)) oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
  idxInOld = isDef(newStartVnode.key)
    ? oldKeyToIdx[newStartVnode.key]
    : findIdxInOld(newStartVnode, oldCh, oldStartIdx, oldEndIdx)
  if (isUndef(idxInOld)) { // New element
    createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
  } else {
    vnodeToMove = oldCh[idxInOld]
    if (sameVnode(vnodeToMove, newStartVnode)) {
      patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
      oldCh[idxInOld] = undefined
      canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
    } else {
      // same key but different element. treat as new element
      createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
    }
  }
  newStartVnode = newCh[++newStartIdx]
}
```

首先会从 oldVnode 列表中，根据 key 去生成一个 map 对象，是 oldVnode.key 与列表索引的映射。如果结点没 key，则不添加进 oldKeyToIdx 中。

```js
oldKeyToIdx = {
  // ...
  [oldVnode.key]: index
}
```

然后根据当前新首结点，得出 idxInOld 变量，该变量是一个 oldVnode 的索引。该变量得出过程：首先判断新首结点是否有 key

1. 如果有：从 oldKeyToIdx 这个对象中取出对应 key 的索引，若对象中没有该 key 则为 undefined。

2. 如果没有：走 findIdxInOld 函数。函数很简单，从剩下的旧结点中，遍历得到返回与新结点 `sameVnode` 的旧结点。若剩下的的旧结点，没有一个相似结点，函数默认返回 undefined

```js
function findIdxInOld (node, oldCh, start, end) {
  for (let i = start; i < end; i++) {
    const c = oldCh[i]
    // ps: node 为新结点，c为旧结点。此时node的 key 为 undefined，因为不为 undefined 时会走逻辑 1
    if (isDef(c) && sameVnode(node, c)) return i
  }
}
```

这样我们拿到了 新首结点，和 oldVnode 的在旧列表结点的索引 idxInOld（可能为undefined）。这样又开始分为两种情况：

1. idxInOld 为 undefined，说明旧结点列表中没有相似结点，直接根据 新vnode 添加新的 dom

2. idxInOld 存在，根据这个索引，从 oldVnode 列表中取出对应的 oldVnode，并进行下一步判断

```js
vnodeToMove = oldCh[idxInOld]
if (sameVnode(vnodeToMove, newStartVnode)) {
  patchVnode(vnodeToMove, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
  oldCh[idxInOld] = undefined
  canMove && nodeOps.insertBefore(parentElm, vnodeToMove.elm, oldStartVnode.elm)
} else {
  // same key but different element. treat as new element
  createElm(newStartVnode, insertedVnodeQueue, parentElm, oldStartVnode.elm, false, newCh, newStartIdx)
}
```

这里首先通过 `sameVnode` 判断是否值得深层次 diff。这个 if 是因为，我们的 oldVnode 可能是从 `oldKeyToIdx` map对象中获取出来的，而这个对象中，只判断了 key，没有判断其他逻辑，所以需要通过 `sameVnode` 更进一步值得判断。

如果此处 `sameVnode` 为false，和 patch 方法一样，直接根据 新vnode 创建 dom。

为 true 时和上述 4 中情况一样，当作根结点进行 列表diff。因为不是根据旧首尾索引得到的 oldVnode，所以把这个旧结点赋值为 `undefined`。不删除的原因是删除会旧指针指向。同时在下一次循环中，遍历到了这个 undefined 结点，会进行跳过。（updateChildren 方法最开始进行循环的时候）

```js
if (isUndef(oldStartVnode)) {
  oldStartVnode = oldCh[++oldStartIdx] // Vnode has been moved left
} else if (isUndef(oldEndVnode)) {
  oldEndVnode = oldCh[--oldEndIdx]
}
```

### 循环结束

整个 `updateChildren` 对子结点的 diff 进行完后，还需要处理一些场景值。回顾一下我们开始时 while 循环的条件：

```js
while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {}
```

当代表的新结点的索引或代表着旧结点的索引，一类首位相交时就结束。此时可能会有两种情况：新结点没 diff 完或旧结点没 diff 完。

新结点没diff完：没有diff完的结点是新增的结点，又因为索引是由两端向中间走的，所以只要把新结点转换成真实dom 并根据索引插入进 dom 中就好。

旧结点没diff完：这个很简单，没 diff 的说明不需要了，删除即可。

```js
if (oldStartIdx > oldEndIdx) {
  refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
  addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
} else if (newStartIdx > newEndIdx) {
  removeVnodes(oldCh, oldStartIdx, oldEndIdx)
}
```

## 实操

让我们来通过一个小 demo 演示一下，假设我们的组件长这样

```html
<div>
  <p>列表</p>
  <ul>
    <li v-for="item in arr" :key="item">{{item}}</li>
  </ul>
</div>
```

我们的 arr 数据变更前为 `[1, 2, 3]`， 变更后为 `[3, 2, 'a', 1]` 反转一下后，中间增加了一个值

```js
// 变更前
this.arr = [1, 2, 3]
// 变更后
this.arr = [3, 2, 'a', 1]
```

arr 改变后，触发 patch 方法，方法通过sameVnode 判断组件新旧 vnode，此时经过 sameVnode 判断新旧结点得出 true，调用 `patchVnode` 子结点的 diff

```js
// patch 方法内的判断
if (!isRealElement && sameVnode(oldVnode, vnode)) {
  patchVnode(oldVnode, vnode, insertedVnodeQueue, null, null, removeOnly)
}


// sameVnode 判断部分
return (
  a.key === b.key && (
    (
      a.tag === b.tag &&
      a.isComment === b.isComment &&
      isDef(a.data) === isDef(b.data) &&
      sameInputType(a, b)
    ) || (
      isTrue(a.isAsyncPlaceholder)
      // 省略
    )
  )
)

// 很简单得出 sameVnode 为 true
return (
  undefined === undefined && (
    (
      'div' === 'div' &&
      false === false &&
      false === false &&
      true
    ) || (
      false
    )
  )
)
```

patchVnode 对当前子列表会进行一些判断，在当前的结构下，会直接会进入到 updateChildren 部分

```js
const oldCh = oldVnode.children
const ch = vnode.children
if (isDef(oldCh) && isDef(ch)) {
  if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue, removeOnly)
}

// 新旧 vnode 结构，pVnode 指的是 p 标签的 vnode，ulVnode 是 ul 标签的
vnode = {
  children: [
    pVnode,
    ulVnode
  ],
  text: undefined
}
```

updateChildren 中，我们快进到 while 循环中，查看是如何对子结点列表进行 diff

```js
while(oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
  // .. 省略
  if (isUndef(oldStartVnode)) {}  // 忽略，暂时用不上
  else if (isUndef(oldEndVnode)) {} // 忽略，暂时用不上
  else if (sameVnode(oldStartVnode, newStartVnode)) {} // 旧首与新首
  else if (sameVnode(oldEndVnode, newEndVnode)) {} // 旧尾与新尾
  else if (sameVnode(oldStartVnode, newEndVnode)) {} // 旧首与新尾
  else if (sameVnode(oldEndVnode, newStartVnode)) {} // 旧尾与新首
  else {} // 特殊遍历
}
```

第一个进行判断的，是我们 `<p>列表</p>` 结点的 新旧vnode。

```js
// 新旧 vnode 结构
vnode = {
  tag: 'p',
  text: undefined,
  children: [{text: '列表'}]
}

else if (sameVnode(oldStartVnode, newStartVnode)) {
  patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx)
  oldStartVnode = oldCh[++oldStartIdx]
  newStartVnode = newCh[++newStartIdx]
}
```

很明显 `sameVnode` 为 true，进入到 patchVnode 的流程，因为新旧 vnode 都有子结点 —— 文本结点 `列表`，又会再次重复 updateChildren -> patchVnode。此时 patchVnode 判断，文本结点有 text，且新旧文本内容相同，所以 patchVnode 不进行下一步判断。文本结点的 patchVnode 结束后，退出到 p 标签的 updateChildren 部分，结束后再退出到 patchVnode pVnode 部分。

```js
if (isUndef(vnode.text)) {
} else if (oldVnode.text !== vnode.text) {
  nodeOps.setTextContent(elm, vnode.text)
}
```

此时p标签 patchVnode 结束。索引向下移动，while 进入到第二次循环。开始对 ul 进行 patchVnode。

我们快进到 ul 结点子列表的diff。

```js
// 这是 oldVnode 结点结构
// this.arr = [1, 2, 3]  旧
oldVnode = {
  children: [
    { tag: 'li', key: 1 , children: [{ text: 1 }] },
    { tag: 'li', key: 2 , children: [{ text: 2 }] },
    { tag: 'li', key: 3 , children: [{ text: 3 }] }
  ]
}

// this.arr = [3, 2, 'a', 1]  新
newVnode = {
  children: [
    { tag: 'li', key: 3 , children: [{ text: 3 }] },
    { tag: 'li', key: 'a' , children: [{ text: 'a' }] },
    { tag: 'li', key: 2 , children: [{ text: 2 }] },
    { tag: 'li', key: 1 , children: [{ text: 1 }] }
  ]
}
```

根据sameVnode方法，我们只有判断key就好了，因为tag、data等，新旧结点都是一致的。现在让我们开始愉快的diff：

根据 旧首 vs 新首， 旧尾 vs 新尾，旧首 vs 新尾，旧尾 vs 新首 顺序类型。我们最开始会走到 旧首 vs 新尾，判断 key 为 1 的vnode。patchVnode的过程不再重复。方法结束后，直接复用 dom，然后移动到最新位置即可。

```js
patchVnode(oldStartVnode, newEndVnode)
canMove && nodeOps.insertBefore( /..省略/ )
oldStartVnode = oldCh[++oldStartIdx]
newEndVnode = newCh[--newEndIdx]
```

旧首指针下移，新尾指针上移。key 为 2 的 vnode 和上述一样，我们先跳过。

此时 oldStartIdx／endStartIdx 指向 key 为 3 的 oldVnode，newStartIdx 指向 key 为 3 的 vnode。两结点进行 patchVnode，结束后，oldStartIdx 下移。while 判断时 oldStartIdx 大于 oleEndIdx，循环退出。

while 退出后，key 为 'a' 的结点没有被遍历到，但是不用担心！接下来就对这种情况进行处理。方法判断是否还剩余没有进行 diff 结点，如果还有则直接添加在 dom 里即可。

```js
if (oldStartIdx > oldEndIdx) {
  refElm = isUndef(newCh[newEndIdx + 1]) ? null : newCh[newEndIdx + 1].elm
  addVnodes(parentElm, refElm, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
}
```

## v-for 中 各种 key 会发生的行为

接下来让我讨论一下，最常使用的 key 的地方 —— v-for 循环列表中，使用各种 key 时，diff 的区别

### 唯一值

使用唯一值当作 key 的好处很多，如果 key 变了 vue 会直接判断需要对组件进行替换

### 使用 index 做为 key

### 不写 key

### 随机数 key
