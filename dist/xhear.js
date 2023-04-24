// xhear - v7.0.0 https://github.com/kirakiray/Xhear  (c) 2018-2023 YAO
parcelRequire=function(e,r,t,n){var i,o="function"==typeof parcelRequire&&parcelRequire,u="function"==typeof require&&require;function f(t,n){if(!r[t]){if(!e[t]){var i="function"==typeof parcelRequire&&parcelRequire;if(!n&&i)return i(t,!0);if(o)return o(t,!0);if(u&&"string"==typeof t)return u(t);var c=new Error("Cannot find module '"+t+"'");throw c.code="MODULE_NOT_FOUND",c}p.resolve=function(r){return e[t][1][r]||r},p.cache={};var l=r[t]=new f.Module(t);e[t][0].call(l.exports,p,l,l.exports,this)}return r[t].exports;function p(e){return f(p.resolve(e))}}f.isParcelRequire=!0,f.Module=function(e){this.id=e,this.bundle=f,this.exports={}},f.modules=e,f.cache=r,f.parent=o,f.register=function(r,t){e[r]=[function(e,r){r.exports=t},{}]};for(var c=0;c<t.length;c++)try{f(t[c])}catch(e){i||(i=e)}if(t.length){var l=f(t[t.length-1]);"object"==typeof exports&&"undefined"!=typeof module?module.exports=l:"function"==typeof define&&define.amd?define(function(){return l}):n&&(this[n]=l)}if(parcelRequire=f,i)throw i;return f}({"vXXv":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.clearTick=void 0,exports.debounce=l,exports.isObject=exports.getType=exports.getRandomId=exports.extend=void 0,exports.nextTick=s;const e=()=>Math.random().toString(32).slice(2);exports.getRandomId=e;const t=Object.prototype.toString,o=e=>t.call(e).toLowerCase().replace(/(\[object )|(])/g,"");exports.getType=o;const r=e=>{const t=o(e);return"array"===t||"object"===t};exports.isObject=r;const n=new Set;function s(t){const o=`t-${e()}`;return n.add(o),Promise.resolve().then(()=>{n.has(o)&&(t(),n.delete(o))}),o}const c=e=>n.delete(e);function l(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:0,o=null,r=[];return function(){null===o&&(o=1,(t>0?setTimeout:s)(()=>{e.call(this,r),r=[],o=null},t)),r.push(...arguments)}}exports.clearTick=c;const i=function(e,t){let o=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{};return Object.keys(t).forEach(r=>{const n=Object.getOwnPropertyDescriptor(t,r),{configurable:s,enumerable:c,writable:l,get:i,set:a,value:u}=n;"value"in n?e.hasOwnProperty(r)?e[r]=u:Object.defineProperty(e,r,{enumerable:c,configurable:s,writable:l,...o,value:u}):Object.defineProperty(e,r,{enumerable:c,configurable:s,...o,get:i,set:a})}),e};exports.extend=i;
},{}],"IC0J":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.emitUpdate=exports.default=void 0;var t=require("./public.mjs"),e=require("./main.mjs");const{assign:r,freeze:s}=Object;class a{constructor(t){r(this,t),s(this)}_getCurrent(t){let{currentTarget:e}=this;if(/\./.test(t)){const r=t.split(".");t=r.pop(),e=e.get(r.join("."))}return{current:e,key:t}}hasModified(t){if("array"===this.type)return this.path.includes(this.currentTarget.get(t));if(/\./.test(t)){const{current:e,key:r}=this._getCurrent(t);return e===this.path.slice(-1)[0]?this.name===r:this.path.includes(e)}return this.path.length?this.path.includes(this.currentTarget[t]):this.name===t}hasReplaced(t){if("set"!==this.type)return!1;if(/\./.test(t)){const{current:e,key:r}=this._getCurrent(t);return e===this.path.slice(-1)[0]&&this.name===r}return!this.path.length&&this.name===t}}class i extends Array{constructor(t){super(...t)}hasModified(t){return this.some(e=>e.hasModified(t))}hasReplaced(t){return this.some(e=>e.hasReplaced(t))}}const n=t=>{let{type:r,currentTarget:s,target:i,name:h,value:c,oldValue:u,args:o,path:l=[]}=t;if(l&&l.includes(s))return void console.warn("Circular references appear");let p={type:r,target:i,name:h,oldValue:u,value:c};if("array"===r&&(delete p.value,p.args=o),s._hasWatchs){const t=new a({currentTarget:s,...p,path:[...l]});s[e.WATCHS].forEach(e=>{e(t)})}s._update&&s.owner.forEach(t=>{n({currentTarget:t,...p,path:[s,...l]})})};exports.emitUpdate=n;var h={watch(r){const s="w-"+(0,t.getRandomId)();return this[e.WATCHS].set(s,r),s},unwatch(t){return this[e.WATCHS].delete(t)},watchTick(e){return this.watch((0,t.debounce)(t=>{try{this.xid}catch(r){return}t=t.filter(t=>{try{t.path.forEach(t=>t.xid)}catch(r){return!1}return!0}),e(new i(t))}))}};exports.default=h;
},{"./public.mjs":"vXXv","./main.mjs":"T2VJ"}],"VmZB":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("./accessor.mjs"),t=require("./main.mjs"),r=require("./public.mjs"),s=require("./watch.mjs");const o=["push","pop","shift","unshift","splice","reverse","sort","fill","copyWithin"],a=Symbol("placeholder");function i(e,t){const r=Array.from(t),s=Array.from(e),o=[],i=new Map,n=e.length;for(let d=0;d<n;d++){const t=e[d],s=r.indexOf(t);s>-1?r[s]=a:o.push(t)}const l=t.length;for(let d=0;d<l;d++){const e=t[d],r=s.indexOf(e);r>-1?s[r]=a:i.set(d,e)}return{deletedItems:o,addedItems:i}}const n={},l=Array.prototype;o.forEach(o=>{l[o]&&(n[o]=function(){const a=Array.from(this);for(var n=arguments.length,d=new Array(n),h=0;h<n;h++)d[h]=arguments[h];const u=l[o].apply(this[t.SELF],d),{deletedItems:c,addedItems:p}=i(a,this);for(let[e,s]of p)(0,t.isxdata)(s)?s._owner.push(this):(0,r.isObject)(s)&&(this.__unupdate=1,this[e]=s,delete this.__unupdate);for(let t of c)(0,e.clearData)(t,this);return(0,s.emitUpdate)({type:"array",currentTarget:this,target:this,args:d,name:o,oldValue:a}),u===this[t.SELF]?this[t.PROXY]:u})});var d=n;exports.default=d;
},{"./accessor.mjs":"iNa0","./main.mjs":"T2VJ","./public.mjs":"vXXv","./watch.mjs":"IC0J"}],"T2VJ":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.WATCHS=exports.SELF=exports.PROXY=exports.ISXDATA=void 0,exports.constructor=p,exports.isxdata=exports.default=void 0;var e=require("./public.mjs"),t=require("./accessor.mjs"),r=s(require("./array.mjs")),o=s(require("./watch.mjs"));function s(e){return e&&e.__esModule?e:{default:e}}const{defineProperties:n,getOwnPropertyDescriptor:a,entries:i}=Object,l=Symbol("self");exports.SELF=l;const c=Symbol("proxy");exports.PROXY=c;const u=Symbol("watchs");exports.WATCHS=u;const h=Symbol("isxdata");exports.ISXDATA=h;const d=e=>e&&!!e[h];function p(r){let o,s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:t.handler,{proxy:i,revoke:d}=Proxy.revocable(this,s);return i._update=1,n(this,{xid:{value:r.xid||(0,e.getRandomId)()},_owner:{value:[]},owner:{configurable:!0,get(){return new Set(this._owner)}},[h]:{value:!0},[l]:{configurable:!0,get:()=>this},[c]:{configurable:!0,get:()=>i},[u]:{get:()=>o||(o=new Map)},_hasWatchs:{get:()=>!!o},_revoke:{value:d}}),Object.keys(r).forEach(e=>{const t=a(r,e);let{value:o,get:s,set:l}=t;s||l?n(this,{[e]:t}):i[e]=o}),i}exports.isxdata=d;class x extends Array{constructor(e){return super(),p.call(this,e)}revoke(){const e=this[l];e._onrevokes&&(e._onrevokes.forEach(e=>e()),e._onrevokes.length=0),e.__unupdate=1,e[u].clear(),i(this).forEach(e=>{let[t,r]=e;d(r)&&(this[t]=null)}),e._owner.forEach(e=>{i(e).forEach(t=>{let[r,o]=t;o===this&&(e[r]=null)})}),delete e[l],delete e[c],e._revoke()}toJSON(){let e={},t=!0,r=0;Object.keys(this).forEach(o=>{let s=this[o];/\D/.test(o)?t=!1:(o=parseInt(o))>r&&(r=o),d(s)&&(s=s.toJSON()),e[o]=s}),t&&(e.length=r+1,e=Array.from(e));const o=this.xid;return n(e,{xid:{get:()=>o}}),e}toString(){return JSON.stringify(this.toJSON())}extend(t,r){return(0,e.extend)(this,t,r)}get(e){if(/\./.test(e)){const r=e.split(".");let o=this;for(let e=0,s=r.length;e<s;e++)try{o=o[r[e]]}catch(t){const s=new Error(`Failed to get data : ${r.slice(0,e).join(".")} \n${t.stack}`);throw Object.assign(s,{error:t,target:o}),s}return o}return this[e]}}exports.default=x,x.prototype.extend({...o.default,...r.default},{enumerable:!1});
},{"./public.mjs":"vXXv","./accessor.mjs":"iNa0","./array.mjs":"VmZB","./watch.mjs":"IC0J"}],"iNa0":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.setData=exports.handler=exports.clearData=void 0;var e=require("./public.mjs"),t=o(require("./main.mjs")),r=require("./watch.mjs");function a(e){if("function"!=typeof WeakMap)return null;var t=new WeakMap,r=new WeakMap;return(a=function(e){return e?r:t})(e)}function o(e,t){if(!t&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var r=a(t);if(r&&r.has(e))return r.get(e);var o={},n=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var s in e)if("default"!==s&&Object.prototype.hasOwnProperty.call(e,s)){var c=n?Object.getOwnPropertyDescriptor(e,s):null;c&&(c.get||c.set)?Object.defineProperty(o,s,c):o[s]=e[s]}return o.default=e,r&&r.set(e,o),o}const{defineProperties:n}=Object,s=a=>{let{target:o,key:n,value:s,receiver:i,type:u,succeed:l}=a,p=s;(0,t.isxdata)(p)?p._owner.push(i):(0,e.isObject)(s)&&(p=new t.default(s))._owner.push(i);const f=i[n],d=f===s;!d&&(0,t.isxdata)(f)&&c(f,i);const y=l(p);return!d&&!o.__unupdate&&(0,r.emitUpdate)({type:u||"set",target:i,currentTarget:i,name:n,value:s,oldValue:f}),y};exports.setData=s;const c=(e,r)=>{if((0,t.isxdata)(e)){const t=e._owner.indexOf(r);t>-1?e._owner.splice(t,1):console.error({desc:"This data is wrong, the owner has no boarding object at the time of deletion",target:r,mismatch:e})}};exports.clearData=c;const i={set(e,t,r,a){if("symbol"==typeof t)return Reflect.set(e,t,r,a);if(/^_/.test(t))return e.hasOwnProperty(t)?Reflect.set(e,t,r,a):n(e,{[t]:{writable:!0,configurable:!0,value:r}}),!0;try{return s({target:e,key:t,value:r,receiver:a,succeed:r=>Reflect.set(e,t,r,a)})}catch(o){const e=new Error(`failed to set ${t} \n ${o.stack}`);throw Object.assign(e,{key:t,value:r,target:a,error:o}),e}},deleteProperty:(e,r)=>/^_/.test(r)||"symbol"==typeof r?Reflect.deleteProperty(e,r):s({target:e,key:r,value:void 0,receiver:e[t.PROXY],type:"delete",succeed:()=>Reflect.deleteProperty(e,r)})};exports.handler=i;
},{"./public.mjs":"vXXv","./main.mjs":"T2VJ","./watch.mjs":"IC0J"}],"KVRu":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.handler=void 0;var e=require("./util.mjs"),t=require("../../stanz/src/accessor.mjs");const r={set:(e,r,s,l)=>/\D/.test(r)?t.handler.set(e,r,s,l):Reflect.set(e,r,s,l),get:(t,r,s,l)=>/\D/.test(String(r))?Reflect.get(t,r,s,l):(0,e.eleX)(t.ele.children[r]),ownKeys(e){let t=Reflect.ownKeys(e),r=e.ele.children.length;for(let s=0;s<r;s++)t.push(String(s));return t},getOwnPropertyDescriptor:(e,t)=>"string"!=typeof t||/\D/.test(t)?Reflect.getOwnPropertyDescriptor(e,t):{enumerable:!0,configurable:!0}};exports.handler=r;
},{"./util.mjs":"RbyW","../../stanz/src/accessor.mjs":"iNa0"}],"jcrR":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.capitalizeFirstLetter=s,exports.toDashCase=exports.isFunction=exports.isArrayEqual=exports.hyphenToUpperCase=exports.getNextNode=void 0;var e=require("../../stanz/src/public.mjs");const t=t=>(0,e.getType)(t).includes("function");exports.isFunction=t;const r=e=>e.replace(/-([a-z])/g,(e,t)=>t.toUpperCase());function s(e){return e.charAt(0).toUpperCase()+e.slice(1)}exports.hyphenToUpperCase=r;const o=e=>{let t=e;do{t=t.nextSibling}while(t instanceof Text);return t};exports.getNextNode=o;const n=(e,t)=>{if(e.length!==t.length)return!1;for(let r=0;r<e.length;r++)if(e[r]!==t[r])return!1;return!0};exports.isArrayEqual=n;const p=e=>e.replace(/[A-Z]/g,function(e){return"-"+e.toLowerCase()});exports.toDashCase=p;
},{"../../stanz/src/public.mjs":"vXXv"}],"YFLN":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.convert=a,exports.default=void 0,exports.render=o;var e=require("../public.mjs"),t=require("../util.mjs");const r=(e,t)=>Array.from(e.querySelectorAll(t)),n=(e,t)=>{return new Function("...$args",`\nconst [$event] = $args;\ntry{\n  with(this){\n    return ${e};\n  }\n}catch(error){\n  console.error(error);\n}\n`).bind(t)};function o(e){let{data:o,target:a,template:s,temps:i,...c}=e;const l=s&&s.innerHTML;l&&(a.innerHTML=l);const d=a.querySelectorAll("xtext"),h=[];o._onrevokes||(o._onrevokes=[()=>h.length=0]),Array.from(d).forEach(e=>{const t=document.createTextNode(""),{parentNode:r}=e;r.insertBefore(t,e),r.removeChild(e);const a=n(e.getAttribute("expr"),o);h.push(()=>{t.textContent=a()})}),r(a,"[x-bind-data]").forEach(e=>{const r=JSON.parse(e.getAttribute("x-bind-data")),n=(0,t.eleX)(e);for(let[t,a]of Object.entries(r))a.forEach(e=>{try{const{always:a}=n[t],s=()=>{n[t](...e,{isExpr:!0,data:o,temps:i,...c})};a?h.push(s):s()}catch(r){const e=new Error(`Execution of the ${t} method reports an error :\n ${r.stack}`);throw e.error=r,e}});e.removeAttribute("x-bind-data")}),h.length&&(a.__render_data&&console.warn("An old listener already exists and the rendering of this element may be wrong",{element:a,old:a.__render_data,new:o}),a.__render_data=o,h.forEach(e=>e()),o.watchTick(e=>{h.forEach(e=>e())}))}function a(e){let t={};const{tagName:r}=e;if("TEMPLATE"===r){let r=e.innerHTML;const n=r.match(/{{.+?}}/g);n&&(n.forEach(e=>{r=r.replace(e,`<xtext expr="${e.replace(/{{(.+?)}}/,"$1")}"></xtext>`)}),e.innerHTML=r);const o=e.getAttribute("name");o&&(t[o]=e),t={...t,...a(e.content)}}else if(r){const t={};Array.from(e.attributes).forEach(r=>{const n=/(.*):(.+)/.exec(r.name);if(!n)return;let[,o,a]=n;o||(o="prop"),(t[o]||(t[o]=[])).push([a,r.value]),e.removeAttribute(r.name)}),Object.keys(t).length&&e.setAttribute("x-bind-data",JSON.stringify(t))}return e.children&&Array.from(e.children).forEach(e=>{t={...t,...a(e)}}),t}const s=t=>(0,e.isFunction)(t)?t():t,i={_convertExpr(){let e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{},t=arguments.length>1?arguments[1]:void 0;const{isExpr:r,data:o}=e;return r?n(t,o):t},prop(t,r,n){r=this._convertExpr(n,r),r=s(r),this[t=(0,e.hyphenToUpperCase)(t)]=r},attr(e,t,r){if(t=this._convertExpr(r,t),void 0===(t=s(t)))return this.ele.getAttribute(e);this.ele.setAttribute(e,t)}};i.prop.always=!0,i.attr.always=!0;var c=i;exports.default=c;
},{"../public.mjs":"jcrR","../util.mjs":"RbyW"}],"LWJB":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=n(require("../../../stanz/src/main.mjs")),t=require("../public.mjs"),r=require("../util.mjs"),a=require("./render.mjs");function n(e){return e&&e.__esModule?e:{default:e}}var s={fill(e,r,a){const{data:n,temps:s}=a,l=a.$host||n,c=s[(0,t.hyphenToUpperCase)(e)],f=this.ele;n.watchTick(e=>{if(e.hasReplaced(r))return void d({data:n,key:r,_ele:f,targetTemp:c,temps:s,$host:l});if(!e.hasModified(r))return;const a=n.get(r),{children:u}=f,m=Array.from(u).map(e=>e.__render_data.$data),_=Array.from(a);if(!(0,t.isArrayEqual)(m,_))for(let t=0,r=a.length;t<r;t++){const e=a[t],r=u[t];if(!r){const{ele:t}=i(e,c,s,l);f.appendChild(t);continue}const n=r.__render_data.$data;if(e!==n){if(m.includes(e)){const t=Array.from(u).find(t=>t.__render_data.$data===e);t.__inArray=1,f.insertBefore(t,r),delete t.__inArray}else{const{ele:t}=i(e,c,s,l);f.insertBefore(t,r)}_.includes(n)||(o(r),r.remove())}}}),d({data:n,key:r,_ele:f,targetTemp:c,temps:s,$host:l})}};exports.default=s;const i=(t,n,s,i)=>{const o=new e.default({$data:t,$host:i}),d=(0,r.createXEle)(n.innerHTML),{ele:l}=d;return(0,a.render)({target:l,data:o,temps:s,$host:i}),l.setAttribute("x-fill-item",1),{ele:l,itemData:o}},o=e=>{const{__render_data:t}=e;t&&t.revoke(),Array.from(e.querySelectorAll("[x-fill-item]")).forEach(o)},d=e=>{let{data:t,key:r,_ele:a,targetTemp:n,temps:s,$host:d}=e;const l=t.get(r);Array.from(a.children).forEach(o),a.innerHTML="",l&&l.forEach(e=>{const{ele:t}=i(e,n,s,d);a.appendChild(t)})};
},{"../../../stanz/src/main.mjs":"T2VJ","../public.mjs":"jcrR","../util.mjs":"RbyW","./render.mjs":"YFLN"}],"H69r":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("../../../stanz/src/public.mjs"),t=require("../public.mjs"),i=require("../util.mjs");function o(e){let{ele:t,val:i}=e;if(i){const e=this.__beforeMark;if(!e)return;const{parentNode:i}=e;i.insertBefore(t,e),this.__beforeMark=null,i.removeChild(e)}else{const{parentNode:e}=t;if(!e)return;const{__conditionType:i}=t,o=t.textContent.trim().slice(0,30),n=this.__beforeMark=document.createComment(o);n.__conditionType=i,e.insertBefore(n,t),e.removeChild(t)}}function n(e,t){e.__conditionType=t;let i=e;do{i=i.previousSibling}while(i instanceof Text);const o=i.__conditionType;if("if"!==o&&"elseIf"!==o){const t=new Error("The previous element must be if or ifElse");throw t.target=e,t.prevNode=i,t}}function l(n){(0,e.clearTick)(n.__tickid),n.__tickid=(0,e.nextTick)(()=>{let e=n.__allConditionEles;if(!e){e=[];let i=n;for(;i&&i.__conditionType;)e.push(i),i=(0,t.getNextNode)(i);n.__allConditionEles=e}let l=0;e.forEach(e=>{const t=(0,i.eleX)(e),{__conditionType:n,__condition:s}=e;l?o.call(t,{ele:e,val:!1}):l||"else"!==n?(s&&(l=1),o.call(t,{ele:e,val:s})):o.call(t,{ele:e,val:!0})})})}var s={set if(e){const{ele:t}=this;t.__conditionType="if",t.__condition=e,l(t)},set elseIf(e){const{ele:t}=this;t.__condition=e,t.__conditionType||n(t,"elseIf")},set else(e){const{ele:t}=this;t.__conditionType||n(t,"else")}};exports.default=s;
},{"../../../stanz/src/public.mjs":"vXXv","../public.mjs":"jcrR","../util.mjs":"RbyW"}],"pd8f":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e={sync(e,t,i){if(!i)throw"Sync is only allowed within the renderer";const{data:s}=i;this[e]=s[t],this.watch(i=>{i.hasModified(e)&&(s[t]=this[e])}),s.watch(i=>{i.hasModified(t)&&(this[e]=s[t])})}};exports.default=e;
},{}],"uH3H":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e={on(e,t,s){return t=s&&s.isExpr&&!/[^\d\w_\$\.]/.test(t)?s.data.get(t):this._convertExpr(s,t),s&&s.data&&(t=t.bind(s.data)),this.ele.addEventListener(e,t),this},one(e,t,s){const r=s=>{this.off(e,r),t(s)};return this.on(e,r,s),this},off(e,t){return this.ele.removeEventListener(e,t),this},emit(e,t){let s;return e&&(s=new Event(e)),t&&Object.assign(s,t),this.ele.dispatchEvent(s),this}};exports.default=e;
},{}],"hwXb":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("./public.mjs"),r=require("./util.mjs"),t=require("../../stanz/src/watch.mjs");const a=function(e,t,a){const{children:n}=e,s=[];for(let r=t,h=t+a;r<h;r++){const e=n[r];s.push(e)}s.forEach(e=>e.remove());for(var i=arguments.length,o=new Array(i>3?i-3:0),c=3;c<i;c++)o[c-3]=arguments[c];if(o.length){const a=document.createDocumentFragment();o.forEach(e=>a.append((0,r.createXEle)(e).ele));const s=n[t];s?e.insertBefore(a,s):e.appendChild(a)}return s},n=["push","pop","shift","unshift","splice","reverse","sort","fill","copyWithin"],s={push(){const{ele:e}=this;for(var r=arguments.length,n=new Array(r),s=0;s<r;s++)n[s]=arguments[s];return a(e,e.children.length,0,...n),(0,t.emitUpdate)({type:"array",currentTarget:this,target:this,args:n,name:"push"}),e.children.length},pop(){const{ele:e}=this;for(var n=arguments.length,s=new Array(n),i=0;i<n;i++)s[i]=arguments[i];const o=a(e,e.children.length-1,1,...s);return(0,t.emitUpdate)({type:"array",currentTarget:this,target:this,args:s,name:"pop"}),(0,r.eleX)(o[0])},shift(){const{ele:e}=this;for(var n=arguments.length,s=new Array(n),i=0;i<n;i++)s[i]=arguments[i];const o=a(e,0,1,...s);return(0,t.emitUpdate)({type:"array",currentTarget:this,target:this,args:s,name:"shift"}),(0,r.eleX)(o[0])},unshift(){const{ele:e}=this;for(var r=arguments.length,n=new Array(r),s=0;s<r;s++)n[s]=arguments[s];return a(e,0,0,...n),(0,t.emitUpdate)({type:"array",currentTarget:this,target:this,args:n,name:"unshift"}),e.children.length},splice(){for(var e=arguments.length,n=new Array(e),s=0;s<e;s++)n[s]=arguments[s];const i=a(this.ele,...n);return(0,t.emitUpdate)({type:"array",currentTarget:this,target:this,args:n,name:"splice"}),i.map(r.eleX)},reverse(){const e=Array.from(this.ele.childNodes);for(var r=arguments.length,a=new Array(r),n=0;n<r;n++)a[n]=arguments[n];i.reverse.call(e,...a);const s=document.createDocumentFragment();return e.forEach(e=>{e.__inArray=1,s.append(e)}),this.ele.append(s),e.forEach(e=>{delete e.__inArray}),(0,t.emitUpdate)({type:"array",currentTarget:this,target:this,args:a,name:"reverse"}),this},sort(){const e=Array.from(this.ele.children).map(r.eleX);for(var a=arguments.length,n=new Array(a),s=0;s<a;s++)n[s]=arguments[s];i.sort.call(e,...n);const o=document.createDocumentFragment();return e.forEach(e=>{e.ele.__inArray=1,o.append(e.ele)}),this.ele.append(o),e.forEach(e=>{delete e.ele.__inArray}),(0,t.emitUpdate)({type:"array",currentTarget:this,target:this,args:n,name:"sort"}),this}},i=Array.prototype;Object.keys(Object.getOwnPropertyDescriptors(i)).forEach(t=>{if("constructor"===t||"length"===t||n.includes(t))return;const a=i[t];(0,e.isFunction)(a)&&(s[t]=function(){for(var e=arguments.length,t=new Array(e),n=0;n<e;n++)t[n]=arguments[n];return a.apply(Array.from(this.ele.children).map(r.eleX),t)})});class o{}exports.default=o;for(let[c,h]of Object.entries(s))Object.defineProperty(o.prototype,c,{value:h});
},{"./public.mjs":"jcrR","./util.mjs":"RbyW","../../stanz/src/watch.mjs":"IC0J"}],"fRpZ":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.initFormEle=void 0;const e=new Set(["input","textarea","select","option","button","label","fieldset","legend","form"]),t=t=>{const{tag:n}=t;if(e.has(n))switch(n){case"input":i(t);break;case"textarea":a(t,"input")}};exports.initFormEle=t;const a=function(e){let t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"change";const{ele:a}=e;e.value=a.value,a.addEventListener(t,t=>{e.value=a.value}),e.watch(t=>{t.hasModified("value")&&(a.value=e.value)})},i=e=>{switch(e.attr("type")){case"text":a(e,"input")}};
},{}],"PnwU":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=require("./util.mjs"),t=require("./accessor.mjs"),r=p(require("./render/render.mjs")),n=p(require("./render/fill.mjs")),s=p(require("./render/condition.mjs")),l=p(require("./render/sync.mjs")),u=p(require("./event.mjs")),o=p(require("./array.mjs")),i=require("./form.mjs"),a=require("../../stanz/src/public.mjs"),c=h(require("../../stanz/src/main.mjs")),d=p(require("../../stanz/src/watch.mjs"));function f(e){if("function"!=typeof WeakMap)return null;var t=new WeakMap,r=new WeakMap;return(f=function(e){return e?r:t})(e)}function h(e,t){if(!t&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var r=f(t);if(r&&r.has(e))return r.get(e);var n={},s=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var l in e)if("default"!==l&&Object.prototype.hasOwnProperty.call(e,l)){var u=s?Object.getOwnPropertyDescriptor(e,l):null;u&&(u.get||u.set)?Object.defineProperty(n,l,u):n[l]=e[l]}return n.default=e,r&&r.set(e,n),n}function p(e){return e&&e.__esModule?e:{default:e}}const{defineProperties:g}=Object,m=t=>{let{_this:r,ele:n,proxySelf:s}=t;const l={owner:{get(){const{parentNode:t}=n,{_owner:s}=r,l=t?[(0,e.eleX)(t),...s]:[...s];return new Set(l)}},ele:{get:()=>n}},u=n.tagName&&n.tagName.toLowerCase();u&&(l.tag={enumerable:!0,value:u}),g(r,l),(0,i.initFormEle)(s)};class y extends o.default{constructor(e){let{ele:r}=e;super();const n=c.constructor.call(this,{},t.handler);return m({_this:this,ele:r,proxySelf:n}),r.__xhear__=n,n}get length(){return this.ele.children.length}$(t){const r=this.ele.querySelector(t);return r?(0,e.eleX)(r):null}all(t){return Array.from(this.ele.querySelectorAll(t)).map(e.eleX)}extend(e,t){return(0,a.extend)(this,e,t)}get text(){return this.ele.textContent}set text(e){this.ele.textContent=e}get html(){return this.ele.innerHTML}set html(e){this.ele.innerHTML=e}get classList(){return this.ele.classList}get data(){return this.ele.dataset}get css(){return getComputedStyle(this.ele)}get shadow(){return(0,e.eleX)(this.ele.shadowRoot)}get parent(){let{parentNode:t}=this.ele;return t&&t!==document?(0,e.eleX)(t):null}get style(){return this.ele.style}set style(e){if("string"==(0,a.getType)(e))return void(this.ele.style=e);let{style:t}=this,r=Array.from(t),n=Object.keys(e);r.forEach(e=>{n.includes(e)||(t[e]="")}),Object.assign(t,e)}remove(){this.ele.remove()}}exports.default=y;const j=c.default.prototype,x=y.prototype;x.extend(s.default),x.extend({get:j.get,toJSON:j.toJSON,toString:j.toString,...d.default,...u.default,...r.default,...n.default,...l.default},{enumerable:!1});
},{"./util.mjs":"RbyW","./accessor.mjs":"KVRu","./render/render.mjs":"YFLN","./render/fill.mjs":"LWJB","./render/condition.mjs":"H69r","./render/sync.mjs":"pd8f","./event.mjs":"uH3H","./array.mjs":"hwXb","./form.mjs":"fRpZ","../../stanz/src/public.mjs":"vXXv","../../stanz/src/main.mjs":"T2VJ","../../stanz/src/watch.mjs":"IC0J"}],"RbyW":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.strToXEle=exports.objToXEle=exports.eleX=exports.createXEle=void 0;var e=r(require("./main.mjs")),t=require("../../stanz/src/public.mjs");function r(e){return e&&e.__esModule?e:{default:e}}const n=t=>t?t.__xhear__?t.__xhear__:new e.default({ele:t}):null;exports.eleX=n;const s=e=>{const t={...e};if(!e.tag)return null;const r=document.createElement(e.tag);delete t.tag;const s=n(r);return Object.assign(s,t),s};exports.objToXEle=s;const o=document.createElement("div"),c=e=>{o.innerHTML=e;const t=o.children[0]||o.childNodes[0];return o.innerHTML="",n(t)};exports.strToXEle=c;const l=(r,o)=>{if(r instanceof e.default)return r;if(r instanceof Element)return n(r);switch((0,t.getType)(r)){case"object":return s(r);case"string":return c(r)}};exports.createXEle=l;
},{"./main.mjs":"PnwU","../../stanz/src/public.mjs":"vXXv"}],"LQdM":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=void 0;var e=r(require("./main.mjs"));function t(e){if("function"!=typeof WeakMap)return null;var r=new WeakMap,n=new WeakMap;return(t=function(e){return e?n:r})(e)}function r(e,r){if(!r&&e&&e.__esModule)return e;if(null===e||"object"!=typeof e&&"function"!=typeof e)return{default:e};var n=t(r);if(n&&n.has(e))return n.get(e);var a={},o=Object.defineProperty&&Object.getOwnPropertyDescriptor;for(var u in e)if("default"!==u&&Object.prototype.hasOwnProperty.call(e,u)){var f=o?Object.getOwnPropertyDescriptor(e,u):null;f&&(f.get||f.set)?Object.defineProperty(a,u,f):a[u]=e[u]}return a.default=e,n&&n.set(e,a),a}const n=t=>new e.default(t);Object.assign(n,{is:e.isxdata});var a=n;exports.default=a;
},{"./main.mjs":"T2VJ"}],"GjOg":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.register=void 0;var t=require("./public.mjs"),e=require("./render/render.mjs"),r=require("./util.mjs");const a={},n=function(){const n={tag:"",temp:"",data:{},proto:{},...arguments.length>0&&void 0!==arguments[0]?arguments[0]:{}};o(n.tag);const c=(0,t.capitalizeFirstLetter)((0,t.hyphenToUpperCase)(n.tag));if(a[c])throw`Component ${c} already exists`;const i=document.createElement("template");i.innerHTML=n.temp;const h=(0,e.convert)(i),d=t=>{let e;return e=t instanceof Array?[...t]:Object.keys(t)},l=a[c]=class extends HTMLElement{constructor(){super(...arguments);const a=(0,r.eleX)(this);if(n.created&&n.created.call(a),a.extend(n.proto,{enumerable:!1}),n.attrs){const e=d(n.attrs);a.watchTick(r=>{e.forEach(e=>{r.hasModified(e)&&this.setAttribute((0,t.toDashCase)(e),a[e])})})}if(n.watch){const t=Object.entries(n.watch);a.watchTick(e=>{for(let[r,n]of t)e.hasModified(r)&&n(a[r])})}const s={...n.data,...n.attrs};for(let[t,e]of Object.entries(s))a.hasOwnProperty(t)||(a[t]=e);if(n.temp){const t=this.attachShadow({mode:"open"});t.innerHTML=i.innerHTML,(0,e.render)({target:t,data:a,temps:h})}n.ready&&n.ready.call(a)}connectedCallback(){n.attached&&!s(this)&&n.attached.call((0,r.eleX)(this))}disconnectedCallback(){n.detached&&!s(this)&&n.detached.call((0,r.eleX)(this))}attributeChangedCallback(t,e,a){const n=(0,r.eleX)(this);/[^\d.]/.test(a)||"number"!=typeof n[t]||(a=Number(a)),n[t]=a}static get observedAttributes(){return d(n.attrs||{}).map(e=>(0,t.toDashCase)(e))}};customElements.define(n.tag,l)};function s(t){let e=t;for(;e;){if(e.__inArray)return!0;if(!(e=e.parentNode||e.host)||e.tagName&&"BODY"===e.tagName)break}return!1}function o(t){if("-"===t.charAt(0)||"-"===t.charAt(t.length-1))throw new Error(`The string "${t}" cannot start or end with "-"`);for(let e=0;e<t.length-1;e++)if("-"===t.charAt(e)&&"-"===t.charAt(e+1))throw new Error(`The string "${t}" cannot have consecutive "-" characters`);if(!t.includes("-"))throw new Error(`The string "${t}" must contain at least one "-"`);return!0}exports.register=n;
},{"./public.mjs":"jcrR","./render/render.mjs":"YFLN","./util.mjs":"RbyW"}],"SZYs":[function(require,module,exports) {
"use strict";Object.defineProperty(exports,"__esModule",{value:!0}),exports.default=l;var e=require("./util.mjs"),r=require("./render/render.mjs"),t=i(require("./main.mjs")),s=i(require("../../stanz/src/base.mjs")),u=require("../../stanz/src/public.mjs"),n=require("./register.mjs");function i(e){return e&&e.__esModule?e:{default:e}}function l(r){if("string"===(0,u.getType)(r)&&!/<.+>/.test(r)){const t=document.querySelector(r);return(0,e.eleX)(t)}return(0,e.createXEle)(r)}Object.assign(l,{stanz:s.default,render:r.render,convert:r.convert,register:n.register,fn:t.default.prototype,all:r=>Array.from(document.querySelectorAll(r)).map(e.eleX)});
},{"./util.mjs":"RbyW","./render/render.mjs":"YFLN","./main.mjs":"PnwU","../../stanz/src/base.mjs":"LQdM","../../stanz/src/public.mjs":"vXXv","./register.mjs":"GjOg"}],"s7iV":[function(require,module,exports) {
var global = arguments[3];
var e=arguments[3],u=r(require("./base.mjs"));function r(e){return e&&e.__esModule?e:{default:e}}void 0!==e&&(e.$=u.default);
},{"./base.mjs":"SZYs"}]},{},["s7iV"], "global")
