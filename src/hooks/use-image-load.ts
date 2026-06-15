import { useEffect, useState } from "react"

export function useImageLoad(imageUrl: string): boolean {
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    if (!imageUrl) {
      setIsLoaded(true)
      return
    }

    let cancelled = false
    setIsLoaded(false)

    const image = new Image()
    const settle = () => {
      if (!cancelled) setIsLoaded(true)
    }
    image.onload = settle
    image.onerror = settle
    image.src = imageUrl

    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return isLoaded
}
