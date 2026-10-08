<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import BaseBreadcrumb from '@/components/shared/BaseBreadcrumb.vue';
import { useWeldingSchedule } from '@/stores/PCD/Welding/WeldingSchedule';
import { storeToRefs } from 'pinia';
import QrcodeVue from 'qrcode.vue';
import { useUtilityStore } from '@/stores/utility';

const page = ref({ title: 'Priview Tag OK Welding Schedule' });
const breadcrumbs = shallowRef([
  {
    title: 'PCD',
    disabled: false,
    href: '#'
  },
  {
    title: 'Welding',
    disabled: false,
    href: '#'
  },
  {
    title: 'Welding Schedule',
    disabled: false,
    href: '/pcd/welding/schedule'
  },
  {
    title: 'Priview Tag OK Welding Schedule',
    disabled: true,
    href: '#'
  }
]);

const store = useWeldingSchedule();
const { tableTagOk, printers, isPrinted, selectedPrinter } = storeToRefs(store);
const utilityStore = useUtilityStore();
let timeNow = ref<String | null>(null);

onMounted( async () => {
	await store.fetchDataTagOK();
	await store.getPrinters();
	getTimeNow();
})

const getTimeNow = () => {
	const now = new Date();

	const day = String(now.getDate()).padStart(2, '0');
	const month = String(now.getMonth() + 1).padStart(2, '0');
	const year = now.getFullYear();

	const hours = String(now.getHours()).padStart(2, "0");
	const minutes = String(now.getMinutes()).padStart(2, "0");
	const seconds = String(now.getSeconds()).padStart(2, "0");
	
	timeNow.value = `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`;
};

const printTagOk = () => {
  store.printArea(selectedPrinter.value)
}

</script>

