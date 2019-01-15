((glo) => {
    "use strict";

    // 获取随机id
const getRandomId = () => Math.random().toString(32).substr(2);
let objectToString = Object.prototype.toString;
const getType = value => objectToString.call(value).toLowerCase().replace(/(\[object )|(])/g, '');
const isUndefined = val => val === undefined;
// 克隆object
const cloneObject = obj => JSON.parse(JSON.stringify(obj));

// 设置不可枚举的方法
const setNotEnumer = (tar, obj) => {
    for (let k in obj) {
        defineProperty(tar, k, {
            // enumerable: false,
            writable: true,
            value: obj[k]
        });
    }
}

let {
    defineProperty,
    defineProperties,
    assign
} = Object;

//改良异步方法
const nextTick = (() => {
    let isTick = false;
    let nextTickArr = [];
    return (fun) => {
        if (!isTick) {
            isTick = true;
            setTimeout(() => {
                for (let i = 0; i < nextTickArr.length; i++) {
                    nextTickArr[i]();
                }
                nextTickArr = [];
                isTick = false;
            }, 0);
        }
        nextTickArr.push(fun);
    };
})();

// common
// XhearElement寄存在element内的函数寄宿对象key
const XHEAREVENT = "_xevent_" + getRandomId();
// xhearElement初始化存放的变量key
const XHEARELEMENT = "_xhearEle_" + getRandomId();
// 属于可动变量的key组合
const EXKEYS = "_exkeys_" + getRandomId();
const ATTACHED = "_attached_" + getRandomId();
const DETACHED = "_detached_" + getRandomId();

// database
// 注册数据
const regDatabase = new Map();

// 可以走默认setter的key Map
const defaultKeys = new Set(["display", "text", "html", "style"]);

// business function
// 获取 content 容器
const getContentEle = (tarEle) => {
    let contentEle = tarEle;

    // 判断是否xvRender
    while (contentEle.xvRender) {
        let xhearEle = contentEle[XHEARELEMENT];

        if (xhearEle) {
            let {
                $content
            } = xhearEle;

            if ($content) {
                contentEle = $content.ele;
            } else {
                break;
            }
        }
    }

    return contentEle;
}

// 获取父容器
const getParentEle = (tarEle) => {
    let {
        parentElement
    } = tarEle;

    if (!parentElement) {
        return;
    }

    while (parentElement.hostId) {
        parentElement = parentElement[XHEARELEMENT].$host.ele;
    }

    return parentElement;
}

// 判断元素是否符合条件
const meetsEle = (ele, expr) => {
    if (ele === expr) {
        return !0;
    }
    let fadeParent = document.createElement('div');
    if (ele === document) {
        return false;
    }
    fadeParent.appendChild(ele.cloneNode(false));
    return !!fadeParent.querySelector(expr);
}

// 转换元素
const parseStringToDom = (str) => {
    let par = document.createElement('div');
    par.innerHTML = str;
    let childs = Array.from(par.childNodes);
    return childs.filter(function (e) {
        if (!(e instanceof Text) || (e.textContent && e.textContent.trim())) {
            par.removeChild(e);
            return e;
        }
    });
};

// 转换 tag data 到 element
const parseDataToDom = (objData) => {
    if (!objData.tag) {
        console.error("this data need tag =>", objData);
        throw "";
    }

    // 生成element
    let ele = document.createElement(objData.tag);

    // 添加数据
    objData.class && ele.setAttribute('class', objData.class);
    objData.text && (ele.textContent = objData.text);
    if (objData.data) {
        let {
            data
        } = objData;

        Object.keys(data).forEach(k => {
            let val = data[k];
            ele.dataset[k] = val;
        });
    }

    // 判断是否xv-ele
    let {
        xvele
    } = objData;

    let xhearEle;

    if (xvele) {
        ele.setAttribute('xv-ele', "");
        renderEle(ele);
        xhearEle = createXHearElement(ele);

        // 数据合并
        xhearEle[EXKEYS].forEach(k => {
            let val = objData[k];
            !isUndefined(val) && (xhearEle[k] = val);
        });
    }

    // 填充内容
    let akey = 0;
    while (akey in objData) {
        // 转换数据
        let childEle = parseDataToDom(objData[akey]);

        if (xhearEle) {
            let {
                $content
            } = xhearEle;

            if ($content) {
                $content.ele.appendChild(childEle);
            }
        } else {
            ele.appendChild(childEle);
        }
        akey++;
    }

    return ele;
}

// 将element转换成xhearElement
const createXHearElement = (ele) => {
    let xhearEle = ele[XHEARELEMENT];
    if (!xhearEle) {
        xhearEle = new XhearElement(ele);
        ele[XHEARELEMENT] = xhearEle;
    }
    return xhearEle;
}

// 渲染所有xv-ele
const renderAllXvEle = (ele) => {
    // 判断内部元素是否有xv-ele
    let eles = ele.querySelectorAll('[xv-ele]');
    Array.from(eles).forEach(e => {
        renderEle(e);
    });

    let isXvEle = ele.getAttribute('xv-ele');
    if (!isUndefined(isXvEle) && isXvEle !== null) {
        renderEle(ele);
    }
}


// 转化成XhearElement
const parseToXHearElement = expr => {
    if (expr instanceof XhearElement) {
        return expr;
    }

    let reobj;

    // expr type
    switch (getType(expr)) {
        case "object":
            reobj = parseDataToDom(expr);
            reobj = createXHearElement(reobj);
            break;
        case "string":
            expr = parseStringToDom(expr)[0];
        default:
            if (expr instanceof Element) {
                renderAllXvEle(expr);
                reobj = createXHearElement(expr);
            }
    }

    return reobj;
}

    

// common
// 事件寄宿对象key
const EVES = "_eves_" + getRandomId();
// 是否在数组方法执行中key
const RUNARRMETHOD = "_runarrmethod_" + getRandomId();
// 存放modifyId的寄宿对象key
const MODIFYIDHOST = "_modify_" + getRandomId();
// modifyId打扫器寄存变量
const MODIFYTIMER = "_modify_timer_" + getRandomId();
// watch寄宿对象
const WATCHHOST = "_watch_" + getRandomId();
// 同步数据寄宿对象key
const SYNCHOST = "_synchost_" + getRandomId();

// business function
let isXData = obj => obj instanceof XData;

// 按条件判断数据是否符合条件
const conditData = (exprKey, exprValue, exprType, exprEqType, tarData) => {
    let reData = 0;

    // 搜索数据
    switch (exprType) {
        case "keyValue":
            let tarValue = tarData[exprKey];
            switch (exprEqType) {
                case "=":
                    if (tarValue == exprValue) {
                        reData = 1;
                    }
                    break;
                case ":=":
                    if (isXData(tarValue) && tarValue.findIndex(e => e == exprValue) > -1) {
                        reData = 1;
                    }
                    break;
                case "*=":
                    if (getType(tarValue) == "string" && tarValue.search(exprValue) > -1) {
                        reData = 1;
                    }
                    break;
                case "~=":
                    if (getType(tarValue) == "string" && tarValue.split(' ').findIndex(e => e == exprValue) > -1) {
                        reData = 1;
                    }
                    break;
            }
            break;
        case "hasValue":
            switch (exprEqType) {
                case "=":
                    if (Object.values(tarData).findIndex(e => e == exprValue) > -1) {
                        reData = 1;
                    }
                    break;
                case ":=":
                    Object.values(tarData).some(tarValue => {
                        if (isXData(tarValue) && tarValue.findIndex(e => e == exprValue) > -1) {
                            reData = 1;
                            return true;
                        }
                    });
                    break;
                case "*=":
                    Object.values(tarData).some(tarValue => {
                        if (getType(tarValue) == "string" && tarValue.search(exprValue) > -1) {
                            reData = 1;
                            return true;
                        }
                    });
                    break;
                case "~=":
                    Object.values(tarData).some(tarValue => {
                        if (getType(tarValue) == "string" && tarValue.split(' ').findIndex(e => e == exprValue) > -1) {
                            reData = 1;
                            return true;
                        }
                    });
                    break;
            }
            break;
        case "hasKey":
            if (tarData.hasOwnProperty(exprKey)) {
                reData = 1;
            }
            break;
    }

    return reData;
}

// 查找数据
let seekData = (data, exprObj) => {
    let arr = [];

    // 关键数据
    let exprKey = exprObj.k,
        exprValue = exprObj.v,
        exprType = exprObj.type,
        exprEqType = exprObj.eqType;

    Object.keys(data).forEach(k => {
        let tarData = data[k];

        if (isXData(tarData)) {
            // 判断是否可添加
            let canAdd = conditData(exprKey, exprValue, exprType, exprEqType, tarData);

            // 允许就添加
            canAdd && arr.push(tarData);

            // 查找子项
            let newArr = seekData(tarData, exprObj);
            arr.push(...newArr);
        }
    });
    return arr;
}

// 生成xdata对象
const createXData = (obj, options) => {
    let redata = obj;
    switch (getType(obj)) {
        case "object":
        case "array":
            redata = new XData(obj, options);
            break;
    }

    return redata;
};

// 清除xdata的方法
let clearXData = (xdata) => {
    if (!isXData(xdata)) {
        return;
    }
    // 干掉parent
    if (xdata.parent) {
        xdata.parent = null;
    }
    // 改变状态
    xdata.status = "destory";
    // 去掉hostkey
    xdata.hostkey = null;

    // 开始清扫所有绑定
    // 先清扫 sync
    for (let d of xdata[SYNCHOST].keys()) {
        xdata.unsync(d);
    }

    // 清扫 watch
    xdata[WATCHHOST].clear();

    // 清扫 on
    xdata[EVES].clear();

    xdata[MODIFYIDHOST].clear();
}

// virData用的数据映射方法
const mapData = (data, options) => {
    if (!(data instanceof Object)) {
        return data;
    }

    let {
        key,
        type,
        mapping
    } = options;

    switch (type) {
        case "mapKey":
            Object.keys(data).forEach(k => {
                let val = data[k];
                if (mapping[k]) {
                    data[mapping[k]] = val;
                    delete data[k];
                }
                switch (getType(val)) {
                    case "object":
                        mapData(val, options);
                        break;
                }
            });
            break;
        case "mapValue":
            Object.keys(data).forEach(k => {
                let val = data[k];
                if (k == key && mapping[val]) {
                    data[key] = mapping[val];
                }
                switch (getType(val)) {
                    case "object":
                        mapData(val, options);
                        break;
                }
            });
            break
    }
}

    function XData(obj, options = {}) {
    let proxyThis = new Proxy(this, XDataHandler);
    // let proxyThis = this;

    // 数组的长度
    let length = 0;

    // 数据合并
    Object.keys(obj).forEach(k => {
        // 值
        let value = obj[k];

        if (!/\D/.test(k)) {
            // 数字key
            k = parseInt(k);

            if (k >= length) {
                length = k + 1;
            }
        }

        // 设置值
        this[k] = createXData(value, {
            parent: proxyThis,
            hostkey: k
        });
    });

    let opt = {
        // status: "root",
        // 设置数组长度
        length,
        // 事件寄宿对象
        [EVES]: new Map(),
        // modifyId存放寄宿对象
        [MODIFYIDHOST]: new Set(),
        // modifyId清理器的断定变量
        [MODIFYTIMER]: 0,
        // watch寄宿对象
        [WATCHHOST]: new Map(),
        // 同步数据寄宿对象
        [SYNCHOST]: new Map()
    };

    // 设置不可枚举数据
    setNotEnumer(this, opt);

    // 设置专属值
    defineProperties(this, {
        status: {
            writable: true,
            value: options.parent ? "binding" : "root"
        },
        parent: {
            writable: true,
            value: options.parent
        },
        hostkey: {
            writable: true,
            value: options.hostkey
        }
    });

    return proxyThis;
}

let XDataFn = XData.prototype = {};


function XDataEvent(type, target) {
    let enumerable = true;
    defineProperties(this, {
        type: {
            enumerable,
            value: type
        },
        keys: {
            enumerable,
            value: []
        },
        target: {
            enumerable,
            value: target
        },
        bubble: {
            enumerable,
            writable: true,
            value: true
        },
        cancel: {
            enumerable,
            writable: true,
            value: false
        },
        currentTarget: {
            enumerable,
            writable: true,
            value: target
        }
    });
}

defineProperties(XDataEvent.prototype, {
    // trend数据，用于给其他数据同步用的
    trend: {
        get() {
            let {
                modify
            } = this;

            if (!modify) {
                return;
            }

            let reobj = {
                genre: modify.genre,
                keys: this.keys.slice()
            };

            // 设置fromKey
            defineProperties(reobj, {
                "oldVal": {
                    value: modify.oldVal
                },
                "fromKey": {
                    get() {
                        let fromKey = this.keys[0];
                        return isUndefined(fromKey) ? modify.key : fromKey;
                    },
                    enumerable: true
                }
            });

            switch (modify.genre) {
                case "arrayMethod":
                    var {
                        methodName,
                        args,
                        modifyId
                    } = modify;

                    // 修正args，将XData还原成object对象
                    args = args.map(e => {
                        if (isXData(e)) {
                            return e.object;
                        }
                        return e;
                    });

                    assign(reobj, {
                        methodName,
                        args,
                        modifyId
                    });
                    break;
                default:
                    var {
                        value,
                        modifyId
                    } = modify;

                    if (isXData(value)) {
                        value = value.object;
                    }
                    assign(reobj, {
                        key: modify.key,
                        value,
                        modifyId
                    });
                    break;
            }

            return Object.freeze(reobj);
        }
    }
});

    // 获取事件数组
const getEvesArr = (tar, eventName) => {
    let eves = tar[EVES];
    let tarSetter = eves.get(eventName);

    if (!tarSetter) {
        tarSetter = new Set();
        eves.set(eventName, tarSetter);
    }

    return tarSetter;
};

setNotEnumer(XDataFn, {
    // 事件注册
    on(eventName, callback, data) {
        let count;
        // 判断是否对象传入
        if (getType(eventName) == "object") {
            let eveONObj = eventName;
            eventName = eveONObj.event;
            callback = eveONObj.callback;
            data = eveONObj.data;
            count = eveONObj.count;
        }

        // 设置数量
        (isUndefined(count)) && (count = Infinity);

        // 分解id参数
        let spIdArr = eventName.split('#');
        let eventId;
        if (1 in spIdArr) {
            eventId = spIdArr[1];
            eventName = spIdArr[0];
        }

        // 获取事件寄宿对象
        let eves = getEvesArr(this, eventName);

        if (!isUndefined(eventId)) {
            // 判断是否存在过这个id的事件注册过
            // 注册过这个id的把旧的删除
            Array.from(eves).some((opt) => {
                // 想等值得删除
                if (opt.eventId === eventId) {
                    eves.delete(opt);
                    return true;
                }
            });
        }

        // 事件数据记录
        callback && eves.add({
            eventName,
            callback,
            data,
            eventId,
            count
        });

        return this;
    },
    // 注册触发一次的事件
    one(eventName, callback, data) {
        if (getType(eventName) == "object") {
            eventName.count = 1;
            this.on(eventName);
        } else {
            this.on({
                event: eventName,
                callback,
                data,
                count: 1
            });
        }
        return this;
    },
    off(eventName, callback) {
        // 判断是否对象传入
        if (getType(eventName) == "object") {
            let eveONObj = eventName;
            eventName = eveONObj.event;
            callback = eveONObj.callback;
        }
        let eves = getEvesArr(this, eventName);
        Array.from(eves).some((opt) => {
            // 想等值得删除
            if (opt.callback === callback) {
                eves.delete(opt);
                return true;
            }
        });
        return this;
    },
    emit(eventName, emitData) {
        let eves, eventObj;

        if (eventName instanceof XDataEvent) {
            // 直接获取对象
            eventObj = eventName;

            // 修正事件名变量
            eventName = eventName.type;
        } else {
            // 生成emitEvent对象
            eventObj = new XDataEvent(eventName, this);
        }

        // 修正currentTarget
        eventObj.currentTarget = this;

        // 获取事件队列数组
        eves = getEvesArr(this, eventName);

        // 事件数组触发
        Array.from(eves).some((opt) => {
            // 触发callback
            // 如果cancel就不执行了
            if (eventObj.cancel) {
                return true;
            }

            // 根据count运行函数
            // 为插件行为提供一个暂停运行的方式
            // 添加数据
            let args = [eventObj];
            !isUndefined(opt.data) && (eventObj.data = opt.data);
            !isUndefined(opt.eventId) && (eventObj.eventId = opt.eventId);
            eventObj.count = opt.count;
            !isUndefined(emitData) && (args.push(emitData));

            // 添加事件插件机制
            let isRun = !opt.before ? 1 : opt.before({
                self: this,
                event: eventObj,
                emitData
            });

            isRun && opt.callback.apply(this, args);

            // 添加事件插件机制
            opt.after && opt.after({
                self: this,
                event: eventObj,
                emitData
            });

            // 删除多余数据
            delete eventObj.data;
            delete eventObj.eventId;
            delete eventObj.count;

            // 递减
            opt.count--;

            if (opt.count <= 0) {
                eves.delete(opt);
            }
        });

        // 冒泡触发
        if (eventObj.bubble && !eventObj.cancel) {
            let {
                parent
            } = this;
            if (parent) {
                eventObj.keys.unshift(this.hostkey);
                parent.emit(eventObj, emitData);
            }
        }

        return this;
    }
});

    // 主体entrend方法
const entrend = (options) => {
    let {
        target,
        key,
        value,
        receiver,
        modifyId,
        genre
    } = options;

    // 判断modifyId
    if (!modifyId) {
        // 生成随机modifyId
        modifyId = getRandomId();
    } else {
        // 查看是否已经存在这个modifyId了，存在就不折腾
        if (receiver[MODIFYIDHOST].has(modifyId)) {
            return true;
        };
    }

    // 自身添加modifyId
    receiver[MODIFYIDHOST].add(modifyId);

    // 准备打扫函数
    clearModifyIdHost(receiver);

    // 返回的数据
    let reData = true;

    // 事件实例生成
    let eveObj = new XDataEvent('update', receiver);

    switch (genre) {
        case "handleSet":
            // 获取旧的值
            var oldVal = target[key];

            // 如果相等的话，就不要折腾了
            if (oldVal === value) {
                return true;
            }

            // 如果value是XData就删除原来的数据，自己变成普通对象
            if (isXData(value)) {
                let valueObject = value.object;
                value.remove();
                value = valueObject
            }

            let isFirst;
            // 判断是否初次设置
            if (!target.hasOwnProperty(key)) {
                isFirst = 1;
            }

            // 设置值
            target[key] = createXData(value, {
                parent: receiver,
                hostkey: key
            });

            // 添加修正数据
            eveObj.modify = {
                // change 改动
                // set 新增值
                genre: isFirst ? "new" : "change",
                key,
                value,
                oldVal,
                modifyId
            };
            break;
        case "handleDelete":
            // 没有值也不折腾了
            if (!target.hasOwnProperty(key)) {
                return true;
            }

            // 获取旧的值
            var oldVal = target[key];

            // 删除值
            delete target[key];

            // 清理数据
            clearXData(oldVal);

            // 添加修正数据
            eveObj.modify = {
                // change 改动
                // set 新增值
                genre: "delete",
                key,
                oldVal,
                modifyId
            };
            break;
        case "arrayMethod":
            let {
                methodName,
                args
            } = options;

            // 根据方法对新添加参数修正
            switch (methodName) {
                case "splice":
                case "push":
                case "unshift":
                    args = args.map(e => {
                        if (isXData(e)) {
                            // 是xdata的话，干掉原来的数据
                            if (!e.parent) {
                                return e;
                            }
                            let eObj = e.object;
                            e.remove();
                            e = eObj;
                        }
                        return createXData(e);
                    });
            }

            // 设置不可执行setHandler
            receiver[RUNARRMETHOD] = 1;

            // 对sort方法要特殊处理，已应对sort函数参数的问题
            if (methodName == "sort" && !(args[0] instanceof Array)) {
                // 备份
                let backupTarget = receiver.slice();

                // 运行方法
                reData = arrayFn[methodName].apply(receiver, args);
                let backupReData = reData.slice();

                // 转换成数组
                let newArg0 = [],
                    putId = getRandomId();
                backupTarget.forEach(e => {
                    // 查找id
                    let id = backupReData.indexOf(e);

                    // 清空相应的数组内数据
                    backupReData[id] = putId;

                    // 加入新数组
                    newArg0.push(id);
                });

                // 修正参数
                args = [newArg0];
            } else {
                // 运行方法
                reData = arrayFn[methodName].apply(receiver, args);
            }

            // 复原状态
            delete receiver[RUNARRMETHOD];

            // 根据方法是否清除返回的数据
            switch (methodName) {
                case "splice":
                case "pop":
                case "shift":
                    // 清理被裁剪的数据
                    reData.forEach(e => {
                        clearXData(e);
                    });
                    break;
            }

            // 添加修正数据
            eveObj.modify = {
                genre: "arrayMethod",
                methodName,
                modifyId,
                args
            };

            break;
    }

    receiver.emit(eveObj);

    return reData;
}

// 清理modifyIdHost的方法，每次清理一半，少于2个就一口气清理
const clearModifyIdHost = (xdata) => {
    // 判断是否开始打扫了
    if (xdata[MODIFYTIMER]) {
        return;
    }

    // 琐起清洁器
    xdata[MODIFYTIMER] = 1;

    let clearFunc = () => {
        // 获取存量长度
        let {
            size
        } = xdata[MODIFYIDHOST];

        if (size > 10) {
            // 清理一半数量，从新跑回去清理函数
            let halfSzie = Math.floor(size / 2);

            // 清理一半数量的modifyId
            xdata[MODIFYIDHOST].forEach((e, i) => {
                if (i < halfSzie) {
                    xdata[MODIFYIDHOST].delete(e);
                }
            });

            // 计时递归
            setTimeout(clearFunc, 3000);
        } else {
            // 小于两个就清理掉啦
            // 改成小于10个就不理了
            // xdata[MODIFYIDHOST].clear();
            // 解锁
            xdata[MODIFYTIMER] = 0;
            // 清理函数
            clearFunc = null;
        }
    }

    setTimeout(clearFunc, 10000);
}

    // 数组通用方法
// 可运行的方法
['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'map', 'slice', 'some', 'indexOf', 'includes', 'join'].forEach(methodName => {
    let arrayFnFunc = Array.prototype[methodName];
    if (arrayFnFunc) {
        defineProperty(XDataFn, methodName, {
            writable: true,
            value(...args) {
                return arrayFnFunc.apply(this, args);
            }
        });
    }
});

// 设置 ArrayFn
const arrayFn = {};

// 几个会改变数据结构的方法
['pop', 'push', 'reverse', 'splice', 'shift', 'unshift', 'sort'].forEach(methodName => {
    // 原来的数组方法
    let arrayFnFunc = Array.prototype[methodName];

    arrayFn[methodName] = arrayFnFunc;

    // 存在方法的情况下加入
    if (arrayFnFunc) {
        defineProperty(XDataFn, methodName, {
            writable: true,
            value(...args) {
                // 获取到_entrendModifyId就立刻删除
                let modifyId = this._entrendModifyId;
                if (modifyId) {
                    delete this._entrendModifyId;
                }

                // 其他方式就要通过主体entrend调整
                return entrend({
                    genre: "arrayMethod",
                    args,
                    methodName,
                    modifyId,
                    receiver: this
                });
            }
        });
    }
});

assign(arrayFn, {
    // 改良的sort方法，可以直接传入置换顺序对象
    sort(func) {
        if (func instanceof Array) {
            let backupThis = this.slice();

            func.forEach((k, i) => {
                this[k] = backupThis[i];
            });

            return this;
        } else {
            // 参数和原生sort无区别，直接代入
            return Array.prototype.sort.call(this, func);
        }
    }
});

    // 私有属性正则
const PRIREG = /^_.+|^parent$|^hostkey$|^status$|^length$/;
let XDataHandler = {
    set(target, key, value, receiver) {
        // 私有变量直接通过
        // 数组函数运行中直接通过
        if (PRIREG.test(key)) {
            return Reflect.set(target, key, value, receiver);
        }

        // 数组内组合，修改hostkey和parent
        if (target.hasOwnProperty(RUNARRMETHOD)) {
            if (isXData(value)) {
                value.parent = receiver;
                value.hostkey = key;
                value.status = "binding";
            }
            return Reflect.set(target, key, value, receiver);
        }

        // 获取到_entrendModifyId就立刻删除
        let modifyId = target._entrendModifyId;
        if (modifyId) {
            delete target._entrendModifyId;
        }

        // 其他方式就要通过主体entrend调整
        return entrend({
            genre: "handleSet",
            modifyId,
            target,
            key,
            value,
            receiver
        });
    },
    deleteProperty(target, key) {
        // 私有变量直接通过
        // 数组函数运行中直接通过
        if (/^_.+/.test(key) || target.hasOwnProperty(RUNARRMETHOD)) {
            return Reflect.deleteProperty(target, key);
        }

        // 获取到_entrendModifyId就立刻删除
        let modifyId = target._entrendModifyId;
        if (modifyId) {
            delete target._entrendModifyId;
        }

        // 获取receiver
        let receiver;

        if (target.parent) {
            receiver = target.parent[target.hostkey];
        } else {
            Object.values(target).some(e => {
                if (isXData(e)) {
                    receiver = e.parent;
                    return true;
                }
            });

            if (!receiver) {
                receiver = new Proxy(target, XDataHandler);
            }
        }

        return entrend({
            genre: "handleDelete",
            modifyId,
            target,
            key,
            receiver
        });
    }
};

    setNotEnumer(XDataFn, {
    seek(expr) {
        // 代表式的组织化数据
        let exprObjArr = [];

        let hostKey;
        let hostKeyArr = expr.match(/(^[^\[\]])\[.+\]/);
        if (hostKeyArr && hostKeyArr.length >= 2) {
            hostKey = hostKeyArr[1];
        }

        // 分析expr字符串数据
        let garr = expr.match(/\[.+?\]/g);

        garr.forEach(str => {
            str = str.replace(/\[|\]/g, "");
            let strarr = str.split(/(=|\*=|:=|~=)/);

            let param_first = strarr[0];

            switch (strarr.length) {
                case 3:
                    if (param_first) {
                        exprObjArr.push({
                            type: "keyValue",
                            k: param_first,
                            eqType: strarr[1],
                            v: strarr[2]
                        });
                    } else {
                        exprObjArr.push({
                            type: "hasValue",
                            eqType: strarr[1],
                            v: strarr[2]
                        });
                    }
                    break;
                case 1:
                    exprObjArr.push({
                        type: "hasKey",
                        k: param_first
                    });
                    break;
            }
        });

        // 要返回的数据
        let redata;

        exprObjArr.forEach((exprObj, i) => {
            let exprKey = exprObj.k,
                exprValue = exprObj.v,
                exprType = exprObj.type,
                exprEqType = exprObj.eqType;

            switch (i) {
                case 0:
                    // 初次查找数据
                    redata = seekData(this, exprObj);
                    break;
                default:
                    // 筛选数据
                    redata = redata.filter(tarData => conditData(exprKey, exprValue, exprType, exprEqType, tarData) ? tarData : undefined);
            }
        });

        // hostKey过滤
        if (hostKey) {
            redata = redata.filter(e => (e.hostkey == hostKey) ? e : undefined);
        }

        return redata;
    },
    watch(expr, callback) {
        // 调整参数
        let arg1Type = getType(expr);
        if (/function/.test(arg1Type)) {
            callback = expr;
            expr = "";
        }

        // 根据参数调整类型
        let watchType;

        if (expr == "") {
            watchType = "watchOri";
        } else if (/\[.+\]/.test(expr)) {
            watchType = "seekOri";
        } else {
            watchType = "watchKey";
        }

        // 获取相应队列数据
        let tarExprObj = this[WATCHHOST].get(expr);
        if (!tarExprObj) {
            tarExprObj = new Set();

            this[WATCHHOST].set(expr, tarExprObj);
        }

        // 要保存的对象数据
        let saveObj = {
            modifys: [],
            isNextTick: 0,
            callback,
            // updateFunc
        };

        // 添加保存对象
        tarExprObj.add(saveObj);

        // 更新函数
        let updateFunc;

        // 根据类型调整
        switch (watchType) {
            case "watchOri":
                this.on('update', updateFunc = (e) => {
                    // 添加trend数据
                    saveObj.modifys.push(e.trend);

                    // 判断是否进入nextTick
                    if (saveObj.isNextTick) {
                        return;
                    }

                    // 锁上
                    saveObj.isNextTick = 1;

                    nextTick(() => {
                        // 监听整个数据
                        saveObj.callback.call(this, {
                            modifys: Array.from(saveObj.modifys)
                        });

                        // 事后清空modifys
                        saveObj.modifys.length = 0;

                        // 解锁
                        saveObj.isNextTick = 0;
                    });
                });
                break;
            case "watchKey":
                this.on('update', updateFunc = e => {
                    let {
                        trend
                    } = e;

                    if (trend.fromKey != expr) {
                        return;
                    }

                    // 添加改动
                    saveObj.modifys.push(trend);

                    // 判断是否进入nextTick
                    if (saveObj.isNextTick) {
                        return;
                    }

                    // 锁上
                    saveObj.isNextTick = 1;

                    nextTick(() => {
                        // 获取值
                        let val = this[expr];

                        // 监听整个数据
                        saveObj.callback.call(this, {
                            expr,
                            val,
                            modifys: Array.from(saveObj.modifys)
                        }, val);

                        // 事后清空modifys
                        saveObj.modifys.length = 0;

                        // 解锁
                        saveObj.isNextTick = 0;
                    });
                });
                break;
            case "seekOri":
                // 先记录旧的数据
                let sData = saveObj.oldVals = this.seek(expr);

                this.on('update', updateFunc = e => {
                    // 判断是否进入nextTick
                    if (saveObj.isNextTick) {
                        return;
                    }

                    // 锁上
                    saveObj.isNextTick = 1;

                    nextTick(() => {
                        let {
                            oldVals
                        } = saveObj;

                        let sData = this.seek(expr);

                        // 判断是否相等
                        let isEq = 1;
                        if (sData.length != oldVals.length) {
                            isEq = 0;
                        }
                        isEq && sData.some((e, i) => {
                            if (!(oldVals[i] == e)) {
                                isEq = 0;
                                return true;
                            }
                        });

                        // 不相等就触发callback
                        if (!isEq) {
                            saveObj.callback.call(this, {
                                expr,
                                old: oldVals,
                                val: sData
                            }, sData);
                        }

                        // 替换旧值
                        saveObj.oldVals = sData;

                        // 解锁
                        saveObj.isNextTick = 0;
                    });
                });

                // 执行初始callback
                callback({
                    expr,
                    val: sData
                }, sData);
                break;
        }

        // 设置绑定update的函数
        saveObj.updateFunc = updateFunc;

        // 判断是否expr
        // if (watchType == "seekOri") {
        //     let sData = this.seek(expr);
        //     callback({
        //         expr,
        //         val: sData
        //     }, sData);
        // }
    },
    // 注销watch
    unwatch(expr, callback) {
        // 调整参数
        let arg1Type = getType(expr);
        if (/function/.test(arg1Type)) {
            callback = expr;
            expr = "";
        }

        let tarExprObj = this[WATCHHOST].get(expr);

        if (tarExprObj) {
            // 搜索相应的saveObj
            let saveObj;
            Array.from(tarExprObj).some(e => {
                if (e.callback === callback) {
                    saveObj = e;
                    return;
                }
            });

            if (saveObj) {
                // 去除update监听
                this.off('update', saveObj.updateFunc);

                // 删除对象
                tarExprObj.delete(saveObj);

                // 判断arr是否清空，是的话回收update事件绑定
                if (!tarExprObj.size) {
                    delete this[WATCHHOST].delete(expr);
                }
            } else {
                console.warn(`can't find this watch callback => `, callback);
            }
        }

        return this;
    },
    entrend(options) {
        // 目标数据
        let target = this;

        let {
            modifyId
        } = options;

        if (!modifyId) {
            throw "illegal trend data";
        }

        // 获取target
        options.keys.forEach(k => {
            target = target[k];
        });

        // 添加_entrendModifyId
        target._entrendModifyId = modifyId;

        switch (options.genre) {
            case "arrayMethod":
                target[options.methodName](...options.args);
                break;
            case "delete":
                delete target[options.key];
                break;
            default:
                target[options.key] = options.value;
                break;
        }

        return this;
    },
    // 同步数据的方法
    sync(xdata, options, cover) {
        let optionsType = getType(options);

        let watchFunc, oppWatchFunc;

        switch (optionsType) {
            case "string":
                // 单键覆盖
                if (cover) {
                    xdata[options] = this[options];
                }

                this.watch(watchFunc = e => {
                    e.modifys.forEach(trend => {
                        if (trend.fromKey == options) {
                            xdata.entrend(trend);
                        }
                    });
                });
                xdata.watch(oppWatchFunc = e => {
                    e.modifys.forEach(trend => {
                        if (trend.fromKey == options) {
                            this.entrend(trend);
                        }
                    });
                });
                break;
            case "array":
                // 数组内的键覆盖
                if (cover) {
                    options.forEach(k => {
                        xdata[k] = this[k];
                    });
                }

                this.watch(watchFunc = e => {
                    e.modifys.forEach(trend => {
                        if (options.includes(trend.fromKey)) {
                            xdata.entrend(trend);
                        }
                    });
                });
                xdata.watch(oppWatchFunc = e => {
                    e.modifys.forEach(trend => {
                        if (options.includes(trend.fromKey)) {
                            this.entrend(trend);
                        }
                    });
                });
                break;
            case "object":
                let optionsKeys = Object.keys(options);

                // 映射key来绑定值
                let resOptions = {};

                // 映射对象内的数据合并
                if (cover) {
                    optionsKeys.forEach(k => {
                        let oppK = options[k];
                        xdata[oppK] = this[k];
                        resOptions[oppK] = k;
                    });
                } else {
                    optionsKeys.forEach(k => {
                        resOptions[options[k]] = k;
                    });
                }

                this.watch(watchFunc = e => {
                    e.modifys.forEach(trend => {
                        trend = cloneObject(trend);
                        let keysOne = trend.fromKey;

                        if (options.hasOwnProperty(keysOne)) {
                            if (isUndefined(trend.keys[0])) {
                                trend.key = options[keysOne];
                            } else {
                                trend.keys[0] = options[keysOne];
                            }
                            xdata.entrend(trend);
                        }
                    });
                });

                xdata.watch(watchFunc = e => {
                    e.modifys.forEach(trend => {

                        trend = cloneObject(trend);

                        let keysOne = trend.fromKey;

                        if (resOptions.hasOwnProperty(keysOne)) {
                            if (isUndefined(trend.keys[0])) {
                                trend.key = resOptions[keysOne];
                            } else {
                                trend.keys[0] = resOptions[keysOne];
                            }
                            this.entrend(trend);
                        }
                    });
                });

                break;
            default:
                // undefined
                if (cover) {
                    xdata.extend(this.object);
                }

                this.watch(watchFunc = e => {
                    e.modifys.forEach(trend => {
                        xdata.entrend(trend);
                    });
                });
                xdata.watch(oppWatchFunc = e => {
                    e.modifys.forEach(trend => {
                        this.entrend(trend);
                    });
                });
                break;
        }

        // 双方添加数据对称记录
        this[SYNCHOST].set(xdata, {
            // opp: xdata,
            oppWatchFunc,
            watchFunc
        });
        xdata[SYNCHOST].set(this, {
            // opp: this,
            oppWatchFunc: watchFunc,
            watchFunc: oppWatchFunc
        });

        return this;
    },
    // 注销sync绑定
    unsync(xdataObj) {
        let syncData = this[SYNCHOST].get(xdataObj);

        if (syncData) {
            let {
                oppWatchFunc,
                watchFunc
            } = syncData;

            // 解除绑定的watch函数
            this.unwatch(watchFunc);
            xdataObj.unwatch(oppWatchFunc);
            this[SYNCHOST].delete(xdataObj);
            xdataObj[SYNCHOST].delete(this);
        } else {
            console.warn("not found => ", xdataObj);
        }

        return this;
    },
    virData(options) {
        // 转换为xdata
        let cloneData = this.object;
        mapData(cloneData, options);
        cloneData = createXData(cloneData);

        let {
            mapping,
            type,
            key
        } = options;

        let reserveMapping = {};

        Object.keys(mapping).forEach(k => {
            let k2 = mapping[k];
            !isUndefined(k2) && (reserveMapping[k2] = k);
        });

        let _thisUpdateFunc, selfUpdataFunc;
        switch (type) {
            case "mapKey":
                this.on('update', _thisUpdateFunc = e => {
                    let {
                        trend
                    } = e;

                    trend = cloneObject(trend);

                    // 修正trend的数据
                    if (trend.args) {
                        mapData(trend.args, options);
                    } else if (trend.value) {
                        mapData(trend.value, options);
                    }

                    let tarKey = mapping[trend.key];
                    if (!isUndefined(tarKey)) {
                        // 修正trend数据
                        trend.key = tarKey;
                    }
                    cloneData.entrend(trend);
                });
                cloneData.on('update', selfUpdataFunc = e => {
                    let {
                        trend
                    } = e;

                    trend = cloneObject(trend);

                    if (trend.args) {
                        mapData(trend.args, {
                            type,
                            // key,
                            mapping: reserveMapping
                        });
                    } else if (trend.value) {
                        mapData(trend.value, {
                            type,
                            // key,
                            mapping: reserveMapping
                        });
                    }

                    let tarKey = reserveMapping[trend.key];

                    if (!isUndefined(tarKey)) {
                        trend.key = tarKey;
                    }
                    this.entrend(trend);
                });
                break;
            case "mapValue":
                this.on('update', _thisUpdateFunc = e => {
                    let {
                        trend
                    } = e;

                    trend = cloneObject(trend);

                    // 修正trend的数据
                    if (trend.args) {
                        mapData(trend.args, options);
                    } else if (trend.value) {
                        mapData(trend.value, options);
                    }

                    if (trend.key == key) {
                        let val = trend.value;
                        if (mapping.hasOwnProperty(val)) {
                            // 修正value
                            trend.value = mapping[val];
                        }
                    }

                    // 同步
                    cloneData.entrend(trend);

                });
                cloneData.on('update', selfUpdataFunc = e => {
                    let {
                        trend
                    } = e;

                    trend = cloneObject(trend);

                    if (trend.args) {
                        mapData(trend.args, {
                            type,
                            key,
                            mapping: reserveMapping
                        });
                    } else if (trend.value) {
                        mapData(trend.value, {
                            type,
                            key,
                            mapping: reserveMapping
                        });
                    }

                    if (trend.key == key) {
                        let val = trend.value;
                        if (reserveMapping.hasOwnProperty(val)) {
                            // 修正value
                            trend.value = reserveMapping[val];
                        }
                    }

                    // 同步
                    this.entrend(trend);
                });
                break;
        }

        // 修正remove方法
        defineProperty(cloneData, "remove", {
            value(...args) {
                if (!args.length) {
                    // 确认删除自身，清除this的函数
                    this.off('update', _thisUpdateFunc);
                    cloneData.off('update', selfUpdataFunc);
                    _thisUpdateFunc = selfUpdataFunc = cloneData = null;
                }
                XDataFn.remove.call(cloneData, ...args);
            }
        });

        return cloneData;
    },
    // 删除相应Key的值
    removeByKey(key) {
        // 删除子数据
        if (/\D/.test(key)) {
            // 非数字
            delete this[key];
        } else {
            // 纯数字，术语数组内元素，通过splice删除
            this.splice(parseInt(key), 1);
        }
    },
    // 删除值
    remove(value) {
        if (isUndefined(value)) {
            // 删除自身
            let {
                parent
            } = this;

            if (parent) {
                // 删除
                parent.removeByKey(this.hostkey);
            } else {
                clearXData(this);
            }
        } else {
            if (isXData(value)) {
                (value.parent == this) && this.removeByKey(value.hostkey);
            } else {
                let tarId = this.indexOf(value);
                if (tarId > -1) {
                    this.removeByKey(tarId);
                }
            }
        }
    },
    // push的去重版本
    add(data) {
        !this.includes(data) && this.push(data);
    },
    clone() {
        return createXData(this.object);
    },
    reset(value) {
        let valueKeys = Object.keys(value);

        // 删除本身不存在的key
        Object.keys(this).forEach(k => {
            if (!valueKeys.includes(k) && k !== "length") {
                delete this[k];
            }
        });

        assign(this, value);
        return this;
    },
    extend(...args) {
        assign(this, ...args);
    }
});


defineProperties(XDataFn, {
    // 直接返回object
    "object": {
        get() {
            let obj = {};

            Object.keys(this).forEach(k => {
                let val = this[k];

                if (isXData(val)) {
                    obj[k] = val.object;
                } else {
                    obj[k] = val;
                }
            });

            return obj;
        }
    },
    "string": {
        get() {
            return JSON.stringify(this.object);
        }
    },
    "root": {
        get() {
            let root = this;
            while (root.parent) {
                root = root.parent;
            }
            return root;
        }
    },
    "prev": {
        get() {
            if (!/\D/.test(this.hostkey) && this.hostkey > 0) {
                return this.parent[this.hostkey - 1];
            }
        }
    },
    "next": {
        get() {
            if (!/\D/.test(this.hostkey)) {
                return this.parent[this.hostkey + 1];
            }
        }
    }
});

    

    const XhearElementHandler = {
    get(target, key, receiver) {
        // 判断是否纯数字
        if (/\D/.test(key)) {
            return Reflect.get(target, key, receiver);
        } else {
            // 纯数字就从children上获取
            let ele = getContentEle(receiver.ele).children[key];
            return ele && createXHearElement(ele);
        }
    },
    set(target, key, value, receiver) {
        if (/^_.+/.test(key) || defaultKeys.has(key)) {
            return Reflect.set(target, key, value, receiver);
        }

        // 获取到_entrendModifyId就立刻删除
        let modifyId = target._entrendModifyId;
        if (modifyId) {
            delete target._entrendModifyId;
        }

        // 数字和关键key才能修改
        if (!/\D/.test(key) || target[EXKEYS].has(key)) {
            return xhearEntrend({
                genre: "handleSet",
                modifyId,
                target,
                key,
                value,
                receiver
            });
        }

        // debugger

        return true;

    },
    deleteProperty(target, key) {
        // 私有变量直接通过
        // 数组函数运行中直接通过
        if (/^_.+/.test(key)) {
            return Reflect.deleteProperty(target, key);
        }
        console.error(`you can't use delete with xhearElement`);
        return false;
    }
};

function XhearElement(ele) {
    defineProperties(this, {
        tag: {
            enumerable: true,
            value: ele.tagName.toLowerCase()
        },
        ele: {
            value: ele
        }
    });
    let opt = {
        // status: "root",
        // 设置数组长度
        // length,
        // 事件寄宿对象
        [EVES]: new Map(),
        // modifyId存放寄宿对象
        [MODIFYIDHOST]: new Set(),
        // modifyId清理器的断定变量
        [MODIFYTIMER]: 0,
        // watch寄宿对象
        [WATCHHOST]: new Map(),
        // 同步数据寄宿对象
        [SYNCHOST]: new Map(),
        // ------下面是XhearElement新增的------
        // 实体事件函数寄存
        [XHEAREVENT]: new Map(),
        // 在exkeys内的才能进行set操作
        [EXKEYS]: new Set()
    };

    // 设置不可枚举数据
    setNotEnumer(this, opt);

    // 返回代理后的数据对象
    return new Proxy(this, XhearElementHandler);
}
let XhearElementFn = XhearElement.prototype = Object.create(XDataFn);

defineProperties(XhearElementFn, {
    hostkey: {
        get() {
            return Array.from(this.ele.parentElement.children).indexOf(this.ele);
        }
    },
    parent: {
        get() {
            let parentElement = getParentEle(this.ele);
            if (!parentElement) {
                return;
            }
            return createXHearElement(parentElement);
        }
    },
    // 是否注册的Xele
    xvele: {
        get() {
            let {
                attributes
            } = this.ele;

            return attributes.hasOwnProperty('xv-ele') || attributes.hasOwnProperty('xv-render');
        }
    },
    class: {
        get() {
            return this.ele.classList;
        }
    },
    data: {
        get() {
            return this.ele.dataset;
        }
    },
    object: {
        get() {
            let obj = {
                tag: this.tag
            };

            // 非xvele就保留class属性
            if (!this.xvRender) {
                let classValue = this.ele.classList.value;
                classValue && (obj.class = classValue);
            } else {
                // 获取自定义数据
                let exkeys = this[EXKEYS];
                exkeys && exkeys.forEach(k => {
                    obj[k] = this[k];
                });
                obj.xvele = 1;
            }

            // 自身的children加入
            this.forEach((e, i) => {
                if (e instanceof XhearElement) {
                    obj[i] = e.object;
                } else {
                    obj[i] = e;
                }
            });

            return obj;
        }
    },
    length: {
        get() {
            let contentEle = getContentEle(this.ele);
            return contentEle.children.length;
        }
    },
    // 获取标识元素
    marks: {
        get() {
            // 判断自身是否有shadowId
            let shadowId = this.attr('xv-shadow');

            let obj = {};
            this.queAll('[xv-mark]').forEach(e => {
                if (shadowId !== e.attr('[xv-shadow]')) {
                    return;
                }
                obj[e.attr("xv-mark")] = e;
            });
            return obj;
        }
    }
});

// 重构seekData函数
seekData = (data, exprObj) => {
    let arr = [];

    // 关键数据
    let exprKey = exprObj.k,
        exprValue = exprObj.v,
        exprType = exprObj.type,
        exprEqType = exprObj.eqType;

    let searchFunc = k => {
        let tarData = data[k];

        if (isXData(tarData)) {
            // 判断是否可添加
            let canAdd = conditData(exprKey, exprValue, exprType, exprEqType, tarData);

            // 允许就添加
            canAdd && arr.push(tarData);

            // 查找子项
            let newArr = seekData(tarData, exprObj);
            arr.push(...newArr);
        }
    }

    if (data instanceof XhearElement) {
        // 准备好key
        let exkeys = data[EXKEYS] || [];
        let childKeys = Object.keys(getContentEle(data.ele).children);
        [...exkeys, ...childKeys].forEach(searchFunc);
    } else {
        Object.keys(data).forEach(searchFunc);
    }
    searchFunc = null;
    return arr;
}

// 修正事件方法
setNotEnumer(XhearElementFn, {
    on(...args) {
        let eventName = args[0],
            selector,
            callback,
            data;

        // 判断是否对象传入
        if (getType(eventName) == "object") {
            let eveOnObj = eventName;
            eventName = eveOnObj.event;
            callback = eveOnObj.callback;
            data = eveOnObj.data;
            selector = eveOnObj.selector;
        } else {
            // 判断第二个参数是否字符串，字符串当做selector处理
            switch (getType(args[1])) {
                case "string":
                    selector = args[1];
                    callback = args[2];
                    data = args[3];
                    break;
                default:
                    callback = args[1];
                    data = args[2];
            }

            // 修正参数项
            args = [{
                event: eventName,
                callback,
                data
            }];
        }

        // 判断原生是否有存在注册的函数
        let tarCall = this[XHEAREVENT].get(eventName);
        if (!tarCall) {
            let eventCall;
            // 不存在就注册
            this.ele.addEventListener(eventName, eventCall = (e) => {
                // 阻止掉其他所有的函数监听
                e.stopImmediatePropagation();

                // 事件实例生成
                let target = createXHearElement(e.target);
                let eveObj = new XDataEvent(eventName, target);

                // 添加 originalEvent
                eveObj.originalEvent = e;

                // 添加默认方法
                eveObj.preventDefault = e.preventDefault.bind(e);

                // 判断添加影子ID
                let shadowId = e.target.getAttribute('xv-shadow');
                shadowId && (eveObj.shadow = shadowId);

                target.emit(eveObj);

                return false;
            });
            this[XHEAREVENT].set(eventName, eventCall);
        }

        let reData = XDataFn.on.apply(this, args);

        // 判断有selector，把selector数据放进去
        if (selector) {
            // 获取事件寄宿对象
            let eves = getEvesArr(this, eventName);

            // 遍历函数
            Array.from(eves).some(e => {
                if (e.callback == callback) {
                    // 确认函数，添加before和after方法
                    e.before = (options) => {
                        let eveObj = options.event;
                        let target = eveObj.target;

                        // 目标元素
                        let delegateTarget = target.parents(selector)[0];
                        if (!delegateTarget && target.is(selector)) {
                            delegateTarget = target;
                        }

                        // 判断是否在selector内
                        if (!delegateTarget) {
                            return 0;
                        }

                        // 通过selector验证
                        // 设置两个关键数据
                        assign(eveObj, {
                            selector,
                            delegateTarget
                        });

                        // 返回可运行
                        return 1;
                    }
                    e.after = (options) => {
                        let eveObj = options.event;

                        // 删除无关数据
                        delete eveObj.selector;
                        delete eveObj.delegateTarget;
                    }
                }
            });
        }

        return reData;
    },
    one(...args) {
        let eventName = args[0];
        let reData = XDataFn.one.apply(this, args);

        // 智能清除事件函数
        intelClearEvent(this, eventName);

        return reData;
    },
    off(...args) {
        let eventName = args[0];

        let reData = XDataFn.off.apply(this, args);

        // 智能清除事件函数
        intelClearEvent(this, eventName);

        return reData;
    },
    emit(...args) {
        let eveObj = args[0];

        // 判断是否 shadow元素，shadow元素到根节点就不要冒泡
        if (eveObj instanceof XDataEvent && eveObj.shadow && eveObj.shadow == this.xvRender) {
            // 判断是否update冒泡
            if (eveObj.type == "update") {
                // update就阻止冒泡
                return;
            }

            // 其他事件修正数据后继续冒泡
            // 修正事件对象
            let newEveObj = new XDataEvent(eveObj.type, this);

            // 判断添加影子ID
            let shadowId = this.ele.getAttribute('xv-shadow');
            shadowId && (eveObj.shadow = shadowId);

            let {
                originalEvent,
                preventDefault
            } = eveObj;
            if (originalEvent) {
                assign(newEveObj, {
                    originalEvent,
                    preventDefault,
                    fromShadowEvent: eveObj
                });
            }

            // 替换原来的事件对象
            args = [newEveObj];
        }

        return XDataFn.emit.apply(this, args);
    },
    que(expr) {
        return $.que(expr, this.ele);
    },
    extend(...args) {
        let obj = {};
        assign(obj, ...args);

        // 合并数据
        Object.keys(obj).forEach(k => {
            let val = obj[k];
            let selfVal = this[k];
            if (val !== selfVal) {
                this[k] = val;
            }
        });
    },
    // 根据界面元素上的toData生成xdata实例
    viewData() {
        // 判断自身是否有shadowId
        let shadowId = this.attr('xv-shadow');

        // 生成xdata数据对象
        let xdata = $.xdata({});

        // 获取所有toData元素
        let eles = this.queAll('[xv-vd]');
        eles.forEach(e => {
            if (shadowId !== e.attr('[xv-shadow]')) {
                return;
            }

            // 获取vd内容
            let vd = e.attr('xv-vd');

            if (e.xvele) {
                let syncObj = {};

                // 判断是否有to结构
                if (/ to /.test(vd)) {
                    // 获取分组
                    let vGroup = vd.split(",");
                    vGroup.forEach(g => {
                        // 拆分 to 两边的值
                        let toGroup = g.split("to");
                        if (toGroup.length == 2) {
                            let key = toGroup[0].trim();
                            let toKey = toGroup[1].trim();
                            xdata[toKey] = e[key];
                            syncObj[toKey] = key;
                        }
                    });
                } else {
                    vd = vd.trim();
                    // 设置同步数据
                    xdata[vd] = e.value;
                    syncObj[vd] = "value";
                }

                // 数据同步
                xdata.sync(e, syncObj);
            } else {
                // 普通元素
                let {
                    ele
                } = e;

                if ('checked' in ele) {
                    // 设定值
                    xdata[vd] = ele.checked;

                    // 修正Input
                    xdata.watch(vd, e => {
                        ele.checked = xdata[vd];
                    });
                    ele.addEventListener("change", e => {
                        xdata[vd] = ele.checked;
                    });
                } else {
                    // 设定值
                    xdata[vd] = ele.value;

                    // 修正Input
                    xdata.watch(vd, e => {
                        ele.value = xdata[vd];
                    });
                    ele.addEventListener("change", e => {
                        xdata[vd] = ele.value;
                    });
                    ele.addEventListener("input", e => {
                        xdata[vd] = ele.value;
                    });
                }
            }
        });

        return xdata;
    }
});

// 判断是否要清除注册的事件函数
const intelClearEvent = (_this, eventName) => {
    // 查看是否没有注册的事件函数了，没有就清空call
    let tarEves = _this[EVES][eventName];

    if (tarEves && !tarEves.length) {
        let tarCall = _this[XHEAREVENT].get(eventName);

        // 清除注册事件函数
        _this.ele.removeEventListener(eventName, tarCall);
        _this[XHEAREVENT].delete(eventName);
    }
}

    // xhear数据的entrend入口
const xhearEntrend = (options) => {
    let {
        target,
        key,
        value,
        receiver,
        modifyId,
        genre
    } = options;

    // 判断modifyId
    if (!modifyId) {
        // 生成随机modifyId
        modifyId = getRandomId();
    } else {
        // 查看是否已经存在这个modifyId了，存在就不折腾
        if (receiver[MODIFYIDHOST].has(modifyId)) {
            return true;
        };
    }

    // 自身添加modifyId
    receiver[MODIFYIDHOST].add(modifyId);

    // 准备打扫函数
    clearModifyIdHost(receiver);

    // 返回的数据
    let reData = true;

    // 事件实例生成
    let eveObj = new XDataEvent('update', receiver);

    let {
        ele
    } = receiver;

    // 获取影子id
    let shadowId = ele.getAttribute('xv-shadow');

    // 设置shadowId
    shadowId && (eveObj.shadow = shadowId);

    switch (genre) {
        case "handleSet":
            let oldVal;
            if (/\D/.test(key)) {
                // 替换变量数据
                oldVal = target[key];

                // 一样的值就别折腾
                if (oldVal === value) {
                    return true;
                }

                // 是Object的话，转换成stanz数据
                var afterSetValue = value;
                if (afterSetValue instanceof Object) {
                    afterSetValue = cloneObject(afterSetValue);
                    afterSetValue = createXData(afterSetValue, {
                        parent: receiver,
                        hostkey: key
                    });
                }

                // 替换值
                target[key] = afterSetValue;

            } else {
                // 直接替换相应位置元素
                var afterSetValue = parseToXHearElement(value);

                if (shadowId) {
                    // 存在shadow的情况，添加的新元素也要shadow属性
                    afterSetValue.ele.setAttribute('xv-shadow', shadowId);
                }

                // 获取旧值
                let tarEle = receiver[key];
                if (tarEle) {
                    // 替换相应元素
                    let {
                        parentElement
                    } = tarEle.ele;
                    parentElement.insertBefore(afterSetValue.ele, tarEle.ele);
                    parentElement.removeChild(tarEle.ele);
                } else {
                    // 在后面添加新元素
                    let contentEle = getContentEle(ele);
                    contentEle.appendChild(afterSetValue.ele);
                }

                oldVal = tarEle;
            }

            // 添加修正数据
            eveObj.modify = {
                genre: "change",
                key,
                value,
                oldVal,
                modifyId
            };
            break;
        case "arrayMethod":
            let {
                methodName,
                args
            } = options;

            // 对于新添加的，先转换一下
            switch (methodName) {
                case "splice":
                case "unshift":
                case "push":
                    args = args.map(e => {
                        // 对于已经有组织的人，先脱离组织
                        if (e instanceof XhearElement && e.parent) {
                            e.remove();
                            return e.object;
                        }
                        return e;
                    });
            }

            switch (methodName) {
                case "splice":
                    reData = xhearSplice(receiver, ...args);
                    break;
                case "unshift":
                    xhearSplice(receiver, 0, 0, ...args);
                    reData = receiver.length;
                    break;
                case "push":
                    xhearSplice(receiver, receiver.length, 0, ...args);
                    reData = receiver.length;
                    break;
                case "shift":
                    reData = xhearSplice(receiver, 0, 1, ...args);
                    break;
                case "pop":
                    reData = xhearSplice(receiver, receiver.length - 1, 1, ...args);
                    break;
                case "reverse":
                    var contentEle = getContentEle(receiver.ele);
                    let childs = Array.from(contentEle.children).reverse();
                    childs.forEach(e => {
                        contentEle.appendChild(e);
                    });
                    reData = this;
                    break;
                case "sort":
                    var contentEle = getContentEle(receiver.ele);
                    let arg = args[0];

                    if (arg instanceof Array) {
                        // 先做备份
                        let backupChilds = Array.from(contentEle.children);

                        // 修正顺序
                        arg.forEach(eid => {
                            contentEle.appendChild(backupChilds[eid]);
                        });
                    } else {
                        // 新生成数组
                        let arr = Array.from(contentEle.children).map(e => createXHearElement(e));
                        let backupArr = Array.from(arr);

                        // 执行排序函数
                        arr.sort(arg);

                        // 记录顺序
                        let ids = [],
                            putId = getRandomId();

                        arr.forEach(e => {
                            let id = backupArr.indexOf(e);
                            backupArr[id] = putId;
                            ids.push(id);
                        });

                        // 修正新顺序
                        arr.forEach(e => {
                            contentEle.appendChild(e.ele);
                        });

                        // 重新赋值参数
                        args = [ids];
                    }
                    break;
            }

            // 对于新添加的，先转换一下
            // switch (methodName) {
            //     case "splice":
            //     case "unshift":
            //     case "push":
            //         args = args.map(e => {
            //             // 对于已经有组织的人，先脱离组织
            //             if (e instanceof XhearElement) {
            //                 return e.object;
            //             } else {
            //                 return e;
            //             }
            //         });
            // }

            // 添加修正数据
            eveObj.modify = {
                genre: "arrayMethod",
                methodName,
                modifyId,
                args
            };
            break;
        default:
            return;
    }

    // update事件触发
    receiver.emit(eveObj);

    return reData;
}

    // 可运行的方法
['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'map', 'slice', 'some', 'indexOf', 'includes'].forEach(methodName => {
    let oldFunc = Array.prototype[methodName];
    if (oldFunc) {
        setNotEnumer(XhearElementFn, {
            [methodName](...args) {
                return oldFunc.apply(Array.from(getContentEle(this.ele).children).map(e => createXHearElement(e)), args);
            }
        });
    }
});

