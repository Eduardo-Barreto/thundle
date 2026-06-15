import { expect, test, type Page } from "@playwright/test"

import robots from "../src/config/robots.json"

const NAMED = robots
  .filter((r) => typeof r.imageUrl === "string" && r.imageUrl.trim().length > 0)
  .map((r) => r.name)

const ANSWER = NAMED[0]!
const WRONG = NAMED.slice(1, 10)

async function guess(page: Page, name: string) {
  const input = page.getByLabel("Buscar robô")
  await input.click()
  await input.fill(name)
  await page.getByRole("option").filter({ hasText: name }).first().click()
}

test("each route renders its own mode with the matching tab active", async ({ page }) => {
  await page.goto("/desfoque")
  await expect(page.getByRole("button", { name: "Desfoque" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByRole("region", { name: "Imagem do robô" })).toBeVisible()

  await page.goto("/zoom")
  await expect(page.getByRole("button", { name: "Zoom" })).toHaveAttribute("aria-pressed", "true")

  await page.goto("/")
  await expect(page.getByRole("button", { name: "Clássico" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
})

test("selecting a mode tab updates the URL path", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Zoom" }).click()
  await expect(page).toHaveURL(/\/zoom$/)
})

test("a wrong guess advances the reveal counter and lists the attempt", async ({ page }) => {
  await page.goto(`/desfoque?answer=${encodeURIComponent(ANSWER)}`)
  await expect(page.getByText(`0/9 nitidez`)).toBeVisible()

  await guess(page, WRONG[0]!)

  await expect(page.getByText(`1/9 nitidez`)).toBeVisible()
  await expect(
    page.getByRole("region", { name: "Chutes anteriores" }).getByText(WRONG[0]!),
  ).toBeVisible()
})

test("guessing the answer wins and records the win under that mode's stats", async ({ page }) => {
  await page.goto(`/desfoque?answer=${encodeURIComponent(ANSWER)}`)
  await guess(page, ANSWER)

  const overlay = page.getByRole("dialog")
  await expect(overlay).toBeVisible()
  await expect(overlay.getByText("1/9 tentativas")).toBeVisible()

  await overlay.getByLabel("Fechar").click()
  await page.getByLabel("Estatísticas").click()
  const stats = page.getByRole("dialog")
  await expect(stats.getByRole("button", { name: "Desfoque" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(stats.getByText("Vitórias").locator("..").getByText("1")).toBeVisible()
})

test("running out of guesses reveals the image as a loss", async ({ page }) => {
  await page.goto(`/zoom?answer=${encodeURIComponent(ANSWER)}`)
  for (const name of WRONG) {
    await guess(page, name)
  }
  const overlay = page.getByRole("dialog")
  await expect(overlay).toBeVisible()
  await expect(overlay.getByText("Imagem revelada")).toBeVisible()
})
