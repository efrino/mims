# Audit tema gelap & responsive — 2026-10-02

Hasil scan statis `src/views/**` yang terdaftar di router (174 halaman). Heuristik, bukan uji browser:
- **Tema**: jumlah warna terang tertulis langsung (`bg-white`, `text-gray-600`, `#fff`, style inline) vs varian `dark:` / kelas `wui-*`. Ditandai bila ≥5 warna terang dan varian gelap < 30%.
- **Responsive**: halaman >80 baris tanpa breakpoint (`sm:/md:/lg:`, `@media`, `v-col md=`, `useDisplay`) atau dengan lebar tetap ≥1000px / kolom ≥100px dipaksa.

| Ringkasan | Jumlah |
|---|---|
| Halaman diperiksa | 174 |
| Belum dukung tema gelap | 130 |
| Belum responsive | 91 |
| Keduanya | 73 |
| Sudah aman tema | 44 |

## admin/PCD (42)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [SimulationEdit.vue](../../src/views/admin/PCD/Welding/SimulationEdit.vue) | ✗ | ✓ | 514 | 0 | 16 | 0 |
| [SimulationCreate.vue](../../src/views/admin/PCD/Welding/SimulationCreate.vue) | ✗ | ✓ | 502 | 0 | 17 | 0 |
| [SubAssySimulationEdit.vue](../../src/views/admin/PCD/Welding/SubAssy/SubAssySimulationEdit.vue) | ✗ | ✓ | 387 | 0 | 16 | 0 |
| [SubAssySimulationCreate.vue](../../src/views/admin/PCD/Welding/SubAssy/SubAssySimulationCreate.vue) | ✗ | ✓ | 376 | 0 | 17 | 0 |
| [SimulationDetail.vue](../../src/views/admin/PCD/Welding/SimulationDetail.vue) | ✗ | ✓ | 204 | 0 | 16 | 0 |
| [SubAssySimulationDetail.vue](../../src/views/admin/PCD/Welding/SubAssy/SubAssySimulationDetail.vue) | ✗ | ✓ | 202 | 0 | 16 | 0 |
| [Patan.vue](../../src/views/admin/PCD/Stamping/Patan.vue) | ✗ | ✗ | 140 | 0 | 9 | 2 |
| [glc-uji-skema.vue](../../src/views/admin/PCD/Welding/glc-uji-skema.vue) | ✗ | ✗ | 130 | 0 | 3 | 2 |
| [WeldingSchedule.vue](../../src/views/admin/PCD/Welding/WeldingSchedule.vue) | ✗ | ✗ | 126 | 0 | 12 | 2 |
| [area-machine.vue](../../src/views/admin/PCD/Master/area-machine.vue) | ✓ | ✗ | 83 | 70 | 1 | 1 |
| [glc-robot.vue](../../src/views/admin/PCD/Welding/glc-robot.vue) | ✗ | ✗ | 76 | 0 | 2 | 2 |
| [SimulationPatan.vue](../../src/views/admin/PCD/Welding/SimulationPatan.vue) | ✗ | ✓ | 69 | 0 | 10 | 0 |
| [SubAssySimulationPatan.vue](../../src/views/admin/PCD/Welding/SubAssy/SubAssySimulationPatan.vue) | ✗ | ✓ | 69 | 0 | 10 | 0 |
| [lkh.vue](../../src/views/admin/PCD/Welding/lkh.vue) | ✗ | ✗ | 61 | 0 | 0 | 0 |
| [MasterDataAndonWelding.vue](../../src/views/admin/PCD/Master/MasterDataAndonWelding.vue) | ✗ | ✓ | 56 | 0 | 6 | 0 |
| [SimulationCompare.vue](../../src/views/admin/PCD/Welding/SimulationCompare.vue) | ✗ | ✓ | 56 | 0 | 7 | 0 |
| [mutasi-unified.vue](../../src/views/admin/PCD/Welding/mutasi-unified.vue) | ✗ | ✗ | 50 | 0 | 3 | 1 |
| [machine-utilization.vue](../../src/views/admin/PCD/Welding/machine-utilization.vue) | ✗ | ✗ | 42 | 0 | 0 | 0 |
| [ReportPareto.vue](../../src/views/admin/PCD/Stamping/ReportPareto.vue) | ✗ | ✓ | 39 | 0 | 3 | 0 |
| [MasterPartAndon.vue](../../src/views/admin/PCD/Master/MasterPartAndon.vue) | ✗ | ✓ | 37 | 0 | 5 | 0 |
| [PrintKanban.vue](../../src/views/admin/PCD/Kanban/PrintKanban.vue) | ✗ | ✓ | 35 | 0 | 1 | 0 |
| [MasterDataKanban.vue](../../src/views/admin/PCD/Master/MasterDataKanban.vue) | ✗ | ✓ | 32 | 0 | 3 | 0 |
| [SimulationLiveDashboard.vue](../../src/views/admin/PCD/Welding/SimulationLiveDashboard.vue) | ✗ | ✗ | 28 | 0 | 0 | 0 |
| [MachinePress.vue](../../src/views/admin/PCD/Master/MachinePress.vue) | ✗ | ✗ | 27 | 0 | 0 | 0 |
| [SimulationMonitoring.vue](../../src/views/admin/PCD/Welding/SimulationMonitoring.vue) | ✗ | ✗ | 27 | 0 | 0 | 0 |
| [SubAssySimulation.vue](../../src/views/admin/PCD/Welding/SubAssy/SubAssySimulation.vue) | ✗ | ✓ | 25 | 0 | 3 | 0 |
| [params-mutasi.vue](../../src/views/admin/PCD/Auto/params-mutasi.vue) | ✗ | ✗ | 24 | 0 | 0 | 0 |
| [Simulation.vue](../../src/views/admin/PCD/Welding/Simulation.vue) | ✗ | ✓ | 24 | 0 | 3 | 0 |
| [WeeklyAchievement.vue](../../src/views/admin/PCD/Welding/WeeklyAchievement.vue) | ✗ | ✓ | 20 | 0 | 1 | 0 |
| [WeeklyAchievement.vue](../../src/views/admin/PCD/Stamping/WeeklyAchievement.vue) | ✗ | ✓ | 18 | 0 | 1 | 0 |
| [ScanKanbanSTO.vue](../../src/views/admin/PCD/Kanban/ScanKanbanSTO.vue) | ✗ | ✓ | 17 | 0 | 0 | 0 |
| [ScanKanbanIN.vue](../../src/views/admin/PCD/Kanban/ScanKanbanIN.vue) | ✗ | ✓ | 16 | 0 | 1 | 0 |
| [ScanKanbanOUT.vue](../../src/views/admin/PCD/Kanban/ScanKanbanOUT.vue) | ✗ | ✓ | 16 | 0 | 1 | 0 |
| [PreviewTagOkPress.vue](../../src/views/admin/PCD/Stamping/PreviewTagOkPress.vue) | ✗ | ✗ | 10 | 0 | 0 | 0 |
| [PreviewTagOKWeldSched.vue](../../src/views/admin/PCD/Welding/PreviewTagOKWeldSched.vue) | ✗ | ✗ | 10 | 0 | 0 | 0 |
| [master-data.vue](../../src/views/admin/PCD/Master/master-data.vue) | ✗ | ✓ | 8 | 0 | 12 | 0 |
| [welding_glc.vue](../../src/views/admin/PCD/Welding/welding_glc.vue) | ✗ | ✗ | 7 | 0 | 0 | 0 |
| [params-category.vue](../../src/views/admin/PCD/Auto/params-category.vue) | ✗ | ✓ | 5 | 0 | 0 | 0 |
| [ScanEKanban.vue](../../src/views/admin/PCD/Kanban/ScanEKanban.vue) | ✗ | ✓ | 5 | 0 | 0 | 0 |
| [GlcSimulationDetail.vue](../../src/views/admin/PCD/Stamping/GlcSimulationDetail.vue) | ✓ | ✗ | 2 | 0 | 3 | 1 |
| [GlcSimulation.vue](../../src/views/admin/PCD/Stamping/GlcSimulation.vue) | ✓ | ✗ | 1 | 0 | 7 | 1 |
| [glc-sub-assy.vue](../../src/views/admin/PCD/Welding/glc-sub-assy.vue) | ✓ | ✗ | 1 | 0 | 0 | 1 |

