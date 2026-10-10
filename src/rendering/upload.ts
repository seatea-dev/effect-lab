export const UPLOAD_BYTE_LIMIT = 20_000_000

/** Signature checks identify candidates. The browser decoder still validates the image. */
export async function validateUpload(file: Blob): Promise<'jpeg' | 'png' | 'webp'> {
  if (file.size > UPLOAD_BYTE_LIMIT) throw new Error('Choose an image no larger than 20 MB.')
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpeg'
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return 'png'
  if ([82, 73, 70, 70].every((value, index) => bytes[index] === value)
    && [87, 69, 66, 80].every((value, index) => bytes[index + 8] === value)) return 'webp'
  throw new Error('Choose a JPEG, PNG, or WebP image.')
}
