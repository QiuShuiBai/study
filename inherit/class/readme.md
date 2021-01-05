# class 继承

class 继承通过关键字 extends 实现

需要注意的有亮点，父类 constructor 中的 this 指向的是构造对象。

class 的继承可以理解成以下几个步骤：

1. 子类 constructor 中调用 super() 方法，方法中的 this 指向构造对象。

2. 子类 super 方法执行完成后，按照正常非继承的步骤生成子类构造对象

3. 调用父类生成父类构造对象，此时父类中 constructor 方法不执行。

4. 子类构造对象原型上的 __proto__ 由原先指向 Object 改为指向父类构造对象，完成继承。

如果子类构造对象如需要访问 Object 上的方法，会通过 子类原型 -> 父类构造对象 -> 父类原型 -> __proto__ 访问到

因 constructor 中 super 方法要先于 this 调用，所以父类如果和子类有相同属性赋值时，子类会覆盖父类。