## admin/Logistik (34)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [Mutation.vue](../../src/views/admin/Logistik/IFP/Transaction/Mutation.vue) | ✗ | ✗ | 490 | 1 | 10 | 2 |
| [RundownTrial.vue](../../src/views/admin/Logistik/IFP/Transaction/RundownTrial.vue) | ✗ | ✗ | 349 | 0 | 13 | 4 |
| [SupplyMaterial.vue](../../src/views/admin/Logistik/IRM/Transaction/SupplyMaterial.vue) | ✗ | ✗ | 195 | 0 | 0 | 0 |
| [ResumePallet.vue](../../src/views/admin/Logistik/Pallet/Report/ResumePallet.vue) | ✗ | ✓ | 171 | 0 | 7 | 0 |
| [Monitoring.vue](../../src/views/admin/Logistik/WIP/Transaction/Monitoring.vue) | ✗ | ✗ | 102 | 0 | 3 | 12 |
| [MasterCustomer.vue](../../src/views/admin/Logistik/IFP/Transaction/MasterCustomer.vue) | ✗ | ✗ | 88 | 1 | 1 | 1 |
| [MasterCycle.vue](../../src/views/admin/Logistik/MasterData/MasterCycle.vue) | ✗ | ✓ | 84 | 0 | 4 | 0 |
| [BarcodeCustomer.vue](../../src/views/admin/Logistik/IFP/Transaction/BarcodeCustomer.vue) | ✗ | ✗ | 75 | 0 | 0 | 0 |
| [MasterStrength.vue](../../src/views/admin/Logistik/MasterData/MasterStrength.vue) | ✗ | ✓ | 75 | 0 | 2 | 0 |
| [Budget.vue](../../src/views/admin/Logistik/MasterData/Budget.vue) | ✗ | ✓ | 70 | 0 | 8 | 0 |
| [PrintBarcodePallet.vue](../../src/views/admin/Logistik/IFP/Transaction/PrintBarcodePallet.vue) | ✗ | ✓ | 64 | 0 | 7 | 0 |
| [ScanPalletOutGroup2.vue](../../src/views/admin/Logistik/Pallet/Transaction/ScanPalletOutGroup2.vue) | ✗ | ✓ | 60 | 0 | 4 | 0 |
| [Incoming.vue](../../src/views/admin/Logistik/MasterData/Incoming.vue) | ✓ | ✗ | 53 | 108 | 12 | 2 |
| [ScanInDriver.vue](../../src/views/admin/Logistik/Pallet/Transaction/ScanInDriver.vue) | ✗ | ✓ | 45 | 0 | 11 | 0 |
| [MierukaShippingAll.vue](../../src/views/admin/Logistik/IFP/Report/MierukaShippingAll.vue) | ✗ | ✓ | 42 | 0 | 17 | 0 |
| [ScanHistoryInhouse.vue](../../src/views/admin/Logistik/IFPP/Report/ScanHistoryInhouse.vue) | ✗ | ✓ | 41 | 0 | 3 | 0 |
| [ScanHistoryOuthouse.vue](../../src/views/admin/Logistik/IFPP/Report/ScanHistoryOuthouse.vue) | ✗ | ✓ | 41 | 0 | 3 | 0 |
| [ScanHistory.vue](../../src/views/admin/Logistik/IFPP/Report/ScanHistory.vue) | ✗ | ✗ | 40 | 0 | 0 | 1 |
| [ScanPalletOutAdm.vue](../../src/views/admin/Logistik/Pallet/Transaction/ScanPalletOutAdm.vue) | ✗ | ✗ | 31 | 0 | 4 | 1 |
| [ScanPalletOutTmmin.vue](../../src/views/admin/Logistik/Pallet/Transaction/ScanPalletOutTmmin.vue) | ✗ | ✗ | 31 | 0 | 4 | 1 |
| [ScanPalletPolybox.vue](../../src/views/admin/Logistik/Pallet/Transaction/ScanPalletPolybox.vue) | ✗ | ✓ | 28 | 0 | 4 | 0 |
| [RundownInhouse.vue](../../src/views/admin/Logistik/IFPP/Transaction/RundownInhouse.vue) | ✗ | ✗ | 25 | 4 | 0 | 1 |
| [RundownOuthouse.vue](../../src/views/admin/Logistik/IFPP/Transaction/RundownOuthouse.vue) | ✗ | ✗ | 25 | 4 | 0 | 1 |
| [UploadRundownInhouse.vue](../../src/views/admin/Logistik/WIP/Transaction/UploadRundownInhouse.vue) | ✗ | ✗ | 25 | 4 | 0 | 1 |
| [UploadRundownOuthouse.vue](../../src/views/admin/Logistik/WIP/Transaction/UploadRundownOuthouse.vue) | ✗ | ✗ | 25 | 4 | 0 | 1 |
| [UploadRundownByExcel.vue](../../src/views/admin/Logistik/IRM/Transaction/UploadRundownByExcel.vue) | ✗ | ✗ | 23 | 4 | 0 | 1 |
| [ScannedTagOk.vue](../../src/views/admin/Logistik/IFP/Report/ScannedTagOk.vue) | ✓ | ✗ | 21 | 51 | 0 | 0 |
| [ScanOkPallet.vue](../../src/views/admin/Logistik/Pallet/Transaction/ScanOkPallet.vue) | ✗ | ✓ | 16 | 0 | 3 | 0 |
| [ListScanShipping.vue](../../src/views/admin/Logistik/IFP/Report/ListScanShipping.vue) | ✗ | ✗ | 14 | 0 | 0 | 0 |
| [ShortageStock.vue](../../src/views/admin/Logistik/IRM/Transaction/ShortageStock.vue) | ✗ | ✗ | 11 | 0 | 0 | 0 |
| [MonitoringPallet.vue](../../src/views/admin/Logistik/Pallet/Report/MonitoringPallet.vue) | ✗ | ✗ | 6 | 0 | 4 | 1 |
| [ScanPalletOut.vue](../../src/views/admin/Logistik/Pallet/Transaction/ScanPalletOut.vue) | ✗ | ✓ | 5 | 0 | 3 | 0 |
| [MonitoringPalletIn.vue](../../src/views/admin/Logistik/Pallet/Report/MonitoringPalletIn.vue) | ✓ | ✗ | 3 | 0 | 1 | 1 |
| [MonitoringPalletOut.vue](../../src/views/admin/Logistik/Pallet/Report/MonitoringPalletOut.vue) | ✓ | ✗ | 1 | 0 | 2 | 1 |

