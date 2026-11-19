import { expect, test, type Browser, type Page } from '@playwright/test';

const EMPTY_STYLE = JSON.stringify({ version: 8, sources: {}, layers: [] });

const consoleErrors: string[] = [];
test.beforeEach(() => { consoleErrors.length = 0; });
test.afterEach(() => {
  expect(consoleErrors.filter((e) => /Worker failed to load/.test(e)), 'o worker do MapLibre precisa carregar').toEqual([]);
});

async function player(browser: Browser, nick: string): Promise<Page> {
  const ctx = await browser.newContext();
  ctx.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await ctx.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ contentType: 'application/json', body: EMPTY_STYLE }));
  await ctx.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await ctx.addInitScript((n) => window.localStorage.setItem('onde-to:nick', n), nick);
  return ctx.newPage();
}

async function guess(page: Page) {
  await expect(page.getByTestId('fake-viewer')).toBeVisible();
  await page.getByTestId('guess-map').click();
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(page.getByRole('button', { name: /Palpite enviado|Próxima rodada|Ver resultado final/ }).or(page.getByTestId('round-table'))).toBeVisible();
}

async function openRoom(browser: Browser) {
  const ana = await player(browser, 'Ana');
  const bia = await player(browser, 'Bia');
  await ana.goto('/sala/nova');
  const code = (await ana.getByTestId('room-code').textContent())!.trim();
  expect(code).toMatch(/^[A-Z0-9]{4}$/);
  await bia.goto(`/sala/${code.toLowerCase()}`);
  await expect(ana.getByText('Bia', { exact: true })).toBeVisible();
  await expect(bia.getByText('Ana', { exact: true })).toBeVisible();
  await expect(ana.locator('.lobby-players [data-avatar]')).toHaveCount(2);
  await ana.getByLabel('Mapa').selectOption('teste');
  return { ana, bia };
}

test('clássico: duas pessoas jogam uma rodada até o pódio', async ({ browser }) => {
  const { ana, bia } = await openRoom(browser);
  await ana.getByLabel('Rodadas').selectOption('1');
  await expect(bia.getByLabel('Rodadas')).toHaveValue('1');
  await ana.getByRole('button', { name: 'Iniciar partida' }).click();

  await guess(ana);
  await guess(bia);

  for (const p of [ana, bia]) await expect(p.getByTestId('round-table').locator('li')).toHaveCount(2);
  await expect(ana.locator('[data-result-pin]')).toHaveCount(2);
  await expect(bia.getByRole('button', { name: 'Ver resultado final' })).toHaveCount(0);
  await ana.getByRole('button', { name: 'Ver resultado final' }).click();
  for (const p of [ana, bia]) await expect(p.getByTestId('winner')).toContainText(/venc/);
});

test('duelo 1 contra 1 termina com um time vencedor', async ({ browser }) => {
  const { ana, bia } = await openRoom(browser);
  await ana.getByRole('button', { name: 'Duelo' }).click();
  await ana.getByLabel('Vida inicial').selectOption('1000');
  await expect(ana.getByRole('button', { name: 'Iniciar partida' })).toBeEnabled();
  await ana.getByRole('button', { name: 'Iniciar partida' }).click();

  // Só a Ana chuta (no centro do mapa) e encerra a rodada: o Time B perde vida até zerar ou o baralho acabar.
  for (let i = 0; i < 12; i++) {
    if (await ana.getByTestId('winner').isVisible()) break;
    await guess(ana);
    await ana.getByRole('button', { name: 'Encerrar rodada' }).click();
    const final = ana.getByRole('button', { name: 'Ver resultado final' });
    const next = ana.getByRole('button', { name: 'Próxima rodada' });
    await expect(final.or(next)).toBeVisible();
    await expect(bia.getByTestId('round-table')).toBeVisible();
    if (await final.isVisible()) {
      await final.click();
      break;
    }
    await next.click();
  }
  for (const p of [ana, bia]) await expect(p.getByTestId('winner')).toHaveText('Time A venceu!');
});
