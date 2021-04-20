# Props 及父子组件更新

> 不知道为了什么，疑惑它围绕着我...

有下面几个问题：

1. props 如何传递给子组件

2. 子组件直接修改 props 是否影响到父组件

3. 子组件更新是否会引起父组件更新

4. 父组件更新是否会引起子组件更新

5. 父子组件更新顺序

我们先来一个简单 demo，并依据该 demo 来阅读源码

```html
<!-- father -->
<div>
  {{fatherName}}
  <son :name="sonName"></son>
</div>

<!-- son组件 -->
<div>{{name}}</div>
```

```js
// father
data() {
  return {
    fatherName: '大明',
    sonName: '小明'
  }
}

// son
props: {
  sonName: String
}
```

这是一个非常简单的 demo，父组件传递给子组件一个 props，子组件接收并显示。

## 子组件 props 初始化

我们定义好相关数据后，通过 new Vue() 且调用了实例的 `$mount` 方法后，vue渲染我们的视图。那我们子组件是如何拿到父组件传递的内容呢？我们根据 $mount 的执行，一步步研究。

### 父亲组件中生成 son 结点 vnode

在 $mount 时，vue 会把 render函数 转换为 vnode，再根据 vnode 进行挂载。

> 如果是单文件，vue-loader 会把 template 模块转化为 render 函数。如果 new Vue 时写的是 template 选项，vue 本身的 parse 模块会把 template 转化为 render 函数。

下面是我们 father 组件的 render 函数：

```js
// <div>
//   {{fatherName}}
//   <son :name="sonName"></son>
// </div>
var render = function() {
  var _vm = this
  var _h = _vm.$createElement
  var _c = _vm._self._c || _h
  return _c(
    "div",
    { attrs: { id: "app" } },
    [ // 该数组每一项都是 div 的子节点
      _vm._v(" " + _vm._s(_vm.father) + " "), //  大明
      _c("son", { attrs: { name: _vm.sonName } }) // son组件
    ],
    1
  )
}
```

我们知道 render 返回的是一个 vnode，在上面的函数中可以知道 `_c` 函数返回 vnode。我们聚焦下面这行代码。

```js
_c("son", { attrs: { name: _vm.sonName } }) // _vm.sonName === '小明'
```

