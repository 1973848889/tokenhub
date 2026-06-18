import { test, expect } from '@playwright/test';

test.describe('AI治理平台 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
  });

  test('P1: 首页自动跳转到仪表盘', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('h1')).toContainText('仪表盘');
  });

  test('P2: 侧边栏菜单项可点击', async ({ page }) => {
    const menuLabels = ['仪表盘', '账单管理', '模型广场', '安全治理', '系统设置'];

    for (const label of menuLabels) {
      await page.click(`text=${label}`);
      await page.waitForTimeout(300);
    }
  });

  test('P3: 仪表盘概览卡片展示', async ({ page }) => {
    await expect(page.locator('text=今日费用')).toBeVisible();
    await expect(page.locator('text=今日Token')).toBeVisible();
    await expect(page.locator('text=今日调用')).toBeVisible();
    await expect(page.locator('text=月度预算使用率')).toBeVisible();
  });

  test('P4: 侧边栏折叠/展开', async ({ page }) => {
    const foldButton = page.locator('.ant-btn').first();
    await foldButton.click();
    await page.waitForTimeout(300);
    await foldButton.click();
    await page.waitForTimeout(300);
  });

  test('P5: 登录页可访问', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await expect(page.locator('text=AI应用与治理智能平台')).toBeVisible();
    await expect(page.locator('text=AI应用与治理智能平台')).toBeVisible();
    await expect(page.locator('input[placeholder="邮箱"]')).toBeVisible();
    await expect(page.locator('input[placeholder="密码"]')).toBeVisible();
    await expect(page.locator('button.ant-btn-primary')).toBeVisible();
  });

  test('P6: 登录后跳转仪表盘', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[placeholder="邮箱"]', 'admin@example.com');
    await page.fill('input[placeholder="密码"]', 'password');
    await page.click('button.ant-btn-primary');
    await page.waitForURL(/\/dashboard/);
  });
});
