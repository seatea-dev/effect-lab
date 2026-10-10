import urbanUrl from '../assets/urban.jpg'
import portraitUrl from '../assets/portrait.jpg'
import architectureUrl from '../assets/architecture.jpg'
import natureUrl from '../assets/nature.jpg'
import abstractUrl from '../assets/abstract.jpg'
import urbanThumb from '../assets/urban-thumb.jpg'
import portraitThumb from '../assets/portrait-thumb.jpg'
import architectureThumb from '../assets/architecture-thumb.jpg'
import natureThumb from '../assets/nature-thumb.jpg'
import abstractThumb from '../assets/abstract-thumb.jpg'

export type SampleDefinition = {
  id: string; name: string; subject: string; description: string
  url: string; thumbnailUrl: string; width: number; height: number
  creator: string; sourceUrl: string; license: string; licenseUrl: string
}

export const urbanSample: SampleDefinition = {
  id: 'urban', name: 'Sixth Avenue at dusk', subject: 'Urban',
  description: 'Brick facades, windows, and evening traffic at Sixth Avenue and 36th Street in Manhattan.',
  url: urbanUrl, thumbnailUrl: urbanThumb, width: 1920, height: 1153,
  creator: 'Jim Henderson', sourceUrl: 'https://commons.wikimedia.org/wiki/File:980_Sixth_Av_36_Street_dusk_jeh.jpg',
  license: 'CC0 1.0', licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
}

export const samples: readonly SampleDefinition[] = [
  {
    id: 'portrait', name: 'Mae Jemison', subject: 'Portrait',
    description: 'NASA astronaut Mae Jemison smiling in an orange flight suit.',
    url: portraitUrl, thumbnailUrl: portraitThumb, width: 1536, height: 1920,
    creator: 'NASA', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Mae_Carol_Jemison_(cropped_2).jpg',
    license: 'Public domain', licenseUrl: 'https://www.nasa.gov/nasa-brand-center/images-and-media/',
  },
  {
    id: 'architecture', name: 'Jefferson Memorial at dusk', subject: 'Architecture',
    description: 'The illuminated columns and dome of the Jefferson Memorial reflected in water at dusk.',
    url: architectureUrl, thumbnailUrl: architectureThumb, width: 1920, height: 1540,
    creator: 'Carol M. Highsmith', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Jefferson_Memorial_dusk_Highsmith.jpg',
    license: 'Public domain', licenseUrl: 'https://www.loc.gov/pictures/collection/highsm/rights.html',
  },
  {
    id: 'nature', name: 'The Tetons and the Snake River', subject: 'Nature',
    description: 'Ansel Adams photograph of a winding river beneath mountains and dramatic clouds.',
    url: natureUrl, thumbnailUrl: natureThumb, width: 1920, height: 1537,
    creator: 'Ansel Adams / National Park Service', sourceUrl: 'https://commons.wikimedia.org/wiki/File:Adams_The_Tetons_and_the_Snake_River.jpg',
    license: 'Public domain', licenseUrl: 'https://www.archives.gov/research/ansel-adams',
  },
  urbanSample,
  {
    id: 'abstract', name: 'Circles in balance', subject: 'Geometric',
    description: 'Rust and ochre circles overlap a slate triangle on warm paper.',
    url: abstractUrl, thumbnailUrl: abstractThumb, width: 1920, height: 1440,
    creator: 'Imprint project', sourceUrl: '', license: 'CC0 1.0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
  },
]

export function getSample(id: string): SampleDefinition {
  const sample = samples.find((entry) => entry.id === id)
  if (!sample) throw new Error('Unknown sample image.')
  return sample
}
