# babel 编译 class 解析

从一基本功能的 class 中，通过 babel 学习新知识。

## 前言

常说通过`class`关键字来创建对象是通过构造函数创建对象的`语法糖`。为了细致研究 class 运行原理，可以通过 babel 指定 es2015 来看看如何编译 class。

## 一个功能完善的class

下面是一个简单的 Person 类。定义了一个实例属性和一个原型方法，和一个静态属性、静态方法。

```js
class Person {
  static chineseName = '人类'
  constructor(params = {}) {
    this.name = params.name
  }
  eat(foot) {
    console.log('I like eat', foot)
  }
  static drink() {
    console.log('I can drink')
  }
}
```

经过 babel 编译后，我们的 Person 类实际是一个通过立即执行函数返回的构造函数。同时在会调用辅助方法添加静态属性`chineseName`

> 立即执行函数有自己独有的作用域，这种用法可以避免污染全局

```js
var Person = /*#__PURE__*/ (function () {
  function Person() {
    var params =
      arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

    _classCallCheck(this, Person);

    _defineProperty(this, "height", 1);

    this.name = params.name;
  }

  _createClass(
    Person,
    [
      {
        key: "eat",
        value: function eat(foot) {
          console.log("I like eat", foot);
        }
      }
    ],
    [
      {
        key: "drink",
        value: function drink() {
          console.log("I can drink water");
        }
      }
    ]
  );

  return Person;
})();

_defineProperty(Person, "chineseName", "人类");
```

## 构造函数的生成

接下来我们通过立即执行函数，看看是怎么生成的 Person 构造函数。函数内首先定义了一个 Person 方法，这就是我们使用的编译后的构造函数。Person 方法执行时会走三个逻辑：

1. 通过 arguments 获取参数。使用 arguments 的原因是我们定义了 params 默认为 `{}`，babel需要转译这语法。
2. 调用方法`_classCallCheck`。因类不同当作普通函数进行调用，这个方法便是检测这个原因的。
3. 定义实例属性

这一块我们很好理解，定义了一个构造函数来模拟 class。其中 `_classCallCheck` 暂时先跳过，待我们实例化运行时再研究。

立即执行函数内定义完构造函数 Person 后，会执行 `_createClass` 方法。这个方法是为 Person 添加原型方法和静态方法。babel 把我们定义好的原型/静态方法转换成一个对象数组后，和构造函数 `Person` 一起作为参数传入。

```js
function _createClass(Constructor, protoProps, staticProps) {
  if (protoProps) _defineProperties(Constructor.prototype, protoProps);
  if (staticProps) _defineProperties(Constructor, staticProps);
  return Constructor;
}

// 辅助函数
function _defineProperties(target, props) {
  for (var i = 0; i < props.length; i++) {
    var descriptor = props[i];
    descriptor.enumerable = descriptor.enumerable || false;
    descriptor.configurable = true;
    if ("value" in descriptor) descriptor.writable = true;
    Object.defineProperty(target, descriptor.key, descriptor);
  }
}
```

先介绍 `_defineProperties`。这方法是对 `Object.defineProperty` 的封装，主要是给`属性描述符`定义了一些默认值。可以看成是一个定制版的 `Object.defineProperties`。

我们的 `例子Person` 定义了一个原型方法 eat，和静态方法 drink。原型方法和静态方法在都会调用 `_defineProperties` 辅助函数进行定义。区别是原型方法定义在`原型链`上，静态方法定义在构造函数本身上：

```js
// 原形方法
Object.defineProperty(Person.prototype, descriptor.key, descriptor);
// 静态方法
Object.defineProperty(Person, descriptor.key, descriptor);
```

这样下来，我们对立即执行函数已经分析完毕，我们编译后的构造函数也完成了对 class `实例属性`、`实例方法`、`静态方法`的转换，现在只剩下静态属性了。

## 静态属性

静态属性的定义很简单，很一个属性都会执行一遍 `_defineProperty` 方法。该方法也就是对 defineProperty 的封装。

```js
_defineProperty(Person, "chineseName", "人类");

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }
  return obj;
}
```

> @babel/core 需要添加 `@babel/plugin-proposal-class-properties` 插件

## 运行

我们在 `new Person()` 时会触发到上面说的 `_classCallCheck` 方法

```js
// 运行
_classCallCheck(this, Person)

function _instanceof(left, right) {
  if (
    right != null &&
    typeof Symbol !== "undefined" &&
    right[Symbol.hasInstance]
  ) {
    return !!right[Symbol.hasInstance](left);
  } else {
    return left instanceof right;
  }
}

function _classCallCheck(instance, Constructor) {
  if (!_instanceof(instance, Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}
```

这个方法就是调用 `instanceof` 判断 `Person` 允许时的 this 是否是 Person 的实例对象。因为 Class 都[执行在严格模式](https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Classes#%E4%B8%A5%E6%A0%BC%E6%A8%A1%E5%BC%8F)下，所以 babel 转译后的代码也在这个环境。如果是直接调用 `Person()`时，this 为 `undefined`，符合类只能通过`new` 关键字进行调用的要求。

> 1. babel 编译后的代码是用 this 来判断是否是构造函数的实例，这地方可以通过 `call` 等方法改变 this 指向绕过。
>
> 2. `_instanceof` 有一个 Symbal.hasInstance。是一个内置的 Symbal 属性，如果对象中具有这个变量（通常为一个方法），使用 `instanceof` 时会调用这个方法。[传送门](https://es6.ruanyifeng.com/#docs/symbol#Symbol-hasInstance)
