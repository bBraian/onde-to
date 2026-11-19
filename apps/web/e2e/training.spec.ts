import { expect, test } from '@playwright/test';

test('treino: uma rodada até o resumo, com recorde', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.route('https://tiles.openfreemap.org/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ version: 8, sources: {}, layers: [] }) }));
  await page.route('https://fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));

  await page.goto('/');
  await page.getByRole('button', { name: 'Treinar' }).click();
  await page.getByLabel('Mapa').selectOption('teste');
  await page.getByLabel('Rodadas').selectOption('3');
  await page.getByRole('button', { name: 'Começar' }).click();

  for (let i = 1; i <= 3; i++) {
    await expect(page.getByTestId('fake-viewer')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Clique no mapa para marcar' })).toBeDisabled();
    await page.getByTestId('guess-map').click();
    await page.getByRole('button', { name: 'Chutar' }).click();
    await expect(page.getByTestId('result-map')).toBeVisible();
    await page.getByRole('button', { name: i < 3 ? 'Próxima rodada' : 'Ver resumo' }).click();
  }

  await expect(page.getByRole('heading', { level: 1 })).toContainText('pontos');
  await expect(page.getByText('Novo recorde!')).toBeVisible();
  await page.getByRole('button', { name: 'Jogar de novo' }).click();
  await expect(page.getByTestId('fake-viewer')).toBeVisible();
  expect(errors).toEqual([]);
});
