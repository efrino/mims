export type SchemaHandling = '' | 'additional' | 'advance'

export type ExistingSchemaType = 'none' | 'additional' | 'advance'

export type ResetField = 'pcs' | 'kg' | 'amount'

export type FilterData = {
    customer: string
    periode: string
    type_budget: string
}

export type AdvanceSubmitItem = {
    month: string
    pcs_diff: number
    kg_diff: number
    amount_diff: number
}

export type AdvanceExtraItem = {
    uid: string
    month: string
    pcsPrev: number
    kgPrev: number
    amountPrev: number
    pcsDiff: number | null
    kgDiff: number | null
    amountDiff: number | null
    hint: string
}

export type AdvanceExtraDiffMemory = {
    pcsDiff: number
    kgDiff: number
    amountDiff: number
}
