import db from '@adonisjs/lucid/services/db'
export const activityDays = 30
export function activityCutoff() {
  return new Date(Date.now() - activityDays * 86400000)
}
export async function purgeOldActivity() {
  await db.from('page_events').where('created_at', '<', activityCutoff()).delete()
}
