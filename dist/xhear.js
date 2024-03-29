/*!
 * xhear v6.0.0
 * https://github.com/kirakiray/Xhear#readme
 * 
 * (c) 2018-2021 YAO
 * Released under the MIT License.
 */
((glo) => {
    "use strict";
    //<o:start--toofa.js-->
    // public function
    const getRandomId = () => Math.random().toString(32).substr(2);
    // const getRandomId = (len = 40) => {
    //     return Array.from(crypto.getRandomValues(new Uint8Array(len / 2)), dec => ('0' + dec.toString(16)).substr(-2)).join('');
    // }
    var objectToString = Object.prototype.toString;
    var getType = value => objectToString.call(value).toLowerCase().replace(/(\[object )|(])/g, '');
    const isFunction = d => getType(d).search('function') > -1;
    var isEmptyObj = obj => !Object.keys(obj).length;
    const defineProperties = Object.defineProperties;
    const getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
    const isxdata = obj => obj instanceof XData;

    const isDebug = document.currentScript.getAttribute("debug") !== null;

    // 改良异步方法
    const nextTick = (() => {
        if (isDebug) {
            let nMap = new Map();
            return (fun, key) => {
                if (!key) {
                    key = getRandomId();
                }

                let timer = nMap.get(key);
                clearTimeout(timer);
                nMap.set(key, setTimeout(() => {
                    fun();
                    nMap.delete(key);
                }));
            };
        }

        // 定位对象寄存器
        let nextTickMap = new Map();

        let pnext = (func) => Promise.resolve().then(() => func())

        if (typeof process === "object" && process.nextTick) {
            pnext = process.nextTick;
        }

        let inTick = false;
        return (fun, key) => {
            if (!key) {
                key = getRandomId();
            }

            nextTickMap.set(key, {
                key,
                fun
            });

            if (inTick) {
                return;
            }

            inTick = true;

            pnext(() => {
                if (nextTickMap.size) {
                    nextTickMap.forEach(({
                        key,
                        fun
                    }) => {
                        try {
                            fun();
                        } catch (e) {
                            console.error(e);
                        }
                        nextTickMap.delete(key);
                    });
                }

                nextTickMap.clear();
                inTick = false;
            });
        };
    })();

    // 在tick后运行收集的函数数据
    const collect = (func, time) => {
        let arr = [];
        let timer;
        const reFunc = e => {
            arr.push(Object.assign({}, e));
            if (time) {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    func(arr);
                    arr.length = 0;
                }, time);
            } else {
                nextTick(() => {
                    func(arr);
                    arr.length = 0;
                }, reFunc);
            }
        }

        return reFunc;
    }

    // 扩展对象
    const extend = (_this, proto, descriptor = {}) => {
        Object.keys(proto).forEach(k => {
            // 获取描述
            let {
                get,
                set,
                value
            } = getOwnPropertyDescriptor(proto, k);

            if (value) {
                if (_this.hasOwnProperty(k)) {
                    _this[k] = value;
                } else {
                    Object.defineProperty(_this, k, {
                        ...descriptor,
                        value,
                    });
                }
            } else {
                Object.defineProperty(_this, k, {
                    ...descriptor,
                    get,
                    set,
                });
            }
        });
    }

    const startTime = Date.now();
    // 获取高精度的当前时间
    // const getTimeId = () => startTime + performance.now();
    // const getTimeId = () => Date.now().toString(32);
    // const getTimeId = () => performance.now().toString(32);


    const XDATASELF = Symbol("self");
    const PROXYSELF = Symbol("proxy");
    const WATCHS = Symbol("watchs");
    const CANUPDATE = Symbol("can_update");

    const cansetXtatus = new Set(["root", "sub", "revoke"]);

    const emitUpdate = (target, opts, path, unupdate) => {
        let new_path;
        if (!path) {
            new_path = opts.path = [target[PROXYSELF]];
        } else {
            new_path = opts.path = [target[PROXYSELF], ...path];
        }

        // 触发callback
        target[WATCHS].forEach(f => f(opts));

        if (unupdate || target._unupdate) {
            return;
        }

        // 向上冒泡
        target.owner && target.owner.forEach(parent => emitUpdate(parent, opts, new_path.slice()));
    }

    class XData {
        constructor(obj, status) {

            let proxy_self;

            if (obj.get) {
                proxy_self = new Proxy(this, {
                    get: obj.get,
                    ownKeys: obj.ownKeys,
                    getOwnPropertyDescriptor: obj.getOwnPropertyDescriptor,
                    set: xdataHandler.set,
                });

                delete obj.get;
                delete obj.ownKeys;
                delete obj.getOwnPropertyDescriptor;
            } else {
                proxy_self = new Proxy(this, xdataHandler);
            }

            // 当前对象所处的状态
            let xtatus = status;

            // 每个对象的专属id
            defineProperties(this, {
                [XDATASELF]: {
                    value: this
                },
                [PROXYSELF]: {
                    value: proxy_self
                },
                // 每个对象必有的id
                xid: {
                    value: "x_" + getRandomId()
                },
                // 当前所处的状态
                _xtatus: {
                    get() {
                        return xtatus;
                    },
                    set(val) {
                        if (!cansetXtatus.has(val)) {
                            throw {
                                target: proxy_self,
                                desc: `xtatus not allowed to be set ${val}`
                            };
                        }
                        const size = this.owner.size;

                        if (val === "revoke" && size) {
                            throw {
                                target: proxy_self,
                                desc: "the owner is not empty"
                            };
                        } else if (xtatus === "revoke" && val !== "revoke") {
                            if (!size) {
                                fixXDataOwner(this);
                            }
                        } else if (xtatus === "sub" && val === "root") {
                            throw {
                                target: proxy_self,
                                desc: "cannot modify sub to root"
                            };
                        }
                        xtatus = val;
                    }
                },
                // 所有父层对象存储的位置
                // 拥有者对象
                owner: {
                    configurable: true,
                    writable: true,
                    value: new Set()
                },
                // 数组对象
                length: {
                    configurable: true,
                    writable: true,
                    value: 0
                },
                // 监听函数
                [WATCHS]: {
                    value: new Map()
                },
                [CANUPDATE]: {
                    writable: true,
                    value: 0
                }
            });

            let maxNum = -1;
            Object.keys(obj).forEach(key => {
                let descObj = getOwnPropertyDescriptor(obj, key);
                let {
                    value,
                    get,
                    set
                } = descObj;

                if (key === "get") {
                    return;
                }
                if (!/\D/.test(key)) {
                    key = parseInt(key);
                    if (key > maxNum) {
                        maxNum = key;
                    }
                }
                if (get || set) {
                    // 通过get set 函数设置
                    defineProperties(this, {
                        [key]: descObj
                    });
                } else {
                    // 直接设置函数
                    // this.setData(key, value);
                    proxy_self[key] = value;
                }
            });

            if (maxNum > -1) {
                this.length = maxNum + 1;
            }

            this[CANUPDATE] = 1;

            return proxy_self;
        }

        watch(callback) {
            const wid = "e_" + getRandomId();

            this[WATCHS].set(wid, callback);

            return wid;
        }

        unwatch(wid) {
            return this[WATCHS].delete(wid);
        }

        setData(key, value) {
            let valueType = getType(value);
            if (valueType == "array" || valueType == "object") {
                value = createXData(value, "sub");

                // 设置父层的key
                value.owner.add(this);
            }

            const oldVal = this[key];

            if (oldVal === value) {
                return true;
            }

            let reval = Reflect.set(this, key, value);

            // if (this[CANUPDATE] || this._update === false) {
            if (this[CANUPDATE]) {
                // 改动冒泡
                emitUpdate(this, {
                    xid: this.xid,
                    name: "setData",
                    args: [key, value]
                });
            }

            clearXDataOwner(oldVal, this);

            return reval;
        }

        // 主动触发更新事件
        // 方便 get 类型数据触发 watch 
        update(opts = {}) {
            emitUpdate(this, Object.assign({}, opts, {
                xid: this.xid,
                isCustom: true
            }));
        }

        delete(key) {
            // 确认key是隐藏属性
            if (/^_/.test(key) || typeof key === "symbol") {
                return Reflect.deleteProperty(this, key);
            }

            if (!key) {
                return false;
            }

            // 无proxy自身
            const _this = this[XDATASELF];

            let val = _this[key];
            // 清除owner上的父层
            // val.owner.delete(_this);
            clearXDataOwner(val, _this);

            let reval = Reflect.deleteProperty(_this, key);

            // 改动冒泡
            emitUpdate(this, {
                xid: this.xid,
                name: "delete",
                args: [key]
            });

            return reval;
        }
    }

    // 中转XBody的请求
    const xdataHandler = {
        set(target, key, value, receiver) {
            if (typeof key === "symbol") {
                return Reflect.set(target, key, value, receiver);
            }

            // 确认key是隐藏属性
            if (/^_/.test(key)) {
                if (!target.hasOwnProperty(key)) {
                    defineProperties(target, {
                        [key]: {
                            writable: true,
                            configurable: true,
                            value
                        }
                    })
                } else {
                    Reflect.set(target, key, value, receiver);
                }
                return true;
            }

            try {
                return target.setData(key, value);
            } catch (e) {
                throw {
                    desc: `failed to set ${key}`,
                    key,
                    value,
                    target: receiver
                };
            }
        },
        deleteProperty: function(target, key) {
            return target.delete(key);
        }
    }

    // 清除xdata的owner数据
    const clearXDataOwner = (xdata, parent) => {
        if (!isxdata(xdata)) {
            return;
        }

        const {
            owner
        } = xdata;
        owner.delete(parent);

        if (!owner.size) {
            xdata._xtatus = "revoke";
            Object.values(xdata).forEach(child => {
                clearXDataOwner(child, xdata[XDATASELF]);
            });
        }
    }

    // 修正xdata的owner数据
    const fixXDataOwner = (xdata) => {
        if (xdata._xtatus === "revoke") {
            // 重新修复状态
            Object.values(xdata).forEach(e => {
                if (isxdata(e)) {
                    fixXDataOwner(e);
                    e.owner.add(xdata);
                    e._xtatus = "sub";
                }
            });
        }
    }

    const createXData = (obj, status = "root") => {
        if (isxdata(obj)) {
            obj._xtatus = status;
            return obj;
        }
        return new XData(obj, status);
    };

    extend(XData.prototype, {
        seek(expr) {
            let arr = [];

            if (!isFunction(expr)) {
                let f = new Function(`with(this){return ${expr}}`)
                expr = _this => {
                    try {
                        return f.call(_this, _this);
                    } catch (e) {}
                };
            }

            if (expr.call(this, this)) {
                arr.push(this);
            }

            Object.values(this).forEach(e => {
                if (isxdata(e)) {
                    arr.push(...e.seek(expr));
                }
            });

            return arr;
        },
        // watch异步收集版本
        watchTick(func, time) {
            return this.watch(collect(func, time));
        },
        // 监听直到表达式成功
        watchUntil(expr) {
            let isFunc = isFunction(expr);
            if (!isFunc && /[^=><]=[^=]/.test(expr)) {
                throw 'cannot use single =';
            }

            return new Promise(resolve => {
                // 忽略错误
                let exprFun = isFunc ? expr.bind(this) : new Function(`
        try{with(this){
            return ${expr}
        }}catch(e){}`).bind(this);

                let f;
                const wid = this.watchTick(f = () => {
                    let reVal = exprFun();
                    if (reVal) {
                        this.unwatch(wid);
                        resolve(reVal);
                    }
                });
                f();
            });
        },
        // 监听相应key
        watchKey(obj, immediately) {
            if (immediately) {
                Object.keys(obj).forEach(key => obj[key].call(this, this[key]));
            }

            let oldVal = {};
            Object.keys(obj).forEach(key => {
                oldVal[key] = this[key];
            });
            // Object.entries(this).forEach(([k, v]) => {
            //     oldVal[k] = v;
            // });
            return this.watch(collect((arr) => {
                Object.keys(obj).forEach(key => {
                    // 当前值
                    let val = this[key];

                    if (oldVal[key] !== val) {
                        obj[key].call(this, val);
                    } else if (isxdata(val)) {
                        // 判断改动arr内是否有当前key的改动
                        let hasChange = arr.some(e => {
                            let p = e.path[1];

                            // if (p == oldVal[key]) {
                            return p == val;
                        });

                        if (hasChange) {
                            obj[key].call(this, val);
                        }
                    }

                    oldVal[key] = val;
                });
            }));
        },
        // 转换为json数据
        toJSON() {
            let obj = {};

            let isPureArray = true;
            let maxId = 0;

            Object.keys(this).forEach(k => {
                let val = this[k];

                if (!/\D/.test(k)) {
                    k = parseInt(k);
                    if (k > maxId) {
                        maxId = k;
                    }
                } else {
                    isPureArray = false;
                }

                if (isxdata(val)) {
                    val = val.toJSON();
                }

                obj[k] = val;
            });

            if (isPureArray) {
                obj.length = maxId + 1;
                obj = Array.from(obj);
            }

            const xid = this.xid;
            defineProperties(obj, {
                xid: {
                    get: () => xid
                }
            });

            return obj;
        },
        // 转为字符串
        toString() {
            return JSON.stringify(this.toJSON());
        }
    });

    // 不影响数据原结构的方法，重新做钩子
    ['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'map', 'slice', 'some', 'indexOf', 'lastIndexOf', 'includes', 'join'].forEach(methodName => {
        let arrayFnFunc = Array.prototype[methodName];
        if (arrayFnFunc) {
            defineProperties(XData.prototype, {
                [methodName]: {
                    value: arrayFnFunc
                }
            });
        }
    });

    // 原生splice方法
    const arraySplice = Array.prototype.splice;

    extend(XData.prototype, {
        splice(index, howmany, ...items) {
            let self = this[XDATASELF];

            // items修正
            items = items.map(e => {
                let valueType = getType(e);
                if (valueType == "array" || valueType == "object") {
                    e = createXData(e, "sub");
                    e.owner.add(self);
                }

                return e;
            })

            let b_howmany = getType(howmany) == 'number' ? howmany : (this.length - index);

            // 套入原生方法
            let rmArrs = arraySplice.call(self, index, b_howmany, ...items);

            // rmArrs.forEach(e => isxdata(e) && e.owner.delete(self));
            rmArrs.forEach(e => clearXDataOwner(e, self));

            // 改动冒泡
            emitUpdate(this, {
                xid: this.xid,
                name: "splice",
                args: [index, howmany, ...items]
            });

            return rmArrs;
        },
        unshift(...items) {
            this.splice(0, 0, ...items);
            return this.length;
        },
        push(...items) {
            this.splice(this.length, 0, ...items);
            return this.length;
        },
        shift() {
            return this.splice(0, 1)[0];
        },
        pop() {
            return this.splice(this.length - 1, 1)[0];
        }
    });

    ['sort', 'reverse'].forEach(methodName => {
        // 原来的数组方法
        const arrayFnFunc = Array.prototype[methodName];

        if (arrayFnFunc) {
            defineProperties(XData.prototype, {
                [methodName]: {
                    value(...args) {
                        let reval = arrayFnFunc.apply(this[XDATASELF], args)

                        emitUpdate(this, {
                            xid: this.xid,
                            name: methodName
                        });

                        return reval;
                    }
                }
            });
        }
    });
    // 公用方法文件
    // 创建xEle元素
    const createXEle = (ele) => {
        if (!ele) {
            return null;
        }
        return ele.__xEle__ ? ele.__xEle__ : (ele.__xEle__ = new XEle(ele));
    }

    // 判断元素是否符合条件
    const meetTemp = document.createElement('template');
    const meetsEle = (ele, expr) => {
        if (!ele.tagName) {
            return false;
        }
        if (ele === expr) {
            return true;
        }
        if (ele === document) {
            return false;
        }
        meetTemp.innerHTML = `<${ele.tagName.toLowerCase()} ${Array.from(ele.attributes).map(e => e.name + '="' + e.value + '"').join(" ")} />`;
        return !!meetTemp.content.querySelector(expr);
    }

    // 转换元素
    const parseStringToDom = (str) => {
        const pstTemp = document.createElement('div');
        pstTemp.innerHTML = str;
        let childs = Array.from(pstTemp.children);
        return childs.map(function(e) {
            pstTemp.removeChild(e);
            return e;
        });
    };

    // 将对象转为element
    const parseDataToDom = (objData) => {
        if (!objData.tag) {
            console.error("this data need tag =>", objData);
            throw "";
        }

        // 生成element
        let ele = document.createElement(objData.tag);

        // 添加数据
        objData.class && ele.setAttribute('class', objData.class);
        objData.slot && ele.setAttribute('slot', objData.slot);
        // objData.text && (ele.textContent = objData.text);

        const xele = createXEle(ele);

        // 数据合并
        xele[CANSETKEYS].forEach(k => {
            if (objData[k]) {
                xele[k] = objData[k];
            }
        });

        // 填充子元素
        let akey = 0;
        while (akey in objData) {
            // 转换数据
            let childEle = parseDataToDom(objData[akey]);
            ele.appendChild(childEle);
            akey++;
        }

        return ele;
    }

    // 将 element attribute 横杠转换为大小写模式
    const attrToProp = key => {
        // 判断是否有横线
        if (/\-/.test(key)) {
            key = key.replace(/\-[\D]/g, (letter) => letter.substr(1).toUpperCase());
        }
        return key;
    }
    const propToAttr = key => {
        if (/[A-Z]/.test(key)) {
            key = key.replace(/[A-Z]/g, letter => "-" + letter.toLowerCase());
        }
        return key;
    }

    // 最基础对象功能
    const XEleHandler = {
        get(target, key, receiver) {
            if (typeof key === 'string' && !/\D/.test(key)) {
                return createXEle(target.ele.children[key]);
            }
            return Reflect.get(target, key, receiver);
        },
        ownKeys(target) {
            let keys = Reflect.ownKeys(target);
            let len = target.ele.children.length;
            for (let i = 0; i < len; i++) {
                keys.push(String(i));
            }
            return keys;
        },
        getOwnPropertyDescriptor(target, key) {
            if (typeof key === 'string' && !/\D/.test(key)) {
                return {
                    enumerable: true,
                    configurable: true,
                }
            }
            return Reflect.getOwnPropertyDescriptor(target, key);
        }
    };

    const EVENTS = Symbol("events");
    const xSetData = XData.prototype.setData;

    // 可直接设置的Key
    const xEleDefaultSetKeys = ["text", "html", "show", "style"];
    const CANSETKEYS = Symbol("cansetkeys");

    class XEle extends XData {
        constructor(ele) {
            super(Object.assign({}, XEleHandler));
            // super(XEleHandler);

            const self = this[XDATASELF];

            self.tag = ele.tagName ? ele.tagName.toLowerCase() : '';

            // self.owner = new WeakSet();
            // XEle不允许拥有owner
            // self.owner = null;
            // delete self.owner;
            defineProperties(self, {
                owner: {
                    get() {
                        let par = ele.parentNode;

                        return par ? [createXEle(par)] : [];
                    }
                }
            });

            defineProperties(self, {
                ele: {
                    get: () => ele
                },
                [EVENTS]: {
                    writable: true,
                    value: ""
                },
                // 允许被设置的key值
                // [CANSETKEYS]: {
                //     value: new Set(xEleDefaultSetKeys)
                // }
            });

            delete self.length;

            // if (self.tag == "input" || self.tag == "textarea" || self.tag == "select" || (ele.contentEditable == "true")) { // contentEditable可以随时被修改
            if (self.tag == "input" || self.tag == "textarea" || self.tag == "select") {
                renderInput(self);
            }
        }

        setData(key, value) {
            if (!this[CANSETKEYS] || this[CANSETKEYS].has(key)) {
                return xSetData.call(this, key, value);
            }
        }

        get root() {
            return createXEle(this.ele.getRootNode());
        }

        get host() {
            let root = this.ele.getRootNode();
            let {
                host
            } = root;
            return host ? createXEle(host) : null;
        }

        get shadow() {
            return createXEle(this.ele.shadowRoot);
        }

        get parent() {
            let {
                parentNode
            } = this.ele;
            return (!parentNode || parentNode === document) ? null : createXEle(parentNode);
        }

        get index() {
            let {
                parentNode
            } = this.ele;

            if (!parentNode) {
                return null;
            }

            return Array.prototype.indexOf.call(parentNode.children, this.ele);
        }

        get length() {
            return this.ele.children.length;
        }

        get text() {
            return this.ele.textContent;
        }

        set text(val) {
            this.ele.textContent = val;
        }

        get html() {
            return this.ele.innerHTML;
        }

        set html(val) {
            this.ele.innerHTML = val;
        }

        get class() {
            return this.ele.classList;
        }

        get data() {
            return this.ele.dataset;
        }

        get css() {
            return getComputedStyle(this.ele);
        }

        get style() {
            return this.ele.style;
        }

        set style(d) {
            if (getType(d) == "string") {
                this.ele.style = d;
                return;
            }

            let {
                style
            } = this;

            // 覆盖旧的样式
            let hasKeys = Array.from(style);
            let nextKeys = Object.keys(d);

            // 清空不用设置的key
            hasKeys.forEach(k => {
                if (!nextKeys.includes(k)) {
                    style[k] = "";
                }
            });

            Object.assign(style, d);
        }

        get show() {
            return this.ele.style.display !== "none";
        }

        set show(val) {
            if (val) {
                this.ele.style.display = "";
            } else {
                this.ele.style.display = "none";
            }
        }

        get position() {
            return {
                top: this.ele.offsetTop,
                left: this.ele.offsetLeft
            };
        }

        get offset() {
            let reobj = {
                top: 0,
                left: 0
            };

            let tar = this.ele;
            while (tar && tar !== document) {
                reobj.top += tar.offsetTop;
                reobj.left += tar.offsetLeft;
                tar = tar.offsetParent
            }
            return reobj;
        }

        get width() {
            return parseInt(getComputedStyle(this.ele).width);
        }

        get height() {
            return parseInt(getComputedStyle(this.ele).height);
        }

        get innerWidth() {
            return this.ele.clientWidth;
        }

        get innerHeight() {
            return this.ele.clientHeight;
        }

        get offsetWidth() {
            return this.ele.offsetWidth;
        }

        get offsetHeight() {
            return this.ele.offsetHeight;
        }

        get outerWidth() {
            let computedStyle = getComputedStyle(this.ele);
            return this.ele.offsetWidth + parseInt(computedStyle['margin-left']) + parseInt(computedStyle['margin-right']);
        }

        get outerHeight() {
            let computedStyle = getComputedStyle(this.ele);
            return this.ele.offsetHeight + parseInt(computedStyle['margin-top']) + parseInt(computedStyle['margin-bottom']);
        }

        get next() {
            const nextEle = this.ele.nextElementSibling;
            return nextEle ? createXEle(nextEle) : null;
        }

        get prev() {
            const prevEle = this.ele.previousElementSibling;
            return prevEle ? createXEle(prevEle) : null;
        }

        $(expr) {
            const target = this.ele.querySelector(expr);
            return target ? createXEle(target) : null;
        }

        all(expr) {
            return Array.from(this.ele.querySelectorAll(expr)).map(e => {
                return createXEle(e);
            })
        }

        is(expr) {
            return meetsEle(this.ele, expr)
        }

        attr(...args) {
            let [key, value] = args;

            let {
                ele
            } = this;

            if (args.length == 1) {
                if (key instanceof Object) {
                    Object.keys(key).forEach(k => {
                        ele.setAttribute(k, key[k]);
                    });
                }
                return ele.getAttribute(key);
            }

            if (value === null) {
                ele.removeAttribute(key);
            } else {
                ele.setAttribute(key, value);
            }
        }

        siblings(expr) {
            // 获取相邻元素
            let parChilds = Array.from(this.parent.ele.children);

            // 删除自身
            let tarId = parChilds.indexOf(this.ele);
            parChilds.splice(tarId, 1);

            // 删除不符合规定的
            if (expr) {
                parChilds = parChilds.filter(e => {
                    if (meetsEle(e, expr)) {
                        return true;
                    }
                });
            }

            return parChilds.map(e => createXEle(e));
        }

        parents(expr, until) {
            let pars = [];
            let tempTar = this.parent;

            if (!expr) {
                while (tempTar) {
                    pars.push(tempTar);
                    tempTar = tempTar.parent;
                }
            } else {
                if (getType(expr) == "string") {
                    while (tempTar && tempTar) {
                        if (meetsEle(tempTar.ele, expr)) {
                            pars.push(tempTar);
                        }
                        tempTar = tempTar.parent;
                    }
                }
            }

            if (until) {
                if (until instanceof XEle) {
                    let newPars = [];
                    pars.some(e => {
                        if (e === until) {
                            return true;
                        }
                        newPars.push(e);
                    });
                    pars = newPars;
                } else if (getType(until) == "string") {
                    let newPars = [];
                    pars.some(e => {
                        if (e.is(until)) {
                            return true;
                        }
                        newPars.push(e);
                    });
                    pars = newPars;
                }
            }

            return pars;
        }

        clone() {
            let cloneEle = createXEle(this.ele.cloneNode(true));

            // 数据重新设置
            Object.keys(this).forEach(key => {
                if (key !== "tag") {
                    cloneEle[key] = this[key];
                }
            });

            return cloneEle;
        }

        remove() {
            const {
                parent
            } = this;
            parent.splice(parent.indexOf(this), 1);
            // const { ele } = this;
            // ele.parentNode.removeChild(ele);
        }

        // 插件方法extend
        extend(proto) {
            extend(this, proto, {
                configurable: true
            });
        }

        // 监听尺寸变动
        initSizeObs(time = 300) {
            if (this._initedSizeObs) {
                console.warn({
                    target: this.ele,
                    desc: "initRect is runned"
                });
                return;
            }
            this._initedSizeObs = 1;

            let resizeTimer;
            // 元素尺寸修正
            const fixSize = () => {
                clearTimeout(resizeTimer);

                setTimeout(() => {
                    // 尺寸时间监听
                    emitUpdate(this, {
                        xid: this.xid,
                        name: "sizeUpdate"
                    }, undefined, false);
                }, time);
            }
            fixSize();
            if (window.ResizeObserver) {
                const resizeObserver = new ResizeObserver(entries => {
                    fixSize();
                });
                resizeObserver.observe(this.ele);

                return () => {
                    resizeObserver.disconnect();
                }
            } else {
                let f;
                window.addEventListener("resize", f = e => {
                    fixSize();
                });
                return () => {
                    window.removeEventListener("resize", f);
                }
            }
        }
    }

    // 允许被设置的key值
    defineProperties(XEle.prototype, {
        [CANSETKEYS]: {
            // writable: true,
            value: new Set(xEleDefaultSetKeys)
        }
    });
    // 因为表单太常用了，将表单组件进行规范
    // 渲染表单元素的方法
    const renderInput = (xele) => {
        let type = xele.attr("type") || "text";
        const {
            ele
        } = xele;

        let d_opts = {
            type: {
                enumerable: true,
                get: () => type
            },
            name: {
                enumerable: true,
                get: () => ele.name
            },
            value: {
                enumerable: true,
                get() {
                    return ele.hasOwnProperty('__value') ? ele.__value : ele.value;
                },
                set(val) {
                    // 针对可能输入的是数字被动转成字符
                    ele.value = ele.__value = val;

                    emitUpdate(xele, {
                        xid: xele.xid,
                        name: "setData",
                        args: ["value", val]
                    });
                }
            },
            disabled: {
                enumerable: true,
                get() {
                    return ele.disabled;
                },
                set(val) {
                    ele.disabled = val;
                }
            },
            // 错误信息
            msg: {
                writable: true,
                value: null
            },
            [CANSETKEYS]: {
                value: new Set(["value", "disabled", "msg", ...xEleDefaultSetKeys])
            }
        };

        // 根据类型进行设置
        switch (type) {
            case "radio":
            case "checkbox":
                Object.assign(d_opts, {
                    checked: {
                        enumerable: true,
                        get() {
                            return ele.checked;
                        },
                        set(val) {
                            ele.checked = val;
                        }
                    },
                    name: {
                        enumerable: true,
                        get() {
                            return ele.name;
                        }
                    }
                });

                // 不赋予这个字段
                delete d_opts.msg;

                xele.on("change", e => {
                    emitUpdate(xele, {
                        xid: xele.xid,
                        name: "setData",
                        args: ["checked", ele.checked]
                    });
                });

                d_opts[CANSETKEYS].value.add("checked");
                break;
            case "file":
                Object.assign(d_opts, {
                    accept: {
                        enumerable: true,
                        get() {
                            return ele.accept;
                        }
                    }
                });
                break;
            case "text":
            default:
                xele.on("input", e => {
                    delete ele.__value;

                    // 改动冒泡
                    emitUpdate(xele, {
                        xid: xele.xid,
                        name: "setData",
                        args: ["value", ele.value]
                    });
                });
                break;
        }

        defineProperties(xele, d_opts);
    }

    class FromXData extends XData {
        constructor(obj, {
            selector,
            delay,
            _target
        }) {
            super(obj, "root");

            this._selector = selector;
            this._target = _target;
            this._delay = delay;

            let isInit = 0;

            let backupData;

            let watchFun = () => {
                const eles = this.formEles;
                const obj = getFromEleData(eles, this);

                const objKeys = Object.keys(obj);
                Object.keys(this).filter(e => {
                    return !objKeys.includes(e);
                }).forEach(k => {
                    delete this[k];
                });

                Object.assign(this, obj);

                backupData = this.toJSON();

                if (!isInit) {
                    return;
                }

                verifyFormEle(eles);
            }

            let timer;
            this._wid = _target.watch(() => {
                clearTimeout(timer);
                timer = setTimeout(() => {
                    watchFun();
                }, this._delay);
            });

            // 数据初始化
            watchFun();

            isInit = 1;

            // 反向数据绑定
            this.watchTick(e => {
                let data = this.toJSON();

                Object.entries(data).forEach(([k, value]) => {
                    let oldVal = backupData[k];

                    if (value !== oldVal || (typeof value == "object" && typeof oldVal == "object" && JSON.stringify(value) !== JSON.stringify(oldVal))) {
                        // 相应的元素
                        let targetEles = this.getTarget(k);

                        targetEles.forEach(ele => {
                            switch (ele.type) {
                                case "checkbox":
                                    if (value.includes(ele.value)) {
                                        ele.checked = true;
                                    } else {
                                        ele.checked = false;
                                    }
                                    break;
                                case "radio":
                                    if (ele.value == value) {
                                        ele.checked = true;
                                    } else {
                                        ele.checked = false;
                                    }
                                    break;
                                case "text":
                                default:
                                    ele.value = value;
                                    break;
                            }
                        });
                    }
                });

                // 备份数据
                backupData = data;
            });
        }

        get formEles() {
            return this._target.all(this._selector)
        }

        // 获取对应属性的元素
        getTarget(propName) {
            return this.formEles.filter(e => e.name === propName);
        }

        // 用于验证的方法
        // verify() {
        // }
    }

    // 从元素上获取表单数据
    const getFromEleData = (eles, oldData) => {
        const obj = {};

        eles.forEach(ele => {
            const {
                name,
                type,
                value
            } = ele;

            switch (type) {
                case "radio":
                    if (ele.checked) {
                        obj[name] = value;
                    }
                    break;
                case "checkbox":
                    let tar_arr = obj[name] || ((obj[name] = oldData[name]) || (obj[name] = []));
                    if (ele.checked) {
                        if (!tar_arr.includes(ele.value)) {
                            tar_arr.push(value);
                        }
                    } else if (tar_arr.includes(ele.value)) {
                        // 包含就删除
                        tar_arr.splice(tar_arr.indexOf(ele.value), 1);
                    }
                    break;
                case "text":
                default:
                    obj[name] = value;
            }
        });

        return obj;
    }

    // 验证表单元素
    const verifyFormEle = (eles) => {
        // 重新跑一次验证
        eles.forEach(e => {
            const event = new CustomEvent("verify", {
                bubbles: false
            });
            event.msg = "";
            event.formData = this;
            event.$target = e;

            e.trigger(event);

            const {
                msg
            } = event;
            const msg_type = getType(msg);

            // msg只能是Error或字符串
            if (msg_type == "string") {
                e.msg = msg || null;
            } else if (msg_type == "error") {
                if (getType(e.msg) !== "error" || e.msg.message !== msg.message) {
                    e.msg = msg;
                }
            } else {
                console.warn({
                    target: e,
                    msg,
                    desc: `msg can only be Error or String`
                });
            }
        });
    }

    extend(XEle.prototype, {
        // 专门用于表单的插件
        form(opts) {
            const defs = {
                // 对表单元素进行修正
                selector: "input,textarea,select",
                delay: 100
            };

            if (getType(opts) === "string") {
                defs.selector = opts;
            } else {
                Object.assign(defs, opts);
            }

            // 主体返回对象
            const formdata = new FromXData({}, {
                selector: defs.selector,
                delay: defs.delay,
                _target: this
            });

            return formdata;
        }
    });
    // 重造数组方法
    ['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'map', 'slice', 'some', 'indexOf', 'lastIndexOf', 'includes', 'join'].forEach(methodName => {
        const arrayFnFunc = Array.prototype[methodName];
        if (arrayFnFunc) {
            Object.defineProperty(XEle.prototype, methodName, {
                value(...args) {
                    return arrayFnFunc.apply(Array.from(this.ele.children).map(createXEle), args);
                }
            });
        }
    });

    extend(XEle.prototype, {
        // 最基础的
        splice(index, howmany, ...items) {
            const {
                ele
            } = this;
            const children = Array.from(ele.children);

            // 删除相应元素
            const removes = [];
            let b_index = index;
            let b_howmany = getType(howmany) == 'number' ? howmany : (this.length - index);
            let target = children[b_index];
            while (target && b_howmany > 0) {
                removes.push(target);
                ele.removeChild(target);
                b_index++;
                b_howmany--;
                target = children[b_index];
            }

            // 新增元素
            if (items.length) {
                let fragEle = document.createDocumentFragment();
                items.forEach(e => {
                    if (e instanceof Element) {
                        fragEle.appendChild(e);
                        return;
                    }

                    if (e instanceof XEle) {
                        fragEle.appendChild(e.ele);
                        return;
                    }

                    let type = getType(e);

                    if (type == "string") {
                        parseStringToDom(e).forEach(e2 => {
                            fragEle.appendChild(e2);
                        });
                    } else if (type == "object") {
                        fragEle.appendChild(parseDataToDom(e));
                    }
                });

                if (index >= this.length) {
                    // 在末尾添加元素
                    ele.appendChild(fragEle);
                } else {
                    // 指定index插入
                    ele.insertBefore(fragEle, ele.children[index]);
                }
            }

            // 改动冒泡
            emitUpdate(this, {
                xid: this.xid,
                name: "splice",
                args: [index, howmany, ...items]
            });

            return removes;
        },
        sort(sortCall) {
            const selfEle = this.ele;
            const childs = Array.from(selfEle.children).map(createXEle).sort(sortCall);

            rebuildXEleArray(selfEle, childs);

            emitUpdate(this, {
                xid: this.xid,
                name: "sort"
            });
            return this;
        },
        reverse() {
            const selfEle = this.ele;
            const childs = Array.from(selfEle.children).reverse();
            rebuildXEleArray(selfEle, childs);
            emitUpdate(this, {
                xid: this.xid,
                name: "reverse"
            });

            return this;
        }
    });

    // 根据先后顺序数组进行元素排序
    const rebuildXEleArray = (container, rearray) => {
        const {
            children
        } = container;

        rearray.forEach((e, index) => {
            let ele = e.ele || e;

            const targetChild = children[index];

            if (!targetChild) {
                // 属于后面新增
                container.appendChild(ele);
            } else if (ele !== targetChild) {
                container.insertBefore(ele, targetChild);
            }
        });
    }
    // DOM自带事件，何必舍近求远
    const getEventsMap = (target) => {
        return target[EVENTS] ? target[EVENTS] : (target[EVENTS] = new Map());
    }

    const MOUSEEVENT = glo.MouseEvent || Event;
    const TOUCHEVENT = glo.TouchEvent || Event;

    // 修正 Event Class 用的数据表
    const EventMap = new Map([
        ["click", MOUSEEVENT],
        ["mousedown", MOUSEEVENT],
        ["mouseup", MOUSEEVENT],
        ["mousemove", MOUSEEVENT],
        ["mouseenter", MOUSEEVENT],
        ["mouseleave", MOUSEEVENT],
        ["touchstart", TOUCHEVENT],
        ["touchend", TOUCHEVENT],
        ["touchmove", TOUCHEVENT]
    ]);

    // 触发原生事件
    const triggerEvenet = (_this, name, data, bubbles = true) => {
        let TargeEvent = EventMap.get(name) || CustomEvent;

        const event = name instanceof Event ? name : new TargeEvent(name, {
            bubbles,
            cancelable: true
        });

        event.data = data;

        // 触发事件
        return _this.ele.dispatchEvent(event);
    }

    extend(XEle.prototype, {
        on(name, selector, callback) {
            if (isFunction(selector)) {
                callback = selector;
                selector = undefined;
            } else {
                const real_callback = callback;
                const {
                    ele
                } = this;
                callback = (event) => {
                    let path;
                    if (event.path) {
                        path = event.path;
                    } else {
                        path = createXEle(event.target).parents(null, ele).map(e => e.ele);
                        path.unshift(event.target);
                    }

                    path.some(pTarget => {
                        if (pTarget == ele) {
                            return true;
                        }

                        if (createXEle(pTarget).is(selector)) {
                            event.selector = pTarget;
                            real_callback(event);
                            delete event.selector;
                        }
                    });
                }
            }

            this.ele.addEventListener(name, callback);
            const eid = "e_" + getRandomId()
            getEventsMap(this).set(eid, {
                name,
                selector,
                callback
            });
            return eid;
        },
        off(eid) {
            let d = getEventsMap(this).get(eid);

            if (!d) {
                return false;
            }

            this.ele.removeEventListener(d.name, d.callback);
            this[EVENTS].delete(eid);
            return true;
        },
        one(name, selector, callback) {
            let eid, func;
            if (typeof selector == "string") {
                func = callback;
                callback = (e) => {
                    func(e);
                    this.off(eid);
                }
            } else {
                func = selector;
                selector = (e) => {
                    func(e);
                    this.off(eid);
                }
            }

            eid = this.on(name, selector, callback);

            return eid;
        },
        trigger(name, data) {
            return triggerEvenet(this, name, data);
        },
        triggerHandler(name, data) {
            return triggerEvenet(this, name, data, false);
        }
    });

    // 常用事件封装
    ["click", "focus", "blur"].forEach(name => {
        extend(XEle.prototype, {
            [name](callback) {
                if (isFunction(callback)) {
                    this.on(name, callback);
                } else {
                    // callback 就是 data
                    return this.trigger(name, callback);
                }
            }
        });
    });
    // 所有注册的组件
    const Components = {};
    const ComponentResolves = {};

    // 获取组件
    const getComp = (name) => {
        name = attrToProp(name);

        // 组件上有数据就直接返回
        if (Components[name]) {
            return Components[name];
        }

        // 创建挂载组件
        let pms = new Promise(res => {
            ComponentResolves[name] = res;
        });
        Components[name] = pms;

        return pms;
    }

    // 渲染元素
    const renderXEle = async ({
        xele,
        defs,
        temps,
        _this
    }) => {
        Object.assign(xele, defs.data, defs.attrs);

        defs.created && defs.created.call(xele);

        if (defs.temp) {
            // 添加shadow root
            const sroot = _this.attachShadow({
                mode: "open"
            });

            sroot.innerHTML = defs.temp;

            // 渲染元素
            renderTemp({
                host: xele,
                xdata: xele,
                content: sroot,
                temps
            });

            // 子元素有改动，触发元素渲染
            xele.shadow && xele.shadow.watchTick(e => {
                if (e.some(e2 => e2.path.length > 1)) {
                    emitUpdate(xele, {
                        xid: xele.xid,
                        name: "forceUpdate"
                    });
                }
            }, 10);

            // 缓冲link
            let links = sroot.querySelectorAll("link");
            if (links.length) {
                await Promise.all(Array.from(links).map(linkEle => {
                    return new Promise((resolve, reject) => {
                        if (linkEle.sheet) {
                            resolve();
                        } else {
                            let succeedCall, errCall;
                            linkEle.addEventListener("load", succeedCall = e => {
                                linkEle.removeEventListener("load", succeedCall);
                                linkEle.removeEventListener("error", errCall);
                                resolve();
                            });
                            linkEle.addEventListener("error", errCall = e => {
                                linkEle.removeEventListener("load", succeedCall);
                                linkEle.removeEventListener("error", errCall);
                                reject({
                                    desc: "link load error",
                                    ele: linkEle,
                                    target: xele.ele
                                });
                            });
                        }
                    });
                }));
            }
        }

        defs.ready && defs.ready.call(xele);

        // attrs监听
        !isEmptyObj(defs.attrs) && xele.watchTick(e => {
            _this.__set_attr = 1;
            Object.keys(defs.attrs).forEach(key => {
                _this.setAttribute(propToAttr(key), xele[key]);
            });
            delete _this.__set_attr;
        });

        // watch函数触发
        let d_watch = defs.watch;
        if (!isEmptyObj(d_watch)) {
            xele.watchKey(d_watch, true);
        }
    }

    // 已经运行revoke函数
    const RUNNDEDREVOKE = Symbol("runned_revoke");

    // 注册组件的主要逻辑
    const register = (opts) => {
        const defs = {
            // 注册的组件名
            tag: "",
            // 正文内容字符串
            temp: "",
            // 和attributes绑定的keys
            attrs: {},
            // 默认数据
            data: {},
            // 根据属性直接设置值
            watch: {},
            // 合并到原型链上的方法
            proto: {},
            // // 组件被创建时触发的函数（数据初始化完成）
            // created() { },
            // // 组件数据初始化完成后触发的函数（初次渲染完毕）
            // ready() { },
            // // 被添加到document触发的函数
            // attached() { },
            // // 被移出document触发的函数
            // detached() { },
            // // 容器元素发生改变
            // slotchange() { }
        };

        Object.assign(defs, opts);

        let temps;

        if (defs.temp) {
            const d = transTemp(defs.temp, defs.tag);
            defs.temp = d.html;
            temps = d.temps;
        }

        // 生成新的XEle class
        let compName = attrToProp(opts.tag);
        // const CustomXEle = Components[compName] = class extends XEle {
        const CustomXEle = class extends XEle {
            constructor(ele) {
                super(ele);

                ele.isCustom = true;
            }

            // 强制刷新视图
            forceUpdate() {
                // 改动冒泡
                emitUpdate(this, {
                    xid: this.xid,
                    name: "forceUpdate"
                });
            }
            // 回收元素内所有的数据（防止垃圾回收失败）
            revoke() {
                if (this[RUNNDEDREVOKE]) {
                    return;
                }
                this[RUNNDEDREVOKE] = 1;
                Object.values(this).forEach(child => {
                    if (!(child instanceof XEle) && isxdata(child)) {
                        clearXDataOwner(child, this[XDATASELF]);
                    }
                });

                removeElementBind(this.shadow.ele);
            }
        }

        // 扩展原型
        extend(CustomXEle.prototype, defs.proto);

        const cansetKeys = getCansetKeys(defs);

        // 扩展CANSETKEYS
        defineProperties(CustomXEle.prototype, {
            [CANSETKEYS]: {
                writable: true,
                value: new Set([...xEleDefaultSetKeys, ...cansetKeys])
            }
        });

        // 注册原生组件
        const XhearElement = class extends HTMLElement {
            constructor(...args) {
                super(...args);

                let old_xele = this.__xEle__;
                if (old_xele) {
                    console.warn({
                        target: old_xele,
                        desc: "please re-instantiate the object"
                    });
                }

                this.__xEle__ = new CustomXEle(this);

                const xele = createXEle(this);

                renderXEle({
                    xele,
                    defs,
                    temps,
                    _this: this
                }).then(e => {
                    if (this.__x_connected) {
                        this.setAttribute("x-render", 1);
                    } else {
                        this.x_render = 1;
                    }
                });
            }

            connectedCallback() {
                // console.log("connectedCallback => ", this);
                if (this.x_render) {
                    this.setAttribute("x-render", this.x_render)
                }
                this.__x_connected = true;
                if (defs.attached && !this.__x_runned_connected) {
                    nextTick(() => {
                        if (this.__x_connected && !this.__x_runned_connected) {
                            this.__x_runned_connected = true;
                            defs.attached.call(createXEle(this));
                        }
                    });
                }
            }

            // adoptedCallback() {
            //     console.log("adoptedCallback => ", this);
            // }

            disconnectedCallback() {
                // console.log("disconnectedCallback => ", this);
                this.__x_connected = false;
                if (defs.detached && !this.__x_runnded_disconnected) {
                    nextTick(() => {
                        if (!this.__x_connected && !this.__x_runnded_disconnected) {
                            this.__x_runnded_disconnected = true;
                            defs.detached.call(createXEle(this));
                        }
                    });
                }
            }

            attributeChangedCallback(name, oldValue, newValue) {
                if (this.__set_attr) return;

                createXEle(this)[attrToProp(name)] = newValue;
            }

            static get observedAttributes() {
                return Object.keys(defs.attrs).map(e => propToAttr(e));
            }
        }

        customElements.define(defs.tag, XhearElement);

        // 设置注册完成
        if (ComponentResolves[compName]) {
            ComponentResolves[compName](CustomXEle);
            delete ComponentResolves[compName];
        } else {
            Components[compName] = Promise.resolve(CustomXEle);
        }

    }

    // 根据 defaults 获取可设置的keys
    const getCansetKeys = (defs) => {
        const {
            attrs,
            data,
            watch,
            proto
        } = defs;

        const keys = [...Object.keys(attrs), ...Object.keys(data), ...Object.keys(watch)];

        const protoDesp = Object.getOwnPropertyDescriptors(proto);
        Object.keys(protoDesp).forEach(keyName => {
            let {
                set
            } = protoDesp[keyName];

            if (set) {
                keys.push(keyName);
            }
        });

        return keys;
    }

    // 将temp转化为可渲染的模板
    const transTemp = (temp, regTagName) => {
        // 去除注释代码
        temp = temp.replace(/<!--.+?-->/g, "");

        // 自定义字符串转换
        var textDataArr = temp.match(/{{.+?}}/g);
        textDataArr && textDataArr.forEach((e) => {
            var key = /{{(.+?)}}/.exec(e);
            if (key) {
                // temp = temp.replace(e, `<span :text="${key[1]}"></span>`);
                temp = temp.replace(e, `<x-span prop="${encodeURI(key[1])}"></x-span>`);
            }
        });

        // 再转换
        const tsTemp = document.createElement("template");
        tsTemp.innerHTML = temp;

        // 原生元素上修正 temp:xxx模板
        let addTemps = [],
            removeRegEles = [];

        Array.from(tsTemp.content.querySelectorAll("*")).forEach(ele => {
            // 绑定对象
            const bindData = {};

            // 需要被删除的属性
            const needRemoveAttrs = [];

            Array.from(ele.attributes).forEach(attrObj => {
                let {
                    name,
                    value
                } = attrObj;

                // 模板抽离
                let tempMatch = /^temp:(.+)/.exec(name);
                if (tempMatch) {
                    let [, tempName] = tempMatch;
                    let tempEle = document.createElement("template");
                    tempEle.setAttribute('name', tempName);
                    ele.removeAttribute(name);
                    tempEle.innerHTML = ele.outerHTML;
                    addTemps.push(tempEle);
                    removeRegEles.push(ele);
                    return true;
                }

                // 指令
                let command;
                // 目标
                let target;

                if (/^#/.test(name)) {
                    command = "cmd";
                    target = name.replace(/^#/, "");
                } else if (/^@/.test(name)) {
                    command = "on";
                    target = name.replace(/^@/, "");
                } else if (name.includes(":")) {
                    // 带有指令分隔符的，进行之类修正
                    let m_arr = name.split(":");

                    if (m_arr.length == 2) {
                        // 模板正确，进行赋值
                        command = m_arr[0];
                        target = m_arr[1];

                        if (command === "") {
                            // 属性绑定修正
                            command = "prop";
                        }
                    } else {
                        // 绑定标识出错
                        throw {
                            desc: "template binding mark error",
                            target: ele,
                            expr: name
                        };
                    }
                }

                if (command) {
                    let data = bindData[command] || (bindData[command] = {});
                    if (command == "on") {
                        data[target] = {
                            name: value
                        };
                    } else if (target) {
                        data[target] = value;
                    }
                    needRemoveAttrs.push(name);
                }
            });

            if (needRemoveAttrs.length) {
                // ele.setAttribute("bind-data", JSON.stringify(bindData));
                // ele.setAttribute('bind-keys', Object.keys(bindData).join(" "));

                // 原属性还原
                Object.keys(bindData).forEach(bName => {
                    let data = bindData[bName];
                    if (bName == "cmd") {
                        Object.keys(data).forEach(dName => {
                            ele.setAttribute(`x-cmd-${dName}`, data[dName]);
                        });
                    } else {
                        ele.setAttribute(`x-${bName}`, JSON.stringify(data));
                    }
                });

                needRemoveAttrs.forEach(name => ele.removeAttribute(name));
            }
        });

        if (addTemps.length) {
            addTemps.forEach(ele => {
                tsTemp.content.appendChild(ele);
            });
            removeRegEles.forEach(ele => {
                tsTemp.content.removeChild(ele);
            });
        }

        // 将 template 内的页进行转换
        Array.from(tsTemp.content.querySelectorAll("template")).forEach(e => {
            e.innerHTML = transTemp(e.innerHTML).html;
        });

        // 修正 x-cmd-if 元素
        wrapIfTemp(tsTemp);

        // 获取模板
        let temps = new Map();

        Array.from(tsTemp.content.querySelectorAll(`template[name]`)).forEach(e => {
            temps.set(e.getAttribute("name"), {
                ele: e,
                code: e.content.children[0].outerHTML
            });
            e.parentNode.removeChild(e);
        })

        // 对temp进行检测
        if (temps.size) {
            for (let [key, e] of temps.entries()) {
                const {
                    children
                } = e.ele.content;
                if (children.length !== 1) {
                    throw {
                        name: key,
                        html: e.code,
                        tag: regTagName,
                        desc: "register error, only one element must exist in the template"
                    };
                } else {
                    if (children[0].getAttribute("x-cmd-if")) {
                        throw {
                            name: key,
                            html: e.code,
                            tag: regTagName,
                            desc: "register error, cannot use if on template first element"
                        };
                    }
                }
            }
        }

        // 返回最终结果
        return {
            temps,
            html: tsTemp.innerHTML
        };
    }

    // 给 x-cmd-if 元素包裹 template
    const wrapIfTemp = (tempEle) => {
        let iEles = tempEle.content.querySelectorAll("[x-cmd-if],[x-cmd-else-if],[x-cmd-else],[x-cmd-await],[x-cmd-then],[x-cmd-catch]");

        iEles.forEach(ele => {
            if (ele.tagName.toLowerCase() == "template") {
                return;
            }

            let ifTempEle = document.createElement("template");
            ["x-cmd-if", "x-cmd-else-if", "x-cmd-else", "x-cmd-await", "x-cmd-then", "x-cmd-catch"].forEach(name => {
                let val = ele.getAttribute(name);

                if (val === null) {
                    return;
                }

                ifTempEle.setAttribute(name, val);
                ele.removeAttribute(name);
            });

            ele.parentNode.insertBefore(ifTempEle, ele);
            ifTempEle.content.appendChild(ele);
        });

        // 内部 template 也进行包裹
        Array.from(tempEle.content.querySelectorAll("template")).forEach(wrapIfTemp);
    }
    // 获取所有符合表达式的可渲染的元素
    const getCanRenderEles = (root, expr) => {
        let arr = Array.from(root.querySelectorAll(expr))
        if (root instanceof Element && meetsEle(root, expr)) {
            arr.push(root);
        }
        return arr;
    }

    // 去除原元素并添加定位元素
    const postionNode = e => {
        // let textnode = document.createTextNode("");
        let marker = new Comment("x-marker");

        let parent = e.parentNode;
        parent.insertBefore(marker, e);
        parent.removeChild(e);

        return {
            marker,
            parent
        };
    }

    // 将表达式转换为函数
    const exprToFunc = expr => {
        return new Function("...$args", `
const [$e,$target] = $args;

try{
    with(this){
        ${expr};
    }
}catch(e){
    throw {
        message:e.message || "run error",
        expr:\`${expr.replace(/`/g, "\\`")}\`,
        target:this,
        error:e
    };
}`);
    }

    // 清除表达式属性并将数据添加到元素对象内
    const moveAttrExpr = (ele, exprName, propData) => {
        ele.removeAttribute(exprName);

        let renderedData = ele.__renderData;
        if (!renderedData) {
            renderedData = ele.__renderData = {}
            // 增加渲染过后的数据
            ele.setAttribute("x-rendered", "");
        }

        renderedData[exprName] = propData;
    }

    // 绑定函数监听，添加到记录数组
    const bindWatch = (data, func, bindings) => {
        let eid = data.watchTick(func);
        bindings.push({
            eid,
            target: data
        });
    }

    // 获取目标数据get函数
    const renderXdataGetFunc = (expr, xdata) => {
        let runFunc;

        if (regIsFuncExpr.test(expr)) {
            // 属于函数
            runFunc = exprToFunc("return " + expr).bind(xdata);
        } else {
            // 值变动
            runFunc = () => xdata[expr];
        }

        return runFunc;
    }

    // 渲染器上的watch函数绑定
    // expr用作判断xdata或host的依据，不做执行
    const renderInWatch = ({
        xdata,
        host,
        expr,
        watchFun
    }) => {
        // 已绑定的数据
        const bindings = [];

        // if (host !== xdata) {
        if (!(xdata instanceof XEle)) {
            // fill内的再填充渲染
            // xdata负责监听$index
            // xdata.$data为item数据本身
            // $host为组件数据
            if (expr.includes("$host")) {
                if (expr.includes("$index")) {
                    bindWatch(xdata, watchFun, bindings);
                }
                bindWatch(host, watchFun, bindings);
            } else if (expr.includes("$index") || expr.includes("$item")) {
                bindWatch(xdata, watchFun, bindings);
                isxdata(xdata.$data) && bindWatch(xdata.$data, watchFun, bindings);
            } else if (expr.includes("$data")) {
                isxdata(xdata.$data) && bindWatch(xdata.$data, watchFun, bindings);
            }
            // else {
            //     throw {
            //         desc: "fill element must use $data $host $item or $index",
            //         target: host,
            //         expr
            //     };
            // }
        } else {
            // host数据绑定
            bindWatch(xdata, watchFun, bindings);
        }

        return bindings;
    }

    // 表达式到值的设置
    const exprToSet = ({
        xdata,
        host,
        expr,
        callback,
        isArray
    }) => {
        // 即时运行的判断函数
        let runFunc = renderXdataGetFunc(expr, xdata);

        // 备份比较用的数据
        let backup_val, backup_ids, backup_objstr;

        // 直接运行的渲染函数
        const watchFun = (modifys) => {
            const val = runFunc();

            if (isxdata(val)) {
                if (isArray) {
                    // 对象只监听数组变动
                    let ids = val.map(e => (e && e.xid) ? e.xid : e).join(",");
                    if (backup_ids !== ids) {
                        callback({
                            val,
                            modifys
                        });
                        backup_ids = ids;
                    }
                } else {
                    // 对象监听
                    let obj_str = val.toJSON();

                    if (backup_val !== val || obj_str !== backup_objstr) {
                        callback({
                            val,
                            modifys
                        });
                        backup_objstr = obj_str;
                    }
                }
            } else if (backup_val !== val) {
                callback({
                    val,
                    modifys
                });
                backup_objstr = null;
            }
            backup_val = val;
        }

        // 先执行一次
        watchFun();

        return renderInWatch({
            xdata,
            host,
            expr,
            watchFun
        });
    }

    // 添加监听数据
    const addBindingData = (target, bindings) => {
        let _binds = target.__bindings || (target.__bindings = []);
        _binds.push(...bindings);
    }

    const regIsFuncExpr = /[\(\)\;\.\=\>\<\|]/;

    // 元素深度循环函数
    const elementDeepEach = (ele, callback) => {
        // callback(ele);
        Array.from(ele.childNodes).forEach(target => {
            callback(target);

            if (target instanceof Element) {
                elementDeepEach(target, callback);
            }
        });
    }

    // 根据 if 语句，去除数据绑定关系
    const removeElementBind = (target) => {
        elementDeepEach(target, ele => {
            if (ele.isCustom) {
                createXEle(ele).revoke();
            }

            if (ele.__bindings) {
                ele.__bindings.forEach(e => {
                    let {
                        target,
                        eid
                    } = e;
                    target.unwatch(eid);
                });
            }
        });
    }

    // 添加渲染模板item内的元素
    const addTempItemEle = ({
        temp,
        temps,
        marker,
        parent,
        host,
        xdata
    }) => {
        // 添加元素
        let targets = parseStringToDom(temp.innerHTML);
        targets.forEach(ele => {
            parent.insertBefore(ele, marker);
            renderTemp({
                host,
                xdata,
                content: ele,
                temps
            });
        });
        return targets;
    }

    // 删除渲染模板item内的元素
    const removeTempItemEle = (arr) => {
        arr.forEach(item => {
            // 去除数据绑定
            removeElementBind(item)

            // 删除元素
            item.parentNode.removeChild(item);
        });
    }

    // 渲染组件的逻辑
    // host 主体组件元素；存放方法的主体
    // xdata 渲染目标数据；单层渲染下是host，x-fill模式下是具体的数据
    // content 渲染目标元素
    const renderTemp = ({
        host,
        xdata,
        content,
        temps
    }) => {
        // 事件绑定
        getCanRenderEles(content, "[x-on]").forEach(target => {
            let eventInfo = JSON.parse(target.getAttribute("x-on"));

            let eids = [];

            const $tar = createXEle(target);

            Object.keys(eventInfo).forEach(eventName => {
                let {
                    name
                } = eventInfo[eventName];

                let eid;

                // 判断是否函数
                if (regIsFuncExpr.test(name)) {
                    // 函数绑定
                    const func = exprToFunc(name);
                    eid = $tar.on(eventName, (event) => {
                        // func.call(host, event);
                        func.call(xdata, event, $tar);
                    });
                } else {
                    // 函数名绑定
                    eid = $tar.on(eventName, (event) => {
                        // host[name] && host[name].call(host, event);
                        xdata[name] && xdata[name].call(xdata, event);
                    });
                }

                eids.push(eid);
            });

            moveAttrExpr(target, "x-on", eventInfo);
        });

        // 属性绑定
        getCanRenderEles(content, "[x-attr]").forEach(ele => {
            const attrData = JSON.parse(ele.getAttribute('x-attr'));

            moveAttrExpr(ele, "x-attr", attrData);

            Object.keys(attrData).forEach(attrName => {
                const bindings = exprToSet({
                    xdata,
                    host,
                    expr: attrData[attrName],
                    callback: ({
                        val
                    }) => {
                        ele.setAttribute(attrName, val);
                    }
                });

                addBindingData(ele, bindings);
            })
        });

        // class绑定
        getCanRenderEles(content, "[x-class]").forEach(ele => {
            const classListData = JSON.parse(ele.getAttribute('x-class'));

            moveAttrExpr(ele, "x-class", classListData);

            Object.keys(classListData).forEach(className => {
                const bindings = exprToSet({
                    xdata,
                    host,
                    expr: classListData[className],
                    callback: ({
                        val
                    }) => {
                        // ele.setAttribute(className, val);
                        if (val) {
                            ele.classList.add(className);
                        } else {
                            ele.classList.remove(className);
                        }
                    }
                });

                addBindingData(ele, bindings);
            })
        });

        getCanRenderEles(content, "[x-prop]").forEach(ele => {
            const propData = JSON.parse(ele.getAttribute('x-prop'));
            const xEle = createXEle(ele);

            moveAttrExpr(ele, "x-prop", propData);

            Object.keys(propData).forEach(propName => {
                const bindings = exprToSet({
                    xdata,
                    host,
                    expr: propData[propName],
                    callback: ({
                        val
                    }) => {
                        xEle[propName] = val;
                    }
                });

                addBindingData(ele, bindings);
            });
        });

        // 数据双向绑定
        getCanRenderEles(content, "[x-sync]").forEach(ele => {
            const propData = JSON.parse(ele.getAttribute('x-sync'));
            const xEle = createXEle(ele);

            Object.keys(propData).forEach(propName => {
                let hostPropName = propData[propName];
                if (regIsFuncExpr.test(hostPropName)) {
                    throw {
                        desc: "sync only accepts attribute names"
                    };
                }

                const bindings1 = exprToSet({
                    xdata,
                    host,
                    expr: hostPropName,
                    callback: ({
                        val
                    }) => {
                        xEle[propName] = val;
                    }
                });

                const bindings2 = exprToSet({
                    xdata: xEle,
                    host,
                    expr: propName,
                    callback: ({
                        val
                    }) => {
                        xdata[hostPropName] = val;
                    }
                });

                addBindingData(ele, [...bindings1, ...bindings2]);
            });
        });

        // 文本绑定
        getCanRenderEles(content, 'x-span').forEach(ele => {
            let expr = decodeURI(ele.getAttribute("prop"));

            let {
                marker,
                parent
            } = postionNode(ele);

            // 改为textNode
            const textnode = document.createTextNode("")
            parent.replaceChild(textnode, marker);

            // 数据绑定
            const bindings = exprToSet({
                xdata,
                host,
                expr,
                callback: ({
                    val
                }) => {
                    textnode.textContent = val;
                }
            });

            addBindingData(textnode, bindings);
        });

        // if元素渲染
        getCanRenderEles(content, '[x-cmd-if]').forEach(ele => {
            const conditionEles = [ele];
            // 将后续的else-if和else都拿起来
            let {
                nextElementSibling
            } = ele;
            while (nextElementSibling && (nextElementSibling.hasAttribute("x-cmd-else-if") || nextElementSibling.hasAttribute("x-cmd-else"))) {
                nextElementSibling.parentNode.removeChild(nextElementSibling);
                conditionEles.push(nextElementSibling);
                nextElementSibling = ele.nextElementSibling
            }

            let all_expr = '';

            // 生成个字的函数
            const conditions = conditionEles.map((e, index) => {
                let callback;

                const expr = e.getAttribute("x-cmd-else-if") || e.getAttribute("x-cmd-if");

                if (expr) {
                    callback = renderXdataGetFunc(expr, xdata);
                    all_expr += `${index == 0 ? 'if' : 'else-if'}(${expr})...`;
                }

                return {
                    callback,
                    tempEle: e
                };
            });

            // 定位文本元素
            let {
                marker,
                parent
            } = postionNode(ele);

            // 生成的目标元素
            let targetEle = null;
            let oldIndex = -1;

            const watchFun = (modifys) => {
                let tempEle, tarIndex;
                conditions.some((e, index) => {
                    if (!e.callback || e.callback()) {
                        tempEle = e.tempEle;
                        tarIndex = index;
                        return true;
                    }
                });

                // 存在改动，进行纠正
                if (oldIndex !== tarIndex) {
                    // 旧模板销毁
                    if (targetEle) {
                        // 去除数据绑定
                        removeElementBind(targetEle);

                        // 删除元素
                        targetEle.parentNode.removeChild(targetEle);
                        // parent.replaceChild(marker, targetEle);
                        targetEle = null;
                    }

                    if (!tempEle) {
                        // 木存在模板就待定
                        return;
                    }

                    // 添加元素
                    targetEle = parseStringToDom(tempEle.content.children[0].outerHTML)[0];

                    parent.insertBefore(targetEle, marker);

                    // 重新渲染
                    renderTemp({
                        host,
                        xdata,
                        content: targetEle,
                        temps
                    });
                }

                oldIndex = tarIndex;
            }

            // 先执行一次
            watchFun();

            addBindingData(marker, renderInWatch({
                xdata,
                host,
                expr: all_expr,
                watchFun
            }));

            // const expr = ele.getAttribute('x-cmd-if');

            // // 定位文本元素
            // let { marker, parent } = postionNode(ele);

            // // 生成的目标元素
            // let targetEle = null;

            // const bindings = exprToSet({
            //     xdata, host, expr,
            //     callback: ({ val }) => {
            //         if (val && !targetEle) {
            //             // 添加元素
            //             targetEle = $(ele.content.children[0].outerHTML).ele;

            //             parent.insertBefore(targetEle, marker);
            //             // parent.replaceChild(targetEle, marker);

            //             // 重新渲染
            //             renderTemp({ host, xdata, content: targetEle, temps });
            //         } else if (!val && targetEle) {
            //             // 去除数据绑定
            //             removeElementBind(targetEle);

            //             // 删除元素
            //             targetEle.parentNode.removeChild(targetEle);
            //             // parent.replaceChild(marker, targetEle);

            //             targetEle = null;
            //         }
            //     }
            // });

            // addBindingData(marker, bindings);
        });

        // await元素渲染
        getCanRenderEles(content, "[x-cmd-await]").forEach(ele => {
            let awaitTemp = ele,
                thenTemp, catchTemp;
            // 将后续的else-if和else都拿起来
            let {
                nextElementSibling
            } = ele;
            while (nextElementSibling && (nextElementSibling.hasAttribute("x-cmd-then") || nextElementSibling.hasAttribute("x-cmd-catch"))) {
                if (nextElementSibling.hasAttribute("x-cmd-then")) {
                    thenTemp = nextElementSibling;
                } else if (nextElementSibling.hasAttribute("x-cmd-catch")) {
                    catchTemp = nextElementSibling;
                }
                nextElementSibling.parentNode.removeChild(nextElementSibling);
                nextElementSibling = ele.nextElementSibling
            }

            // 添加定位
            let {
                marker,
                parent
            } = postionNode(ele);

            let expr = ele.getAttribute("x-cmd-await");

            let beforePms, beforeTargets;
            const bindings = exprToSet({
                xdata,
                host,
                expr,
                callback: ({
                    val
                }) => {
                    // 清除前面的数据
                    if (beforeTargets) {
                        removeTempItemEle(beforeTargets);
                        beforeTargets = null;
                    }

                    // 添加元素
                    beforeTargets = addTempItemEle({
                        temp: awaitTemp,
                        temps,
                        marker,
                        parent,
                        host,
                        xdata
                    });

                    beforePms = val;

                    val.then(e => {
                        if (beforePms !== val) {
                            return;
                        }
                        removeTempItemEle(beforeTargets);
                        beforeTargets = null;
                        if (thenTemp) {
                            beforeTargets = addTempItemEle({
                                temp: thenTemp,
                                temps,
                                marker,
                                parent,
                                host,
                                xdata: {
                                    [thenTemp.getAttribute("x-cmd-then")]: e
                                }
                            });
                        }
                    }).catch(err => {
                        if (beforePms !== val) {
                            return;
                        }
                        removeTempItemEle(beforeTargets);
                        beforeTargets = null;
                        if (catchTemp) {
                            beforeTargets = addTempItemEle({
                                temp: catchTemp,
                                temps,
                                marker,
                                parent,
                                host,
                                xdata: {
                                    [catchTemp.getAttribute("x-cmd-catch")]: err
                                }
                            });
                        }
                    })
                }
            });

            addBindingData(marker, bindings);
        });

        // 填充绑定
        getCanRenderEles(content, '[x-fill]').forEach(ele => {
            const fillData = JSON.parse(ele.getAttribute("x-fill"));
            let fillKeys = ele.getAttribute("x-item");
            fillKeys && (fillKeys = JSON.parse(fillKeys));

            const container = ele;

            createXEle(container)._unupdate = 1;

            let [tempName, propName] = Object.entries(fillData)[0];

            let old_xid;

            // 提前把 x-fill 属性去掉，防止重复渲染
            moveAttrExpr(ele, "x-fill", fillData);
            moveAttrExpr(ele, "x-item", fillKeys);

            const bindings = exprToSet({
                xdata,
                host,
                expr: propName,
                isArray: 1,
                callback: d => {
                    const targetArr = d.val;

                    // 获取模板
                    let tempData = temps.get(tempName);

                    if (!tempData) {
                        throw {
                            target: host.ele,
                            desc: `this template was not found`,
                            name: tempName
                        };
                    }

                    if (!old_xid) {
                        // 完全填充
                        targetArr.forEach((data, index) => {
                            const itemEle = createFillItem({
                                host,
                                data,
                                index,
                                tempData,
                                temps
                            });

                            if (fillKeys) {
                                initKeyToItem(itemEle, fillKeys, xdata, host);
                            }

                            // 添加到容器内
                            container.appendChild(itemEle.ele);
                        });

                        old_xid = targetArr.xid;
                    } else {
                        const childs = Array.from(container.children);
                        const oldArr = childs.map(e => e.__fill_item.$data);

                        const holder = Symbol("holder");

                        const afterChilds = [];
                        targetArr.forEach((e, index) => {
                            let oldIndex = oldArr.indexOf(e);
                            if (oldIndex === -1) {
                                // 属于新增
                                let newItem = createFillItem({
                                    host,
                                    data: e,
                                    index,
                                    tempData,
                                    temps
                                });

                                if (fillKeys) {
                                    initKeyToItem(newItem, fillKeys, xdata, host);
                                }

                                afterChilds.push(newItem.ele);
                            } else {
                                // 属于位移
                                let targetEle = childs[oldIndex];
                                // 更新index
                                targetEle.__fill_item.$index = index;
                                afterChilds.push(targetEle);

                                // 标识已用
                                oldArr[oldIndex] = holder;
                            }
                        });

                        // 需要被清除数据的
                        const needRemoves = [];

                        // 删除不在数据内的元素
                        oldArr.forEach((e, i) => {
                            if (e !== holder) {
                                let e2 = childs[i];
                                needRemoves.push(e2);
                                container.removeChild(e2);
                            }
                        });

                        // 去除数据绑定
                        needRemoves.forEach(e => removeElementBind(e));

                        // 重构数组
                        rebuildXEleArray(container, afterChilds);
                    }
                }
            });

            addBindingData(ele, bindings);
        });
    }

    const initKeyToItem = (itemEle, fillKeys, xdata, host) => {
        let fData = itemEle.$item;
        Object.keys(fillKeys).forEach(key => {
            let expr = fillKeys[key];

            const propName = attrToProp(key);
            let itemBindings = exprToSet({
                xdata,
                host,
                expr,
                callback: ({
                    val
                }) => {
                    fData[propName] = val;
                }
            });

            addBindingData(itemEle.ele, itemBindings);
        });
    }

    // 生成fillItem元素
    // fillKeys 传递的Key
    const createFillItem = ({
        host,
        data,
        index,
        tempData,
        temps
    }) => {
        const itemEle = createXEle(parseStringToDom(tempData.code)[0]);

        const itemData = createXData({
            get $host() {
                return host;
            },
            // $data: data,
            $index: index,
            get $data() {
                return data;
            },
            get $item() {
                // 获取自身
                return itemData;
            }
            // get $index() {
            //     return this._index;
            // },
            // _index: index
        });

        defineProperties(itemEle, {
            $item: {
                get: () => itemData
            },
            $data: {
                get: () => data
            }
        });

        itemEle.ele.__fill_item = itemData;

        renderTemp({
            host,
            xdata: itemData,
            content: itemEle.ele,
            temps
        });

        return itemEle;
    }


    function $(expr) {
        if (expr instanceof Element) {
            return createXEle(expr);
        }

        const exprType = getType(expr);

        // 目标元素
        let ele;

        if (exprType == "string") {
            if (!/\<.+\>/.test(expr)) {
                ele = document.querySelector(expr);
            } else {
                ele = parseStringToDom(expr)[0]
            }
        } else if (exprType == "object") {
            ele = parseDataToDom(expr);
        } else if (expr === document || expr instanceof DocumentFragment) {
            ele = expr;
        }

        if (ele) {
            return createXEle(ele);
        }

        return null;
    }

    Object.assign($, {
        all(expr) {
            return Array.from(document.querySelectorAll(expr)).map(e => createXEle(e));
        },
        register,
        xdata: (obj) => createXData(obj),
        nextTick,
        fn: XEle.prototype,
        extend,
        getComp
    });
    //<o:end--toofa.js-->

    glo.$ = $
})(window);