const { test, expect } = require("@playwright/test");

test("push and unshift", async ({ page }) => {
  await page.goto("http://localhost:3398/test/statics/array-test.html");

  await expect((await page.$$(".sub")).length).toBe(5);

  await page.waitForFunction(async () => {
    return $("#target").push(`<div class="sub">6</div>`);
  });

  await expect((await page.$$(".sub")).length).toBe(6);

  await page.waitForFunction(async () => {
    return $("#target").unshift(`<div class="sub">0</div>`);
  });

  await expect((await page.$$(".sub")).length).toBe(7);

  const { _preview: data } = await page.waitForFunction(async () => {
    return $("#target")
      .map((e) => e.text)
      .join(",");
  });

  expect(data).toBe(["0", "2", "3", "1", "5", "4", "6"].join(","));
});

test("pop and shift", async ({ page }) => {
  await page.goto("http://localhost:3398/test/statics/array-test.html");

  await expect((await page.$$(".sub")).length).toBe(5);

  await page.waitForFunction(async () => {
    return $("#target").pop();
  });

  await expect((await page.$$(".sub")).length).toBe(4);

  await page.waitForFunction(async () => {
    return $("#target").shift();
  });

  await expect((await page.$$(".sub")).length).toBe(3);

  const { _preview: data } = await page.waitForFunction(async () => {
    return $("#target")
      .map((e) => e.text)
      .join(",");
  });

  expect(data).toBe(["3", "1", "5"].join(","));
});

test("splice", async ({ page }) => {
  await page.goto("http://localhost:3398/test/statics/array-test.html");

  await expect((await page.$$(".sub")).length).toBe(5);

  await page.waitForFunction(async () => {
    return $("#target").splice(
      1,
      2,
      `<div class="sub">10</div>`,
      `<div class="sub">11</div>`
    );
  });

  await expect((await page.$$(".sub")).length).toBe(5);

  const { _preview: data } = await page.waitForFunction(async () => {
    return $("#target")
      .map((e) => e.text)
      .join(",");
  });

  expect(data).toBe(["2", "10", "11", "5", "4"].join(","));
});

test("splice negative", async ({ page }) => {
  await page.goto("http://localhost:3398/test/statics/array-test.html");

  await expect((await page.$$(".sub")).length).toBe(5);

  await page.waitForFunction(async () => {
    return $("#target").splice(-2);
  });

  await expect((await page.$$(".sub")).length).toBe(3);

  const { _preview: data } = await page.waitForFunction(async () => {
    return $("#target")
      .map((e) => e.text)
      .join(",");
  });

  expect(data).toBe(["2", "3", "1"].join(","));
});

test("reverse", async ({ page }) => {
  await page.goto("http://localhost:3398/test/statics/array-test.html");

  await expect((await page.$$(".sub")).length).toBe(5);

  const { _preview: data } = await page.waitForFunction(async () => {
    $("#target").reverse();

    return $("#target")
      .map((e) => e.text)
      .join(",");
  });

  expect(data).toBe(["4", "5", "1", "3", "2"].join(","));
});

test("sort", async ({ page }) => {
  await page.goto("http://localhost:3398/test/statics/array-test.html");

  await expect((await page.$$(".sub")).length).toBe(5);

  const { _preview: data } = await page.waitForFunction(async () => {
    $("#target").sort((a, b) => {
      return a.text - b.text;
    });

    return $("#target")
      .map((e) => e.text)
      .join(",");
  });

  expect(data).toBe(["1", "2", "3", "4", "5"].join(","));
});
