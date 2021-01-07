# babel 编译 class 解析

## 前言

常说通过 `class` 关键字来创建对象是通过构造函数创建对象的`语法糖`。为了细致研究 class 运行原理，可以通过 babel 指定 es2015 来看看如何编译 class。

## class 生成的对象

我们通过下面这个例子来

```js
class Person {
  constructor(params = {}) {
    this.name = params.name
  }
  eat(foot) {
    console.log('I like eat', foot)
  }
}
```

[class](https://babeljs.io/repl#?browsers=defaults%2C%20not%20ie%2011%2C%20not%20ie_mob%2011&build=&builtIns=false&spec=false&loose=false&code_lz=MYGwhgzhAEAKCmAnCB7AdtA3gKGtCALmAQJbDQBmiKAttALzQDkaArgO5hO7TDqGJWwAikQAKAA5hEYGhACUWHngIALEhAB0aWfAbQpMudt3LoajZrABzPY0OytN-DwC-PHvGJiKKFAUUcPDw-NFQQeE0QFGsxJgBJaBASAGs9LwJmABpKPwCzCy0IMABPMXk3bB5CYjJ8UvKlPHd3bFDCAyRUDEY0eHY4LvQxTGgdGngALmYAL2AmHOdppgAmABYmVwqgA&debug=false&forceAllTransforms=false&shippedProposals=false&circleciRepo=&evaluate=false&fileSize=false&timeTravel=false&sourceType=module&lineWrap=false&presets=es2015%2Cstage-2&prettier=true&targets=&version=7.12.12&externalPlugins=)

