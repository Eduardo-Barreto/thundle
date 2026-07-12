import { expect, test } from "@playwright/test"

// Smoke opcional contra a API real (sem mocks): LIVE_SMOKE=1 bunx playwright
// test e2e/live-smoke.spec.ts. Fora do gate, é pulado — o CI roda offline.
test.skip(!process.env.LIVE_SMOKE, "live smoke só com LIVE_SMOKE=1")

test("live: puzzle do dia carrega da app-api.tapout.gg com imagens", async ({ page }) => {
  await page.goto("/bracket")
  await expect(page.getByRole("region", { name: "Chave da competição" })).toBeVisible({
    timeout: 20000,
  })
  const board = page.getByRole("region", { name: "Chave da competição" })
  const pickable = board.locator('button[aria-pressed="false"]:enabled').first()
  await expect(pickable).toBeVisible()
  await pickable.click()
  await expect(board.locator('button[aria-pressed="true"]').first()).toBeVisible()
  // O primeiro hit do proxy /img é frio (S3 atrás de Referer), então a
  // asserção espera a primeira imagem aparecer em vez de contar na hora.
  await expect(page.locator("[data-position] img").first()).toBeVisible({ timeout: 15000 })
  console.log("imagens renderizadas:", await page.locator("[data-position] img").count())
})
