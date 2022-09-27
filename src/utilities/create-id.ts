import crypto from 'node:crypto'
import { JsonObject } from 'type-fest'

export function createId(object: JsonObject): string {
  return crypto.createHash('md5').update(JSON.stringify(object)).digest('hex')
}
