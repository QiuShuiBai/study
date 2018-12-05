# createAPI源码分析

## 简单的api式调用组件

### 简单调用
类似于常见的loading组件，大多数情况是在多个页面都要被调用的。这个时候最适合写成api形式，在需要的地方使用。
通常会简单的像下面这样做:
```js
import Vue from 'vue'
export default function instantiateComponent(Component) {
  const instance = new Vue({
    render(createElement) {
      return createElement(Component)
    },
    methods: {
      init() {
        // Vue 实例使用的根 DOM 元素。
        document.body.appendChild(this.$el)
      }
    }
  })
  instance.$mount()
  instance.init()
// instance是整个vue实例，component是组件实例
  const component = instance.$children[0]
  return component
}
```
这样在某个组件内，只用像下面这样做
```js
import Loading from 'components/loading.vue'
import instantiateComponent from 'common/js/instantiateComponent'
// ......省略......省略......省略......
// 然后在需要调用的地方使用
instantiateComponent(Loading)
```
当然这样做会出**问题**:
`instantiateComponent`方法调用后出现了`loading`组件，之后就一直存在无法销毁

我们可以给Loading做些修改达到目的：

1. 在`html`包裹层加一个`v-if="visible"`指令

2. 在`data`属性里添加一个键值对：`visible: true`

3. 在`methods`里添加两个方法: 

```js
hide() { this.visible = false }
show() { this.visible = true }
```

这样在使用时就可以:
```js
// 显示时
this.instance = instantiateComponent(Loading)
this.instance.show()

// 隐藏时
this.instance && this.instance.hide()
```

### props和events
组件显示的内容当然希望可以在外部控制，做到可配置化。同样的需要暴露一些事件。

所以我们就需要给`instantiateComponent`函数添加一个和配置相关的参数，让createElement使用。
<!-- https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5-data-%E5%AF%B9%E8%B1%A1 -->
先改写`instantiateComponent`
```js
// ....
instantiateComponent(Component, options) {
  // ....
  const instance = new Vue({
    render(createElement) {
      return createElement(Component, { ...options })
    }
  })
  // ....
}
```

```js
let options = {
  props: { txt: '请稍后..' },
  on: { click: clickHandler } // 假设clickHandler是一个函数
}
instantiateComponent(Loading, options)
```

这样就已经能满足我们简单的需求了，但功能不全且不够优雅


## createAPI方式

createAPI的用法很简单，下面五个步骤简单的对应了下面的五行代码
 1. 引入createAPI模块
 2. 引入需api式调用的组件
 3. 注册createAPI
 4. 生成api
 5. 调用api，实例化组件

```js
import CreateAPI from 'create-api'
import Loading from './components/loading.vue'
Vue.use(CreateAPI)
Vue.createAPI(Loading, true)

// 在某个vue文件中调用
// 假设config是配置项
this.$createDialog(config)
```

来让我们看一看**createAPI**究竟是如何工作的：

### 注册createAPI方法

当我们引入了`createAPI`后，通过`Vue.use`注册插件实际上就是运行了插件提供的`install`方法。

下面代码是`install`方法：
```js
function install(Vue, options = {}) {
  // options是生成api名的配置项
  const {componentPrefix = '', apiPrefix = '$create-'} = options
  Vue.createAPI = function (Component, events, single) {
    if (isBoolean(events)) {
      single = events
      events = []
    }
    const api = apiCreator.call(this, Component, events, single)
    const createName = processComponentName(Component, {
      // processComponentName是对需api调用的组件名字的处理
      componentPrefix,
      apiPrefix,
    })
    Vue.prototype[createName] = Component.$create = api.create
    return api
  }
}
```
根据[文档][1]和上述代码我们能得知：

 1. `options`是用来生成`api`名使用的
 2. `Vue.use`注册`createAPI`后，会在`Vue`构造器上添加一个叫`createAPI`的方法
 3. `Vue.createAPI`收到参数运行后会在`Vue.prototype`上添加一个方法
 
`install`运行完后`Vue`上就已经有了`createAPI`这个方法了，注册完成

### 生成api

`api`的生成是运行了`Vue.createAPI`这个方法，方法的核心是`apiCreator`，在`apiCreator`运行后，返回的`api.create`就是后续我们实例化组件的`api`

通过`apiCreator`方法引入的路径可以查看到`src/creator.js`的文件:
```js
function apiCreator(Component, events = [], single = false) {
  let Vue = this
  let currentSingleComp
  let singleMap = {}
  const beforeHooks = []
  // ...省略
  const api = {
    before(hook) {
      beforeHooks.push(hook)
    },
    create(config, renderFn, _single) {
      //...省略
    }
  }
  return api
}
```
这个函数内几乎所有东西都是为`api`对象中的`create`函数服务。

