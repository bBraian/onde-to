import { expect, test, type Page } from '@playwright/test';

const EMPTY_STYLE = JSON.stringify({ version: 8, sources: {}, layers: [] });

async function setup(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ contentType: 'application/json', body: EMPTY_STYLE }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.goto('/');
  await page.getByRole('button', { name: 'Jogar aqui' }).click();
  await page.getByLabel('Mapa').selectOption('teste');
  return errors;
}

async function twoPlayers(page: Page) {
  await page.getByRole('button', { name: 'Adicionar jogador' }).click();
  await page.getByLabel('Apelido do jogador 1').fill('Ana');
  await page.getByLabel('Apelido do jogador 2').fill('Bia');
  await page.getByLabel('Rodadas').selectOption('1');
}

test('sozinho: três rodadas até o fim, com recorde', async ({ page }) => {
  const errors = await setup(page);
  await page.getByLabel('Rodadas').selectOption('3');
  await page.getByRole('button', { name: 'Começar!' }).click();
  for (let i = 1; i <= 3; i++) {
    await expect(page.getByTestId('fake-viewer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clique no mapa para marcar' })).toBeDisabled();
    await page.getByTestId('guess-map').click();
    await page.getByRole('button', { name: 'Chutar' }).click();
    await expect(page.getByTestId('result-map')).toBeVisible();
    if (i === 1) {
      // o alfinete do palpite tem que ficar onde foi o palpite, não no canto do mapa (a animação não pode roubar o transform do marcador)
      await page.waitForTimeout(1200);
      const mapBox = (await page.getByTestId('result-map').boundingBox())!;
      const pinBox = (await page.locator('[data-result-pin]').first().boundingBox())!;
      expect(pinBox.x - mapBox.x).toBeGreaterThan(20);
      expect(pinBox.y - mapBox.y).toBeGreaterThan(20);
    }
    await page.getByRole('button', { name: i < 3 ? 'Próxima rodada' : 'Ver resultado final' }).click();
  }
  await expect(page.getByText('Novo recorde!')).toBeVisible();
  await page.getByRole('button', { name: 'Jogar de novo' }).click();
  await expect(page.getByTestId('fake-viewer')).toBeVisible();
  expect(errors).toEqual([]);
});

test('turnos: a Bia não vê o pino da Ana e o resultado mostra os dois', async ({ page }) => {
  await setup(page);
  await twoPlayers(page);
  await page.getByRole('button', { name: 'Começar!' }).click();
  await expect(page.getByRole('heading', { name: 'Vez de Ana' })).toBeVisible();
  await page.getByRole('button', { name: 'Tô pronto!' }).click();
  await page.getByTestId('guess-map').click();
  await expect(page.locator('[data-pin]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(page.getByRole('heading', { name: 'Vez de Bia' })).toBeVisible();
  await page.getByRole('button', { name: 'Tô pronto!' }).click();
  await expect(page.getByTestId('fake-viewer')).toBeVisible();
  await expect(page.locator('[data-pin]')).toHaveCount(0);
  await page.getByTestId('guess-map').click({ position: { x: 60, y: 60 } });
  await page.getByRole('button', { name: 'Chutar' }).click();
  await expect(page.getByTestId('round-table').locator('li')).toHaveCount(2);
  await page.getByRole('button', { name: 'Ver resultado final' }).click();
  await expect(page.getByTestId('winner')).toContainText(/venc|Empate/);
});

test('mesmo mapa com pontuação por rodada: o mais perto ganha +1', async ({ page }) => {
  await setup(page);
  await twoPlayers(page);
  await page.getByRole('button', { name: 'Mesmo mapa' }).click();
  await page.getByRole('button', { name: /^Rodada/ }).click();
  await page.getByRole('button', { name: 'Começar!' }).click();
  await expect(page.getByTestId('fake-viewer')).toBeVisible();
  await page.getByRole('button', { name: 'Ana', exact: true }).click();
  await page.getByTestId('guess-map').click();
  await page.getByRole('button', { name: 'Bia', exact: true }).click();
  await page.getByTestId('guess-map').click({ position: { x: 30, y: 30 } });
  await expect(page.locator('[data-pin]')).toHaveCount(2);
  await page.getByRole('button', { name: 'Revelar' }).click();
  await expect(page.getByTestId('round-table')).toContainText('+1');
});
