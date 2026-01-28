/**
 * 基础版事件观察者（发布-订阅模式）
 * 支持：订阅/发布/取消订阅/清空事件
 */
export default class MessageObserver {
  constructor() {
    // 存储事件映射：{ 事件名: [回调函数1, 回调函数2, ...] }
    this.events = Object.create(null); // 无原型，更安全
  }

  /**
   * 订阅事件
   * @param {string} action - 事件类型（事件名）
   * @param {Function} callback - 事件触发的回调函数
   * @returns {this} 支持链式调用
   */
  on(action, callback) {
    // 校验参数：事件名非空、回调是函数
    if (!action || typeof callback !== 'function') return this;
    // 事件不存在则初始化空数组，存在则直接push回调
    this.events[action] = this.events[action] || [];
    // 避免重复绑定同一个回调
    if (!this.events[action].includes(callback)) {
      this.events[action].push(callback);
    }
    return this; // 链式调用：observer.on('a', fn).on('b', fn2)
  }

  /**
   * 发布事件（触发事件）
   * @param {string} action - 事件类型（事件名）
   * @param  {...any} args - 传递给回调的任意参数
   * @returns {this} 支持链式调用
   */
  emit(action, ...args) {
    // 事件不存在则直接返回
    if (!this.events[action] || this.events[action].length === 0) return this;
    // 遍历执行所有回调，传递参数（浅拷贝数组，避免执行中回调被删除导致的遍历异常）
    this.events[action].slice().forEach(callback => {
      callback.apply(this, args); // 绑定this为观察者实例，也可改为window/undefined
    });
    return this;
  }

  /**
   * 取消指定事件的指定回调
   * @param {string} action - 事件类型（事件名）
   * @param {Function} [callback] - 可选，不传则清空该事件所有回调
   * @returns {this} 支持链式调用
   */
  off(action, callback) {
    if (!this.events[action]) return this;
    // 不传callback：清空该事件所有订阅
    if (!callback) {
      this.events[action] = [];
      return this;
    }
    // 传callback：过滤掉该回调，保留其他
    this.events[action] = this.events[action].filter(fn => fn !== callback);
    return this;
  }

  /**
   * 清空所有事件的所有订阅
   * @returns {this} 支持链式调用
   */
  clear() {
    this.events = Object.create(null);
    return this;
  }
}