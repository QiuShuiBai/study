# vue-create-api

在 vue 的模版开发中，api 式调用组件有很多好处。比如在请求接口时，可以 api 式调用 loading 组件进行显示，在接口结束后进行隐藏，同时不用在需要用到的 vue 文件里进行重复的注册、声明等过程。

而 vue-create-api ，就是一个能够让 Vue 组件通过 API 方式调用的插件。该插件生成的 API 主要有多个特点：

1. 一个是让 Vue 组件挂载在 `body` 下，与Vue 实例使用的根 DOM 元素同级。

2. 能在普通 js 文件中调用

3. 实例化 api组件 时，可传递 Vue 支持的[所有的配置值](https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1)

4. 实例化 api组件 时，可以监听传递的 props 并做到响应式更新

## 使用

接下来是简单的使用过程（具体可查看[文档](https://github.com/cube-ui/vue-create-api)）。首先通过 `npm install vue-create-api` 安装，然后再使用 `Vue.use` 方法进行注册。注册完成后会在 Vue 构造函数上挂在 `createAPI` 方法。通过该方法，会相应的在 `Vue.prototype` 链上挂载生成的 `api` 方法。

> 部分逻辑写在注释中

```js
import CreateAPI from 'vue-create-api'
// 引入需要用 API 式调用的组件
import Loading from 'components/loading.vue'
// 注册 createAPI 方法
Vue.use(CreateAPI)

// 使用createAPI,把 Loading 组件的 api 挂在 Vue.prototype 上
Vue.createAPI(Loading)
```

Vue.createAPI 接收的第一个参数是一个`组件`，该组件必须拥有`name`属性；第二个属性是`Boolean`值，表是否单例生成。

在上面的代码中，根据 `vue-create-api` 内部规则（后面详细讲），生成的 api 名为`$createLoading`（假设我们 Loading 组件的 name 为 'loading' ）。

因为 $createLoading 方法挂在 Vue.prototype 上，所以在我们的任意的 Vue 文件里，可以通过`this.$createLoading()`方法拿到该组件实例。下面是具体的使用

```js
// 假设 getUserInfo 是封装过后的调用接口函数
import { getUserInfo } from 'api'
export default {
  // ...
  methods: {
    getUserInfo() {
      // 通过 api 方法拿到 loading 组件实例，请求时显示 loading 组件
      this.loading = this.loading || this.$createLoading()
      this.loading.show()
      getUserInfo()
        .then(res => {
          // 请求成功后，隐藏 loading 组件
          this.loading.hide()
        })
    }
  }
}
```

介绍完如何在 vue 文件中使用 api 组件后，让我们看看怎么在 js 文件中执行

```js
import Loading from 'components/loading.vue'
import axios from 'axios'

function getCityInfo() {
  // vue-create-api 会给 Loading 组件添加一个 $create 方法，用于生成实例。该方法同 $createLoading
  let loading = Loading.$create()
  loading.show()
  return axios.get('/city-info')
  .then((res) => {
    loading.hide()
    return Promise.resolve(res)
  })
}
```

## 生成 api 原理

通过上面的使用部分，我们可以知道，vue-create-api 生成的 api 方法是为了让我们拿到组件的实例。拿到实例后就可以通过组件内部的方法去控制组件。

得到组件的的实例很简单，类似的有xxxx(TODO)。在 vue-create-api 中，是直接通过 new Vue 实例化的，具体在下面代码的`instantiateComponent`方法中：

```js
// 省去各种代码，只剩下核心实例化组件部分
// 此时的 Component 是 Vue.create(Loading) 的组件 Loading 的一个引用
Vue.createAPI = function(Component) {
  function instantiateComponent(Component) {
    const instance = new Vue({
      render(createElement) {
        return createElement(Component)
      }
    })
    instance.$mount()
    // 这里选择手动挂载的原因是避免 Vue 根实例替换掉已有的 dom
    document.body.appendChild(instance.$el)
    // ...
    const component = instance.$children[0]
    // ...
    // 此时component 就是 Loading 组件得实例
    return component
  }
}
```

> 这里涉及到 Vue 的部分知识，new Vue时，如果没有`el`属性及调用 `$mount()` 时没有传 `elementOrSelector` 参数，需要使用原生 DOM API 把它插入文档中。

函数运行时得到组件实例，然后把该函数放在 Vue.prototype 上，这样我们就可以随时调用想要的组件了。

```js
Vue.createAPI = function(Component) {
  // ... 省略上面的书写的代码
  // 暂时先只用知道 processComponentName 方法用于生成 api 名
  const createName = processComponentName(Component, {
    componentPrefix,
    apiPrefix,
  })
  function create() {
    return instantiateComponent(Component)
  }
  // instantiateComponent 方法，Componet.$create 用于普遍 js 调用
  Vue.prototype[createName] = Component.$create = create
}
```

> 在`Vue.prototype[createName] = Component.$create = create`这可以知道如何在普通js文件中进行组件调用的：1. 在引入的组件上添加了一个 `$create` 方法。2. 通过 `$create`方法生成组件实例并得到该实例

因为 `processComponentName` 方法是得到 api 名的，和插件的核心流程无关，所以这里简单介绍一下。首先需要先知道使用 Vue.use 注册插件时的配置项，该配置项只用于生成 api 名，具体流程在下方代码注释中讲解。

| 键名 | 描述 | 默认值 |
| :--- | --- | --- |
| `componentPrefix` | 组件名前缀，最终生成的 API 会忽略该前缀 | - |
| `apiPrefix` | 为生成的 API 添加统一前缀 | `$create` |

```js
function processComponentName(Component, options) {
  const {componentPrefix, apiPrefix} = options
  // 得到组件 name
  const name = Component.name
  // prefixRegs 是匹配 componentPrefix 的正则，escapeReg 方法用于避免一些特殊字符
  const prefixReg = new RegExp(`^${escapeReg(componentPrefix)}`, 'i')
  // 删除与 componentPrefix 前缀匹配的字符
  const pureName = name.replace(prefixReg, '')
  // camelize 方法用于结合 apiPrefix 前缀，生产驼峰形式的 api
  let camelizeName = `${camelize(`${apiPrefix}${pureName}`)}`
  return camelizeName
}
```

到这里为止，vue-create-api 插件中最核心的地方已经介绍完毕了，先做一个总结，有以下两点较为重要：

1. 注册插件时可以传递一个配置项，用于生成 api 名，该 api 挂载在 Vue.prototype 上，同时这个api 也会在添加在组件对象中用于在js文件调用。该 api 调用后，会返回 api 组件的实例，可以通过这个实例对组件进行控制。

2. 实例化时为了避免替换掉已有dom，所以没有在 new Vue 时传 `el` 且 调用 `$mount` 时没有传参，手动使用 dom 操作添加在 html 上。

## 特点的实现

上面“生成 api”部分阐述了 vue-create-api 的骨架，同时也就是上述特点的前两个。接下来让我们分析以下该插件是如何满足上述特点的后三个：

1. 实例化 api组件 时，可传递 Vue 支持的[所有的配置值](https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5%E6%95%B0%E6%8D%AE%E5%AF%B9%E8%B1%A1)

2. 实例化 api组件 时，可以监听传递的 props 并做到响应式更新

### 支持 Vue 的所有配置项

这里很简单，只用在调用 this[createName]生成实例时，按约定好的规则传递 `new Vue()` 就好。接下来让我们看看 vue-create-api 文档关于这块是如何介绍 `this[createName]` 接收三个参数中的第一个参数`config`：

> | 名称 | 描述 | 类型 | 可选值 | 默认值 |
> | - | - | - | - | - |
> | config | 配置参数 | Object | {} | - |
> 同时，config 中可以设置 Vue 支持的[所有的配置值](https://cn.vuejs.org/v2/guide/render-function.html#%E6%B7%B1%E5%85%A5-data-%E5%AF%B9%E8%B1%A1)，但是必须要加 `$`

```js
// $createAaBb 为插件生成的 组件api
this.$createAaBb({
  $attrs: {
    id: 'id'
  },
  $class: {
    'my-class': true
  }
})
```

实现也很简单，把 config 得到并处理后，把处理后的值再从调用的地方层层传递下去就好了

```js
Vue.createAPI = function(Component) {
  function instantiateComponent(Component, config) {
    const instance = new Vue({
      // ...省略部分代码
      ...config
    })
    // ...省略部分代码
    const component = instance.$children[0]
    return component
  }
  function process$(config) {
    const renderData = {}
    Object.keys(config).forEach(key => {
      renderData[key.replace('$', '')] = config[key]
    })
    return renderData
  }
  function create(config) {
    // 这里的 process$ 是阉割的不能再阉割的写法，实际上插件考虑了多种情况，复杂很多。
    let renderData = process$(config)
    let component = instantiateComponent(Component, renderData)
    return component
  }
  // createName 为 api 名
  Vue.prototype[createName] = Component.$create = create
}
```

### 实现响应式

响应式的需求很容易体现在 toast 组件中。比如一个操作流，单个操作成功后需要进行提示：第一个操作成功，第二个操作成功（当然实际不应该是这么low的提示，这里只是举个例子）。如果没有对 props 进行监听并更新组件，那么为了满足需求，就需要不停的实例化多个 toast。显然不符合常理。

首先让我们看看文档，响应式需要满足哪些条件：

> 你可以在 `config` 中配置 `$props` 和 `$events`, `$props` 中的属性会被 watch，从而支持响应式更新.
 `$props` 示例, `{ [key]: [propKey] }`:
> ```js
> {
>   title: 'title',
>   content: 'my content',
>   open: false
> }
> ```
> 如果 `propKey` 是一个字符串，且作为属性名存在于调用 `$createAaBb()` 的组件中, 则会取该实例对应的属性值作为该 Prop 值。 同时会 watch 该属性，做到响应式更新。

可以看到，如何知道一个 prop 是需要响应式更新的化，值需要为一个字符串，用于响应式监听。这个字符串代表的是调用这个 组件api 的组件（父组件）中的属性。接下来让我们来看看思路：

> 注意：假设 组件 A 调用了 api组件 B，那么这里就定义 A 为 (B的) 父组件，B 为（A的）子组件

实例化时，先在得到父组件，然后再从实例化函数的参数中，找到需要响应式的数据，让父组件监听这些数据的变化，变化后重新让 api组件更新。让我们就着下方的代码，分步骤查看是如果实现这一功能的。

```js
Vue.createAPI = function(Component) {
  function instantiateComponent(Component) {
    // 省略内部逻辑
  }
  function process$(config) {
    // 省略内部逻辑
  }
  function create(config) {
    //第一步： 得到父组件， this 便是父组件，这里涉及到 js this指向问题：“当this作为对象方法的调用”
    const ownerInstance = this
    // 判断是父组件是否在 Vue 实例中，如果没有则说明是在普通js文件调用
    const isInVueInstance = !!ownerInstance.$on
    let options = {}
    if (isInVueInstance) {
      // 此时，我们拿到了“父组件” ownerInstance 并放在了 options 对象上的 parent 属性上
      options.parent = ownerInstance
    }
    let renderData = process$(config)
    let component = instantiateComponent(Component, renderData)
    // 第二步，找到响应式数据；第三步，监听；第四部更新。抽成一个方法来做
    processProps(config, ownerInstance, component)
    return component
  }
  function processProps(config, ownerInstance, component) {
    // config 是实例 api 组件时传递的 Vue 配置项
    const $props = config.$props
    const watchKeys = []
    const watchPropKeys = []
    // 第二步内容，找到需要响应式的数据
    Object.keys($props).forEach((key) => {
      const propKey = $props[key]
      // 如果 props 中某个属性的值是“字符串”且在“父组件”中能找到以该字符串为 key 的数据
      if (isStr(propKey) && propKey in ownerInstance) {
        // 子组件中，需要更新的值
        watchKeys.push(key)
        // 父组件中，需要被监听的数据
        watchPropKeys.push(propKey)
      }
    })
    // 第三步监听
    ownerInstance.$watch(function () {
      // 把子组件中需要监听的 props 单独集合成一个对象，并使用 父组件的"$watch"方法监听这个对象
      const props = {}
      watchKeys.forEach((key, i) => {
        // props对象的 key 是子组件的的props的 key ，value 是父组件中能找到以该"该key为属性"的属性值
        props[key] = ownerInstance[watchPropKeys[i]]
      })
      return props
    }, (newProps) => {
      // 这个匿名函数会在 props 这个对象发生变化时执行，参数是新的 props 对象。这里涉及到 Vue 知识: “$watch”
      // 第四步，更新。$updateProps 马上在下面讲
      component && component.$updateProps(newProps)
    })
  }
  // createName 为 api 名
  Vue.prototype[createName] = Component.$create = create
}
```

可以看到，整个流程下来还是比较清晰的，因 `ownerInstance` 可能会在多个地方用到，是一个公共值，所以放在 create 方法得到，剩下对数据的处理和监控都收拢在了一个函数里。到 processProps 还差最后一步 `$updateProps`。

因为 `$updateProps` 是通过组件实例上调用的，所以该方法的实现应该在最开始讲到的 `instantiateComponent` 实例化组件的方法内。让我们来扩充以下该方法。
```js
Vue.createAPI = function(Component) {
  function instantiateComponent(Component, config) {
    const instance = new Vue({
      // ...省略部分代码
      ...config
    })
    // ...省略部分代码
    const component = instance.$children[0]
    // $updateProps 只是Vue中"$forceUpdate()"方法的代理
    component.$updateProps = function (props) {
      // 更新实例化Vue时， config 对象中的 props，让新值覆盖旧值
      Object.assign(config.props, props)
      // 在调用 $forceUpdate() 方法，重新渲染 api组件
      instance.$forceUpdate()
    }
    return component
  }

  function create(config) {
    // 省略得到父组件相关部分
    let component = instantiateComponent(Component, config)
    return component
  }
  // createName 为 api 名
  Vue.prototype[createName] = Component.$create = create
}
```

### 销毁

到此为止，一个最基本 api 组件已经实现，但是有一个明显的问题，比如 loading 组件，A 路由初始化 loading，切换到 B路由又初始化一次，那么就会导致我们 body 下会又两个 loading 组件的dom元素。由此我们可以很清晰的知道，在父组件销毁时，api组件也要跟着销毁。

那我们可以对父组件添加一些代码，监听父组件的销毁，然后在此时使用dom操作移除 api组件的dom对象就可以了。

```js
Vue.createAPI = function(Component) {
  function instantiateComponent(Component, config) {
    // ...省略部分代码
  }

  function create(config) {
    let component = instantiateComponent(Component, config)
    // ownerInstance 为父组件
    const ownerInstance = this
    // 父组件监听自身的 beforeDestory 事件，执行
    ownerInstance.$on('hook:beforeDestroy', beforeDestroy)

    function beforeDestroy() {
      // 调用组件自身的销毁方式
      this.$destroy();
      if (this.$el && this.$el.parentNode === document.body) {
        // 同时手动移除 api组件的dom
        document.body.removeChild(this.$el);
      }
      component = null
    }
    return component
  }
  // createName 为 api 名
  Vue.prototype[createName] = Component.$create = create
}
```

## 总结

至此，我们分析完了 vue-create-api 的基本实现，从最开始的实例化 api组件，到挂载在body上，然后满足传递 vue 选项并且支持响应式更新，再到最后的销毁。从树干到树枝，当然这个插件的实际代码要比现在复杂很多，因为还有类似单例生成及兼容旧版本的一些写法。如果感兴趣的话，可以详细去看看是如果实现的。

<!-- 
5. 可选单例模式来实例化 api组件

### 单例

单例模式去实例一个 api组件可能会出现且不仅只在以下几种场景：

1. Dialog对话框，在移动端的对话框中，因屏幕占比及用户体验等原因，一次显示只需要一个对话框，不同的对话改变的仅是对话框的内容

2. Loading效果组件， 并发请求接口时，如果其中一个接口返回，需要把 loading 关闭时。原因：多个接口同时生成 Loading ，如果不是单例，只有在最后的接口返回后才能关闭所有的 Loading

开启单例模式很简单，`Vue.createAPI 第二个参数`，或者 `this[createName] 的第三个参数` 就代表是否开启，Boolean 值，默认为 false，api的优先级高。看看文档是如何介绍 `this[createName]` 接收三个参数中的第三个参数`single`：

> | 名称 | 描述 | 类型 | 可选值 | 默认值 |
> | - | - | - | - | - |
> | single | 可选参数, 决定实例化是否采用单例模式。在没有传递 renderFn 时，可以直接作为第二个参数传入。 | Boolean | true/false | 调用 createAPI 时传入的 single 值 |

```js
import Loading from 'components/loading.vue'

Vue.createAPI(Loading, true)
// 或者
this.$createLoading({
  $props: { text: '加载中' }
}, true)
```

在这个插件中，单例需要考虑到一些问题：

1. 为了避免不同组件互相影响，如X 组件调用了 api 生成 x 组件，Y 组件也调用了 api 生成的 y 组件。此时 x与y 不是单例。

2. 同一个组件，多次调用 api，生成的单例组件需要根据调用时的传参，进行重新渲染。

```js
Vue.createAPI = function(Component, single) {
  // ... 省略上面的书写的代码
  function create(config, single) {
    let singleMap = {}
    const ownerInsUid = options.parent ? options.parent._uid : -1
    const {comp, ins} = singleMap[ownerInsUid] ? singleMap[ownerInsUid] : {}
    if (single && comp && ins) {
      ins.updateRenderData(renderData, renderFn)
      ins.$forceUpdate()
      return comp
    }
    let component = instantiateComponent(Component)
    if (single) {
      singleMap[ownerInsUid] = {
        comp: component,
        ins: instance
      }
    }
    return component
  }
  // createName 为 api 名
  Vue.prototype[createName] = Component.$create = create
}
``` -->