## admin/Stamping (21)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [Achievement.vue](../../src/views/admin/Stamping/Transaction/Achievement/Achievement.vue) | ✗ | ✗ | 208 | 0 | 15 | 9 |
| [AchievementKanban.vue](../../src/views/admin/Stamping/Transaction/Achievement/AchievementKanban.vue) | ✗ | ✗ | 135 | 0 | 9 | 4 |
| [StockPage.vue](../../src/views/admin/Stamping/Report/Stock/StockPage.vue) | ✗ | ✗ | 87 | 0 | 6 | 4 |
| [AchievementSAP.vue](../../src/views/admin/Stamping/Transaction/Achievement/AchievementSAP.vue) | ✗ | ✗ | 53 | 0 | 8 | 4 |
| [AchievementAndon.vue](../../src/views/admin/Stamping/Report/Achievement/AchievementAndon.vue) | ✗ | ✓ | 51 | 0 | 10 | 0 |
| [Lkh.vue](../../src/views/admin/Stamping/Report/Lkh/Lkh.vue) | ✗ | ✓ | 43 | 0 | 1 | 0 |
| [IndexKanbanPage.vue](../../src/views/admin/Stamping/Report/Achievement/IndexKanbanPage.vue) | ✗ | ✗ | 39 | 0 | 0 | 0 |
| [StockPageV2.vue](../../src/views/admin/Stamping/Report/Stock/StockPageV2.vue) | ✗ | ✗ | 35 | 0 | 4 | 2 |
| [MetalFinish.vue](../../src/views/admin/Stamping/Report/MetalFinish/MetalFinish.vue) | ✗ | ✗ | 31 | 0 | 0 | 0 |
| [MetalFinish.vue](../../src/views/admin/Stamping/Transaction/Achievement/MetalFinish.vue) | ✗ | ✓ | 27 | 0 | 6 | 0 |
| [TagOkByPartNumber.vue](../../src/views/admin/Stamping/Transaction/Achievement/TagOkByPartNumber.vue) | ✗ | ✗ | 27 | 6 | 3 | 1 |
| [GangguanMesin.vue](../../src/views/admin/Stamping/Transaction/Achievement/GangguanMesin.vue) | ✗ | ✓ | 20 | 0 | 5 | 0 |
| [CompareMasterPage.vue](../../src/views/admin/Stamping/Report/Stock/CompareMasterPage.vue) | ✗ | ✗ | 18 | 0 | 0 | 0 |
| [TagOKbyKanban.vue](../../src/views/admin/Stamping/Transaction/Achievement/TagOKbyKanban.vue) | ✗ | ✗ | 13 | 0 | 0 | 0 |
| [Achievement.vue](../../src/views/admin/Stamping/Report/Achievement/Achievement.vue) | ✗ | ✗ | 10 | 0 | 0 | 0 |
| [AchievementMachine.vue](../../src/views/admin/Stamping/Report/Achievement/AchievementMachine.vue) | ✗ | ✗ | 10 | 0 | 0 | 0 |
| [AchievementSAP.vue](../../src/views/admin/Stamping/Report/Achievement/AchievementSAP.vue) | ✗ | ✗ | 10 | 0 | 0 | 0 |
| [AchievementSum.vue](../../src/views/admin/Stamping/Report/Achievement/AchievementSum.vue) | ✗ | ✗ | 10 | 0 | 0 | 0 |
| [IndexPage.vue](../../src/views/admin/Stamping/Transaction/Lkh/IndexPage.vue) | ✗ | ✗ | 8 | 0 | 0 | 0 |
| [DiesPairing.vue](../../src/views/admin/Stamping/Master/DiesPairing.vue) | ✓ | ✗ | 3 | 0 | 0 | 0 |
| [SpecMachine.vue](../../src/views/admin/Stamping/Master/SpecMachine.vue) | ✓ | ✗ | 3 | 0 | 0 | 0 |

