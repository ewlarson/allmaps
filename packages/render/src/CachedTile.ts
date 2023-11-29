import { fetchImage } from '@allmaps/stdlib'
import { WarpedMapEvent, WarpedMapEventType } from './shared/events.js'

import type { Tile, ImageRequest } from '@allmaps/types'

export type FetchableTile = {
  tile: Tile
  imageRequest: ImageRequest
  tileUrl: string
}

export type FetchableMapTile = FetchableTile & { mapId: string }

export default class CacheableTile extends EventTarget {
  readonly tile: Tile
  readonly imageRequest: ImageRequest
  readonly tileUrl: string
  imageBitmap?: ImageBitmap

  protected abortController: AbortController

  constructor(fetchableTile: FetchableTile) {
    super()

    this.tile = fetchableTile.tile
    this.imageRequest = fetchableTile.imageRequest
    this.tileUrl = fetchableTile.tileUrl

    this.abortController = new AbortController()
  }

  async fetch() {
    try {
      const image = await fetchImage(this.tileUrl, this.abortController.signal)
      this.imageBitmap = await createImageBitmap(image)

      this.dispatchEvent(
        new WarpedMapEvent(WarpedMapEventType.TILEFETCHED, this.tileUrl)
      )

      return this.imageBitmap
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // fetchImage was aborted because viewport was moved and tile
        // is no longer needed. This error can be ignored, nothing to do.
      } else {
        this.dispatchEvent(
          new WarpedMapEvent(WarpedMapEventType.TILEFETCHERROR, this.tileUrl)
        )
      }
    }
  }

  get fetching() {
    return this.imageBitmap ? false : true
  }

  abort() {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort()
    }
  }
}

export class CachedTile extends CacheableTile {
  imageBitmap!: ImageBitmap
  constructor(fetchableTile: FetchableTile) {
    super(fetchableTile)
  }
}

export function isCachedTile(
  cacheableTile: CacheableTile
): cacheableTile is CachedTile {
  return cacheableTile.imageBitmap !== undefined
}