因为被调用时`call`关键字强制绑定`this`，所以`apiCreator`内的`this`指向的是`Vue`构造函数，而变量`singleMap`是单例模式下的一个存储器，而`beforeHooks`是一个数组，存储初始化钩子被调用时传递进来的参数。

`api`对象的 `before`是一个钩子函数，参数是一个函数，用来在api调用时，组件实例化之前运行传递进来的函数。（文档没有说明）

生成的`api`的过程实际就是给`api.create`方法填入一些默认配置的过程。

下面是`apiCreator`的三个参数
 1. 第一个是需要`api`形式调用的组件`Component`
 2. 第二个是该组件向外暴露的事件`events`
 3. 第三个是否以单例来生成组件`single`

***注意：*** 在`apiCreator`接受的第二个参数`events`是为了兼容老版本的写法，在新版本中意义不大。所以文档中只说`createAPI`接受两个参数，从这开始，和文档统一，接收两个参数，第二个参数表示是否单例

#### api名
函数名很重要（匿名函数、箭头函数： 你说啥）！

通过`install`方法，可以看到，`[createName]`由`processComponentName`生成，代码如下
```js
// 第二个参数是根据给Vue.use传递的第二个参数生成
// 其中apiPrefix默认为'$create-'
const createName = processComponentName(Component, {
  componentPrefix,
  apiPrefix,
})

function processComponentName(Component, options) {
  // 假设componentPrefix为'cube-'，apiPrefix为'$create-'
  const {componentPrefix, apiPrefix} = options
  const name = Component.name // => 'cube-dialog'
  
  // 把componentPrefix里面的特殊字符加'/'形成正则
  const prefixReg = new RegExp(`^${escapeReg(componentPrefix)}`, 'i') // => /^cube\-/i
  
  // 把name的其实位置和prefixReg正则匹配，满足则删除
  const pureName = name.replace(prefixReg, '') // => 'dialog'
  
  // 把apiPrefix和name连接起来，变成驼峰形式
  let camelizeName = `${camelize(`${apiPrefix}${pureName}`)}` // => '$createDialog'
  return camelizeName
}
```
注：其中`escapeReg和camelize`是对正则的相关操作...这里就不仔细说了，附上代码
```js
const camelizeRE = /-(\w)/g

function camelize(str) {
  return (str + '').replace(camelizeRE, function (m, c) {
    return c ? c.toUpperCase() : ''
  })
}

function escapeReg(str, delimiter) {
  return (str + '').replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + (delimiter || '') + '-]', 'g'), '\\$&')
}

```
生成`api`名字的流程很简单，把组件名取出，从第一个字符开始判断，是否能和`componentPrefix`匹配，能则删除。处理后的字符再和`apiPrefix`连接，处理后的字符首字母大写，并加上`apiPrefix`前缀。


### 调用api，实例化组件

当我们在组件中和在某一个js文件中`api`形式生成组件，实际上调用的函数都是`apiCreator`函数返回值`api`的`create`方法

```js
create(config, renderFn, _single) {
  // 前置工作
  // ...省略，功能是修正参数

  // 当前调用的该方法的实例
  const ownerInstance = this
  // isInVueInstance为true:  是否在vue的实例中使用
  const isInVueInstance = !!ownerInstance.$on
  let options = {}
  if (isInVueInstance) {
    options.parent = ownerInstance
    if (!ownerInstance.__unwatchFns__) {
      ownerInstance.__unwatchFns__ = []
    }
  }
  
  // 兼容旧版本
  const renderData = parseRenderData(config, events)

  let component = null
  // 处理$props
  processProps(ownerInstance, renderData, isInVueInstance, (newProps) => {
    component && component.$updateProps(newProps)
  })
  // 处理$events
  processEvents(renderData, ownerInstance)
  // 处理$属性
  process$(renderData)
  // 实例化
  component = createComponent(renderData, renderFn, options, _single)
  // 父组件销毁时，api组件销毁
  if (isInVueInstance) {
    ownerInstance.$on(eventBeforeDestroy, beforeDestroy)
  }

  function beforeDestroy() {
    cancelWatchProps(ownerInstance)
    component.remove()
    component = null
  }

  return component
}
```
`create`运行的条理十分的清晰，每一个模块就做某一件事，以实现下方的功能

前提：设在组件`Component`内调用，则`Component`为`api`组件的父组件

 1. `props`可以 `watch` 父组件的值，做到响应式更新
 2. `events`可以直接写组件回调，也可以写父组件的方法名(字符串)来当作事件回调
 3. 可以支持`Vue`支持的所有的配置值，需以`$`开头
 4. 调用`api`式的组件销毁了，那么该组件也会自动销毁。


#### 前置工作

上面列出的功能中，大部分是有和父组件交互的，所以create函数一开始就判断是否存在父组件

