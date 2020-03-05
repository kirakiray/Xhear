// 注册数据
const regDatabase = new Map();

const RUNARRAY = Symbol("runArray");

const ATTRBINDINGKEY = "attr" + getRandomId();

const register = (opts) => {
    let defaults = {
        // 自定义标签名
        tag: "",
        // 正文内容字符串
        temp: "",
        // 和attributes绑定的keys
        attrs: [],
        // 默认数据
        data: {},
        // 直接监听属性变动对象
        watch: {},
        // 原型链上的方法
        // proto: {},
        // 初始化完成后触发的事件
        // ready() {},
        // 添加进document执行的callback
        // attached() {},
        // 删除后执行的callback
        // detached() {}
    };
    Object.assign(defaults, opts);

    // 复制数据
    let attrs = defaults.attrs = defaults.attrs.map(e => attrToProp(e));
    defaults.data = cloneObject(defaults.data);
    defaults.watch = Object.assign({}, defaults.watch);

    // 转换tag
    let tag = defaults.tag = propToAttr(defaults.tag);

    // 自定义元素
    const CustomXhearEle = class extends XhearEle {
        constructor(...args) {
            super(...args);
        }
    }

    defaults.proto && CustomXhearEle.prototype.extend(defaults.proto);

    // 注册自定义元素
    const XhearElement = class extends HTMLElement {
        constructor() {
            super();

            // 删除旧依赖
            delete this.__xhear__;
            let _xhearThis = new CustomXhearEle(this);

            // 设置渲染识别属性
            Object.defineProperty(this, "xvele", {
                value: true
            });
            Object.defineProperty(_xhearThis, "xvele", {
                value: true
            });

            let xvid = this.xvid = "xv" + getRandomId();

            let options = Object.assign({}, defaults);

            // 设置xv-ele
            nextTick(() => this.setAttribute("xv-ele", ""), xvid);

            renderEle(this, options);
            options.ready && options.ready.call(_xhearThis[PROXYTHIS]);

            options.slotchange && _xhearThis.$shadow.on('slotchange', options.slotchange)

            Object.defineProperties(this, {
                [RUNARRAY]: {
                    writable: true,
                    value: 0
                }
            });
        }

        connectedCallback() {
            if (this[RUNARRAY]) {
                return;
            }
            defaults.attached && defaults.attached.call(createXhearProxy(this));
        }

        disconnectedCallback() {
            if (this[RUNARRAY]) {
                return;
            }
            defaults.detached && defaults.detached.call(createXhearProxy(this));
        }

        attributeChangedCallback(name, oldValue, newValue) {
            let xEle = this.__xhear__;
            name = attrToProp(name);
            if (newValue != xEle[name]) {
                xEle[name] = newValue;
            }
        }

        static get observedAttributes() {
            return attrs.map(e => propToAttr(e));
        }
    }

    Object.assign(defaults, {
        XhearElement
    });

    // 设置映射tag数据
    regDatabase.set(defaults.tag, defaults);

    customElements.define(tag, XhearElement);
}

