export interface SourceEmployee {
  nik: string;
  name: string;
  department: string;
  division: string;
  job_title: string;
  active: number;
}

export interface WhitelistEmployee {
  nik: string;
  name: string;
  gender: string;
  department: string;
  division: string;
  job_title: string;
  emp_status: string;
  // Jumlah maksimal kasbon non-Closed yang boleh aktif bersamaan untuk NIK ini — dikelola di whitelist,
  // TIDAK ikut ter-reset saat sync=true dari master
  kasbon_limit: number;
  active: number;
  // Nama file dokumen PDF tersimpan (mis. KTP/sertifikat) — hanya nama file, path fisik hard-coded di backend
  document: string | null;
}

export interface EmployeeEditForm {
  name: string;
  gender: string;
  department: string;
  division: string;
  job_title: string;
  emp_status: string;
  kasbon_limit: number | null;
  // Diisi hanya saat user memilih file baru untuk di-upload — dikosongkan lagi setelah submit supaya
  // PUT berikutnya (tanpa ganti dokumen) tidak ikut mengirim ulang base64 yang sama.
  document_filename: string | null;
  document_base64: string | null;
}

export interface AutocompleteOption {
  value: string;
  label: string;
  sublabel?: string;
}
