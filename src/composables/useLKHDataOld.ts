// // composables/useLKHData.ts

// import { ref } from 'vue';
// import type { LKHRow } from '@/types/Public/Welding/lkh';

// export function useLKHData() {
//     const lkhData = ref<LKHRow[]>([
//         {
//             no: 1,
//             job_no: 'NX-3975 WIP',
//             part_no: 'P57111-BZ211-00',
//             mc_weld: 'A5 A6',
//             sum_nut_spot: 8,
//             qty_kbn: 40,
//             patan: {
//                 sum_kbn: 3,
//                 lot_size: 120,
//                 lot_cycle: 1,
//                 uph: 167,
//                 sum_stroke: 960,
//                 tpt: 1.4
//             },
//             cut_off_kanban: {
//                 sum_kbn: 3,
//                 lot_size: 120,
//                 sum_stroke: 960,
//                 tpt: 0
//             },
//             actual_prod: {
//                 lot_size: 0,
//                 pjk: 0,
//                 tpt: 0
//             },
//             blc: '',
//             keterangan: ''
//         },
//         {
//             no: 2,
//             job_no: 'NZ-045 0',
//             part_no: '55753-BZ010-00',
//             mc_weld: 'A9',
//             sum_nut_spot: 1,
//             qty_kbn: 50,
//             patan: {
//                 sum_kbn: 4,
//                 lot_size: 200,
//                 lot_cycle: 1,
//                 uph: 333,
//                 sum_stroke: 200,
//                 tpt: 0.6
//             },
//             cut_off_kanban: {
//                 sum_kbn: 5,
//                 lot_size: 250,
//                 sum_stroke: 250,
//                 tpt: 0
//             },
//             actual_prod: {
//                 lot_size: 0,
//                 pjk: 0,
//                 tpt: 0
//             },
//             blc: '',
//             keterangan: ''
//         },
//         {
//             no: 3,
//             job_no: 'AA-0420 0',
//             part_no: 'P57683-BZ040-00',
//             mc_weld: 'A6',
//             sum_nut_spot: 1,
//             qty_kbn: 180,
//             patan: {
//                 sum_kbn: 1,
//                 lot_size: 180,
//                 lot_cycle: 1,
//                 uph: 345,
//                 sum_stroke: 180,
//                 tpt: 0.5
//             },
//             cut_off_kanban: {
//                 sum_kbn: 1,
//                 lot_size: 180,
//                 sum_stroke: 180,
//                 tpt: 0
//             },
//             actual_prod: {
//                 lot_size: 0,
//                 pjk: 0,
//                 tpt: 0
//             },
//             blc: '',
//             keterangan: ''
//         },
//         {
//             no: 4,
//             job_no: 'GT-4885 (ALMINDO)',
//             part_no: '57266-BZ010',
//             mc_weld: 'A6',
//             sum_nut_spot: 4,
//             qty_kbn: 20,
//             patan: {
//                 sum_kbn: 5,
//                 lot_size: 100,
//                 lot_cycle: 1,
//                 uph: 163,
//                 sum_stroke: 400,
//                 tpt: 0.6
//             },
//             cut_off_kanban: {
//                 sum_kbn: 0,
//                 lot_size: 0,
//                 sum_stroke: 0,
//                 tpt: 0
//             },
//             actual_prod: {
//                 lot_size: 0,
//                 pjk: 0,
//                 tpt: 0
//             },
//             blc: '',
//             keterangan: 'ALMINDO'
//         },
//         {
//             no: 5,
//             job_no: 'GT-4885 WIP',
//             part_no: '57266-BZ010',
//             mc_weld: 'A6',
//             sum_nut_spot: 4,
//             qty_kbn: 10,
//             patan: {
//                 sum_kbn: 12,
//                 lot_size: 120,
//                 lot_cycle: 1,
//                 uph: 163,
//                 sum_stroke: 480,
//                 tpt: 0.7
//             },
//             cut_off_kanban: {
//                 sum_kbn: 14,
//                 lot_size: 140,
//                 sum_stroke: 560,
//                 tpt: 0
//             },
//             actual_prod: {
//                 lot_size: 0,
//                 pjk: 0,
//                 tpt: 0
//             },
//             blc: '',
//             keterangan: ''
//         }
//     ]);

//     // Calculate totals
//     const calculateTotals = () => {
//         return {
//             total_patan_stroke: lkhData.value.reduce((sum, row) => sum + row.patan.sum_stroke, 0),
//             total_patan_tpt: lkhData.value.reduce((sum, row) => sum + row.patan.tpt, 0),
//             total_cutoff_stroke: lkhData.value.reduce((sum, row) => sum + row.cut_off_kanban.sum_stroke, 0),
//             total_actual_lot: lkhData.value.reduce((sum, row) => sum + row.actual_prod.lot_size, 0)
//         };
//     };

//     // Export to Excel
//     const exportToExcel = (options: { date: string; shift: number; area: string }) => {
//         console.log('Exporting LKH to Excel:', options);
//         // TODO: Implement Excel export with XLSX library
//         alert(`Export LKH:\nDate: ${options.date}\nShift: ${options.shift}\nArea: ${options.area}`);
//     };

//     // Filter data
//     const filterByMachine = (machine: string) => {
//         if (!machine) return lkhData.value;
//         return lkhData.value.filter(row => 
//             row.mc_weld.toLowerCase().includes(machine.toLowerCase())
//         );
//     };

//     const filterByJobNo = (jobNo: string) => {
//         if (!jobNo) return lkhData.value;
//         return lkhData.value.filter(row => 
//             row.job_no.toLowerCase().includes(jobNo.toLowerCase())
//         );
//     };

//     return {
//         lkhData,
//         calculateTotals,
//         exportToExcel,
//         filterByMachine,
//         filterByJobNo
//     };
// }