## views/public (14)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [visualisasi-auto-plan.vue](../../src/views/public/welding/plan/visualisasi-auto-plan.vue) | ✗ | ✗ | 247 | 0 | 3 | 2 |
| [NoMovementView.vue](../../src/views/public/welding/plan/NoMovementView.vue) | ✗ | ✗ | 42 | 0 | 4 | 2 |
| [DisplayView.vue](../../src/views/public/welding/DisplayView.vue) | ✗ | ✗ | 26 | 0 | 2 | 1 |
| [WipManagement.vue](../../src/views/public/welding/WipManagement.vue) | ✗ | ✗ | 23 | 0 | 0 | 0 |
| [ifpwStockView.vue](../../src/views/public/welding/plan/ifpwStockView.vue) | ✗ | ✓ | 21 | 0 | 3 | 0 |
| [StockQueueView.vue](../../src/views/public/welding/plan/StockQueueView.vue) | ✗ | ✓ | 21 | 0 | 11 | 0 |
| [RundownAccuracyIFPD.vue](../../src/views/public/quality/RundownAccuracyIFPD.vue) | ✗ | ✗ | 19 | 0 | 3 | 3 |
| [RundownAccuracyIFPPInhouse.vue](../../src/views/public/quality/RundownAccuracyIFPPInhouse.vue) | ✗ | ✗ | 19 | 0 | 3 | 3 |
| [RundownAccuracyIFPPOuthouse.vue](../../src/views/public/quality/RundownAccuracyIFPPOuthouse.vue) | ✗ | ✗ | 19 | 0 | 3 | 3 |
| [ReconcileView.vue](../../src/views/public/welding/plan/ReconcileView.vue) | ✗ | ✓ | 18 | 0 | 7 | 0 |
| [ResumeInspectionPart.vue](../../src/views/public/quality/ResumeInspectionPart.vue) | ✗ | ✗ | 16 | 0 | 3 | 3 |
| [index.vue](../../src/views/public/welding/plan/index.vue) | ✗ | ✓ | 6 | 0 | 16 | 0 |
| [LineView.vue](../../src/views/public/welding/LineView.vue) | ✓ | ✗ | 4 | 1 | 2 | 1 |
| [index.vue](../../src/views/public/welding/index.vue) | ✓ | ✗ | 2 | 2 | 2 | 4 |