['pop', 'push', 'reverse', 'splice', 'shift', 'unshift', 'sort'].forEach(methodName => {
    defineProperty(XhearElementFn, methodName, {
        writable: true,
        value(...args) {
            // 获取到_entrendModifyId就立刻删除
            let modifyId = this._entrendModifyId;
            if (modifyId) {
                delete this._entrendModifyId;
            }

            // 其他方式就要通过主体entrend调整
            return xhearEntrend({
                genre: "arrayMethod",
                args,
                methodName,
                modifyId,
                receiver: this
            });
        }
    });
});

// xhearElement用的splice方法
const xhearSplice = (_this, index, howmany, ...items) => {
    let reArr = [];

    let {
        ele
    } = _this;

    // 确认是否渲染的元素，抽出content元素
    let contentEle = getContentEle(ele);
    let {
        children
    } = contentEle;

    // 先删除后面数量的元素
    while (howmany > 0) {
        let childEle = children[index];

        reArr.push(parseToXHearElement(childEle));

        // 删除目标元素
        contentEle.removeChild(childEle);

        // 数量减少
        howmany--;
    }

    // 定位目标子元素
    let tar = children[index];

    let shadowId = ele.getAttribute('xv-shadow');

    // 添加元素
    if (index >= 0 && tar) {
        items.forEach(e => {
            let nEle = parseToXHearElement(e).ele;
            shadowId && (nEle.setAttribute('xv-shadow', shadowId));
            contentEle.insertBefore(nEle, tar);
        });
    } else {
        items.forEach(e => {
            let nEle = parseToXHearElement(e).ele;
            shadowId && (nEle.setAttribute('xv-shadow', shadowId));
            contentEle.appendChild(nEle);
        });
    }

    return reArr;
}

    defineProperties(XhearElementFn, {
    display: {
        get() {
            return getComputedStyle(this.ele)['display'];
        },
        set(val) {
            this.ele.style['display'] = val;
        }
    },
    text: {
        get() {
            return getContentEle(this.ele).textContent;
        },
        set(d) {
            getContentEle(this.ele).textContent = d;
        }
    },
    html: {
        get() {
            return getContentEle(this.ele).innerHTML;
        },
        set(d) {
            getContentEle(this.ele).innerHTML = d;
        }
    },
    style: {
        get() {
            return this.ele.style;
        },
        set(d) {
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

            assign(style, d);
        }
    },
    css: {
        get() {
            return getComputedStyle(this.ele);
        }
    },
    position: {
        get() {
            return {
                top: this.ele.offsetTop,
                left: this.ele.offsetLeft
            };
        }
    },
    offset: {
        get() {
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
    },
    width: {
        get() {
            return parseInt(getComputedStyle(this.ele).width);
        }
    },
    height: {
        get() {
            return parseInt(getComputedStyle(this.ele).height);
        }
    },
    innerWidth: {
        get() {
            return this.ele.clientWidth;
        }
    },
    innerHeight: {
        get() {
            return this.ele.clientHeight;
        }
    },
    offsetWidth: {
        get() {
            return this.ele.offsetWidth;
        }
    },
    offsetHeight: {
        get() {
            return this.ele.offsetHeight;
        }
    },
    outerWidth: {
        get() {
            let tarSty = getComputedStyle(this.ele);
            return this.ele.offsetWidth + parseInt(tarSty['margin-left']) + parseInt(tarSty['margin-right']);
        }
    },
    outerHeight: {
        get() {
            let tarSty = getComputedStyle(this.ele);
            return this.ele.offsetHeight + parseInt(tarSty['margin-top']) + parseInt(tarSty['margin-bottom']);
        }
    }
});

// 模拟类jQuery的方法
setNotEnumer(XhearElementFn, {
    before(data) {
        if (/\D/.test(this.hostkey)) {
            console.error(`can't use before in this data =>`, this, data);
            throw "";
        }
        this.parent.splice(this.hostkey, 0, data);
        return this;
    },
    after(data) {
        if (/\D/.test(this.hostkey)) {
            console.error(`can't use after in this data =>`, this, data);
            throw "";
        }
        this.parent.splice(this.hostkey + 1, 0, data);
        return this;
    },
    siblings(expr) {
        // 获取父层的所有子元素
        let parChilds = Array.from(this.ele.parentElement.children);

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

        return parChilds.map(e => createXHearElement(e));
    },
    remove() {
        if (/\D/.test(this.hostkey)) {
            console.error(`can't delete this key => ${this.hostkey}`, this, data);
            throw "";
        }
        this.parent.splice(this.hostkey, 1);
    },
    empty() {
        // this.html = "";
        this.splice(0, this.length);
        return this;
    },
    parents(expr) {
        let pars = [];
        let tempTar = this.parent;

        if (!expr) {
            while (tempTar && tempTar.tag != "html") {
                pars.push(tempTar);
                tempTar = tempTar.parent;
            }
        } else {
            if (getType(expr) == "string") {
                while (tempTar && tempTar.tag != "html") {
                    if (meetsEle(tempTar.ele, expr)) {
                        pars.push(tempTar);
                    }
                    tempTar = tempTar.parent;
                }
            } else {
                if (expr instanceof XhearElement) {
                    expr = expr.ele;
                }

                // 从属 element
                if (expr instanceof Element) {
                    while (tempTar && tempTar.tag != "html") {
                        if (tempTar.ele == expr) {
                            return true;
                        }
                        tempTar = tempTar.parent;
                    }
                }

                return false;
            }
        }

        return pars;
    },
    parentsUntil(expr) {
        if (expr) {
            let tempTar = this.parent;
            while (tempTar && tempTar.tag != "html") {
                if (meetsEle(tempTar.ele, expr)) {
                    return tempTar;
                }
                tempTar = tempTar.parent;
            }
        }
    },
    attr(key, value) {
        if (!isUndefined(value)) {
            if (this.xvRender) {
                let regTagData = regDatabase.get(this.tag);
                if (regTagData.attrs.includes(key)) {
                    this[key] = value;
                }
            }
            this.ele.setAttribute(key, value);
        } else if (key instanceof Object) {
            Object.keys(key).forEach(k => {
                this.attr(k, key[k]);
            });
        } else {
            return this.ele.getAttribute(key);
        }
    },
    removeAttr(key) {
        this.ele.removeAttribute(key);
        return this;
    },
    is(expr) {
        return meetsEle(this.ele, expr)
    },
    clone() {
        return $(this.ele.cloneNode(true));
    },
    // like jQuery function find
    que(expr) {
        return $.que(expr, this.ele);
    },
    queAll(expr) {
        return $.queAll(expr, this.ele);
    }
});

    // 元素自定义组件id计数器
let renderEleId = 100;

const renderEle = (ele) => {
    // 获取目标数据
    let tdb = regDatabase.get(ele.tagName.toLowerCase());

    if (!tdb) {
        console.warn('not register tag ' + ele.tagName.toLowerCase());
        return;
    }

    // 判断没有渲染
    if (ele.xvRender) {
        return;
    }

    // 将内容元素拿出来先
    let childs = Array.from(ele.childNodes);

    // 填充代码
    ele.innerHTML = tdb.temp;

    // 生成renderId
    let renderId = renderEleId++;

    // 初始化元素
    let xhearEle = createXHearElement(ele);
    let xhearData;

    // 合并 proto 的函数
    let {
        proto
    } = tdb;
    if (proto) {
        Object.keys(proto).forEach(k => {
            // 获取描述
            let objDesc = Object.getOwnPropertyDescriptor(proto, k);

            let {
                get,
                set,
                value
            } = objDesc;

            if (value) {
                defineProperty(xhearEle, k, {
                    value
                });
            } else {
                defineProperty(xhearEle, k, {
                    get,
                    set
                });
            }

        });
    }

    // 全部设置 shadow id
    Array.from(ele.querySelectorAll("*")).forEach(ele => ele.setAttribute('xv-shadow', renderId));

    // 渲染依赖sx-ele，
    // 让ele使用渲染完成的内元素
    Array.from(ele.querySelectorAll(`[xv-ele][xv-shadow="${renderId}"]`)).forEach(ele => renderEle(ele));

    // 渲染完成，设置renderID
    ele.removeAttribute('xv-ele');
    ele.setAttribute('xv-render', renderId);
    defineProperty(xhearEle, 'xvRender', {
        value: ele.xvRender = renderId
    });

    // 获取 xv-content
    let contentEle = ele.querySelector(`[xv-content][xv-shadow="${renderId}"]`);

    // 判断是否有$content
    if (contentEle) {
        // 初始化一次
        let contentXhearEle = createXHearElement(contentEle);

        defineProperty(xhearEle, '$content', {
            value: contentXhearEle
        });

        defineProperty(contentXhearEle, "$host", {
            value: xhearEle
        });
        // 设置hostId
        contentEle.hostId = renderId;

        // 重新修正contentEle
        while (contentEle.xvRender) {
            // $content元素也是render元素的话，获取最终的content元素
            let content = contentEle[XHEARELEMENT].$content;
            content && (contentEle = content.ele);
        }

        // 将原来的东西塞回去
        childs.forEach(ele => {
            contentEle.appendChild(ele);
        });
    } else {
        // 将原来的东西塞回去
        childs.forEach(e => {
            ele.appendChild(e);
        });
    }

    // 设置其他 xv-tar
    Array.from(ele.querySelectorAll(`[xv-tar][xv-shadow="${renderId}"]`)).forEach(ele => {
        let tarKey = ele.getAttribute('xv-tar');
        defineProperty(xhearEle, "$" + tarKey, {
            value: createXHearElement(ele)
        });
    });

    // 转换 xv-span 元素
    Array.from(ele.querySelectorAll(`xv-span[xv-shadow="${renderId}"]`)).forEach(e => {
        // 替换xv-span
        var textnode = document.createTextNode("");
        e.parentNode.insertBefore(textnode, e);
        e.parentNode.removeChild(e);

        // 文本数据绑定
        var xvkey = e.getAttribute('xvkey');

        // 先设置值，后监听
        xhearEle.watch(xvkey, e => textnode.textContent = xhearEle[xvkey]);
    });

    // 绑定xv-module
    Array.from(ele.querySelectorAll(`[xv-module][xv-shadow="${renderId}"]`)).forEach(mEle => {
        // 获取module名并设置监听
        let mKey = mEle.getAttribute('xv-module');

        // 事件回调函数
        let cFun = e => {
            xhearEle[mKey] = mEle.value;
        }
        // 判断是否xvRender的元素
        if (mEle.xvRender) {
            let sEle = createXHearElement(mEle);
            sEle.watch('value', cFun);
        } else {
            mEle.addEventListener('change', cFun);
            mEle.addEventListener('input', cFun);
        }

        // 反向绑定
        xhearEle.watch(mKey, e => {
            mEle.value = xhearEle[mKey];
        });
    });

    // watch事件绑定
    let watchMap = tdb.watch;
    Object.keys(watchMap).forEach(kName => {
        xhearEle.watch(kName, watchMap[kName]);
    });

    // 要设置的数据
    let rData = assign({}, tdb.data);

    // attrs 上的数据
    tdb.attrs.forEach(attrName => {
        // 获取属性值并设置
        let attrVal = ele.getAttribute(attrName);
        if (!isUndefined(attrVal) && attrVal != null) {
            rData[attrName] = attrVal;
        }

        // 绑定值
        xhearEle.watch(attrName, d => {
            // 绑定值
            ele.setAttribute(attrName, d.val);
        });
    });

    // props 上的数据
    tdb.props.forEach(attrName => {
        let attrVal = ele.getAttribute(attrName);
        (!isUndefined(attrVal) && attrVal != null) && (rData[attrName] = attrVal);
    });

    // 添加_exkey
    let exkeys = Object.keys(rData);
    exkeys.push(...tdb.attrs);
    exkeys.push(...tdb.props);
    exkeys.push(...Object.keys(watchMap));
    exkeys = new Set(exkeys);
    defineProperty(xhearEle, EXKEYS, {
        value: exkeys
    });

    // 合并数据后设置
    exkeys.forEach(k => {
        let val = rData[k];

        // 是Object的话，转换成stanz数据
        if (val instanceof Object) {
            val = cloneObject(val);
            val = createXData(val, {
                parent: xhearEle,
                hostkey: k
            });
        }

        if (!isUndefined(val)) {
            xhearEle[k] = val;
        }
    });

    // 设置 value key
    if (exkeys.has('value')) {
        // 设置value取值
        defineProperty(ele, 'value', {
            get() {
                return xhearEle.value;
            },
            set(d) {
                xhearEle.value = d;
            }
        });
    }

    // 执行inited 函数
    tdb.inited && tdb.inited.call(xhearEle);

    // 添加到document后执行attached函数
    if (tdb.attached && !ele[ATTACHED] && ele.getRootNode() === document) {
        tdb.attached.call(xhearEle);
        ele[ATTACHED] = 1;
    }
}

const register = (options) => {
    let defaults = {
        // 自定义标签名
        tag: "",
        // 正文内容字符串
        temp: "",
        // 属性绑定keys
        attrs: [],
        props: [],
        // 默认数据
        data: {},
        // 直接监听属性变动对象
        watch: {},
        // 原型链上的方法
        // proto: {},
        // 初始化完成后触发的事件
        // inited() {},
        // 添加进document执行的callback
        // attached() {},
        // 删除后执行的callback
        // detached() {}
    };
    assign(defaults, options);

    // 复制数据
    defaults.attrs = defaults.attrs.slice();
    defaults.props = defaults.props.slice();
    defaults.data = cloneObject(defaults.data);
    defaults.watch = assign({}, defaults.watch);

    if (defaults.temp) {
        let {
            temp
        } = defaults;

        // 判断temp有内容的话，就必须带上 xv-content
        let tempDiv = document.createElement('div');
        tempDiv.innerHTML = temp;

        let xvcontent = tempDiv.querySelector('[xv-content]');
        if (!xvcontent) {
            console.error(defaults.tag + " need container!", options);
            return;
        }

        // 去除无用的代码（注释代码）
        temp = temp.replace(/<!--.+?-->/g, "");

        //准换自定义字符串数据
        var textDataArr = temp.match(/{{.+?}}/g);
        textDataArr && textDataArr.forEach((e) => {
            var key = /{{(.+?)}}/.exec(e);
            if (key) {
                temp = temp.replace(e, `<xv-span xvkey="${key[1].trim()}"></xv-span>`);
            }
        });

        defaults.temp = temp;
    }

    // 判断是否有attached 或者 detached，有的话初始 全局dom监听事件
    if (defaults.attached || defaults.detached) {
        initDomObserver();
    }

    // 设置映射tag数据
    regDatabase.set(defaults.tag, defaults);

    // 尝试查找页面存在的元素
    Array.from(document.querySelectorAll(defaults.tag + '[xv-ele]')).forEach(e => {
        renderEle(e);
    });
}

// 初始化全局监听dom事件
let isInitDomObserve = 0;
const initDomObserver = () => {
    if (isInitDomObserve) {
        return;
    }
    isInitDomObserve = 1;

    // attached detached 监听
    let observer = new MutationObserver((mutations) => {
        mutations.forEach((e) => {
            let {
                addedNodes,
                removedNodes
            } = e;


            // 监听新增元素
            addedNodes && tachedArrFunc(Array.from(addedNodes), "attached", ATTACHED);

            // 监听去除元素
            removedNodes && tachedArrFunc(Array.from(removedNodes), "detached", DETACHED);
        });
    });
    observer.observe(document.body, {
        attributes: false,
        childList: true,
        characterData: false,
        subtree: true,
    });
}

const tachedArrFunc = (arr, tachedFunName, tachedKey) => {
    arr.forEach(ele => {
        if (ele.xvRender) {
            tatcheTargetFunc(ele, tachedFunName, tachedKey);
        }

        if (ele instanceof Element) {
            // 触发已渲染的attached
            arr.forEach(e => {
                tatcheTargetFunc(ele, tachedFunName, tachedKey);
            });
        }
    });
}

const tatcheTargetFunc = (ele, tachedFunName, tachedKey) => {
    if (!ele.xvRender || ele[tachedKey]) {
        return;
    }
    let tagdata = regDatabase.get(ele.tagName.toLowerCase());
    if (tagdata[tachedFunName]) {
        tagdata[tachedFunName].call(ele, createXHearElement(ele));
        ele[tachedKey] = 1;
    }
}

    // 全局用$
    let $ = (expr) => {
        if (expr instanceof XhearElement) {
            return expr;
        }

        let tar = expr;

        if (getType(expr) === "string" && expr.search("<") === -1) {
            tar = document.querySelector(expr);
        }

        return parseToXHearElement(tar);
    }

    // 暴露到全局
    glo.$ = $;
    assign($, {
        fn: XhearElementFn,
        type: getType,
        init: createXHearElement,
        que: (expr, root = document) => {
            let tar = root.querySelector(expr);
            return tar && createXHearElement(tar);
        },
        queAll: (expr, root = document) => Array.from(root.querySelectorAll(expr)).map(e => createXHearElement(e)),
        xdata: createXData,
        register
    });

    // 添加默认样式
    let mStyle = document.createElement('style');
    mStyle.innerHTML = "[xv-ele]{display:none;}";
    document.head.appendChild(mStyle);

    // 初始化控件
    nextTick(() => {
        Array.from(document.querySelectorAll('[xv-ele]')).forEach(e => {
            renderEle(e);
        });
    });

})(window);