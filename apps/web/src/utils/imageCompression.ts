const MAX_SIZE = 5_242_880 // 5 MB

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = url
  })
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => {
        if (blob) resolve(blob)
        else reject(new Error('canvas.toBlob returned null'))
      },
      type,
      quality,
    )
  })
}

/**
 * If the file is under 5 MB, returns it unchanged.
 * Otherwise compresses it to JPEG by iterating quality (0.85 → 0.1),
 * then halving dimensions up to 4 times, until under 5 MB.
 * Throws if compression still can't reach the limit.
 */
export async function compressImageIfNeeded(
  file: File,
): Promise<{ file: File; wasCompressed: boolean }> {
  if (file.size <= MAX_SIZE) return { file, wasCompressed: false }

  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    let width = img.naturalWidth
    let height = img.naturalHeight
    const canvas = document.createElement('canvas')

    for (let sizePass = 0; sizePass < 4; sizePass++) {
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      ctx.drawImage(img, 0, 0, width, height)

      for (let q = 85; q >= 10; q -= 10) {
        const quality = q / 100
        const blob = await canvasToBlob(canvas, 'image/jpeg', quality)
        if (blob.size <= MAX_SIZE) {
          const compressed = new File([blob], file.name, { type: 'image/jpeg' })
          return { file: compressed, wasCompressed: true }
        }
      }

      // Quality alone not enough — halve dimensions for next pass
      width = Math.max(1, Math.floor(width / 2))
      height = Math.max(1, Math.floor(height / 2))
    }

    throw new Error('Could not compress image below 5 MB')
  } finally {
    URL.revokeObjectURL(url)
  }
}