## admin/Welding (13)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [AchievementSAP.vue](../../src/views/admin/Welding/Transaction/AchievementSAP.vue) | ✗ | ✗ | 50 | 0 | 6 | 2 |
| [AchievementKanban.vue](../../src/views/admin/Welding/Report/AchievementKanban.vue) | ✗ | ✗ | 45 | 0 | 0 | 0 |
| [LKH.vue](../../src/views/admin/Welding/Report/LKH.vue) | ✗ | ✓ | 45 | 0 | 1 | 0 |
| [SpecMachine.vue](../../src/views/admin/Welding/Master/SpecMachine.vue) | ✗ | ✓ | 33 | 0 | 48 | 0 |
| [AchievementKanban.vue](../../src/views/admin/Welding/Transaction/AchievementKanban.vue) | ✗ | ✗ | 31 | 0 | 5 | 4 |
| [TagOkByPartNumber.vue](../../src/views/admin/Welding/Transaction/TagOkByPartNumber.vue) | ✗ | ✗ | 27 | 6 | 3 | 1 |
| [Achievement-page3.vue](../../src/views/admin/Welding/Transaction/Achievement-page3.vue) | ✗ | ✓ | 24 | 0 | 2 | 0 |
| [Achievement.vue](../../src/views/admin/Welding/Transaction/Achievement.vue) | ✗ | ✓ | 21 | 0 | 2 | 0 |
| [Achievement_v2.vue](../../src/views/admin/Welding/Transaction/Achievement_v2.vue) | ✗ | ✗ | 19 | 3 | 0 | 0 |
| [TagOkByKanban.vue](../../src/views/admin/Welding/Transaction/TagOkByKanban.vue) | ✗ | ✗ | 13 | 0 | 0 | 0 |
| [Achievement.vue](../../src/views/admin/Welding/Report/Achievement.vue) | ✗ | ✗ | 11 | 0 | 0 | 0 |
| [ScanTagOk.vue](../../src/views/admin/Welding/Transaction/ScanTagOk.vue) | ✗ | ✗ | 8 | 0 | 0 | 0 |
| [Achievement-page2.vue](../../src/views/admin/Welding/Transaction/Achievement-page2.vue) | ✓ | ✗ | 3 | 0 | 0 | 0 |

