/** UTC instants are stored; start is inclusive and end is exclusive. */
export interface Schedule {
  startsAt?: string
  endsAt?: string
}
export function validSchedule(value: { startsAt?: unknown; endsAt?: unknown }): boolean {
  for (const instant of [value.startsAt, value.endsAt]) {
    if (instant === undefined) continue
    if (
      typeof instant !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(instant)
    )
      return false
    const time = Date.parse(instant)
    if (!Number.isFinite(time) || new Date(time).toISOString() !== instant) return false
  }
  return (
    !value.startsAt ||
    !value.endsAt ||
    Date.parse(value.startsAt as string) < Date.parse(value.endsAt as string)
  )
}
export function linkActive(link: Schedule & { visible: boolean }, now = Date.now()) {
  return (
    link.visible &&
    validSchedule(link) &&
    (!link.startsAt || Date.parse(link.startsAt) <= now) &&
    (!link.endsAt || Date.parse(link.endsAt) > now)
  )
}
