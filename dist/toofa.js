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
const collect = (func) => {
    let arr = [];
    const reFunc = e => {
        arr.push(e);
        nextTick(() => {
            func(arr);
            arr.length = 0;
        }, reFunc);
    }

    return reFunc;
}

// 扩展对象
const extend = (_this, proto) => {
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
                    value
                });
            }
        } else {
            Object.defineProperty(_this, k, {
                get,
                set
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
const WATCHS = Symbol("watchs");
const CANUPDATE = Symbol("can_update");

const cansetXtatus = new Set(["root", "sub", "revoke"]);

const emitUpdate = (target, opts) => {
    // 触发callback
    target[WATCHS].forEach(f => f(opts))

    // 向上冒泡
    target.owner.forEach(parent => emitUpdate(parent, opts));
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

        return target.setData(key, value);
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

const createXData = (obj, status) => {
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
    watchTick(func) {
        return this.watch(collect(func));
    },
    // 监听直到表达式成功
    watchUntil(expr) {
        if (/[^=]=[^=]/.test(expr)) {
            throw 'cannot use single =';
        }

        return new Promise(resolve => {
            // 忽略错误
            let exprFun = new Function(`
        try{with(this){
            return ${expr}
        }}catch(e){}`).bind(this);

            const wid = this.watch(() => {
                let reVal = exprFun();
                if (reVal) {
                    this.unwatch(wid);
                    resolve(reVal);
                }
            });
        });
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

        // 套入原生方法
        let rmArrs = arraySplice.call(self, index, howmany, ...items);

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
    objData.text && (ele.textContent = objData.text);

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
        // super(Object.assign({}, XEleHandler));
        super(XEleHandler);

        const self = this[XDATASELF];

        self.tag = ele.tagName ? ele.tagName.toLowerCase() : ''

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
        return Array.from(this.ele.children).map(e => {
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

        ele.setAttribute(key, value);
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
            if (until instanceof XhearEle) {
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
}

// 允许被设置的key值
defineProperties(XEle.prototype, {
    [CANSETKEYS]: {
        writable: true,
        value: new Set(xEleDefaultSetKeys)
    }
});

window.haha = XEle.prototype;
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
        let b_howmany = howmany;
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
            debugger
            // 属于后面新增
            container.push(ele);
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
                event.path.some(pTarget => {
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
        // 直接监听属性变动对象
        watch: {},
        // 合并到原型链上的方法
        proto: {},
        // 被创建的时候触发的callback
        // created() { },
        // 初次渲染完成后触发的事件
        // ready() {},
        // 添加进document执行的callback
        // attached() {},
        // 从document删除后执行callback
        // detached() {},
        // 容器元素发生变动
        // slotchange() { }
    };

    Object.assign(defs, opts);

    let temps;

    if (defs.temp) {
        const d = transTemp(defs.temp);
        defs.temp = d.html;
        temps = d.temps;
    }

    // 生成新的XEle class
    const CustomXEle = class extends XEle {
        constructor(ele) {
            super(ele);
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

            // cansetKeys.forEach(e => xele[CANSETKEYS].add(e));
            Object.assign(xele, defs.data, defs.attrs);

            defs.created && defs.created.call(xele);

            if (defs.temp) {
                // 添加shadow root
                const sroot = this.attachShadow({
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

                defs.ready && defs.ready.call(xele);
            }
        }

        connectedCallback() {
            // console.log("connectedCallback => ", this);
            this.__x_connected = true;
            if (defs.attached && !this.__x_runned_connected) {
                nexTick(() => {
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
                nexTick(() => {
                    if (!this.__x_connected && !this.__x_runnded_disconnected) {
                        this.__x_runnded_disconnected = true;
                        defs.detached.call(createXEle(this));
                    }
                });
            }
        }


        attributeChangedCallback(name, oldValue, newValue) {
            xele[attrToProp(name)] = newValue;
        }

        static get observedAttributes() {
            return Object.keys(defs.attrs).map(e => propToAttr(e));
        }
    }

    customElements.define(defs.tag, XhearElement);
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
const transTemp = (temp) => {
    // 去除注释代码
    temp = temp.replace(/<!--.+?-->/g, "");

    // 自定义字符串转换
    var textDataArr = temp.match(/{{.+?}}/g);
    textDataArr && textDataArr.forEach((e) => {
        var key = /{{(.+?)}}/.exec(e);
        if (key) {
            temp = temp.replace(e, `<span :text="${key[1]}"></span>`);
        }
    });

    // 再转换
    const tsTemp = document.createElement("template");
    tsTemp.innerHTML = temp;

    Array.from(tsTemp.content.querySelectorAll("*")).forEach(ele => {
        // 绑定属性
        const bindAttrs = {};
        const bindProps = {};
        // 绑定事件
        const bindEvent = {};
        // 填充
        const bindFill = [];

        let removeKeys = [];
        Array.from(ele.attributes).forEach(attrObj => {
            let {
                name,
                value
            } = attrObj;

            // 属性绑定
            const attrExecs = /^attr:(.+)/.exec(name);
            if (attrExecs) {
                bindAttrs[attrExecs[1]] = value;
                removeKeys.push(name);
                return;
            }

            const propExecs = /^:(.+)/.exec(name);
            if (propExecs) {
                bindProps[propExecs[1]] = value;
                removeKeys.push(name);
                return;
            }

            // 填充绑定
            const fillExecs = /^fill:(.+)/.exec(name);
            if (fillExecs) {
                bindFill.push(fillExecs[1], value);
                removeKeys.push(name);
                return;
            }

            // 事件绑定
            const eventExecs = /^@(.+)/.exec(name);
            if (eventExecs) {
                bindEvent[eventExecs[1]] = {
                    name: value
                };
                removeKeys.push(name);
                return;
            }
        });

        !isEmptyObj(bindAttrs) && ele.setAttribute("x-attr", JSON.stringify(bindAttrs));
        !isEmptyObj(bindProps) && ele.setAttribute("x-prop", JSON.stringify(bindProps));
        bindFill.length && ele.setAttribute("x-fill", JSON.stringify(bindFill));
        !isEmptyObj(bindEvent) && ele.setAttribute("x-on", JSON.stringify(bindEvent));
        removeKeys.forEach(name => ele.removeAttribute(name));
    });

    // 将 template 内的页进行转换
    Array.from(tsTemp.content.querySelectorAll("template")).forEach(e => {
        e.innerHTML = transTemp(e.innerHTML).html;
    });

    // 修正 x-if 元素
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

    // 返回最终结果
    return {
        temps,
        html: tsTemp.innerHTML
    };
}

// 给 x-if 元素包裹 template
const wrapIfTemp = (tempEle) => {
    let iEles = tempEle.content.querySelectorAll("[x-if]");

    iEles.forEach(ele => {
        if (ele.tagName.toLowerCase() == "template") {
            return;
        }

        let ifTempEle = document.createElement("template");
        ifTempEle.setAttribute("x-if", ele.getAttribute("x-if"));
        ele.removeAttribute("x-if");

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
        const [$event] = $args;
        
        with(this){
            return ${expr};
        }
    `);
}

// 代理对象监听函数
// class WatchAgent {
//     constructor(xdata) {
//         if (xdata.__watchAgent) {
//             return xdata.__watchAgent;
//         }

//         // 互相绑定
//         this.xdata = xdata;
//         xdata.__watchAgent = this;

//         // 存储表达式对象
//         this.exprMap = new Map();
//     }

//     // 监听表达式变动
//     watchExpr(expr) {
//         debugger
//     }
// }

// 表达式到值的设置
const exprToSet = (xdata, host, expr, callback) => {
    // 即时运行的判断函数
    let runFunc;

    if (regIsFuncExpr.test(expr)) {
        // 属于函数
        runFunc = exprToFunc(expr).bind(xdata);
    } else {
        // 值变动
        runFunc = () => xdata[expr];
    }

    // 备份比较用的数据
    let backup_val, backup_ids;

    // 直接运行的渲染函数
    const watchFun = (e) => {
        const val = runFunc();

        if (isxdata(val)) {
            let ids = val.map(e => e ? e.xid : e).join(",");
            if (backup_ids !== ids) {
                callback(val);
                backup_ids = ids;
            }
        } else if (backup_val !== val) {
            callback(val);
            backup_val = val;
        }
    }

    // 先执行一次
    watchFun();

    // 需要监听的目标对象
    let targetData = xdata;

    // 属于fill 填充渲染
    if (host !== xdata) {
        if (expr.includes("$host") || expr.includes("$index")) {
            targetData = host;
        } else {
            targetData = xdata.$data;
        }
    }
    targetData.watchTick(watchFun);
}

const regIsFuncExpr = /[\(\)\;\.\=\>\<]/;

// 元素深度循环函数（包含自身）
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
        if (ele) {}
        debugger
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
                    func.call(xdata, event);
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

        target.setAttribute("rendered-on", JSON.stringify(eids));
    });

    // 属性绑定
    getCanRenderEles(content, "[x-attr]").forEach(ele => {
        const attrData = JSON.parse(ele.getAttribute('x-attr'));

        Object.keys(attrData).forEach(attrName => {
            exprToSet(xdata, host, attrData[attrName], val => {
                ele.setAttribute(attrName, val);
            });
        })
    });

    getCanRenderEles(content, "[x-prop]").forEach(ele => {
        const propData = JSON.parse(ele.getAttribute('x-prop'));
        const xEle = createXEle(ele);

        Object.keys(propData).forEach(propName => {
            exprToSet(xdata, host, propData[propName], val => {
                xEle[propName] = val;
            });
        });
    });

    // if元素渲染
    getCanRenderEles(content, '[x-if]').forEach(ele => {
        const expr = ele.getAttribute('x-if');

        // 定位文本元素
        let {
            marker,
            parent
        } = postionNode(ele);

        // 生成的目标元素
        let targetEle = null;

        exprToSet(xdata, host, expr, val => {
            if (val && !targetEle) {
                // 添加元素
                targetEle = $(ele.content.children[0].outerHTML).ele;

                // parent.insertBefore(targetEle, marker);
                parent.replaceChild(targetEle, marker);

                // 重新渲染
                renderTemp({
                    host,
                    xdata,
                    content: targetEle,
                    temps
                });
            } else if (targetEle) {
                // 去除数据绑定
                // removeElementBind(targetEle);

                // 删除元素
                // targetEle.parentNode.removeChild(targetEle);
                parent.replaceChild(marker, targetEle);

                targetEle = null;
            }
        });
    });

    getCanRenderEles(content, '[x-fill]').forEach(ele => {
        const fillData = JSON.parse(ele.getAttribute("x-fill"));

        const container = ele;

        // 获取填充数组的函数
        container._getFillArr = () => xdata[propName];

        let [tempName, propName] = fillData;

        let old_xid;

        exprToSet(xdata, host, propName, targetArr => {
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
                targetArr.forEach((data, index) => {
                    const itemEle = createFillItem({
                        // owner: targetArr,
                        host,
                        data,
                        index,
                        tempData,
                        temps
                    });

                    // 添加到容器内
                    container.appendChild(itemEle.ele);
                });

                old_xid = targetArr.xid;
            } else {
                const childs = Array.from(container.children);
                const oldArr = childs.map(ele => {
                    const {
                        $data
                    } = ele.__fill_item;

                    // 将不存在的元素删除
                    if (!targetArr.includes($data)) {
                        container.removeChild(ele);
                    }

                    return $data;
                });

                // 即将用于重构的元素数组
                const new_childs = [];

                // 位移并将新对象重新创建元素绑定
                targetArr.forEach((data, index) => {
                    let oldIndex = oldArr.indexOf(data);
                    if (oldIndex > -1) {
                        // 只是换位置的
                        new_childs.push(childs[oldIndex]);
                    } else {
                        // 需要新增的
                        let newItem = createFillItem({
                            // owner: targetArr,
                            host,
                            data,
                            index,
                            tempData,
                            temps
                        });

                        new_childs.push(newItem.ele);
                    }
                });

                rebuildXEleArray(container, new_childs);
            }
        });
    });
}

// 生成fillItem元素
const createFillItem = ({
    // owner,
    host,
    data,
    index,
    tempData,
    temps
}) => {
    const itemEle = createXEle(parseStringToDom(tempData.code)[0]);

    const itemData = {
        get $host() {
            return host;
        },
        get $data() {
            return data;
        },
        get $index() {
            // return owner.indexOf(data);
            const {
                parent
            } = itemEle;

            if (parent) {
                return parent.ele._getFillArr().indexOf(data);
            } else {
                return index;
            }
        }
    };

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
    register
});