> _c 函数其实就是我们的平常写 [render](https://cn.vuejs.org/v2/api/#render) 选项接收的 [createElement](https://cn.vuejs.org/v2/guide/render-function.html#createElement-%E5%8F%82%E6%95%B0)方法

可以看到，_c 方法的第二个参数正是我们写在 `son 结点` 上的 props。下面我们快进到`son结点` vnode的创建。

> 这里叫 `son结点` 是为了避免大家认为是要创建 son 组件的vnode。这里仅仅是创建 father 组件中对 son 这一结点的 vnode 描述，尚未执行到 `son组件的`创建。描述：当前结点名为`son`，有一个 name 属性，值为 “小明”。

我们重点关注`son结点`的创建过程。在经过一系列操作后（不重要，忽略），`son结点` 的 vnode 最后通过 createComponent 函数创建。函数里面和 props 相关的步骤如下：

```js
vnode = createComponent(Ctor, data, context, children, tag);

// createComponent 函数内容
createComponent(Ctor, ...) {
  // ...
  if (isObject(Ctor)) {
    Ctor = baseCtor.extend(Ctor);
  }
  // ...
  const propsData = extractPropsFromVNodeData(data, Ctor, tag)
  //...
  installComponentHooks(data) // 定义组件钩子
  // ...
  const vnode = new VNode(...,{ propsData, ... })
  return vnode
}
```

1. 其中参数 Ctor 是 son.vue script 模块经过 vue-loader 编译后 export default 的内容。也就是 father 组件 import Son from 'components/son' 的 Son

2. baseCtor.extend 是 `Vue.extend`。

`createComponent` 函数通过 Vue.extend 先定义了该组件的构造函数 `Ctor`，然后通过 `extractPropsFromVNodeData` 提取出 render 函数中 `son结点` 属性里属于子组件 props 部分，最后生成 vnode。

> 其中 data 是我们上方的 _c 函数中的 `attrs: { name: '小明' } 其与 Ctor 中的props模块，得出propsData

#### 子组件访问 props

我们先看 Vue.extend 函数运行时，和 Props 相关的内容。

```js
Vue.extend = function (extendOptions) {
  const Sub = function VueComponent (options) {
    this._init(options)
  }
  Sub.options = mergeOptions(
    Super.options,
    extendOptions
  )
  if (Sub.options.props) {
    initProps(Sub)
  }
  return Sub
}
function initProps (Comp) {
  const props = Comp.options.props
  for (const key in props) {
    proxy(Comp.prototype, `_props`, key)
  }
}
```

Vue.extend 会返回 Sub, Sub是我们的子组件的构造函数。当我们 'new Sub(options)' 时会调 Vue.prototype._init()，和我们实例化 Vue 如出一辙。正好也印证[文档](https://cn.vuejs.org/v2/api/#Vue-extend)上： 使用基础 Vue 构造器，创建一个“子类”。在这里，子类就是我们的 `Sub` 构造函数

```js
// new Vue() 时，也会执行 Vue.prototype._init()
function Vue (options) {
  this._init(options)
}
```

这里把我们的父子 options 合并后赋值给 Sub，这使得实例化 Sub 时可以直接访问到 options。接下来执行`initProps(Sub)`，initProps 方法很简单——调用 proxy 方法给 props 属性做一层代理

```js
function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  Object.defineProperty(target, key, sharedPropertyDefinition)
}
```

proxy 运行完后，我们在子组件访问 this.name 时，因实例没有该属性，则会去构造函数 prototype 中找，也就找到了 Sub.prototype.name。而经过 defineProperty 劫持后，又会指向访问到 this._props.name。因此在我们使用时，可以直接使用 this.xxx 拿到 props（这里的 this 是组件实例）

此处 Vue 做了一个小优化，因为一个组件的 props 配置都是相同的，那么在原型做劫持的话，只用给每个属性做一次 defineProperty，节约了给每一个实例做属性代理的开销。(ps: computed 属性同理)

#### 收集父传子 props 值

定义完子组件的构造函数 `Sub` 后，接下来就是收集父组件传递给子组件的 props。这个流程在 `extractPropsFromVNodeData` 方法中。

```js
const propsData = extractPropsFromVNodeData(data, Ctor, tag)

function extractPropsFromVNodeData (data, Ctor, tag) {
  const propOptions = Ctor.options.props
  const res = {}
  const { attrs, props } = data
  if (isDef(attrs) || isDef(props)) {
    for (const key in propOptions) {
      const altKey = hyphenate(key)
      checkProp(res, props, key, altKey, true) ||
      checkProp(res, attrs, key, altKey, false)
    }
  }
  return res
}
function checkProp () {
  if (isDef(hash)) {
    if (hasOwn(hash, key)) {
      res[key] = hash[key]
      if (!preserve) {
        delete hash[key]
      }
      return true
    } else if (hasOwn(hash, altKey)) {
      res[key] = hash[altKey]
      if (!preserve) {
        delete hash[altKey]
      }
      return true
    }
  }
  return false
}
```

上面介绍过的，data 是 vue-loader 编译template后，把在模版上的属性收集起来的对象。在这里为:

```js
// father组件 render 函数中，关于 son组件 的部分
_c("son", { attrs: { name: _vm.sonName } })

