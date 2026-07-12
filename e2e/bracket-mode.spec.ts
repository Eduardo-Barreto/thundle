import { expect, test, type Page } from "@playwright/test"

import cpbr16Bracket from "../src/test/fixtures/rcx-cpbr16-lightweight-bracket.json"
import cpbr16Robots from "../src/test/fixtures/rcx-cpbr16-lightweight-robots.json"

const BRACKET_URL = "/bracket?bracket=rcx-cpbr16/lightweight&t=combate"

// A chave real da lightweight na RCX CPBR16: K-torze (campeão) venceu a
// semifinal contra Touro Light, a final winners e a grand final contra
// Federal M.T.; não houve bracket reset.
async function mockApi(page: Page) {
  await page.route("https://app-api.tapout.gg/**", async (route) => {
    const url = route.request().url()
    if (url.includes("/bracket")) {
      await route.fulfill({ json: cpbr16Bracket })
      return
    }
    if (url.includes("/robots")) {
      await route.fulfill({ json: cpbr16Robots })
      return
    }
    await route.fulfill({ status: 404, json: { detail: "not mocked" } })
  })
}

async function pickAll(page: Page, winner: (candidates: string[]) => string) {
  // Preenche partida a partida seguindo a propagação: um card "sem pick" é o
  // que não tem nenhum botão aria-pressed=true e tem botões clicáveis.
  for (let i = 0; i < 30; i++) {
    const confirmButton = page.getByRole("button", { name: "Confirmar" })
    if (await confirmButton.isEnabled()) return
    const unpicked = page
      .locator("[data-position]")
      .filter({ hasNot: page.locator('button[aria-pressed="true"]') })
      .filter({ has: page.locator("button[aria-pressed]:enabled") })
    const card = unpicked.first()
    await card.waitFor({ state: "visible" })
    const buttons = card.locator("button[aria-pressed]:enabled")
    const names = await buttons.allTextContents()
    const chosen = winner(names.map((n) => n.trim()))
    await buttons.filter({ hasText: chosen }).first().click()
  }
}

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test("bracket route renders the mode with track selector and event header", async ({ page }) => {
  await page.goto(BRACKET_URL)
  await expect(page.getByRole("button", { name: "Bracket" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByRole("button", { name: /Combate/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  // O override resolve a entry real do manifest, então o header mostra o
  // nome do evento e da categoria, não os slugs.
  await expect(page.getByText("RCX - CPBR16 · Lightweight - 27,2kg / 60lb")).toBeVisible()
  await expect(page.getByRole("region", { name: "Chave da competição" })).toBeVisible()
})

test("no results are visible before confirming", async ({ page }) => {
  await page.goto(BRACKET_URL)
  const board = page.getByRole("region", { name: "Chave da competição" })
  await expect(board.locator("button[aria-pressed]").first()).toBeVisible()
  await expect(board.getByText("✓")).toHaveCount(0)
  await expect(board.getByText("venceu:")).toHaveCount(0)
})

test("picking every match enables confirm; confirming reveals the board and panel", async ({
  page,
}) => {
  await page.goto(BRACKET_URL)
  const board = page.getByRole("region", { name: "Chave da competição" })
  await expect(board.locator("button[aria-pressed]").first()).toBeVisible()

  // Estratégia: sempre escolher K-torze quando disponível (o campeão real),
  // senão o primeiro da lista.
  await pickAll(page, (names) => names.find((n) => n === "K-torze") ?? names[0]!)

  const confirm = page.getByRole("button", { name: "Confirmar" })
  await expect(confirm).toBeEnabled()
  await confirm.click()

  // Reveal inline: painel de resultado + chave real marcada no board.
  await expect(page.getByText("Campeão real")).toBeVisible()
  await expect(page.getByText(/acertos/)).toBeVisible()
  await expect(page.getByText("K-torze").first()).toBeVisible()
  await expect(board.getByText("✓").first()).toBeVisible()

  // Persistência: recarregar mantém o resultado confirmado.
  await page.reload()
  await expect(page.getByText("Campeão real")).toBeVisible()
})

test("clear resets picks and pending count returns", async ({ page }) => {
  await page.goto(BRACKET_URL)
  const board = page.getByRole("region", { name: "Chave da competição" })
  const firstPickable = board.locator('button[aria-pressed="false"]').first()
  await firstPickable.click()
  await expect(board.locator('button[aria-pressed="true"]')).toHaveCount(1)
  await page.getByRole("button", { name: "Limpar" }).click()
  await expect(board.locator('button[aria-pressed="true"]')).toHaveCount(0)
})

test("network failure shows retry without breaking other modes", async ({ page }) => {
  await page.unroute("https://app-api.tapout.gg/**")
  await page.route("https://app-api.tapout.gg/**", (route) => route.abort())
  await page.goto(BRACKET_URL)
  await expect(page.getByText("Não deu pra carregar a chave", { exact: false })).toBeVisible()
  await expect(page.getByRole("button", { name: "Tentar de novo" })).toBeVisible()

  await page.getByRole("button", { name: "Clássico" }).click()
  await expect(page.getByLabel("Buscar robô")).toBeVisible()
})
