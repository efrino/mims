// types/Public/Welding/bom.ts

export interface WeldingBomItem {
    id?: number
    parent_matnr: string
    child_matnr: string
    child_bismt: string | null   // job number (BISMT dari SAP)
    child_name: string | null    // deskripsi part (MAKTG dari SAP)
    mtart: string | null         // material type: FERT / HALB / ROH
    bom_qty: number | null       // BOMQTY
    meins: string | null         // unit: ST / SHT / KG
    sap_stock: number | null     // LABST (stok di SAP)
    lgort: string | null         // storage location (e.g. "2202")
    synced_at: string | null
    synced_by: string | null
}

export interface BomSyncResult {
    success: boolean
    message: string
    inserted: number
    updated: number
    total: number
    synced_at: string
    data: {
        child_matnr: string
        child_bismt: string | null
        child_name: string | null
        mtart: string | null
        bom_qty: number | null
        meins: string | null
        sap_stock: number | null
        lgort: string | null
    }[]
}
