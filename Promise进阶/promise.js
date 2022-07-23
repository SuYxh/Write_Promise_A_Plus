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
