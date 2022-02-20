import { getFirstParamByToken, getSourcesInItem } from './rppp-helpers'
import { ReaperBase } from 'rppp'

/**
 * Intermediary format between the `rppp` version, and a FluidMusic AudioFile.
 *
 * Unlike an rppp Item, this actually stores the data as JavaScript object
 * properties, not in the reaper-centric Object/Struct format format used by the
 * `rppp` package.
 *
 * Unlike Fluid Music AudioFile class, these doesn't actually have any methods
 * and isn't really designed for manipulating. It is intended to be an
 * intermediary format.
 *
 * As of February 2022, this implements Fluid Music's AudioFileOptions
 * interface, So that it can be passed into a Fluid Music AudioFile constructor
 * and then inserted into a Fluid Music AudioTrack. However, this may change in
 * the future when we add support for MIDI (or other SOURCE types).
 */
export interface Item {
  // The item name, as set in Reaper
  name: string
  // The source file for the item
  path: string
  // trim this many seconds from the beginning of the source file
  startInSourceSeconds: number
  // play this many seconds of the source material
  durationSeconds: number
  // where to place this item on the session timeline
  startTimeSeconds: number
  // the rppp source object that this was created from
  rppSource: ReaperBase
}

export function createItem (rppItem: ReaperBase): Item {
  const simplifiedItems: Item[] = []
  const itemName = getFirstParamByToken(rppItem, 'NAME')
  if (typeof itemName !== 'string') {
    throw new Error(`rppp item does not have a name: ${JSON.stringify(rppItem)}`)
  }
  for (const source of getSourcesInItem(rppItem)) {
    const filename = getFirstParamByToken(source, 'FILE')
    if (typeof filename !== 'string') {
      console.warn('reaparse is skipping an item with no direct FILE. (is it compound?)', rppItem)
    } else {
      const durationSeconds = getFirstParamByToken(rppItem, 'LENGTH')
      const startInSourceSeconds = getFirstParamByToken(rppItem, 'SOFFS')
      const startTimeSeconds = getFirstParamByToken(rppItem, 'POSITION')
      if (
        typeof durationSeconds !== 'number' ||
        typeof startInSourceSeconds !== 'number' ||
        typeof startTimeSeconds !== 'number'
      ) {
        console.warn(`reaparse is skipping an ITEM with missing timing tokens (${filename})...`, rppItem)
      } else {
        simplifiedItems.push({
          name: itemName,
          path: filename,
          durationSeconds,
          startInSourceSeconds,
          startTimeSeconds,
          rppSource: rppItem
        })
      }
    }
  }

  if (simplifiedItems.length === 0) {
    console.error(rppItem)
    throw new Error('reaparse found an item with no sources. This is not currently supported.')
  }
  if (simplifiedItems.length > 1) {
    console.error(rppItem)
    throw new Error('reaparse does not currently support parsing items with multiple sources.')
  }

  return simplifiedItems[0]
}
