const { test } = require("@playwright/test");

for (const path of ["/bonds", "/pro"]) {
  test(`inspect ${path}`, async ({ page }) => {
    const logs = [];
    page.on("console", (msg) => logs.push(`console:${msg.type()}:${msg.text()}`));
    page.on("pageerror", (err) => logs.push(`pageerror:${err.message}`));

    await page.goto(`http://localhost:3014${path}`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForTimeout(3000);

    console.log(`URL:${path}`);
    console.log(`TEXT:${(await page.locator("body").innerText()).slice(0, 4000)}`);
    console.log(`LOGS:${logs.join(" || ")}`);
  });
}
