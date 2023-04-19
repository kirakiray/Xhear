import Stanz from "../stanz/src/main.mjs";
import { isFunction, hyphenToUpperCase, isArrayEqual } from "./public.mjs";
import { createXEle, eleX } from "./util.mjs";

const searchEle = (el, expr) => Array.from(el.querySelectorAll(expr));

const convertToFunc = (expr, data) => {
  const funcStr = `
const [$event] = $args;
try{
  with(this){
    return ${expr};
  }
}catch(error){
  console.error(error);
}
`;
  return new Function("...$args", funcStr).bind(data);
};

export function render({ data, target, template, temps }) {
  const content = template && template.innerHTML;

  if (content) {
    target.innerHTML = content;
  }

  const texts = target.querySelectorAll("xtext");

  const tasks = [];

  Array.from(texts).forEach((el) => {
    const textEl = document.createTextNode("");
    const { parentNode } = el;
    parentNode.insertBefore(textEl, el);
    parentNode.removeChild(el);

    const func = convertToFunc(el.getAttribute("expr"), data);
    tasks.push(() => {
      textEl.textContent = func();
    });
  });

  const eles = searchEle(target, `[x-bind-data]`);

  eles.forEach((el) => {
    const bindData = JSON.parse(el.getAttribute("x-bind-data"));

    const $el = eleX(el);

    for (let [actionName, arr] of Object.entries(bindData)) {
      arr.forEach((args) => {
        try {
          const { always } = $el[actionName];

          const func = () => {
            $el[actionName](...args, {
              isExpr: true,
              data,
              temps,
            });
          };

          if (always) {
            // Run every data update
            tasks.push(func);
          } else {
            func();
          }
        } catch (error) {
          const err = new Error(`This method does not exist : ${actionName}`);
          err.error = error;
          throw err;
        }
      });
    }

    el.removeAttribute("x-bind-data");
  });

  if (tasks.length) {
    if (target.__render_data) {
      console.warn(
        `An old listener already exists and the rendering of this element may be wrong`,
        { element: target, old: target.__render_data, new: data }
      );
    }

    target.__render_data = data;

    tasks.forEach((func) => func());

    data.watchTick(() => {
      tasks.forEach((func) => func());
    });
  }
}

export function convert(el) {
  let temps = {};

  const { tagName } = el;
  if (tagName === "TEMPLATE") {
    let content = el.innerHTML;
    const matchs = content.match(/{{.+?}}/g);

    if (matchs) {
      matchs.forEach((str) => {
        content = content.replace(
          str,
          `<xtext expr="${str.replace(/{{(.+?)}}/, "$1")}"></xtext>`
        );
      });

      el.innerHTML = content;
    }

    const tempName = el.getAttribute("name");

    if (tempName) {
      temps[tempName] = el;
    }

    temps = { ...temps, ...convert(el.content) };
  } else if (tagName) {
    const obj = {};

    Array.from(el.attributes).forEach((attr) => {
      const matchData = /(.*):(.+)/.exec(attr.name);

      if (!matchData) {
        return;
      }

      let [, actionName, param0] = matchData;

      if (!actionName) {
        actionName = "prop";
      }

      const targetActions = obj[actionName] || (obj[actionName] = []);

      targetActions.push([param0, attr.value]);

      el.removeAttribute(attr.name);
    });

    const keys = Object.keys(obj);

    if (keys.length) {
      el.setAttribute("x-bind-data", JSON.stringify(obj));
    }
  }

  if (el.children) {
    Array.from(el.children).forEach((el) => {
      temps = { ...temps, ...convert(el) };
    });
  }

  return temps;
}

const getVal = (val) => {
  if (isFunction(val)) {
    return val();
  }

  return val;
};

const defaultData = {
  _convertExpr(options = {}, expr) {
    const { isExpr, data } = options;

    if (!isExpr) {
      return expr;
    }

    return convertToFunc(expr, data);
  },
  prop(name, value, options) {
    value = this._convertExpr(options, value);
    value = getVal(value);
    name = hyphenToUpperCase(name);

    this[name] = value;
  },
  attr(name, value, options) {
    value = this._convertExpr(options, value);
    value = getVal(value);

    this.ele.setAttribute(name, value);
  },
  fill(tempName, key, options) {
    const { data, temps } = options;
    const target = data[key];

    if (!target) {
      const err = new Error(`No corresponding data found : ${key}`);
      err.target = data;
      err.key = key;
      throw err;
    }

    const targetTemp = temps[hyphenToUpperCase(tempName)];

    const _ele = this.ele;

    target.watchTick(() => {
      const { children } = _ele;

      const oldArray = Array.from(children).map((e) => e.__render_data.$data);
      const newArray = Array.from(target);

      if (isArrayEqual(oldArray, newArray)) {
        return;
      }

      for (let i = 0, len = target.length; i < len; i++) {
        const current = target[i];
        const cursorEl = children[i];
        const cursorData = cursorEl.__render_data.$data;

        if (current === cursorData) {
          continue;
        }

        if (oldArray.includes(current)) {
          // Data displacement occurs
          const oldEl = Array.from(children).find(
            (e) => e.__render_data.$data === current
          );
          _ele.insertBefore(oldEl, cursorEl);
        } else {
          // New elements added
          const { ele } = createItem(current, targetTemp, temps);
          _ele.insertBefore(ele, cursorEl);
        }

        // need to be deleted
        if (!newArray.includes(cursorData)) {
          cursorEl.__render_data.revoke();
          cursorEl.remove();
        }
      }
    });

    target.forEach((d) => {
      const { ele } = createItem(d, targetTemp, temps);

      _ele.appendChild(ele);
    });
  },
};

const createItem = (d, targetTemp, temps) => {
  const itemData = new Stanz({
    $data: d,
  });

  const $ele = createXEle(targetTemp.innerHTML);
  const { ele } = $ele;

  render({
    target: ele,
    data: itemData,
    temps,
  });

  return { ele, itemData };
};

defaultData.prop.always = true;
defaultData.attr.always = true;

export default defaultData;
