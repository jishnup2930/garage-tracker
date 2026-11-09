import { z } from 'zod'

const isNum = (v: string) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0
export const reqNum = (label: string) => z.string().trim().min(1, `${label} is required`).refine(isNum, 'Enter a valid positive number')
export const optNum = z.string().trim().refine((v) => v === '' || isNum(v), 'Enter a valid positive number')
export const reqDate = (label: string) => z.string().regex(/^\d{4}-\d{2}-\d{2}$/, `${label} is required`)
export const optDate = z.string().refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Enter a valid date')
export const optText = z.string().trim().max(500, 'Keep this under 500 characters')

export const toNum = (v: string) => Number(v)
export const toOptNum = (v: string) => (v.trim() === '' ? undefined : Number(v))
export const toOpt = (v: string) => (v.trim() === '' ? undefined : v.trim())
export const str = (v: number | string | undefined | null) => (v == null ? '' : String(v))
