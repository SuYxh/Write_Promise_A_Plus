# 手写完整Promise A+ 

## 写在前面的话

看了市面上的一些手写Promise，基本上都不怎么规范，要么无法处理异步，要么没有trycatch，要么没有发布订阅的功能，要么没有实现链式调用等等。那么今天就来实现一个符合Promise A+规范的代码。既然来看手写，那么肯定对Promise都有一定的了解，接下来我们直接上手。



## Promise A+规范

Promise/A+规范原文: https://promisesaplus.com/

Promise/A+规范译文: http://www.ituring.com.cn/article/66566



以下为测试成功截图

![image-20220723204501253](https://qn.huat.xyz/mac/20220723204501.png)



## Promise基础版

```js
const SUCCESS = 'fulfilled'
const FAIL = 'rejected'
const PENDING = 'pending'
class Promise {
  constructor(executor) {
    // 默认是等待态
    this.status = PENDING 
    this.value = undefined
    this.reason = undefined
    const resolve = value => {
      // 只有状态为 PENDING 时才允许修改状态，因为promise状态不可逆
      if (this.status === PENDING) {
        this.value = value
        this.status = SUCCESS
      }
    }
    const reject = reason => {
      if (this.status === PENDING) {
        this.reason = reason
        this.status = FAIL
      }
    }
    // new Promise() 报错的时候也会执行 reject()
    try {
      // 立即执行
      executor(resolve, reject) 
    } catch (e) {
      reject(e)
    }
  }
  then(onFulfilled, onRejected) {
    if (this.status === SUCCESS) {
      onFulfilled(this.value)
    }
    if (this.status === FAIL) {
      onRejected(this.reason)
    }
  }
}

module.exports = Promise
```



## Promise处理异步

```js
const SUCCESS = 'fulfilled'
const FAIL = 'rejected'
const PENDING = 'pending'
class Promise {
  constructor(executor) {
    // 默认是等待态
    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    // 存储成功的所有的回调 只有pending的时候才存储
    this.onResolvedCallbacks = []
    // 存储所有失败的
    this.onRejectedCallbacks = []
    const resolve = value => {
      // 只有状态为 PENDING 时才允许修改状态，因为promise状态不可逆
      if (this.status === PENDING) {
        this.value = value
        this.status = SUCCESS
        this.onResolvedCallbacks.forEach(fn => fn())
      }
    }
    const reject = reason => {
      if (this.status === PENDING) {
        this.reason = reason
        this.status = FAIL
        this.onRejectedCallbacks.forEach(fn => fn())
      }
    }
    // executor 中抛出错误时也会执行 reject()
    try {
      // 立即执行
      executor(resolve, reject)
    } catch (e) {
      reject(e)
    }
  }
  /**
   * @description:
   * then方法会用到一个发布订阅模式，处理 executor 中的异步代码.
   * 如果resolve()的是一个Promise，会自动将这个promise执行，并且采用他的状态，如果成功会将成功的结果向下一层传递，
   * 如果then方法中的成功或者失败 执行的时候发生错误 会走下一个then的失败的回调
   * 如果then方法返回了一个失败的promise他会走外层then的失败的回调
   *  1、（then中传递的函数）判断成功/失败函数的返回结果
   *  2、 如果是 promise 则，采用它的结果
   *  3、 如果不是promise 则，继续将结果传递下去
   * @param {*} onFulfilled
   * @param {*} onRejected
   */
  then(onFulfilled, onRejected) {
    //  同步处理
    if (this.status === SUCCESS) {
      onFulfilled(this.value)
    }
    if (this.status === FAIL) {
      onRejected(this.reason)
    }
    // 如果是PENDING状态，那么应该将函数存起来 分组存放（异步处理）
    if (this.status === PENDING) {
      // 如果是异步，先订阅好
      // push() 参数为什么是函数？
      // this.onResolvedCallbacks.push(onFulfilled(this.value));
      // 这样做也可以，但是无法添加一些逻辑，比如在添加函数前做一些逻辑，所以这里采用函数的方式
      this.onResolvedCallbacks.push(() => {
        // 这里可以添加额外的逻辑
        onFulfilled(this.value)
      })
      this.onRejectedCallbacks.push(() => {
        onRejected(this.reason)
      })
    }
  }
}

module.exports = Promise
```



## Promise链式调用(核心)

```js
const PENDING = 'PENDING'
const SUCCESS = 'FULFILLED'
const FAIL = 'REJECTED'

function resolvePromise(promise2, x, resolve, reject) {
  // 如果 promise2 和 x 相同，抛出错误
  if (promise2 === x) {
    return reject(
      new TypeError('TypeError: Chaining cycle detected for promise #<Promise>')
    )
  }
  // 判断x的类型
  // promise 有n种实现 都符合了这个规范 兼容别人的promise
  // 严谨 🇬应该判断 别人的promise 如果失败了就不能在调用成功 如果成功了不能在调用失败
  let called

  // 怎么判断 x是不是一个promise 看他有没有then方法
  if (typeof x === 'function' || (typeof x === 'object' && x != null)) {
    try {
      // 取then方法可能会出错，所以需要使用 trycatch
      let then = x.then
      if (typeof then === 'function') {
        // 如果 then 为 一个函数，我就认为他是一个promise
        // 直接使用取好的then，而不是使用x.then，否则会在次取值，有可能第一次取值没有报错，第二次取值就报错了
        then.call(
          x,
          y => {
            // 如果promise是成功的就把结果向下传，如果失败的就让下一个人也失败
            if (called) return
            called = true // 防止多次调用成功和失败
            // resolve(y)
            // 为什么要使用 递归？ 查看1.test.js 的情况, resolve()返回 promise
            resolvePromise(promise2, y, resolve, reject) // 递归
          },
          r => {
            if (called) return
            called = true
            // 报错的时候就直接往下走，不用再担心 是不是 peomise 了
            reject(r)
          }
        )
      } else {
        // {then:()=>{}}
        // 说明 x 是一个普通对象，直接成功即可
        resolve(x)
      }
    } catch (e) {
      // 为了辨别这个promise 防止调用多次
      if (called) return
      called = true
      reject(e)
    }
  } else {
    // x是个？ 常量
    resolve(x)
  }
}
class Promise {
  constructor(executor) {
    this.status = PENDING
    this.value = undefined
    this.reason = undefined
    this.onResolvedCallbacks = []
    this.onRejectedCallbacks = []
    const resolve = value => {
      if (this.status === PENDING) {
        this.value = value
        this.status = SUCCESS
        this.onResolvedCallbacks.forEach(fn => fn())
      }
    }
    const reject = reason => {
      if (this.status === PENDING) {
        this.reason = reason
        this.status = FAIL
        this.onRejectedCallbacks.forEach(fn => fn())
      }
    }
    try {
      executor(resolve, reject)
    } catch (e) {
      reject(e)
    }
  }
  // 同一个promise then 多次
  then(onFulfilled, onRejected) {
    // 处理 2.test.js 中的情况
    onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : val => val
    onRejected =
      typeof onRejected === 'function'
        ? onRejected
        : err => {
            // 将失败向下传递
            throw err
          }
    let promise2
    // 可以不停的调用then方法,返还了一个新的promise
    // 异步的特点 等待当前主栈代码都执行后才执行
    promise2 = new Promise((resolve, reject) => {
      if (this.status === SUCCESS) {
        // 为什么要使用 setTimeout ？ 如果不使用 setTimeout ，promise2 则会报错，涉及到代码的执行顺序问题，需要先 new完后再将结果赋值给 promise2 可以去掉  setTimeout 打印一下 promise2 看看
        // setTimeout作用： 为了保证 promise2 已经 new 完了
        setTimeout(() => {
          // try catch 用于 捕获 onFulfilled 函数的异常，比如 在执行 onFulfilled 函数的时候抛错， 或者 onFulfilled 函数中 手动抛出错误
          // constructor 中的 try catch 无法捕获这里异步代码的异常
          try {
            // 调用当前then方法的结果，来判断当前这个promise2 是成功还是失败
            let x = onFulfilled(this.value)
            // 这里的x是普通值还是promise  如果是一个promise呢？
            // console.log('then-SUCCESS', promise2);
            // 判断 x 和 promise2 和 promise 的关系
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            console.log('promise2--catch ', err)
            reject(err)
          }
        })
      }
      if (this.status === FAIL) {
        setTimeout(() => {
          try {
            let x = onRejected(this.reason)
            resolvePromise(promise2, x, resolve, reject)
          } catch (err) {
            reject(err)
          }
        })
      }
      if (this.status === PENDING) {
        this.onResolvedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onFulfilled(this.value)
              resolvePromise(promise2, x, resolve, reject)
            } catch (err) {
              reject(err)
            }
          })
        })
        this.onRejectedCallbacks.push(() => {
          setTimeout(() => {
            try {
              let x = onRejected(this.reason)
              resolvePromise(promise2, x, resolve, reject)
            } catch (err) {
              reject(err)
            }
          })
        })
      }
    })
    return promise2
  }
}

module.exports = Promise
```



#### 1.test.js

```js
const Promise = require('./promise')

const p = new Promise((resolve, reject) => {
  resolve('ok')
})

const p2 = p.then(res => {
  return new Promise((resolve,reject) => {
    setTimeout(() => {
      resolve(new Promise((resolve,reject) => {
        setTimeout(() => {
          resolve('1000')
        },1000);
      }))
    },1000)
  })
})

p2.then(
  data => {
    console.log('data', data)
  },
  err => {
    console.log('err', err)
  }
)
```

#### 2.test.js

```js
const Promise = require('./promise')

const p = new Promise((resolve, reject) => {
  resolve('ok')
})

p.then().then().then(data => {
  console.log('data', data);
})
```



## 完整Promise代码



## 测试

使用`promises-aplus-tests`这个库是否符合 promise A+规范

```
npm i promises-aplus-tests -g
```

然后在promise中添加：

```js
Promise.defer = Promise.deferred = function(){
  let dfd = {};
  dfd.promise = new Promise((resolve,reject)=>{
    dfd.resolve = resolve;
    dfd.reject = reject;
  });
  return dfd;
}
```

然后执行：

```
promises-aplus-tests promise.js
```



<!-- ![image-20220723204501253](https://qn.huat.xyz/mac/20220723215501.png) -->