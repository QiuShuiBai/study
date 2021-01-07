const obj = {}

Object.defineProperty(obj, 'num', {
  get() {
    console.log('get')
    return this._num
  },
  set(nVal) {
    console.log('set')
    this._num = nVal
  }
})

obj.num = 0 // set

const newObj = Object.create(obj)

newObj.num = 1 // set

console.log(Object.getOwnPropertyDescriptor(newObj, 'num'))
console.log(newObj)

// 如果访问者的属性是被继承的，它的 get 和 set 方法会在子对象的属性被访问或者修改时被调用。
// https://developer.mozilla.org/zh-CN/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty