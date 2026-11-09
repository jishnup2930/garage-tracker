import { addDays, format, parseISO } from 'date-fns'
import type { DateStr } from '../types'

export interface CalendarEvent {
  uid: string
  title: string
  description: string
  date: DateStr
  /** Days before the date to alert; the alert fires at 9:00 that morning. */
  leadDays: number
}

const compact = (d: DateStr) => d.replaceAll('-', '')
const nextDay = (d: DateStr) => format(addDays(parseISO(d), 1), 'yyyyMMdd')
// RFC 5545 text: escape backslash, semicolon, comma and newlines.
export const esc = (s: string) => s.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\r?\n/g, '\\n')

/** RFC 5545 lines are at most 75 octets; longer ones continue on lines that start with a space. */
export function fold(line: string): string {
  const enc = new TextEncoder()
  const out: string[] = []
  let cur = ''
  for (const ch of line) {
    if (enc.encode(cur + ch).length > (out.length ? 74 : 75)) {
      out.push(cur)
      cur = ''
    }
    cur += ch
  }
  return [...out, cur].join('\r\n ')
}

/** An all-day .ics event with an alarm, which phone calendars import with one tap. */
export function icsFor(e: CalendarEvent, now = new Date()): string {
  // All-day events start at midnight, so 9am on the lead day is (lead days back) plus 9 hours. Written in
  // days (nominal time) rather than hours so the alarm stays at 9am across a daylight-saving change.
  const trigger = e.leadDays > 0 ? `-P${e.leadDays - 1}DT15H` : 'PT9H'
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Garage Tracker//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    // The due date is part of the UID, so a renewed date imports as a new event rather than an ignored repeat.
    `UID:${e.uid}-${compact(e.date)}@garagetracker`,
    `DTSTAMP:${now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`,
    `DTSTART;VALUE=DATE:${compact(e.date)}`,
    `DTEND;VALUE=DATE:${nextDay(e.date)}`,
    `SUMMARY:${esc(e.title)}`,
    `DESCRIPTION:${esc(e.description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${esc(e.title)}`,
    `TRIGGER:${trigger}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ]
  return lines.map(fold).join('\r\n') + '\r\n'
}

/** Opens Google Calendar's "new event" page pre-filled. Google applies the user's own default alerts. */
export function googleCalendarUrl(e: CalendarEvent): string {
  const q = new URLSearchParams({ action: 'TEMPLATE', text: e.title, details: e.description, dates: `${compact(e.date)}/${nextDay(e.date)}` })
  return `https://calendar.google.com/calendar/render?${q}`
}
