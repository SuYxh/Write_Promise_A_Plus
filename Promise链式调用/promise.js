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
            // 为什么要使用 递归？ 针对 5-特殊情况.js 这种情况
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
    // 处理 6-test-then可选参数.js 的情况
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
            // 这里的x是普通值还是promise
            // 如果是一个promise呢？
            // console.log('promise2--success', promise2);
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
