import { eleX, createXEle } from "./util.mjs";
import { render, convert } from "./render/render.mjs";
import Xhear from "./main.mjs";
import stanz from "../stanz/src/base.mjs";
import { getType } from "../stanz/src/public.mjs";

export default function $(expr) {
  if (getType(expr) === "string" && !/<.+>/.test(expr)) {
    const ele = document.querySelector(expr);

    return eleX(ele);
  }

  return createXEle(expr);
}

Object.assign($, {
  stanz,
  render,
  convert,
  fn: Xhear.prototype,
  all: (expr) => Array.from(document.querySelectorAll(expr)).map(eleX),
});
