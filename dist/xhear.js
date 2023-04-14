// xhear - v7.0.0 https://github.com/kirakiray/Xhear  (c) 2018-2023 YAO
parcelRequire=function(e,r,t,n){var i,o="function"==typeof parcelRequire&&parcelRequire,u="function"==typeof require&&require;function f(t,n){if(!r[t]){if(!e[t]){var i="function"==typeof parcelRequire&&parcelRequire;if(!n&&i)return i(t,!0);if(o)return o(t,!0);if(u&&"string"==typeof t)return u(t);var c=new Error("Cannot find module '"+t+"'");throw c.code="MODULE_NOT_FOUND",c}p.resolve=function(r){return e[t][1][r]||r},p.cache={};var l=r[t]=new f.Module(t);e[t][0].call(l.exports,p,l,l.exports,this)}return r[t].exports;function p(e){return f(p.resolve(e))}}f.isParcelRequire=!0,f.Module=function(e){this.id=e,this.bundle=f,this.exports={}},f.modules=e,f.cache=r,f.parent=o,f.register=function(r,t){e[r]=[function(e,r){r.exports=t},{}]};for(var c=0;c<t.length;c++)try{f(t[c])}catch(e){i||(i=e)}if(t.length){var l=f(t[t.length-1]);"object"==typeof exports&&"undefined"!=typeof module?module.exports=l:"function"==typeof define&&define.amd?define(function(){return l}):n&&(this[n]=l)}if(parcelRequire=f,i)throw i;return f}({"HwQr":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.emitUpdate=exports.default=void 0;var e=require("./public.mjs"),t=require("./main.mjs");const r=e=>{let{type:a,currentTarget:s,target:u,name:n,value:c,oldValue:o,args:p,path:i=[]}=e;if(i&&i.includes(s))return void console.warn("Circular references appear");let l={type:a,target:u,name:n,value:c,oldValue:o};"array"===a&&(l={type:a,target:u,name:n,args:p}),s._hasWatchs&&s[t.WATCHS].forEach(e=>{e({currentTarget:s,...l,path:[...i]})}),s._update&&s.owner.forEach(e=>{r({currentTarget:e,...l,path:[s,...i]})})};exports.emitUpdate=r;var a=r=>{Object.assign(r.prototype,{watch(r){const a="w-"+(0,e.getRandomId)();return this[t.WATCHS].set(a,r),a},unwatch(e){return this[t.WATCHS].delete(e)},watchTick(t){return this.watch((0,e.debounce)(t))}})};exports.default=a;
},{"./public.mjs":"m8ax","./main.mjs":"XZcT"}],"Sgdk":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("./accessor.mjs"),t=require("./main.mjs"),r=require("./public.mjs"),s=require("./watch.mjs");const o=["push","pop","shift","unshift","splice","reverse","sort","fill","copyWithin"],a=Symbol("placeholder");function i(e,t){const r=Array.from(t),s=Array.from(e),o=[],i=new Map,n=e.length;for(let d=0;d<n;d++){const t=e[d],s=r.indexOf(t);s>-1?r[s]=a:o.push(t)}const p=t.length;for(let d=0;d<p;d++){const e=t[d],r=s.indexOf(e);r>-1?s[r]=a:i.set(d,e)}return{deletedItems:o,addedItems:i}}var n=a=>{const n=a.prototype,p=Array.prototype;o.forEach(o=>{n[o]&&Object.defineProperty(n,o,{value(){const a=Array.from(this);for(var n=arguments.length,d=new Array(n),h=0;h<n;h++)d[h]=arguments[h];const l=p[o].apply(this[t.SELF],d),{deletedItems:c,addedItems:u}=i(a,this);for(let[e,t]of u)(0,r.isxdata)(t)?t._owner.push(this):(0,r.isObject)(t)&&(this.__unupdate=1,this[e]=t,delete this.__unupdate);for(let t of c)(0,e.clearData)(t,this);return(0,s.emitUpdate)({type:"array",currentTarget:this,target:this,args:d,name:o}),l===this[t.SELF]?this[t.PROXY]:l}})})};exports.default=n;
},{"./accessor.mjs":"HCpU","./main.mjs":"XZcT","./public.mjs":"m8ax","./watch.mjs":"HwQr"}],"XZcT":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.WATCHS=exports.SELF=exports.PROXY=void 0,exports.constructor=h,exports.default=void 0;var e=require("./public.mjs"),t=require("./accessor.mjs"),r=s(require("./array.mjs")),o=s(require("./watch.mjs"));function s(e){return e&&e.__esModule?e:{default:e}}const{defineProperties:i,getOwnPropertyDescriptor:n,entries:a}=Object,l=Symbol("self");exports.SELF=l;const c=Symbol("proxy");exports.PROXY=c;const u=Symbol("watchs");function h(r){let o,s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:t.handler,{proxy:a,revoke:h}=Proxy.revocable(this,s);return a._update=1,i(this,{xid:{value:r.xid||(0,e.getRandomId)()},_owner:{configurable:!0,value:[]},owner:{get(){return new Set(this._owner)}},[l]:{configurable:!0,get:()=>this},[c]:{configurable:!0,get:()=>a},[u]:{get:()=>o||(o=new Map)},_hasWatchs:{get:()=>!!o},_revoke:{value:h}}),Object.keys(r).forEach(e=>{const t=n(r,e);let{value:o,get:s,set:l}=t;s||l?i(this,{[e]:t}):a[e]=o}),a}exports.WATCHS=u;class d extends Array{constructor(e){return super(),h.call(this,e)}revoke(){const t=this[l];a(this).forEach(t=>{let[r,o]=t;(0,e.isxdata)(o)&&(this[r]=null)}),t._owner.forEach(e=>{a(e).forEach(t=>{let[r,o]=t;o===this&&(e[r]=null)})}),delete t[l],delete t[c],t._revoke()}toJSON(){let t={},r=!0,o=0;Object.keys(this).forEach(s=>{let i=this[s];/\D/.test(s)?r=!1:(s=parseInt(s))>o&&(o=s),(0,e.isxdata)(i)&&(i=i.toJSON()),t[s]=i}),r&&(t.length=o+1,t=Array.from(t));const s=this.xid;return i(t,{xid:{get:()=>s}}),t}toString(){return JSON.stringify(this.toJSON())}}exports.default=d,(0,r.default)(d),(0,o.default)(d);
},{"./public.mjs":"m8ax","./accessor.mjs":"HCpU","./array.mjs":"Sgdk","./watch.mjs":"HwQr"}],"rH1J":[function(require,module,exports) {

var t,e,n=module.exports={};function r(){throw new Error("setTimeout has not been defined")}function o(){throw new Error("clearTimeout has not been defined")}function i(e){if(t===setTimeout)return setTimeout(e,0);if((t===r||!t)&&setTimeout)return t=setTimeout,setTimeout(e,0);try{return t(e,0)}catch(n){try{return t.call(null,e,0)}catch(n){return t.call(this,e,0)}}}function u(t){if(e===clearTimeout)return clearTimeout(t);if((e===o||!e)&&clearTimeout)return e=clearTimeout,clearTimeout(t);try{return e(t)}catch(n){try{return e.call(null,t)}catch(n){return e.call(this,t)}}}!function(){try{t="function"==typeof setTimeout?setTimeout:r}catch(n){t=r}try{e="function"==typeof clearTimeout?clearTimeout:o}catch(n){e=o}}();var c,s=[],l=!1,a=-1;function f(){l&&c&&(l=!1,c.length?s=c.concat(s):a=-1,s.length&&h())}function h(){if(!l){var t=i(f);l=!0;for(var e=s.length;e;){for(c=s,s=[];++a<e;)c&&c[a].run();a=-1,e=s.length}c=null,l=!1,u(t)}}function m(t,e){this.fun=t,this.array=e}function p(){}n.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)e[n-1]=arguments[n];s.push(new m(t,e)),1!==s.length||l||i(h)},m.prototype.run=function(){this.fun.apply(null,this.array)},n.title="browser",n.env={},n.argv=[],n.version="",n.versions={},n.on=p,n.addListener=p,n.once=p,n.off=p,n.removeListener=p,n.removeAllListeners=p,n.emit=p,n.prependListener=p,n.prependOnceListener=p,n.listeners=function(t){return[]},n.binding=function(t){throw new Error("process.binding is not supported")},n.cwd=function(){return"/"},n.chdir=function(t){throw new Error("process.chdir is not supported")},n.umask=function(){return 0};
},{}],"m8ax":[function(require,module,exports) {
var process = require("process");
var e=require("process");Object.defineProperty(exports,"__esModule",{value:!0}),exports.debounce=p,exports.isxdata=exports.isObject=exports.getType=exports.getRandomId=void 0,exports.nextTick=a;var t=o(require("./main.mjs"));function o(e){return e&&e.__esModule?e:{default:e}}const n=()=>Math.random().toString(32).slice(2);exports.getRandomId=n;const r=e=>e instanceof t.default;exports.isxdata=r;const s=Object.prototype.toString,c=e=>s.call(e).toLowerCase().replace(/(\[object )|(])/g,"");exports.getType=c;const i=e=>{const t=c(e);return"array"===t||"object"===t};function a(t){"object"==typeof e&&"function"==typeof e.nextTick?e.nextTick(t):Promise.resolve().then(t)}function p(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,o=null,n=[];return function(){null===o&&(o=1,(t>0?setTimeout:a)(()=>{e.call(this,n),n=[],o=null},t)),n.push(...arguments)}}exports.isObject=i;
},{"./main.mjs":"XZcT","process":"rH1J"}],"HCpU":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.setData=exports.handler=exports.clearData=void 0;var e=require("./public.mjs"),t=o(require("./main.mjs")),r=require("./watch.mjs");function a(e){if("function"!=typeof WeakMap)return null;var t=new WeakMap,r=new WeakMap;return(a=function(e){return e?r:t})(e)}function o(e,t){if(!t&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var r=a(t);if(r&&r.has(e))return r.get(e);var o={},n=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var s in e)if("default"!==s&&Object.prototype.hasOwnProperty.call(e,s)){var i=n?Object.getOwnPropertyDescriptor(e,s):null;i&&(i.get||i.set)?Object.defineProperty(o,s,i):o[s]=e[s]}return o.default=e,r&&r.set(e,o),o}const{defineProperties:n}=Object,s=a=>{let{target:o,key:n,value:s,receiver:c,type:u}=a,l=s;(0,e.isxdata)(l)?l._owner.push(c):(0,e.isObject)(s)&&(l=new t.default(s))._owner.push(c);const p=c[n];return(0,e.isxdata)(p)&&i(p,c),!o.__unupdate&&(0,r.emitUpdate)({type:u||"set",target:c,currentTarget:c,name:n,value:s,oldValue:p}),l};exports.setData=s;const i=(t,r)=>{if((0,e.isxdata)(t)){const e=t._owner.indexOf(r);e>-1?t._owner.splice(e,1):console.error({desc:"This data is wrong, the owner has no boarding object at the time of deletion",target:r,mismatch:t})}};exports.clearData=i;const c={set(e,t,r,a){if("symbol"==typeof t)return Reflect.set(e,t,r,a);if(/^_/.test(t))return e.hasOwnProperty(t)?Reflect.set(e,t,r,a):n(e,{[t]:{writable:!0,configurable:!0,value:r}}),!0;try{const n=s({target:e,key:t,value:r,receiver:a});return Reflect.set(e,t,n,a)}catch(o){throw{desc:`failed to set ${t}`,key:t,value:r,target:a,error:o}}},deleteProperty:(e,r)=>(s({target:e,key:r,value:void 0,receiver:e[t.PROXY],type:"delete"}),Reflect.deleteProperty(e,r))};exports.handler=c;
},{"./public.mjs":"m8ax","./main.mjs":"XZcT","./watch.mjs":"HwQr"}],"KVRu":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.handler=void 0;var e=require("./public.mjs"),t=require("../stanz/src/accessor.mjs");const r={set:(e,r,s,c)=>/\D/.test(r)?t.handler.set(e,r,s,c):Reflect.set(e,r,s,c),get:(t,r,s,c)=>/\D/.test(r)?Reflect.get(t,r,s,c):(0,e.createXhear)(t.ele.children[r])};exports.handler=r;
},{"./public.mjs":"jcrR","../stanz/src/accessor.mjs":"HCpU"}],"PnwU":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("./public.mjs"),t=require("./accessor.mjs"),r=require("../stanz/src/public.mjs"),s=require("../stanz/src/main.mjs"),l=n(require("../stanz/src/watch.mjs"));function n(e){return e&&e.__esModule?e:{default:e}}const{defineProperties:i,getOwnPropertyDescriptor:a,entries:u}=Object;class c{constructor(r){let{ele:l}=r;const n=s.constructor.call(this,t.handler);return i(this,{_owner:{get(){const{parentNode:t}=l;return t?[(0,e.createXhear)(t)]:[]}},ele:{get:()=>l}}),l.__xhear__=n,n}get length(){return this.ele.children.length}$(t){const r=this.ele.querySelector(t);return r?null:(0,e.createXhear)(r)}all(t){return Array.from(this.ele.querySelectorAll(t)).map(e.createXhear)}get tag(){return this.ele.tagName.toLowerCase()}get text(){return this.ele.textContent}set text(e){this.ele.textContent=e}get html(){return this.ele.innerHTML}set html(e){this.ele.innerHTML=e}get class(){return this.ele.classList}get data(){return this.ele.dataset}get css(){return getComputedStyle(this.ele)}get style(){return this.ele.style}set style(e){if("string"==(0,r.getType)(e))return void(this.ele.style=e);let{style:t}=this,s=Array.from(t),l=Object.keys(e);s.forEach(e=>{l.includes(e)||(t[e]="")}),Object.assign(t,e)}}exports.default=c,(0,l.default)(c);
},{"./public.mjs":"jcrR","./accessor.mjs":"KVRu","../stanz/src/public.mjs":"m8ax","../stanz/src/main.mjs":"XZcT","../stanz/src/watch.mjs":"HwQr"}],"jcrR":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.createXhear=void 0;var e=r(require("./main.mjs"));function r(e){return e&&e.__esModule?e:{default:e}}const t=r=>r.__xhear__?r.__xhear__:new e.default({ele:r});exports.createXhear=t;
},{"./main.mjs":"PnwU"}],"fuBC":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=r(require("./main.mjs")),t=require("./public.mjs");function r(e){return e&&e.__esModule?e:{default:e}}const s=t=>new e.default(t);Object.assign(s,{is:t.isxdata});var u=s;exports.default=u;
},{"./main.mjs":"XZcT","./public.mjs":"m8ax"}],"SZYs":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=u;var e=require("./public.mjs"),t=r(require("../stanz/src/base.mjs"));function r(e){return e&&e.__esModule?e:{default:e}}function u(t){if(t instanceof Element)return(0,e.createXhear)(t);const r=document.querySelector(t);return(0,e.createXhear)(r)}Object.assign(u,{stanz:t.default});
},{"./public.mjs":"jcrR","../stanz/src/base.mjs":"fuBC"}],"s7iV":[function(require,module,exports) {
var global = arguments[3];
var e=arguments[3],u=r(require("./base.mjs"));function r(e){return e&&e.__esModule?e:{default:e}}void 0!==e&&(e.$=u.default);
},{"./base.mjs":"SZYs"}]},{},["s7iV"], "global")
