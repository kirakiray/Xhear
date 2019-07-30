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
// // XhearElement寄存在element内的函数寄宿对象key
// const XHEAREVENT = "_xevent_" + getRandomId();
// // xhearElement初始化存放的变量key
// const XHEARELEMENT = "_xhearEle_" + getRandomId();
// // 属于可动变量的key组合
// const EXKEYS = "_exkeys_" + getRandomId();
// const ATTACHED = "_attached_" + getRandomId();
// const DETACHED = "_detached_" + getRandomId();

// XhearElement寄存在element内的函数寄宿对象key
const XHEAREVENT = Symbol("xhearEvents");
// xhearElement初始化存放的变量key
const XHEARELEMENT = Symbol("xhearElement");
// 属于可动变量的key组合
const EXKEYS = Symbol("exkeys");
const ATTACHED = Symbol("attached");
const DETACHED = Symbol("detached");

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
        // 克隆一份，去除数字
        let cloneData = {};

        Object.keys(objData).forEach(k => {
            // 非数字和非xvele tag
            if (k !== "xvele" && k !== "tag" && /\D/.test(k)) {
                cloneData[k] = objData[k];
            }
        });

        ele.setAttribute('xv-ele', "");

        // 数据代入渲染
        renderEle(ele, cloneData);
        // renderEle(ele);

        xhearEle = createXHearElement(ele);

        // 数据合并
        // xhearEle[EXKEYS].forEach(k => {
        //     let val = objData[k];
        //     !isUndefined(val) && (xhearEle[k] = val);
        // });
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