const renderEle = (ele, defaults) => {
    // 初始化元素
    let xhearEle = createXhearEle(ele);

    // 合并 proto
    defaults.proto && xhearEle.extend(defaults.proto);

    let { temp } = defaults;
    let sroot;

    if (temp) {
        // 添加shadow root
        sroot = ele.attachShadow({ mode: "open" });

        // 去除无用的代码（注释代码）
        temp = temp.replace(/<!--.+?-->/g, "");

        // 准换自定义字符串数据
        var textDataArr = temp.match(/{{.+?}}/g);
        textDataArr && textDataArr.forEach((e) => {
            var key = /{{(.+?)}}/.exec(e);
            if (key) {
                temp = temp.replace(e, `<xv-span xvkey="${key[1].trim()}"></xv-span>`);
            }
        });

        // 填充默认内容
        sroot.innerHTML = temp;

        // 设置其他 xv-tar
        queAllToArray(sroot, `[xv-tar]`).forEach(tar => {
            // Array.from(sroot.querySelectorAll(`[xv-tar]`)).forEach(tar => {
            let tarKey = tar.getAttribute('xv-tar');
            Object.defineProperty(xhearEle, "$" + tarKey, {
                get: () => createXhearProxy(tar)
            });
        });

        // 转换 xv-span 元素
        queAllToArray(sroot, `xv-span`).forEach(e => {
            // 替换xv-span
            var textnode = document.createTextNode("");
            e.parentNode.insertBefore(textnode, e);
            e.parentNode.removeChild(e);

            // 文本数据绑定
            var xvkey = e.getAttribute('xvkey');

            // 先设置值，后监听
            xhearEle.watch(xvkey, (e, val) => textnode.textContent = val);
        });

        // :attribute对子元素属性修正方法
        queAllToArray(sroot, "*").forEach(ele => {
            let attrbs = Array.from(ele.attributes);
            let attrOriExpr = '';
            attrbs.forEach(obj => {
                let {
                    name, value
                } = obj;
                let prop = value;
                name = attrToProp(name);

                let colonExecs = /^:(.+)/.exec(name);
                if (colonExecs) {
                    let attr = colonExecs[1];

                    // 判断是否双向绑定
                    let isEachBinding = /^#(.+)/.exec(attr);
                    if (isEachBinding) {
                        attr = isEachBinding[1];
                        isEachBinding = !!isEachBinding;
                    }

                    let watchCall;
                    if (ele.xvele) {
                        watchCall = (e, val) => {
                            if (val instanceof XhearEle) {
                                val = val.Object;
                            }
                            createXhearEle(ele).setData(attr, val);
                        }

                        // 双向绑定
                        if (isEachBinding) {
                            createXhearEle(ele).watch(attr, (e, val) => {
                                xhearEle.setData(prop, val);
                            });
                        }
                    } else {
                        watchCall = (e, val) => {
                            ele.setAttribute(attr, val);
                        };
                    }
                    xhearEle.watch(prop, watchCall)

                    // 删除绑定表达属性
                    ele.removeAttribute(colonExecs[0]);
                    attrOriExpr += `${name}=${value},`;
                }

                if (attrOriExpr) {
                    attrOriExpr = attrOriExpr.slice(0, -1);
                    ele.setAttribute('xv-binding-expr', attrOriExpr);
                }

                let atExecs = /^@(.+)/.exec(name);
                if (atExecs) {
                    // 参数分解
                    let [eventName, ...opts] = atExecs[1].split(".") || "";

                    let functionName = "on";
                    if (opts.includes("once")) {
                        functionName = "one";
                    }

                    // 绑定事件
                    createXhearEle(ele)[functionName](eventName, (event, data) => {
                        if (opts.includes("prevent")) {
                            event.preventDefault();
                        }

                        if (opts.includes("stop")) {
                            event.bubble = false;
                        }

                        xhearEle[prop].call(xhearEle[PROXYTHIS], event, data);
                    });
                }
            });
        });

        // 需要跳过的元素列表
        let xvModelJump = new Set();

        // 绑定 xv-model
        queAllToArray(sroot, `[xv-model]`).forEach(ele => {
            if (xvModelJump.has(ele)) {
                return;
            }

            let modelKey = ele.getAttribute("xv-model");

            switch (ele.tagName.toLowerCase()) {
                case "input":
                    let inputType = ele.getAttribute("type");
                    switch (inputType) {
                        case "checkbox":
                            // 判断是不是复数形式的元素
                            let allChecks = queAllToArray(sroot, `input[type="checkbox"][xv-model="${modelKey}"]`);

                            // 查看是单个数量还是多个数量
                            if (allChecks.length > 1) {
                                allChecks.forEach(checkbox => {
                                    checkbox.addEventListener('change', e => {
                                        let { value, checked } = e.target;

                                        let tarData = xhearEle.getData(modelKey);
                                        if (checked) {
                                            tarData.add(value);
                                        } else {
                                            tarData.delete(value);
                                        }
                                    });
                                });

                                // 添加到跳过列表里
                                allChecks.forEach(e => {
                                    xvModelJump.add(e);
                                })
                            } else {
                                // 单个直接绑定checked值
                                xhearEle.watch(modelKey, (e, val) => {
                                    ele.checked = val;
                                });
                                ele.addEventListener("change", e => {
                                    let { checked } = ele;
                                    xhearEle.setData(modelKey, checked);
                                });
                            }
                            return;
                        case "radio":
                            let allRadios = queAllToArray(sroot, `input[type="radio"][xv-model="${modelKey}"]`);

                            let rid = getRandomId();

                            allRadios.forEach(radioEle => {
                                radioEle.setAttribute("name", `radio_${modelKey}_${rid}`);
                                radioEle.addEventListener("change", e => {
                                    if (radioEle.checked) {
                                        xhearEle.setData(modelKey, radioEle.value);
                                    }
                                });
                            });
                            return;
                    }
                // 其他input 类型继续往下走
                case "textarea":
                    xhearEle.watch(modelKey, (e, val) => {
                        ele.value = val;
                    });
                    ele.addEventListener("input", e => {
                        xhearEle.setData(modelKey, ele.value);
                    });
                    break;
                case "select":
                    xhearEle.watch(modelKey, (e, val) => {
                        ele.value = val;
                    });
                    ele.addEventListener("change", e => {
                        xhearEle.setData(modelKey, ele.value);
                    });
                    break;
                default:
                    // 自定义组件
                    if (ele.xvele) {
                        let cEle = ele.__xhear__;
                        cEle.watch("value", (e, val) => {
                            xhearEle.setData(modelKey, val);
                        });
                        xhearEle.watch(modelKey, (e, val) => {
                            cEle.setData("value", val);
                        });
                    } else {
                        console.warn(`can't xv-model with thie element => `, ele);
                    }
            }
        });
        xvModelJump.clear();
        xvModelJump = null;
    }

    // watch事件绑定
    xhearEle.watch(defaults.watch);

    // 要设置的数据
    let rData = Object.assign({}, defaults.data);

    // attrs 上的数据
    defaults.attrs.forEach(attrName => {
        // 绑定值
        xhearEle.watch(attrName, d => {
            // 绑定值
            ele.setAttribute(propToAttr(attrName), d.val);
        });
    });

    // 添加_exkey
    let canSetKey = Object.keys(rData);
    canSetKey.push(...defaults.attrs);
    canSetKey.push(...Object.keys(defaults.watch));
    canSetKey = new Set(canSetKey);
    canSetKey.forEach(k => {
        // 去除私有属性
        if (/^_.+/.test(k)) {
            canSetKey.delete(k);
        }
    });
    let ck = xhearEle[CANSETKEYS];
    if (!ck) {
        Object.defineProperty(xhearEle, CANSETKEYS, {
            value: canSetKey
        });
    } else {
        canSetKey.forEach(k => ck.add(k))
    }

    // 判断是否有value，进行vaule绑定
    if (canSetKey.has("value")) {
        Object.defineProperty(ele, "value", {
            get() {
                return xhearEle.value;
            },
            set(val) {
                xhearEle.value = val;
            }
        });
    }

    // 合并数据后设置
    Object.keys(rData).forEach(k => {
        let val = rData[k];

        if (!isUndefined(val)) {
            // xhearEle[k] = val;
            xhearEle.setData(k, val);
        }
    });

    // 查找是否有link为完成
    let isSetOne = 0;
    if (sroot) {
        let links = queAllToArray(sroot, `link`);
        if (links.length) {
            Promise.all(links.map(link => new Promise(res => {
                if (link.sheet) {
                    res();
                } else {
                    link.onload = () => {
                        res();
                        link.onload = null;
                    };
                }
            }))).then(() => nextTick(() => ele.setAttribute("xv-ele", 1), ele.xvid))
        } else {
            isSetOne = 1;
        }
    } else {
        isSetOne = 1;
    }

    isSetOne && nextTick(() => ele.setAttribute("xv-ele", 1), ele.xvid);

    xhearEle.trigger('renderend', {
        bubbles: false
    });
}