## admin/Marketing (8)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [UploadSo.vue](../../src/views/admin/Marketing/Daily/UploadSo.vue) | ✗ | ✗ | 1833 | 0 | 285 | 97 |
| [UploadMdfo.vue](../../src/views/admin/Marketing/Monthly/UploadMdfo.vue) | ✗ | ✗ | 901 | 0 | 140 | 64 |
| [BudgetMatHMMI.vue](../../src/views/admin/Marketing/Monthly/Budgeting/HMMI/BudgetMatHMMI.vue) | ✗ | ✗ | 302 | 0 | 0 | 10 |
| [MdfoAnalisis.vue](../../src/views/admin/Marketing/Monthly/MdfoAnalisis.vue) | ✗ | ✗ | 262 | 0 | 18 | 22 |
| [QuotContract.vue](../../src/views/admin/Marketing/Monthly/QuotContract.vue) | ✗ | ✗ | 184 | 0 | 20 | 4 |
| [Mdfo.vue](../../src/views/admin/Marketing/Monthly/Mdfo.vue) | ✗ | ✓ | 181 | 0 | 5 | 0 |
| [WorkingDay.vue](../../src/views/admin/Marketing/Monthly/WorkingDay.vue) | ✗ | ✗ | 46 | 0 | 0 | 1 |
| [BudgetSoHMMI.vue](../../src/views/admin/Marketing/Monthly/Budgeting/HMMI/BudgetSoHMMI.vue) | ✗ | ✗ | 17 | 0 | 1 | 4 |

