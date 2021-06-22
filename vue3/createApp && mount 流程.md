# createApp && mount 流程（待补充详细）

## createApp 创建 app 实例

1. <span id="renderer"></span>const app = createApp(App)

    1. createApp 内部先创建 renderer： ensureRenderer()

    2. ensureRenderer 运行完后，返回的 renderer 为:

        ```js
        renderer = {
          render,
          hydrate,
          createApp: createAppAPI(render, hydrate)
        }
        ```

2. 此时 createApp 拿到了 renderer，接着通过 renderer.createApp() 创建 app 实例

    1. renderer.createApp 执行：

        ```js
        const context = createAppContext()
        const app = (context.app = {
          use() {},
          component() {},
          mount() {}
          // 省略..
        })
        return app
        ```

    2. 创建了 context 对象，此时 app.mount 都能通过作用域访问到该对象

3. createApp 拿到 renderer 生成的 app 后，重写 mount 后，return 出去暴露给开发者

    ```js
    const createApp = ((...args) => {
      // 省略部分代码
      const app = ensureRenderer().createApp(...args)
      const { mount } = app
      app.mount = containerOrSelector => {
        // 省略
        mount()
      }
      return app
    })
    ```

## app.mount 挂载进行 dom 渲染

1. 执行重写的 mount

    ```js
    app.mount = containerOrSelector => {
      // 省略部分
      const container = normalizeContainer(containerOrSelector)
      container.innerHTML = ''
      const proxy = mount(container)
      return proxy
    }
    ```

    1. normalizeContainer 方法执行后，返回整个 vue 挂载的目标 dom

    2. 再通过 container.innerHTML = '' 清空 dom 内元素。如果挂载的 dom 原本有内容，就是在这步进行清空

    3. 调用初始的 mount

2. 执行最初的 mount， rootContainer 是挂载的目标 dom。rootComponent 和 rootProps 是我们创建 app 实例时传入的组件和选项

    ```js
    // 创建时
    const app = createApp(App, { title: '标题'})

    mount(rootContainer) {
      // 重点逻辑
      const vnode = createVNode(rootComponent, rootProps)
      vnode.appContext = context
      render(vnode, rootContainer)
      return vnode.component!.proxy
    }
    ```

