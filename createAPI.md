Vue.use需要提供一个install方法，该方法在src/index.js目录里面，现在直接来看看createAPI的这个方法是怎么写的：

```js
function install(Vue, options = {}) {
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

从这段能得到下列信息：
  1.  在Vue.use注册的时候，第二个参数options是一个对象，用来处理生成的api。（Vue.use()的用法, 源码）。
  2.  在Vue构造器上添加了一个叫createAPI的方法，结合**文档**，这三个参数第一个是需要api形式调用的组件，第二个是该组件向外暴露的事件，第三个是否以单例来生成组件。
  3.  运行完createAPI后，会在vue的原型链上增加在一个方法，该方法就是api形式调用组件的方法。

声明： 在createAPI接受的第二个参数events是为了兼容老版本的写法(props和events全写在一起，不做区分)，在新版本中意义不大。所以文档中只说createAPI接受两个参数

由浅入深，先说options配置项的作用以及为什么createAPI需要提供的Vue组件必须要有组件名name，因为生成的api名字需要用到这些值。
原因在processComponentName()这个函数里面：
```js
/** 
 * 假设Component.name 为 'cube-dialog'
 * componentPrefix 为 'cube-'
 * apiPrefix 为 '$create-'
*/
function processComponentName(Component, options) {
  const {componentPrefix, apiPrefix} = options
  const name = Component.name
  // 如果没有name ，则抛出错误
  assert(name, 'Component must have name while using create-api!')
  // 把componentPrefix里面的特殊字符加'/'形成正则
  const prefixReg = new RegExp(`^${escapeReg(componentPrefix)}`, 'i') // => /^cube\-/i
  // 把name里面和componentPrefix相同的字符删除，如果没有则不做处理
  const pureName = name.replace(prefixReg, '') // => 'dialog'
  // 把apiPrefix和name连接起来，中连接线形式变成驼峰形式
  let camelizeName = `${camelize(`${apiPrefix}${pureName}`)}` // => '$createDialog'
  return camelizeName
}
```
其中escapeReg、camelize方法主要是正则的匹配及转化，具体可查看代码：[escapeReg][1]、[camelize][2]

到这里，生成api名字的过程已经结束了，最后再通过下方代码，就在Vue构造器的prototype链上添加了一个方法
```js
Vue.prototype[createName] = Component.$create = api.create
```
这个方法是啥呢，我们先看看方法中的api变量是什么：
```js
import apiCreator from './creator'
const api = apiCreator.call(this, Component, events, single)
```
api是来至于src/creator.js文件的apiCreator方法的返回值，该函数体中的this因为call方法指向Vue。翻其**源码**后，能发现apiCreator该函数返回了一个名叫api的对象，且这函数里有很多供这个对象调用的方法。该对象就是Vue.createAPI方法中的api变量。
那么就知道[createName]这个方法就是api对象的create方法。

接下来便是看api式调用组件的实现过程了。让我们看apiCreator函数运行:
```js
// 只截取了直接运行的部分
function apiCreator(Component, events = [], single = false) {
  // 调用时用call改变了this指向，指向Vue
  let Vue = this
  // 当前的单例组件
  let currentSingleComp
  // 单例模式下的映射
  let singleMap = {}
  // 模拟钩子的栈，单元测试时使用
  const beforeHooks = []
  // ...
  const api = {}
  // ......
  return api
}
```
到这都只是简单的运行，为后面的重头戏api.create函数做初始化。
```js
create(config, renderFn, _single) {
  if (!isFunction(renderFn) && isUndef(_single)) {
    _single = renderFn
    renderFn = null
  }
  if (isUndef(_single)) {
    _single = single
  }
  const ownerInstance = this
  // isInVueInstance为true:  是否在vue的实例中使用
  const isInVueInstance = !!ownerInstance.$on
  let options = {}
  if (isInVueInstance) {
    // Set parent to store router i18n ...
    options.parent = ownerInstance
    if (!ownerInstance.__unwatchFns__) {
      ownerInstance.__unwatchFns__ = []
    }
  }
  const renderData = parseRenderData(config, events)

  let component = null
  processProps(ownerInstance, renderData, isInVueInstance, (newProps) => {
    component && component.$updateProps(newProps)
  })
  processEvents(renderData, ownerInstance)
  process$(renderData)

  component = createComponent(renderData, renderFn, options, _single)

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
这个函数接受三个参数：
第一个config是配置参数，类型是Object
第二个renderFn是可选参数，用于生成子 VNode 节点，通常用于处理插槽
第三个_single可选参数, 决定实例化是否采用单例模式。在没有传递 renderFn 时，可以直接作为第二个参数传入(_single的默认值来至于apiCreator的single默认值，默认为false)

create函数体中前两个if判断便是判断是否传递renderFn和_single，并为其赋上默认值
之后的ownerInstance为调用该方法的实例，如果在js文件中调用，则指向该组件自己export出去并被vue-loader编译后的对象

接着isInVueInstance是判断是否是在vue文件中调用，如果ownerInstance.$on属性能找到则在，不能则不在（new Vue后，实例对象能通过__proto__往上找到挂载在Vue.prototype.$on函数）。

如果isInVueInstance为true，那么options.parent则保存ownerInstance(为后续让api组件有父组件)，并且给ownerInstance添加__unwatchFns__数组(为后续取消监听函数做准备)。

接下来的parseRenderData是src/parse.js中的方法，它起的作用主要是兼容老版本写法，根据events，来分离config中的方法和属性，并返回一个对象。效果如下:
```js
/** 
 *  { 
 *    props: { name: 'articles', author: 'zc' },
 *    on: { click: function() { console.log('hello createAPI') }
 *  }
*/
```
```js
function parseRenderData(data = {}, events = {}) {
  // data = {
  //   name: 'articles',
  //   author: 'zc',
  //   OnClick: function() { console.log('hello createAPI') }
  // }
  // events = ['click']
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

parseRenderData，创建了一个叫on的对象和一个叫props的对象。通过events数组，生成并返回一个parsedEvents对象，数组的每一项都是key，对应的value是'on'+key名(key的首字母大写)
```js
parsedEvents: { click: 'onClick', input: 'onInput'}
```
之后再判断parsedEvents的每一个value在config里有没有对应的key，有则给on对象添加相应的事件及执行函数并删除config中对应的key


  [1]: http://www.baidu.com
  [2]: http://www.baidu.com