// data
data = {
  attrs: {
    name: '小明'
  }
}
```

propOptions 自然是 son 组件中 props 定义部分，在这里为：

```js
propsOptions = {
  // 组件内容是：name: String，这里被 vue-loader 转化过
  name: { type: String }
}
```

拿到 props 定义和所有模版属性后，在for循环内进行筛选，最后去除 data 中关于 props 定义的属性，并把这些props属性和值添加在 res 对象上。函数运行完成后，返回 res 对象。

#### 生成 son结点 的vnode结束

此时 father 组件中，关于 `<son></son>` 结点的 vnode 定义已经结束。比较有用的信息为：

```js
vnode = {
  tag: 'vue-component-2-son',
  componentOptions: {
    Ctor: function VueComponent (options) {
      this._init(options);
    },
    propsData: {
      name: "小明"
    },
    tag: 'son'
  }
}
```

### 子组件实例

vnode 生成完毕后，便是进行 dom 的创建，在父组件 $mounted 时，会执行到 createComponent 方法进行子组件的创建，而 props 的关联就发生在这块内容。

> vue 是先进行子组件的创建，再创建父组件

```js
function createElm () {
  // ...
  if (createComponent(vnode, insertedVnodeQueue, parentElm, refElm)) {
    return
  }
```

我们先学习（复习？）一下 `createComponent` 方法的参数

- vnode 是 当前 son 组件的 vnode

```js
{
  tag: 'vue-component-2-son'
}
```

> 后三样可先忽略，不太重要

- insertedVnodeQueue 用来收集创建好的 Vnode

- parentElm 父元素 dom 结点

- refElm 是定位结点。如有，vnode 实例dom 插入在该结点前（diff时使用）

```js
function createComponent (vnode, insertedVnodeQueue, parentElm, refElm) {
  let i = vnode.data
  if (isDef(i)) {
    const isReactivated = isDef(vnode.componentInstance) && i.keepAlive
    if (isDef(i = i.hook) && isDef(i = i.init)) {
      i(vnode, false /* hydrating */) // 重点
    }
  }
}

init (vnode, hydrating) {
    // 省略...
    const child = vnode.componentInstance = createComponentInstanceForVnode(
      vnode,
      activeInstance
    )
    child.$mount(hydrating ? vnode.elm : undefined, hydrating)
  }
}

createComponentInstanceForVnode (vnode, parent) {
  // 省略
  return new vnode.componentOptions.Ctor(options)
}
```

> 我们先介绍一下 `i(vnode, false)` 方法。方法实际是上面代码中的 init 函数，这函数是组件钩子，在生成 `<son></son>` 模版 vnode 时，运行 `installComponentHooks` 定义

可以看到，最后是调用 `new vnode.componentOptions.Ctor(options)`，而这个 Ctor 也就是我们之前调用 `Vue.extend` 得到的子类构造器。

```js
const Sub = function VueComponent (options) {
  this._init(options)
}

Vue.prototype._init = function (options) {
  const vm = this
  // ...
  initInternalComponent(vm, options);
  initState(vm)
}
```

我们只关注 props 相关， `_init` 方法会先调用 `initInternalComponent` 函数进行 vm.$options 配置，关键代码：

```js
// 记得我们的 Sub.options不？ vm.constructor 就是 Sub
const opts = vm.$options = Object.create(vm.constructor.options)
const parentVnode = options._parentVnode
const vnodeComponentOptions = parentVnode.componentOptions
opts.propsData = vnodeComponentOptions.propsData
```

后文中 `$options.propsData` 及 `$options.props` 变量都是来自于这个函数。

> $options.propsData 为父组件传递给子组件的 props。$options.props 为子组件 props 对象

结下来执行 `initState(vm)` 该函数涉及到 props 初始化部分如下:

```js
const opts = vm.$options
initProps(vm, opts.props)
```

#### initProps

从文章开始到现在，都是为 props 响应式的铺垫。简单总结就是获取父组件传递给子组件的 props，同时获取子组件的 props 内容。

```js
function initProps(propsOptions) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  const keys = vm.$options._propKeys = []

  for (const key in propsOptions) {
    keys.push(key)
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      defineReactive(props, key, value, () => {
        if (!isRoot && !isUpdatingChildComponent) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
}
```

initProps 函数接收一个参数，参数时子组件选项中的 props 对象。接下来会对这个对象进行遍历。

函数首先拿到我们最开始初始化父组件 vnode 时的 propsData 这个对象（父组件传递给子组件的props 值）。然后定义了一个私有变量 _props，用于保存 props 值。

> 注意这里的 `vm._props = {}`，当我们生成 Sub 构造函数时, 有串代码 `proxy(Comp.prototype, '_props', key)`，其代理到的就是当前 vm._props 这个对象。

前置条件就绪，接下来是对 propsOptions 进行遍历。抽象如下：

```js
for (const key in propsOptions) {
  const value = validateProp(key, propsOptions, propsData, vm)
  defineReactive(props, key, value)
}
```

这里通过 for 循环，对子组件中 props 生成响应式。 props 是我们的 `vm._props` 这个对象，key 是我们定义的 prop，而 value 比较特殊，因父组件并非会传递所有子组件需要的 props，`validateProp` 便是值获取：

```js
const value = validateProp(key, propsOptions, propsData, vm)

function validateProp (key, propOptions, propsData, vm) {
  const prop = propOptions[key]
  let value = propsData[key]
  // check default value
  if (value === undefined) {
    value = getPropDefaultValue(vm, prop, key)
    // since the default value is a fresh copy,
    // make sure to observe it.
    const prevShouldObserve = shouldObserve
    toggleObserving(true)
    observe(value)
    toggleObserving(prevShouldObserve)
  }
  return value
}
```

可以看到 `validateProp` 会先获取到子组件 props 选项中，关于当前属性的描述，接着判断父组件是否传递了当前 props 给子组件，若有则直接返回。若无则获取默认值，同时对该值进行（通过 observe 方法，可以理解成是对我们 data 方法返回的对象进行监听）。

获取到前置条件后便调用 `defineReactive` 方法生成响应式。相信大家对这个方法不会陌生，该方法便是最为关键的响应式步骤。我们平常书写大 data 选项，最后也是获取到每一个key 后，拦截这个key 的 get 和 set 进行响应式。

> 这里不细说 `defineReactive` 方法，因为这块是响应式的内容。

到这里我们就看完了子组件初始化 props 的整个过程。

### 总结

我们从简单的做一个总结：

1. $mount调用后，父组件生成 vnode（调用 render函数 ）。

2. 生成子组件构造函数，此时代理子组件实例 props 访问：`this.a => this.__proto__.a => this._props.a`

3. 生成 propsData。（根据 render 函数，提取出属性，并与子组件 props 选项比较获取）

4. 生成子组件，根据父组件 propsData 初始化 props 默认值。

5. 遍历 props 选项，通过 defineReactive 把 this._props的属性制定成响应式

可以看到，我们的 props 其实组件自己的一个对象，和我们定义的 data 类似。这样子可以很好回答我们的第二个问题，子组件直接修改 props 时，是修改其自己的 _props 对象上的属性，_props 中的 set 只会触发子组件自己的渲染 watcher。不会影响到父组件。

## props 更新

上半部分介绍了 props 的传递，从 props 定义到 子组件接收并渲染，那么还剩下另外一部分：父组件 props 更新后的逻辑。接下来继续从 vue 代码里了解。

```html
<son :name="sonName"></son>
```

```js
created() {
  setTimeout(() => {
    this.sonName = 'new name'
  }, 3000)
}
```

`sonName` 改变后，会触发他的 set 方法，接着重新生成 vnode。因为我们只是简单更新一个 props 值，没有改 tag 或者 key 这些操作，在 `_update` 方法 `diff` 更新的过程中，会走到比较父组件中 son 标签的新旧 vnode。

```js
patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue, newCh, newStartIdx);
```

> 注意：此时只是比较父组件中的 son 标签，并没有深入到 son 组件的比较。

patchVnode 中，会执行到组件 vnode 内置的 `prepatch` 方法。

```js
function patchVnode() {
  // props 关键
  const data = vnode.data
  if (isDef(data) && isDef(i = data.hook) && isDef(i = i.prepatch)) {
    i(oldVnode, vnode)
  }
}
```

`prepatch` 是在生成 vnode 时，识别到了 <son> 标签是一个组件，于是执行 `createComponent` 方法，该方法中执行 `installComponentHooks` 进行 `prepatch` 方法的挂载。（这块不是 props 重点，详细可以自行了解 ~ ）

```js
vnode = createComponent(Ctor, data, context, children, tag)

function createComponent() {
  // install component management hooks onto the placeholder node
  installComponentHooks(data)
}
```

在 prepatch 方法中，会执行 `updateChildComponent` 方法更新子组件

```js
prepatch (oldVnode: MountedComponentVNode, vnode: MountedComponentVNode) {
  const options = vnode.componentOptions
  const child = vnode.componentInstance = oldVnode.componentInstance
  updateChildComponent(
    child,
    options.propsData, // updated props
    options.listeners, // updated listeners
    vnode, // new parent vnode
    options.children // new children
  )
}
```

在 `updateChildComponent` 中有这么一段代码：

```js
if (propsData && vm.$options.props) {
  toggleObserving(false)
  const props = vm._props
  const propKeys = vm.$options._propKeys || []
  for (let i = 0; i < propKeys.length; i++) {
    const key = propKeys[i]
    const propOptions: any = vm.$options.props // wtf flow?
    props[key] = validateProp(key, propOptions, propsData, vm)
  }
  toggleObserving(true)
  // keep a copy of raw propsData
  vm.$options.propsData = propsData
}
```

> 此时的 vm 是 `son组件` 实例，`propsData` 在上文中提到过，是父组件传递给子组件的props 数据。然后 vm 获取到子组件的 _props，`_props` 在上文中也提过，是子组件的集合 props 值的对像。

获取到各个变量值后，进行 props 赋值：

```js
props[key] = validateProp(key, propOptions, propsData, vm)
```

此时，会触发 _props 中对应的 set 方法进行子组件的渲染更新。

### 引用属性更新（对象类型）

思考一下，如果这是引用属性，此时 newVal 和 value 相等，并不会触发 `notify` 进行更新

```js
definePropertyConfig = {
  set: function reactiveSetter (newVal) {
    const value = getter ? getter.call(obj) : val
    /* eslint-disable no-self-compare */
    if (newVal === value || (newVal !== newVal && value !== value)) {
      return
    }
    dep.notify()

  }
}
```

那么如果 props 是一个对象，且某个key 更新后，子组件如何更新的呢？答案是在生成 vnode 时，会访问到该对象 props 的key，然后这个 key 的 set 方法会把当前 子组件的 渲染 watcher 添加 dep 列表里。这样当该 key 更新时，会执行到子组件的渲染 watcher

## 更新顺序

目前为止已经可以回答开头的4个问题，那么现在来看第五个：父子组件更新顺序。直接上答案，先父后子。这里和生命周期 `updated` 有区别（updated 是先子后父）。

源码的很简单，两行就证明了。

```js
function flushSchedulerQueue () {
  // 省略其他
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 省略其他
```

>（ -。- ） 开个小玩笑

这部分是响应式内容，这里简单过一下，分为两部分：基础类型、引用类型

### 基础类型

当父组件更新 data 时触发 data 的 set 方法，最后执行到 `flushSchedulerQueue`

```js
function flushSchedulerQueue () {
  queue.sort((a, b) => a.id - b.id)

  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    watcher.run()
  }
}
```

代码 queue 是 watcher 集合，这里目前只有父组件的渲染 watcher。执行 `watcher.run()` 后，我们直接跳转到父组件的更新 `_update`，然后执行到上文提到的子组件 _props 赋值

```js
props[key] = validateProp(key, propOptions, propsData, vm)
```

此时触发子组件 _props 的 set，此时开始执行 dep.notify，一路通畅直到 `queueWatcher` 方法。

```js
function queueWatcher (watcher: Watcher) {
  if (!flushing) {
    queue.push(watcher)
  } else {
    // if already flushing, splice the watcher based on its id
    // if already past its id, it will be run next immediately.
    let i = queue.length - 1
    while (i > index && queue[i].id > watcher.id) {
      i--
    }
    queue.splice(i + 1, 0, watcher)
  }
  // queue the flush
  if (!waiting) {
    waiting = true
    nextTick(flushSchedulerQueue)
  }
}

```

flushing 在父组件 data 更新，其 set 调用走到此处时，flushing 为 false。接着在 `flushSchedulerQueue` 置为了 true

```js
function flushSchedulerQueue () {
  flushing = true
}
```

所以当子组件 _props 更新时，会走到 else 分支，同时把当前需要执行的 wather 放置与队列正确位置。（在我们的例子中，此时放置与队列末尾）

接着 父组件 执行 `nextTick(flushSchedulerQueue)` 时，`waiting` 设置为 true，于是我们子组件的 set 就到此位置，需要更新的 watcher 放置在当前执行的队列后。在父组件执行完后，执行子组件的 watcher

```js
function flushSchedulerQueue () {
  for (index = 0; index < queue.length; index++) {
    watcher = queue[index]
    // 父组件 run 后，循环到子组件 run
    watcher.run()
  }
}
```

### 引用类型

父组件 $mount时，识别到了子组件，进行子组件的创建。此时在生成子组件 vnode 过程中，因访问到了引用类型的，于是该 key 的 get 触发，收集到了子组件渲染watcher。

当父组件 data 更新时，该属性 set 触发，依次执行 `watcher.run()`。