```js
  const ownerInstance = this
```
如果`api组件`是`this[createName]`方式实例化，那么`this`指向的是父组件实例。而如果是在js文件中, 通过组件自身的 `$create`来实例化，则this指向组件自身(未实例化)。(其中涉及到了this绑定)

组件实例化后，能在隐式原型`__proto__`一层一层找到属于`Vue`构造器的`$on`属性。而未实例化时，本质上只是一个复杂的、普通的对象，所以并没有`Vue`构造器的相关属性。

```js
let options = {}
  if (isInVueInstance) {
    options.parent = ownerInstance
    if (!ownerInstance.__unwatchFns__) {
      ownerInstance.__unwatchFns__ = []
    }
  }
```
如果在组件中调用，那么就把父组件给保存在`options`对象中，`key`名叫`parent`。并且在父组件实例上放置一个数组`__unwatchFns__`，这个数组用来存储`watch`返回的取消观察函数，在父组件销毁时使用。

#### 兼容旧版本及粗加工config

`config`是函数`this[createName]`调用时的第一个参数

旧版本把`events`写成`onXxx`的形式并和`props`放在一起，所以需要分离出来，兼容、分离就在这个`parseRenderData`方法里，在目录`src/parse.js`下。
```js
function parseRenderData(data = {}, events = {}) {
  events = parseEvents(events)
  const props = {...data}
  const on = {}
  for (const name in events) {
    if (events.hasOwnProperty(name)) {
      const handlerName = events[name]
      if (props[handlerName]) {
        on[name] = props[handlerName]
        delete props[handlerName]
      }
    }
  }
  return {
    props,
    on
  }
}

function parseEvents(events) {
  const parsedEvents = {}
  events.forEach((name) => {
    parsedEvents[name] = camelize(`on-${name}`)
  })
  return parsedEvents
}
```
`parseRenderData`又调用了`parseEvents`函数，现在来解释下`data`和`events`参数

 1. `data`来是`api`调用`this[createName](config, renderFn, _single)`时的参数`config`
 2. `events`是生成`api`调用`Vue.createAPI(Component, events)`时的第二个参数`events`，一个数组，每一项时事件名
  
`parseEvents`函数把`events`数组中，每一项都当成对象的键名，对应的键值是首字母大写后加上`on`前缀。最后把这个对象的引用赋值给`events`。(`camelize`函数代码在生成api名模块)

因为我们是在实例化组件的时候，是把renderData当作配置项传递给Vue构造器，所以要符合相关规范。([Vue渲染函数data对象][2])

```js
events = { click: 'onClick',  input: 'onInput' }
props = { onClick: function() {} , ...}
```
然后把`data`对象复制一份，命名为`props`，并且新建名叫`on`的对象。
遍历`events`自身属性，如果`value`是`props`的`key`，那么就给`on`对象添加一个键值对。`key`和这个`value`的`key`相同，值为`props[key]`。然后删除`props`中的这个属性。
```js
on = { click: function() {} }
props = { ... }
```
然后把`on`和`props`组合成一个对象返回 
```js
return { props: { ... },  on: { click: function() {} } }
```

#### 处理$props

在运行完兼容旧版本的`parseRenderData`方法后，我们得到了名叫一个`renderData`的对象。因为新版本中`props`的写发是在`config`中写在一个名为`$props`的对象中，所以还需要处理一下`renderData`对象，把`renderData`中的`$props`和`$events`分开放入`props`和`on`对象中。

```js
function processProps(ownerInstance, renderData, isInVueInstance, onChange) {
  const $props = renderData.props.$props
  if ($props) {
    delete renderData.props.$props
    // 存放api组件需要响应式的变量
    const watchKeys = []
    // 存放父组件变量
    const watchPropKeys = []
    Object.keys($props).forEach((key) => {
      const propKey = $props[key]
      if (isStr(propKey) && propKey in ownerInstance) {
        // get instance value
        renderData.props[key] = ownerInstance[propKey]
        watchKeys.push(key)
        watchPropKeys.push(propKey)
      } else {
        renderData.props[key] = propKey
      }
    })
    if (isInVueInstance) {
      const unwatchFn = ownerInstance.$watch(function () {
        const props = {}
        watchKeys.forEach((key, i) => {
          props[key] = ownerInstance[watchPropKeys[i]]
        })
        return props
      }, onChange)
      ownerInstance.__unwatchFns__.push(unwatchFn)
    }
  }
}
```
不解释参数就是耍流氓：
1. `ownerInstance`是生成`api`方法时定义的变量，指向父组件或指向`api组件`自身
2. `renderData`是经过`parseRenderData`粗加工后的对象
3. `isInVueInstance`是否有父组件
4. `onChange`提供给`Vue`的`$watch`回调函数，用于响应式更新

