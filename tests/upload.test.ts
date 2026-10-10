import { expect, test } from 'vitest'
import { validateUpload } from '../src/rendering/upload'

test('recognizes allowed file signatures rather than names or MIME types', async () => {
  const jpeg = new File([new Uint8Array([255, 216, 255, 224])], 'photo.txt', { type: 'text/plain' })
  expect(await validateUpload(jpeg)).toBe('jpeg')
  await expect(validateUpload(new File(['<svg/>'], 'fake.png', { type: 'image/png' }))).rejects.toThrow('JPEG, PNG, or WebP')
})

test('accepts the exact byte limit but rejects the next byte, even with a valid signature', async () => {
  const header = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  expect(await validateUpload(new Blob([header, new Uint8Array(19_999_992)]))).toBe('png')
  await expect(validateUpload(new Blob([header, new Uint8Array(19_999_993)]))).rejects.toThrow('20 MB')
})

test('requires complete PNG and WebP signatures and rejects empty inputs', async () => {
  expect(await validateUpload(new Blob([new Uint8Array([82, 73, 70, 70, 16, 0, 0, 0, 87, 69, 66, 80])]))).toBe('webp')
  for (const bytes of [[], [137, 80, 78, 71], [82, 73, 70, 70, 0, 0, 0, 0], [255, 216]]) {
    await expect(validateUpload(new Blob([new Uint8Array(bytes)]))).rejects.toThrow('JPEG, PNG, or WebP')
  }
})
