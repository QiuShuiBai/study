# 事件绑定

## html模版里绑定

```html 
<div onclick="click()">click me</div>
```
不推荐使用
- 如果要修改，那么既要修改html又要修改js，紧密耦合
- 如果js未加载完，触发事件，则会抛出错误


## DOM0事件监听
```js
let click = document.getElementById('clickMe')
click.onclick = function () {}    
click.onclick = null
```
Dom0级事件处理程序是将一个函数赋值给一个事件处理程序属性，而通过将事件处理程序设置为null删除绑定在元素上的事件处理程序。
缺点: 这种方法无法给一个事件添加多个事件处理程序, 后面的程序会覆盖前面的程序。


## DOM2事件监听

**注册事件**
```js
document.getElementById('clickMe').addEventListener('click', function clickMe() => {}, false)
```
addEventListener 第三个参数是控制事件推进方式，为true时表示为 事件捕获时调用，为false表示为 事件冒泡时调用

**移除事件**
```js
let speak = function() {
  console.log('sadasd')
  son.removeEventListener('click', speak, false)  //移除事件
}
son.addEventListener('click', speak, false)
```
使用Dom2级方法添加事件处理程序的主要好处是可以添加多个事件处理程序
移除时的参数必须与添加处理程序时使用的参数相同，这也意味着通过addEventListener()添加的匿名函数将无法移除




# 冒泡与捕获 (capturing_bubbling)
```html
<div>
  <p>click me</p>
</div>
```
## 冒泡
  由子元素向父元素前进 --> 点击"click me"，触发p标签的点击事件，然后再触发div标签的点击事件
  p -> div
## 捕获
  由父元素向子元素前进 --> 点击"click me"，触发div标签的点击事件，然后再触发p标签的点击事件
  div -> p

## 执行顺序
  div -> p   p -> div
  **先捕获后冒泡**
    target节点被点击，事件触发顺序为父元素一层层传递至子元素，遇见父元素的捕获事件就暂停执行，事件执行结束后，继续捕获。若当中有异步事件，则放至异步队列。
    直到事件流至target节点，若target节点先注册冒泡事件，则先执行冒泡事件；先注册捕获事件，则先执行捕获事件。
    然后再由target节点，向父元素冒泡

## 注册事件

- 事件注册后，默认的传递方式都是冒泡推进。无论是html模版或者DOM0、DOM2事件

- addEventListener 第三个参数是控制事件推进方式，为true时表示为 事件捕获时调用，为false表示为 事件冒泡时调用





# AJAX

  AJAX => Asynchronous JavaScript and XML（异步的 JavaScript 和 XML）。

  总结： 要先有个请求的实例，告诉这个实例如果去请求和需要请求什么。然后在请求的过程中，会汇报一些列的请求的状态信息，每次到达一个节点，都会汇报一次。在最后的节点，会汇报请求的结果。

## 实现

 - 创建XMLHttpRequest 对象

  ```js
    let xmlhttp = new XMLHttpRequest()
  ```

    XMLHttpRequest 用于在后台与服务器交换数据

 - 使用该对象向服务器发送请求
 
  ```js
    xmlhttp.open(method, url, async)
    xmlhttp.send()
  ```

 - open()三个参数： 
    >   method 为 发送请求的方式：POST  |  GET
        url 为 请求的目标地址
        async 为 异步请求或同步请求  true为异步

 - send()发送请求

- 响应任务

  - xmlhttp.onreadystatechang事件
  
    每当 readyState 改变时，就会触发 onreadystatechange 事件。

  - readyState 属性存有 XMLHttpRequest 的状态信息。
  >   
    readyState 存有 XMLHttpRequest 的状态。从 0 到 4 发生变化。
    0: 请求未初始化
    1: 服务器连接已建立
    2: 请求已接收
    3: 请求处理中
    4: 请求已完成，且响应已就绪

  - status 状态码
    例： 
      200： 请求成功
      404： 页面未找到

  -  **响应**
  ```js
    xmlhttp.onreadystatechange=function()
    {
      if (xmlhttp.readyState==4 && xmlhttp.status==200) {
        let infos =JSON.parse(xmlhttp.responseText)
        console.log(infos)
      }
    }
  ```
      在 onreadystatechange 事件中，我们规定当服务器响应已做好被处理的准备时所执行的任务。当 readyState 等于 4 且状态为 200 时，表示响应已就绪




# git常用命令

git status 查看文件的状态  status: 状态

git diff 查看暂未暂存的提交 发生了哪些修改  diff: difference -> 不同

git diff --staged 查看已暂存的提交

git log 查看版本,得到版本号

git reset 版本号      重置至该版本号内容，保存已修改代码

git reset --hard 版本号    重置至该版本号内容，丢弃已修改代码

git commit --amend 修改上一次commit内容    amend: 修改

git branch -a 查看所有分支包括远程、本地分支  a: all

git branch -d devName 删除本地分支

git branch -D devName 强制删除本地分支

git push origin --delete devName  删除远程分支 