<template>
  <BaseBreadcrumb :title="page.title" :breadcrumbs="breadcrumbs" class="mb-7"></BaseBreadcrumb>
  <div class="flex flex-col justify-center">

		<!-- button -->
		<div class="flex w-full justify-center align-end gap-7 my-10">
			<div class="w-1/4">
				<label for="printer" class="block mb-2 text-sm font-medium text-gray-900">Printer</label>
				<select v-model="selectedPrinter" id="printer" class="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
					<option disabled value="">Pilih</option>
					<option v-for="item in printers" :key="item" :value="item">
						{{ item }}
					</option>
				</select>
			</div>
			<div class="">
				<button 
					type="button"
					@click="printTagOk"
					class="text-white bg-blue-600 hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 font-medium rounded-full text-sm px-5 py-2.5 text-center me-2"
				>
					Print Tag OK
				</button>
			</div>
		</div>

		<!-- table -->
		<div v-if="tableTagOk && tableTagOk?.length > 0  && isPrinted === false" class="flex flex-wrap justify-center">
			<div
				class="mx-3 my-3"
				id="print-content"
				v-for="(item, index) in tableTagOk"
				:key="index"
			>
				<table class="text-center overflow-auto table-fs">
					<tbody>
						<tr>
							<th colspan="2" class="font-weight-black">PT MAJ</th>
							<th colspan="2" class="text-h5 font-weight-black">
								TAG OK WLD
							</th>
							<th
								rowspan="2"
								colspan="2"
								:class="[
									'font-weight-black identity-text',
									item.identity === null || item.identity == undefined
										? 'text-4xl'
										: item.identity?.length > 18
										? 'text-xl'
										: 'text-2xl',
								]"
							>
								{{
									item.part_number === "57451-BZ200-00-KZ"
										? "DCWA"
										: item.identity ??
											(item.part_name?.includes("RH")
												? "RH"
												: item.part_name?.includes("LH")
												? "LH"
												: "")
								}}
							</th>
						</tr>
						<tr>
							<td class="whitespace-nowrap">{{ utilityStore.dateIndonesian(item.date!) }}</td>
							<td>{{ index + 1 }}/{{ item.total_tag_ok }}</td>
							<td colspan="2">{{ item.id_tag_ok }}</td>
						</tr>
						<tr>
							<td>USER</td>
							<td>SHIFT</td>
							<td>LINE</td>
							<td rowspan="3" v-if="item && item.id_tag_ok">
								<qrcode-vue
									v-if="item.id_tag_ok"
									:value="item.id_tag_ok"
									:size="80"
								/>
							</td>
							<td rowspan="3">
								QTY/KBN <br />
								<span class="text-4xl font-weight-black">{{
									item.qty_kbn
								}}</span>
							</td>
							<td rowspan="3">
								JOB NO. <br />
								<span
									class="font-weight-black wrap-text"
									:class="
										item.job_number
											? item.job_number?.length > 11
												? 'text-h7'
												: 'text-h5'
											: ''
									"
								>
									{{ item.job_number }}
								</span>
							</td>
						</tr>
						<tr class="font-weight-black">
							<td>{{ item.user_create }}</td>
							<td>{{ item.shift }}</td>
							<td>
								{{
									item.line_id != null && item.line_id != ""
										? item.line_id == "OUT"
											? "-"
											: item.line_id
										: "-"
								}}
							</td>
						</tr>
						<tr>
							<td>PIC</td>
							<td>DATE</td>
							<td>NAME</td>
						</tr>
						<tr>
							<td>WELDING</td>
							<td></td>
							<td></td>
							<td colspan="3" class="font-weight-black">
								{{ item.part_number }}
							</td>
						</tr>
						<tr>
							<td>QC</td>
							<td></td>
							<td></td>
							<td colspan="3" class="font-weight-black part-name">
								{{
									item.part_name && item.part_name?.length > 33
										? item.part_name.substring(0, 33) + "..."
								: (item.part_name || '-')
								}}
							</td>
						</tr>
						<tr>
							<td>LOG</td>
							<td></td>
							<td></td>
							<td class="font-weight-black">
								{{ item.status }}
							</td>
							<td colspan="2" class="whitespace-nowrap">
								{{ timeNow }}
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<div v-else class="flex flex-col justify-center h-full items-center">
			<h1 class="text-lg mt-10 font-semibold text-gray-500">Tag OK tidak tersedia atau sudah di print sebelumnya</h1>
			<h1 class="text-sm text-gray-500 mt-3">Silahkan kembali ke halaman awal dan membuat Tag OK yang baru.</h1>
			<a 
				type="button" 
				href="/pcd/welding/schedule"
				class="flex gap-2 text-gray-500 border border-gray-300 focus:outline-none hover:bg-gray-100 focus:ring-4 focus:ring-gray-100 font-medium rounded-lg text-sm px-5 py-2.5 mt-5"
			>
				<svg class="w-5 h-5 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
					<path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12l4-4m-4 4 4 4"/>
				</svg>
				Kembali
			</a>
		</div>
  </div>
</template>

<style>
  .border {
    border: .5px solid #D1D5DB !important;
  }

  .box {
    border: 2px dashed #9CA3AF; 
    padding: 12px;
  }

  .part-name,
  .text-h7 {
    font-size: 0.7rem;
  }
  .identity-text {
    max-width: 100px;
    word-break: break-word;
    white-space: pre-wrap;
    text-align: center;
  }

  .wrap-text {
    display: inline-block;
    max-width: 7ch;
    word-break: break-word;
    overflow-wrap: break-word;
    text-align: center;
  }

  .table-fs {
    border-collapse: collapse;
    border-spacing: 0;
    max-height: 7cm !important;
  }

  .table-fs td,
  .table-fs th {
    padding: 2px;
  }

  #print-content td,
  #print-content th {
    border: 1px solid black;
  }

  #print-content table {
    border-collapse: collapse !important;
    font-family: Arial, Helvetica, sans-serif !important;
  }

  .arsir {
    min-width: 50px !important;
    min-height: 300px !important;
    max-width: 50px !important;
    max-height: 300px !important;
    padding: 0;
  }
</style>