## admin/Admin (7)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [StoCancelTag.vue](../../src/views/admin/Admin/StoCancelTag.vue) | ✗ | ✓ | 232 | 0 | 2 | 0 |
| [ManageUser.vue](../../src/views/admin/Admin/ManageUser.vue) | ✗ | ✗ | 159 | 0 | 0 | 6 |
| [StoEvent.vue](../../src/views/admin/Admin/StoEvent.vue) | ✗ | ✓ | 119 | 30 | 2 | 0 |
| [DisplayManagement.vue](../../src/views/admin/Admin/DisplayManagement.vue) | ✗ | ✓ | 117 | 0 | 18 | 0 |
| [StoTagList.vue](../../src/views/admin/Admin/StoTagList.vue) | ✗ | ✗ | 111 | 0 | 0 | 0 |
| [PeminjamanBarang.vue](../../src/views/admin/Admin/PeminjamanBarang.vue) | ✓ | ✗ | 89 | 82 | 18 | 1 |
| [StoMasterData.vue](../../src/views/admin/Admin/StoMasterData.vue) | ✗ | ✓ | 68 | 0 | 3 | 0 |

## admin/HRD (4)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [MappedView.vue](../../src/views/admin/HRD/Absensi/MappedView.vue) | ✗ | ✗ | 146 | 0 | 8 | 1 |
| [HenkatenView.vue](../../src/views/admin/HRD/Absensi/HenkatenView.vue) | ✗ | ✓ | 76 | 0 | 16 | 0 |
| [UnmappedView.vue](../../src/views/admin/HRD/Absensi/UnmappedView.vue) | ✗ | ✗ | 67 | 0 | 0 | 0 |
| [ImportMapping.vue](../../src/views/admin/HRD/ImportMapping.vue) | ✗ | ✓ | 23 | 0 | 5 | 0 |

## admin/Finance (3)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [AdvanceSettlement.vue](../../src/views/admin/Finance/Transaction/AdvanceSettlement.vue) | ✓ | ✗ | 163 | 143 | 4 | 2 |
| [Employee.vue](../../src/views/admin/Finance/Master/Employee.vue) | ✓ | ✗ | 98 | 63 | 0 | 0 |
| [Category.vue](../../src/views/admin/Finance/Master/Category.vue) | ✓ | ✗ | 18 | 14 | 0 | 0 |

## admin/Approval (1)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [FolderSharing.vue](../../src/views/admin/Approval/FolderSharing.vue) | ✗ | ✓ | 159 | 21 | 9 | 0 |

## views/dashboard (1)

| Halaman | Tema | Responsive | Warna terang | dark: | Breakpoint | Lebar tetap |
|---|---|---|---|---|---|---|
| [DashboardMAJNEW.vue](../../src/views/dashboard/DashboardMAJNEW.vue) | ✓ | ✗ | 48 | 96 | 0 | 0 |
