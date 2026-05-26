import { afterEach } from "bun:test"

import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { cleanup } from "@testing-library/react"
import "@testing-library/jest-dom"

GlobalRegistrator.register()

afterEach(() => {
  cleanup()
  localStorage.clear()
})