3. mount 开始时，会通过 createVNode 方法创建一个描述 App 的 VNode

    ```js
    const vnode = createVNode(rootComponent, rootProps)
    // createVNode 经过各种处理后，最后执行 _createVNode 生成 vnode
    function _createVNode(
      type,
      props,
      children = null,
      patchFlag = 0,
      dynamicProps = null,
      isBlockNode = false
    ) {
    }
    ```

    1. `createVNode` 经过一些判断和参数处理后，会执行到 `_createVNode`，该函数前两个参数就是 createVNode 的参数，其他参数走默认值

    2. 执行 `_createVNode` 进行 vnode 的定义。vnode 本质上就是一个对组件进行描述的对象，在这里比较有意义的是 `type` 属性和 `patchFlag` 属性和 `normalizeChildren` 方法。type 是我们最开始传入的App组件对象，shapeFlag 为了标记是vnode类型，有标签（div）或是组件对象等类型。normalizeChildren 这里用不到，先忽略

        ```js
        function _createVNode() {
          const shapeFlag = isString(type)
            ? ShapeFlags.ELEMENT
            : __FEATURE_SUSPENSE__ && isSuspense(type)
              ? ShapeFlags.SUSPENSE
              : isTeleport(type)
                ? ShapeFlags.TELEPORT
                : isObject(type)
                  ? ShapeFlags.STATEFUL_COMPONENT
                  : isFunction(type)
                    ? ShapeFlags.FUNCTIONAL_COMPONENT
                    : 0

          const vnode = {
            type,
            shapeFlag
          }
          normalizeChildren(vnode, children)
          return vnode
        }
        ```

    3. <span id="shapeFlag"></span>因为我们的 `type` 是一个对象，所以 `shapeFlag` 属性会被定义为 `ShapeFlags.STATEFUL_COMPONENT`。

        > 这里有个概念，什么叫 `STATEFUL_COMPONENT` 和 `FUNCTIONAL_COMPONENT`。我们日常开发写的模版组件等，都是有状态组件(statefulComponent)，而函数式组件在 [vue3](https://v3.cn.vuejs.org/guide/migration/functional-components.html#%E5%87%BD%E6%95%B0%E5%BC%8F%E7%BB%84%E4%BB%B6) 中已不推荐使用。

    4. <span id="setContext"></span>拿到 vnode 后，把最开始定义的 context 对象添加在 vnode 上。

        ```js
        const context = createAppContext()
        const app = (context.app = {
          mount(rootContainer) {
            // mount 执行内部，通过作用域获取到 context
            vnode.appContext = context
          }
        }
        ```

4. 执行 `render` 方法。render 来通过闭包，来自于最开始的生成 createApp 方法的 `createAppAPI(render, hydrate)`

    ```js
    renderer = {
      render,
      hydrate,
      createApp: createAppAPI(render, hydrate)
    }
    function createAppAPI(render, hydrate) {
      return function createApp() {
        const app = {
          mount: function() {
            render()
          }
          // ...
        }
        return app
      }
    }
    ```

### render 执行

1. 该render 实际定义在 renderer 渲染器中，而又因为闭包的关系，函数能互相访问到其他的方法：

    ```js
    render(vnode, rootContainer)

    function baseCreateRenderer() {
      // 省略部分
      const patch = () => {}
      const processComponent = () => {}

      const render = (vnode, container) => {
        patch(container._vnode || null, vnode, container)
        container._vnode = vnode
      }
      return {
        render
      }
    }
    ```

### patch 执行

1. <span id="patch"></span>render 在这里会调用 patch 方法，进行 dom 挂载的流程（patch 包括了更新数据后，进行 diff 更新 dom 的逻辑。这只讲挂载）。patch调用时只提供了三个参数，null、当前vnode、容器。

    ```js
    patch(container._vnode || null, vnode, container)

    const patch = (n1, n2, container, /* 其他省略 */) => {
      //..
    }
    ```

    1. 在 patch 中 `n1` 为 null，表示没有旧节点，是第一次的挂载逻辑；`n2` 是之前定义的 vnode，也表示“新vnode节点”；container 是容器。

    2. patch 首先会获取到 `n2`(新vnode)的 type，在当前场景下是一个组件对象。然后根据 type 和 shapeFlag，进行下一步的操作。这里涉及到 (Symbol及位运算)

        ```js
        const { type, ref, shapeFlag } = n2

        switch (type) {
          case Text:
          case Comment:
          case Static:
          default:
            if (shapeFlag & ShapeFlags.ELEMENT) {}
            else if (shapeFlag & ShapeFlags.COMPONENT) {
              processComponent(
                n1,
                n2,
                container,
                anchor,
                parentComponent,
                parentSuspense,
                isSVG,
                optimized
              )
            }
        }
        ```

    3. 因为我们的 shapeFlag 为 `ShapeFlags.STATEFUL_COMPONENT`，所以接下来会调用 `processComponent`。[shapeFlag定义](#shapeFlag)

    4. <span id="processComponent"></span>`processComponent` 顾名思义处理组件其实也只是起到中转作用，这里会判断是否有 n1(旧节点)，没有时执行挂载逻辑，有则执行更新。在该处会执行 `mountComponent`

        ```js
        if (n1 == null) {
          if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {}
          else {
            mountComponent(
              n2,
              container,
              anchor,
              parentComponent,
              parentSuspense,
              isSVG,
              optimized
            )
          }
        } else {
          updateComponent(n1, n2, optimized)
        }
        ```

## mountComponent

1. `mountComponent` 可以只看三部分。分别是创建实例、执行 setup、建立响应式

    ```js
    const mountComponent = () => {
      const instance = (initialVNode.component = createComponentInstance(
        initialVNode,
        parentComponent,
        parentSuspense
      ))
      setupComponent(instance)
      setupRenderEffect(
        instance,
        initialVNode,
        container,
        anchor,
        parentSuspense,
        isSVG,
        optimized
      )
    }
    ```

### createComponentInstance

1. 首先通过`createComponentInstance` 创建实例，和创建 app、context、vnode 一样，创建实例也是直接定义一个对象，经过加工后返回

    ```js
    let uid = 0
    function createComponentInstance(vnode, parent, suspense) {
      const type = vnode.type
      // inherit parent app context - or - if root, adopt from root vnode
      const appContext = (parent ? parent.appContext : vnode.appContext) || emptyAppContext
      const instance = {
        uid: uid++,
        vnode,
        type,
        parent,
        appContext
        // 省略
      }
      if (__DEV__) {
        instance.ctx = createRenderContext(instance)
      } else {
        instance.ctx = { _: instance }
      }
      instance.root = parent ? parent.root : instance
      instance.emit = emit.bind(null, instance)
      return instance
    }
    ```

    1. 这里 `createComponentInstance` 每次执行时 uid 自增，所有的组件实例都具有唯一的一个 uid

    2. 而 appContext 就是整个 app 应用的 context，如果有父组件则从父组件获取。而最初的 context 因在 mount 时[赋值](#setContext)给了最初的 vnode，所以可以直接通过 vnode 获取。

    3. 最后再添加一些属性、方法 （ps: 没搞懂为什么要单独拿出来设置）

### setupComponent

1. 拿到 instance 后，执行 `setupComponent(instance)`，setupComponent 中关于 props等定义先忽略（不是本篇重点）。普通组件时 `isStateful` 为 true，所以执行 `setupStatefulComponent` 进行 setup 相关逻辑。

    ```js
    function setupComponent( instance, isSSR = false) {
      isInSSRComponentSetup = isSSR
      const isStateful = isStatefulComponent(instance)
      const setupResult = isStateful
        ? setupStatefulComponent(instance, isSSR)
        : undefined
      isInSSRComponentSetup = false
      return setupResult
    }
    ```

2. setupStatefulComponent 重点是对 setup 的处理，整个逻辑都是围绕着 setup 进行

    ```js
    function setupStatefulComponent(instance, isSSR) {
      const Component = instance.type
      instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
      const { setup } = Component
      if (setup) {
        const setupContext = (instance.setupContext = setup.length > 1 ? createSetupContext(instance) : null)
        currentInstance = instance
        const setupResult = callWithErrorHandling(
          setup,
          instance,
          ErrorCodes.SETUP_FUNCTION,
          [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
        )
        currentInstance = null
        handleSetupResult(instance, setupResult, isSSR)
      }  else {
        finishComponentSetup(instance, isSSR)
      }
    }
    ```

    1. 首先获取组件的 setup 选项，假设我们的组件有 setup

    2. 接下来定义后 setup 方法的第二个参数 setupContext，都是 instance 实例上的一些属性、方法。这里我们直接看定义：

        ```js
        createSetupContext(instance) {
          return {
            attrs: instance.attrs,
            slots: instance.slots,
            emit: instance.emit,
            expose
          }
        }
        ```

    3. callWithErrorHandling是一个高阶函数，封装了第一个参数 fn 的错误处理。其实就在这里运行了 setup

        ```js
        function callWithErrorHandling(fn, instance, type, args) {
          let res
          try {
            res = args ? fn(...args) : fn()
          } catch (err) {
            handleError(err, instance, type)
          }
          return res
        }
        ```

    4. 获取到 `setupResult` 后，`handleSetupResult` 做一些基础处理，这里仅截取重要的部分。`proxyRefs` 是对结果做一层 proxy 代理。

        ```js
        function handleSetupResult(instance, setupResult, isSSR) {
          instance.setupState = proxyRefs(setupResult)
          finishComponentSetup(instance, isSSR)
        }

        // proxyRefs 的 proxy handler
        const shallowUnwrapHandlers = {
          get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
          set: (target, key, value, receiver) => {
            const oldValue = target[key]
            if (isRef(oldValue) && !isRef(value)) {
              oldValue.value = value
              return true
            } else {
              return Reflect.set(target, key, value, receiver)
            }
          }
        }
        ```

    5. 最后执行 `finishComponentSetup`，这里会给 instance.render 进行赋值且对 options api 进行处理：

        ```js
          function finishComponentSetup(instance, isSSR) {
            instance.render = Component.render || NOOP

            // support for 2.x options
            if (__FEATURE_OPTIONS_API__) {
              currentInstance = instance
              applyOptions(instance, Component)
              currentInstance = null
            }
          }
        ```

    6. 累了，options api 处理啥的，单独讲吧，庞大

### setupRenderEffect

最后一步 `setupRenderEffect` 内执行 effect 方法。该方法是用来建立响应式的，这里暂时不讲。可认为直接执行了传入的 `componentEffect` 函数。

```js
const setupRenderEffect = (
  instance.update = effect(function componentEffect() {
    const subTree = (instance.subTree = renderComponentRoot(instance))

    if (el && hydrateNode) {
    } else {
      patch(
        null,
        subTree,
        container,
        anchor,
        instance,
        parentSuspense,
        isSVG
      )
      initialVNode.el = subTree.el
    }
  }, __DEV__ ? createDevEffectOptions(instance) : prodEffectOptions)
}
```

1. 方法内首先是执行 `renderComponentRoot` 方法。内部获取到需要用到的各种参数后，执行 render 方法 获取 vnode

    ```js
    function renderComponentRoot(instance) {
      const {
        type: Component,
        vnode,
        proxy,
        withProxy,
        props,
        propsOptions: [propsOptions],
        slots,
        attrs,
        emit,
        render,
        renderCache,
        data,
        setupState,
        ctx
      } = instance
      const proxyToUse = withProxy || proxy
      result = normalizeVNode(
        render!.call(
          proxyToUse,
          proxyToUse!,
          renderCache,
          props,
          setupState,
          data,
          ctx
        )
      )
      return result
    }
    ```

    1. render 方法和 vue2 类似，是通过 `@vue/compiler-sfc` 解析.vue 文件，把 template 转化成的 render 函数。

        ```js
        // 简单示意
        function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
          return (_openBlock(), _createBlock("div", _hoisted_1, [
            _createVNode("div", _hoisted_2, _toDisplayString(_ctx.mainValue), 1 /* TEXT */),
            _createVNode("div", _hoisted_3, _toDisplayString(_ctx.foo), 1 /* TEXT */),
            _renderSlot(_ctx.$slots, "default", {}, () => [
              _hoisted_4
            ])
          ]))
        }
        ```

        > 这里的 `return` 使用了[逗号操作符](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Operators/Comma_Operator)。相当于运行 `_openBlock()` 后，再执行 `return _createBlock()`。

        根据下面代码可知createBlock 内部调用 `createVNode` 生成 vnode 后，返回 vnode。那么我们的 `render.call()` 返回的就是 App.vue 中 template 部分的 vnode

        ```js
        // 省略部分代码
        function createBlock() {
          const vnode = createVNode()
          return vnode
        }
        ```

        <span id="tpl-vnode-demo"></span>下面贴一个 template 的代码及其 vnode

        ```html
        <div class="wrapper">
          <p class="name">{{name}}</p>
          <p class="age">{{age}}</p>
        </div>
        ```

        ```js
        vnode = {
          props: { class: "wrapper" },
          type: "div",
          shapeFlag: 17,
          patchFlag: 0,
          children: [{
            props: { class: "name" },
            type: "p",
            shapeFlag: 9,
            patchFlag: 1
            children: "zc",
          }, {
            props: { class: "age" },
            type: "p",
            shapeFlag: 9,
            patchFlag: 1
            children: "24",
          }]
        }
        ```

    2. 拿到 vnode 后，需要执行 normalizeVNode 方法，进行规范，当前情况无处理，暂时不深入

2. <span id="patchAgain"></span>拿到 vnode 后执行再执行 patch...，很熟悉吧，这就是递归。只是 vnode 变了。最开始关于[patch](#patch)的流程。而此时与之前的区别便是 vnode 中的 type 。之前是一个组件对象，而现在是字符串“div”。（以[该例子](#tpl-vnode-demo)为例)。在内部的 if else 会发生些许变化。其执行 `processElement` 这个方法

    ```js
    const { type, ref, shapeFlag } = n2
    switch (type) {
      case Text:
      case Comment:
      case Static:
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(
            n1,
            n2,
            container,
            anchor,
            parentComponent,
            parentSuspense,
            isSVG,
            optimized
          )
        }
        else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 最开始时的 patch 流程
          processComponent()
        }
    }
    ```

    和 [processComponent](#processComponent) 类似，`processElement` 这里也是一个中转处理，判断是挂载还是更新。在这里因为 n1 为 null，执行 `mountElement`方法

    ```js
    // patch 第一个参数是 null
    patch(null, subTree, /* 省略 */)

    // n1 是 patch 的第一个参数
    if (n1 == null) {
      mountElement(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        optimized
      )
    } else {
      patchElement(n1, n2, parentComponent, parentSuspense, isSVG, optimized)
    }
    ```

3. <span id="mountElement"></span>mountElement 这步进入到挂载阶段。

    ```js
    const mountElement = (vnode, container) => {
      let el
      let vnodeHook
      const { type, shapeFlag } = vnode
      el = vnode.el = hostCreateElement(vnode.type, isSVG, props && props.is)

      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(
          vnode.children as VNodeArrayChildren,
          el,
          null,
          parentComponent,
          parentSuspense,
          isSVG && type !== 'foreignObject',
          optimized || !!vnode.dynamicChildren
        )
      }

      hostInsert(el, container, anchor)
    }
    ```

    1. 这里通过 `hostCreateElement` 根据 vnode.type 创建dom，该方法是对 document.createElement 的封装。现在来解释下 `hostCreateElement` 来源。回到最开始创建 [renderer](#renderer)(渲染器) 时，执行的是 `ensureRenderer` 方法。其中参数 `rendererOptions` 是通过 `Object.assign`(extend = Object.assign) 合并了多个对象。其中 `nodeOps` 是包括 dom 操作的方法封装集。

        ```js
        const doc = (typeof document !== 'undefined' ? document : null) as Document
       
        const nodeOps = {
          insert: (child, parent, anchor) => {
            parent.insertBefore(child, anchor || null)
          },
          createElement: (tag, isSVG, is): Element =>
            isSVG
              ? doc.createElementNS(svgNS, tag)
              : doc.createElement(tag, is ? { is } : undefined),

          createText: text => doc.createTextNode(text)
        }

        const rendererOptions = extend({ patchProp, forcePatchProp }, nodeOps)
        function ensureRenderer() {
          return renderer || (renderer = createRenderer<Node, Element>(rendererOptions))
        }
        ```

        而后 createRenderer 把该参数传递后，结构赋值并重命名后为 `hostCreateElement`。所以此时就相当于调用了 `document.createElement('div')`

        ```js
        function createRenderer(options) {
          return baseCreateRenderer(options)
        }

        function baseCreateRenderer() {
          const {
            insert: hostInsert,
            createElement: hostCreateElement,
            createText: hostCreateText,
            // ...
          } = options

          const mountElement = (vnode, container) => {}
          // ...
        }
        ```

    2. 因为我们当前 vnode 具有子元素，且符合 `shapeFlag & ShapeFlags.ARRAY_CHILDREN`。所以取出子元素并传入 `mountChildren`，并且传入根据 父vnode.type 创建的 dom

        ```js
        // vnode 如下
        vnode = {
          type: "div",
          shapeFlag: 17,
          children: [/* 省略*/]
        }

        el = vnode.el = hostCreateElement(vnode.type, isSVG, props && props.is)
        // 17 & 16 === 16  true
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(vnode.children, el, /* 省略 */)
        }
        ```

    3. mountChildren 内部很简单。把每一个子元素，再执行一边patch，不过注意容器，之前一直是以 creatApp 时传入的 dom，而现在是根据 父vnode创建的 dom

        ```js
        const mountChildren = (children, container /* 省略*/) => {
          for (let i = start; i < children.length; i++) {
            const child = (children[i] = optimized
              ? cloneIfMounted(children[i])
              : normalizeVNode(children[i]))
            patch(
              null,
              child,
              container,
              anchor,
              parentComponent,
              parentSuspense,
              isSVG,
              optimized
            )
          }
        }
        ```

4. 子元素再一次 [patch](#patchAgain) 后，又进入到 [mountElement](#mountElement) 阶段。只是这一次子元素为字符串而不是数组了。

    ```js
    // 子 vnode
    vnode = {
      props: { class: "name" },
      type: "p",
      shapeFlag: 9,
      patchFlag: 1
      children: "zc",
    }

    const mountElement = (vnode, container) => {
      let el
      let vnodeHook
      const { type, shapeFlag } = vnode
      el = vnode.el = hostCreateElement(vnode.type, isSVG, props && props.is)

      // 9 & 8 === 8 truen
      if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
        hostSetElementText(el, vnode.children)
      }
      hostInsert(el, container, anchor)
    }
    ```

    1. `hostSetElementText` 和 `hostCreateElement` 类似，也是 vue 对 dom 的封装。

        ```js
        const setElementText: (el, text) => {
          el.textContent = text
        }
        const {
          // 省略
          setElementText: hostSetElementText
        } = options
        ```

    2. 最后执行 `hostInsert`。把子dom 添加到父dom上

        ```js
        const insert: (child, parent, anchor) => {
          parent.insertBefore(child, anchor || null)
        }
        const {
          // 省略
          insert: hostInsert
        } = options
        ```

5. 这样一来，mountChild 递归执行完 patch 后，回到父元素的 [mountElement](#mountElement) 阶段。接着执行父元素的 `hostInsert` 方法把 dom 挂载完毕

6. 如果嵌套了组件，那么在执行子组件 vnode 的[patch](#patchAgain)时，会走到 `else if (shapeFlag & ShapeFlags.COMPONENT)` 的流程，那么就相当于从头再递归[processComponent](#processComponent)方法一次，这里不再继续下去了