设`keyProps`、`valueProps`为`$props`中的键名、键值,`key`和`value`为父组件的键名、键值

使用`Object.keys`方法拿出`$keyProps`的集合，遍历集合。

`keyProps`若对应的`valueProps`是字符串，并且是父组件中的某一个`key`，那么就在`renderData.props`上添加`keyProps`，值为`value`。

`watchKeys`和`watchPropKeys`这两个数组就是为了存储需要响应式更新的值：`watchKeys`每一项是`api组件`的key，`watchPropKeys`每一项是父组件的`key`，第n项对应第n项(n <= 0)。

**响应式更新**： 如果`isInVueInstance`为`true`，那么`ownerInstance`是父组件。调用`ownerInstance`的`$watch`方法，若父组件中在`watchPropKeys`属性变化了的话，那么就会更新`renderData.props`中相应的值，同时触发回调函数`onChange`。然后把`$watch`返回的取消观察函数保存在前置工作生成的`__unwatchFns__`数组里，用来停止触发回调（`$watch`[文档][3]）
```js
(newProps) => {
  component && component.$updateProps(newProps)
}
```
`onChange`长这样，`component`是`api组件`的实例，`$updateProps`是封装了的一层调用实例的`$forceUpdate`方法。

#### 处理$events

`$events`的处理相对`$props`简单很多，因为没有响应式更新的地方。和处理`$props`一样，把`props`中的`$events`删掉，并把`$events`的数据挂在`renderData.on`上
```js
function processEvents(renderData, ownerInstance) {
  const $events = renderData.props.$events
  if ($events) {
    delete renderData.props.$events

    Object.keys($events).forEach((event) => {
      let eventHandler = $events[event]
      if (typeof eventHandler === 'string') {
        eventHandler = ownerInstance[eventHandler]
      }
      renderData.on[event] = eventHandler
    })
  }
}
```
如果`$events`中键值对中某个的`value`是字符串，那么就在父组件中把名字和这个字符串相等方法覆盖掉这个`value`

#### 处理$开头的Vue相关配置项

为了区分哪些是要给Vue的相关配置，所以在api调用时第一个参数`config`中需要加`$`，现需要找到这些变量，并去掉`$`后挂在`renderData`上
```js
function process$(renderData) {
  // props中如果存在$开头的变量，则在props中删除，并直接挂在renderData对象上
  const props = renderData.props
  Object.keys(props).forEach((prop) => {
    if (prop.charAt(0) === '$') {
      renderData[prop.slice(1)] = props[prop]
      delete props[prop]
    }
  })
}
```

#### 生成实例

上面做了如此多的工作，都是为了处理要生成实例时，传递给Vue渲染函数的data对象。所谓磨刀不误砍柴工，接着是createAPI是如何实例化组件。

`beforeHooks`存储初始化钩子被调用时传递进来的参数，在组件实例前，先运行传递给before钩子函数。在`cube-ui`中，用来检验部分不推荐单例的组件是否是单例模式生成。

`ownerInsUid`为父组件的`_uid`，没有父组件则为-1。`singleMap`为单例模式下存储组件的对象。

(_uid为组件实例化时Vue生成的唯一id，可查看[Vue代码][4])

```js
function createComponent(renderData, renderFn, options, single) {
  beforeHooks.forEach((before) => {
    before(renderData, renderFn, single)
  })
  const ownerInsUid = options.parent ? options.parent._uid : -1
  const {comp, ins} = singleMap[ownerInsUid] ? singleMap[ownerInsUid] : {}
  if (single && comp && ins) {
    ins.updateRenderData(renderData, renderFn)
    // ins.$forceUpdate()
    currentSingleComp = comp
    return comp
  }
  const component = instantiateComponent(Vue, Component, renderData, renderFn, options)
  const instance = component.$parent
  const originRemove = component.remove
  component.remove = function () {
    if (single) {
      if (!singleMap[ownerInsUid]) {
        return
      }
      singleMap[ownerInsUid] = null
    }
    originRemove && originRemove.call(this)
    instance.destroy()
  }
  const originShow = component.show
  component.show = function () {
    originShow && originShow.call(this)
    return this
  }
  const originHide = component.hide
  component.hide = function () {
    originHide && originHide.call(this)
    return this
  }
  if (single) {
    singleMap[ownerInsUid] = {
      comp: component,
      ins: instance
    }
    currentSingleComp = comp
  }
  return component
}
```

  [1]: https://github.com/cube-ui/vue-create-api/blob/master/README_zh-CN.md
  [2]: https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5-data-%E5%AF%B9%E8%B1%A1
  [3]: https://cn.vuejs.org/v2/api/#vm-watch
  [4]: https://github.com/vuejs/vue/blob/dev/src/core/instance/init.js