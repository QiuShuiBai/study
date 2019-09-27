# Object.defineProperty

## 难点

如果访问者的属性是被继承的，它的 get 和 set 方法会在子对象的属性被访问或者修改时被调用。get 很好理解，但是set 的表现和普通继承的属性有区别：

```js
const a = { name: 'a' }
const b = Object.create(a)

console.log(b.name) // 'a'

b.name = 'b'

console.log(b.name) // 'b'
console.log(a.name) // 'a'
```

上述未代理时，修改 `b.name` 表现为直接修改 `b` 这个对象而和对象 `a` 没有关系

但 `a.name` 经过代理后，修改 `b.name` 表现为会触发 a.name 的 `set`。而且在修改完 `b.name` 后再次访问，在常理中是能直接在 `b` 这个对象获取到 `name` 属性，但实际却触发了 `a.name` 的 `get`。

```js
const a = {}
Object.defineProperty(a, 'name', {
  get() {
    console.log('get')
    return this._name
  },
  set(nVal) {
    console.log('set')
    this._name = nVal
  }
})

const b = Object.create(a)

b.name = 'b'  // 'set'
console.log(b.name) // 'get'、'b'
```

## 后续思考

### 9.28日思考

经过proxy 后，使用 `Reflect.set(target, key, value, receiver)` 修改子元素后，不再会沿着原型链触发父元素代理。假设：

子对象与父对象都有某一元素，且该元素不是通过继承而来，在上面难点的相同行为下，不会触发父对象的 `get` 与 `set`

实验中，首先确定该操作导致两对象为继承关系

```js
const father = {}
const son = {}
// ... Object.defineProperty 代理
father.name = 'father' // 'set'
father.canAskFather = true

son.__proto__ = father
console.log(son.canAskFather) // true 表明能通过原型链访问到 father
```

后依照 index.html的 script 中可以看到，原有元素不会触发到父对象相同元素的`get`及`set`。

此时表示和 `Reflect.set` 一直
