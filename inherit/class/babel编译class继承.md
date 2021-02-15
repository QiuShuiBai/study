# 从 babel 编译 class 中学习继承

我们由上篇[babel编译calss](https://github.com/QiuShuiBai/study/blob/master/class/babel%E7%BC%96%E8%AF%91class%E8%A7%A3%E6%9E%90.md)中可知，babel 会把 class 转化成一个`构造函数`，constructor 实例属性会在构造函数中的生成，其他实例方法、静态方法等，则分别定义在原型、方法对象上。

而 class 还有一个很重要的概念，那就是继承。

> babel 编译后会有很多兼容方法，文章会挑选出较为生僻的部分，通俗部分会略过

## 构造函数继承

构造函数的继承有很多种类型，最为常见的还是[寄生组合式继承](https://developer.mozilla.org/zh-CN/docs/Learn/JavaScript/Objects/Inheritance)。babel 编译后 Class 继承实际就是这种方式，不过多了些细节上的处理。

## babel 编译结果

下面是我们需要进行编译的类。我们这里重点是观察 babel 如何实现 class 继承，所以只需要两个简单的类就好了。

```js
class Super {
  constructor(params = {}, that) {
    this.name = params.name
  }
  eat(foot) {
    console.log('I can eat ', foot)
  }
}

class Sub extends Super{
  constructor(params = {}) {
    super(params)
    this.sex = params.sex
  }
  song(song) {
    console.log('I can sing ', song)
  }
}
```

`Super` 并没有因为被 `Sub` 继承而影响到编译结果，这部分可看[babel编译calss](https://github.com/QiuShuiBai/study/blob/master/class/babel%E7%BC%96%E8%AF%91class%E8%A7%A3%E6%9E%90.md)了解。

我们重点来看 `Sub`。

```js
var Super = /*#__PURE__*/ (function () {
  function Super() {
    var params =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var that = arguments.length > 1 ? arguments[1] : undefined;

    _classCallCheck(this, Super);

    this.name = params.name;
  }

  _createClass(Super, [
    {
      key: "eat",
      value: function eat(foot) {
        console.log("I can eat ", foot);
      }
    }
  ]);

  return Super;
})();

var Sub = /*#__PURE__*/ (function (_Super) {
  _inherits(Sub, _Super);

  var _super = _createSuper(Sub);

  function Sub() {
    var _this;

    var params =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Sub);

    _this = _super.call(this, params);
    _this.sex = params.sex;
    return _this;
  }

  _createClass(Sub, [
    {
      key: "song",
      value: function song(_song) {
        console.log("I can sing ", _song);
      }
    }
  ]);

  return Sub;
})(Super);
```

`Sub` 对比 `Super` 可以发现。子类的被编译后，立即执行函数体中多执行了 `_inherits` 及 `_createSuper` 方法，同时我们 `构造函数Sub` 内部调用了 `_super.call(this, params)`

> ʕ •ᴥ•ʔ 控制变量法可知道继承发生在这三步中。同时这些个写法和我们的“寄生组合式”继承神似

```js
var Sub = /*#__PURE__*/ (function (_Super) {
  _inherits(Sub, _Super);
  var _super = _createSuper(Sub);
  // ...省略
  function Sub() {
    var _this;
    // ...省略
    _this = _super.call(this, params);
  }
  return Sub
})(Super)
```

### _inherits 改变原型关系

我们先看 `_inherits`方法。

```js
function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function");
  }
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: { value: subClass, writable: true, configurable: true }
  });
  if (superClass) _setPrototypeOf(subClass, superClass);
}
```

第一步较为简单，判断 superClass 类型，不符合则抛出错误。接着第二步：改变 Sub 类的 `prototype` 属性（最重能通过原型链找到 Super.prototype），这样 `Sub实例` 就可以通过原型链访问到 `Super` 类的原型方法。举例：

> 现在 obj 本身找 `eat` 方法，接着去 `Sub.prototype` 上找，最后访问到 `Super.prototype`，找到了 `eat` 方法。

```js
const obj = new Sub()
obj.eat('apple') // I can eat apple
```

`Object.create` 这里传了第二个参数，这里是因为改变了 `Sub.prototype` 后，需要手动维护 `Sub.prototype.constructor`，让其指向自身。

<!-- TODO，详细解释 _setPrototypeOf -->
第三部则是调用 `_setPrototypeOf` 辅助方法改变 `Sub` 的原型对象，指向 `Super`。通过原型链，可以理解原先的 Sub 方法是通过 `Function` js内置方法生成的。改变后可以理解成是 `Super` 类生成的。这样我们的 Sub 就能访问到 Super 的`静态属性了`

### 生成内部 _super 方法

通过操作原型，我们的 Sub类 已经能继承了 Super类 的原型方法、静态属性了。接下来就剩下实例属性了。

实例属性的生成一定发送在执行 `new Sub()` 时，很明显是发送在 `_super.call(this, params)`（构造函数式继承）。那么疑惑点便在 `_super` 这个方法的来源及内部结构上了。下面是 _super 方法的来源：

```js
var Sub = /*#__PURE__*/ (function (_Super) {
  _inherits(Sub, _Super);
  var _super = _createSuper(Sub);
  // ...
})(Super)
```

让我们先看看 `_createSuper` 方法

```js
function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct();
  return function _createSuperInternal() {
    var Super = _getPrototypeOf(Derived),
      result;
    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf(this).constructor;
      result = Reflect.construct(Super, arguments, NewTarget);
    } else {
      result = Super.apply(this, arguments);
    }
    return _possibleConstructorReturn(this, result);
  };
}
```

### 继承 Super 类的实例属性

> _super 的调用发生在 `new Sub` 时，

`_createSuper(Sub)` 返回一个 `_createSperInternal` 辅助方法，内部的 `_super` 就是这个方法。从 `_createSuper` 方法使用时传递的参数来看，并没有用上我们最开始定义的 Super 类而是 `Sub` 类，那么是如何获取到 Super 呢？答案便是 `_inherits` 中的 `_setPrototypeOf(subClass, superClass)`，这样一来 Super类 便是 Sub类 的原型对象：

```js
Sub.__proto__ === Super // true
```

因此，在 `_createSperInternal` 方法中，通过 `_getPrototypeOf` 便能获取 Super 类。获取之后便调用 [Reflect.construct](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Reflect/construct) 方法（else 的代码块里是对该方法的兼容）。此时 `result` 是一个对象，里面的属性为 Super 方法中的实例属性。最后会对 result 做一次验证，然后返回。此时，我们的 Sub类 运行后已经拿到了 Super 类的实例属性了。

## 总结

继承中难点主要是子类实例对象如何继承父类的实例属性及原型属性，其次便是子类如何继承到父类的静态属性。除了实例属性需要在“new”时发生，其余发生在 `_inherits` 方法中。其中因兼容问题导致有很多辅助方法。
