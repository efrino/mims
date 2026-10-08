import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export interface AccumulationData {
  period?: {
    start_date: string;
    end_date: string;
    spmon?: string;
  };
  top_highest_accumulation: Array<{
    zcust: string;
    customer: string;
    model: string;
    route: string;
    part_number: string;
    job_number: string;
    mdfo: number;
    sales_order: number;
    accum: number;
  }>;
  top_lowest_accumulation: Array<{
    zcust: string;
    customer: string;
    model: string;
    route: string;
    part_number: string;
    job_number: string;
    mdfo: number;
    sales_order: number;
    accum: number;
  }>;
  accumulation_by_customer_model: Array<{
    zcust: string;
    customer: string;
    model: string;
    mdfo: number;
    sales_order: number;
    accum: number;
    sales_order_achievement: number;
  }>;
}

function updateCellText(tcNode: Element, newText: string, doc: Document, fontSize?: number, textColorHex?: string) {
  const aNs = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const color = textColorHex || '000000';

  // Pastikan <a:txBody> ada di dalam <a:tc>
  let txBody = tcNode.getElementsByTagNameNS(aNs, 'txBody')[0];
  if (!txBody) {
    txBody = doc.createElementNS(aNs, 'a:txBody');
    const bodyPr = doc.createElementNS(aNs, 'a:bodyPr');
    const lstStyle = doc.createElementNS(aNs, 'a:lstStyle');
    const p = doc.createElementNS(aNs, 'a:p');
    const pPr = doc.createElementNS(aNs, 'a:pPr');
    pPr.setAttribute('marL', '0');
    pPr.setAttribute('indent', '0');
    pPr.setAttribute('algn', 'ctr');
    const buNone = doc.createElementNS(aNs, 'a:buNone');
    pPr.appendChild(buNone);
    p.appendChild(pPr);

    txBody.appendChild(bodyPr);
    txBody.appendChild(lstStyle);
    txBody.appendChild(p);

    const tcPr = tcNode.getElementsByTagNameNS(aNs, 'tcPr')[0];
    if (tcPr) {
      tcNode.insertBefore(txBody, tcPr);
    } else {
      tcNode.appendChild(txBody);
    }
  }

  // Jika teks kosong (misal sel baris lanjutan merge), kosongkan semua elemen <a:t>
  const tList = txBody.getElementsByTagNameNS(aNs, 't');
  if (newText === '') {
    for (let i = 0; i < tList.length; i++) {
      tList[i].textContent = '';
    }
    return;
  }

  if (tList.length > 0) {
    tList[0].textContent = newText;
    for (let i = 1; i < tList.length; i++) {
      tList[i].textContent = '';
    }
  } else {
    let p = txBody.getElementsByTagNameNS(aNs, 'p')[0];
    if (!p) {
      p = doc.createElementNS(aNs, 'a:p');
      const pPr = doc.createElementNS(aNs, 'a:pPr');
      pPr.setAttribute('marL', '0');
      pPr.setAttribute('indent', '0');
      pPr.setAttribute('algn', 'ctr');
      const buNone = doc.createElementNS(aNs, 'a:buNone');
      pPr.appendChild(buNone);
      p.appendChild(pPr);
      txBody.appendChild(p);
    }

    const r = doc.createElementNS(aNs, 'a:r');
    const rPr = doc.createElementNS(aNs, 'a:rPr');
    rPr.setAttribute('lang', 'en-US');
    rPr.setAttribute('sz', fontSize ? fontSize.toString() : '1000');
    rPr.setAttribute('dirty', '0');

    const solidFill = doc.createElementNS(aNs, 'a:solidFill');
    const srgbClr = doc.createElementNS(aNs, 'a:srgbClr');
    srgbClr.setAttribute('val', color);
    solidFill.appendChild(srgbClr);
    rPr.appendChild(solidFill);

    const latin = doc.createElementNS(aNs, 'a:latin');
    latin.setAttribute('typeface', 'Bahnschrift');
    rPr.appendChild(latin);

    const t = doc.createElementNS(aNs, 'a:t');
    t.textContent = newText;

    r.appendChild(rPr);
    r.appendChild(t);
    p.appendChild(r);
  }

  if (fontSize) {
    const rPrList = tcNode.getElementsByTagNameNS(aNs, 'rPr');
    for (let i = 0; i < rPrList.length; i++) {
      rPrList[i].setAttribute('sz', fontSize.toString());
    }
  }

  const rPrList = tcNode.getElementsByTagNameNS(aNs, 'rPr');
  for (let i = 0; i < rPrList.length; i++) {
    const rPr = rPrList[i];
    let solidFill = rPr.getElementsByTagNameNS(aNs, 'solidFill')[0];
    if (!solidFill) {
      solidFill = doc.createElementNS(aNs, 'a:solidFill');
      rPr.appendChild(solidFill);
    }
    while (solidFill.firstChild) {
      solidFill.removeChild(solidFill.firstChild);
    }
    const srgbClr = doc.createElementNS(aNs, 'a:srgbClr');
    srgbClr.setAttribute('val', color);
    solidFill.appendChild(srgbClr);
  }
}

function formatThousand(num: number | string | undefined | null): string {
  if (num === null || num === undefined || num === '') return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString('id-ID');
}

function formatPercentage(accum: number | string | undefined | null, mdfo: number | string | undefined | null): string {
  const a = Number(accum) || 0;
  const m = Number(mdfo) || 0;
  if (!m || isNaN(m) || m === 0) return '0%';
  const pct = Math.round(Math.abs((a / m) * 100));
  return `${pct}%`;
}

function getJobOrPartNumber(item: any): string {
  if (!item) return '-';
  const job = (item.job_number || '').toString().trim();
  if (job && job !== '-' && job.toLowerCase() !== 'null' && job.toLowerCase() !== 'undefined') {
    return job;
  }
  const part = (item.part_number || item.matnr || '').toString().trim();
  return part || '-';
}

/**
 * Format rentang tanggal ke format Indonesia:
 * Contoh:
 * Slide 1: 1 AGUSTUS 2026 - 07 AGUSTUS 2026
 * Slide 2 & 3: 1-7 AGUSTUS 2026 (atau 1 AGUSTUS 2026 - 7 AGUSTUS 2026 bila beda bulan)
 */
function formatIndonesianDateRange(startDate: string, endDate: string): { slide1Date: string; slide23Date: string } {
  const monthNames = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];

  const parseDmy = (str: string) => {
    if (!str) return null;
    const parts = str.split('-');
    if (parts.length === 3) {
      return {
        day: parseInt(parts[0], 10),
        dayPad: parts[0].padStart(2, '0'),
        month: parseInt(parts[1], 10),
        year: parts[2]
      };
    }
    return null;
  };

  const d1 = parseDmy(startDate);
  const d2 = parseDmy(endDate);

  if (!d1 || !d2) {
    return {
      slide1Date: `${startDate} - ${endDate}`,
      slide23Date: `${startDate} - ${endDate}`
    };
  }

  const mName1 = monthNames[d1.month - 1] || '';
  const mName2 = monthNames[d2.month - 1] || '';

  // Slide 1: 1 AGUSTUS 2026 - 07 AGUSTUS 2026
  const slide1Date = `${d1.day} ${mName1} ${d1.year} - ${d2.dayPad} ${mName2} ${d2.year}`;

  // Slide 2 & 3: 1-7 AGUSTUS 2026
  let slide23Date = '';
  if (d1.month === d2.month && d1.year === d2.year) {
    slide23Date = `${d1.day}-${d2.day} ${mName2} ${d2.year}`;
  } else {
    slide23Date = `${d1.day} ${mName1} - ${d2.day} ${mName2} ${d2.year}`;
  }

  return { slide1Date, slide23Date };
}

export async function generatePptxFromTemplate(
  data: AccumulationData,
  startDate: string,
  endDate: string,
  templateUrl: string = '/file.pptx'
) {
  // 1. Ambil template PPTX dari folder public frontend
  let res: Response;
  try {
    res = await fetch(templateUrl);
    if (!res.ok) {
      res = await fetch('/mims/file/template_mdfo_analysis.pptx');
    }
  } catch {
    res = await fetch('/mims/file/template_mdfo_analysis.pptx');
  }

  if (!res.ok) {
    throw new Error('Gagal memuat template PowerPoint dari folder public frontend (/file.pptx).');
  }

  const arrayBuffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const parser = new DOMParser();
  const serializer = new XMLSerializer();
  const aNs = 'http://schemas.openxmlformats.org/drawingml/2006/main';
  const pNs = 'http://schemas.openxmlformats.org/presentationml/2006/main';

  const { slide1Date, slide23Date } = formatIndonesianDateRange(startDate, endDate);

  // 2. Proses Slide 1: Tambahkan tanggal di bawah judul MDFO ANALYSIS
  const slide1File = zip.file('ppt/slides/slide1.xml');
  if (slide1File) {
    const slide1Xml = await slide1File.async('string');
    const doc1 = parser.parseFromString(slide1Xml, 'application/xml');
    const spList1 = doc1.getElementsByTagNameNS(pNs, 'sp');

    for (let i = 0; i < spList1.length; i++) {
      const sp = spList1[i];
      const cNvPr = sp.getElementsByTagNameNS(pNs, 'cNvPr')[0];
      const spName = cNvPr ? cNvPr.getAttribute('name') : '';

      if (spName === 'Title 1') {
        const pList = sp.getElementsByTagNameNS(aNs, 'p');
        if (pList.length > 0) {
          const p = pList[0];

          // Bersihkan run kedua (tanggal lama jika ada)
          const rList = p.getElementsByTagNameNS(aNs, 'r');
          while (rList.length > 1) {
            p.removeChild(rList[1]);
          }

          // Pastikan ada tag <a:br>
          let br = p.getElementsByTagNameNS(aNs, 'br')[0];
          if (!br) {
            br = doc1.createElementNS(aNs, 'a:br');
            p.appendChild(br);
          }

          // Buat <a:r> baru untuk tanggal di bawah judul
          const newR = doc1.createElementNS(aNs, 'a:r');
          const rPr = doc1.createElementNS(aNs, 'a:rPr');
          rPr.setAttribute('lang', 'id-ID');
          rPr.setAttribute('sz', '2000');
          rPr.setAttribute('b', '1');
          rPr.setAttribute('dirty', '0');

          const solidFill = doc1.createElementNS(aNs, 'a:solidFill');
          const prstClr = doc1.createElementNS(aNs, 'a:prstClr');
          prstClr.setAttribute('val', 'white');
          solidFill.appendChild(prstClr);
          rPr.appendChild(solidFill);

          const effectLst = doc1.createElementNS(aNs, 'a:effectLst');
          const outerShdw = doc1.createElementNS(aNs, 'a:outerShdw');
          outerShdw.setAttribute('blurRad', '38100');
          outerShdw.setAttribute('dist', '38100');
          outerShdw.setAttribute('dir', '2700000');
          outerShdw.setAttribute('algn', 'tl');
          const srgbClr = doc1.createElementNS(aNs, 'a:srgbClr');
          srgbClr.setAttribute('val', '000000');
          const alpha = doc1.createElementNS(aNs, 'a:alpha');
          alpha.setAttribute('val', '43137');
          srgbClr.appendChild(alpha);
          outerShdw.appendChild(srgbClr);
          effectLst.appendChild(outerShdw);
          rPr.appendChild(effectLst);

          const latin = doc1.createElementNS(aNs, 'a:latin');
          latin.setAttribute('typeface', 'Arial Black');
          rPr.appendChild(latin);

          const t = doc1.createElementNS(aNs, 'a:t');
          t.textContent = slide1Date;

          newR.appendChild(rPr);
          newR.appendChild(t);
          p.appendChild(newR);
        }
      }
    }

    zip.file('ppt/slides/slide1.xml', serializer.serializeToString(doc1));
  }

  // 3. Proses Slide 2: Top 10 Highest & Top 10 Lowest + Range Tanggal di Atas Kanan Tabel
  const slide2File = zip.file('ppt/slides/slide2.xml');
  if (slide2File) {
    const slide2Xml = await slide2File.async('string');
    const doc2 = parser.parseFromString(slide2Xml, 'application/xml');
    
    // Update Text 1 (Range Tanggal di Atas Kanan Tabel)
    const spList2 = doc2.getElementsByTagNameNS(pNs, 'sp');
    for (let i = 0; i < spList2.length; i++) {
      const sp = spList2[i];
      const cNvPr = sp.getElementsByTagNameNS(pNs, 'cNvPr')[0];
      const spName = cNvPr ? cNvPr.getAttribute('name') : '';
      if (spName === 'Text 1') {
        const tList = sp.getElementsByTagNameNS(aNs, 't');
        if (tList.length > 0) {
          tList[0].textContent = slide23Date;
          for (let k = 1; k < tList.length; k++) {
            tList[k].textContent = '';
          }
        }
      }
    }

    const tables2 = doc2.getElementsByTagNameNS(aNs, 'tbl');

    const calcPctValue = (item: any) => {
      const a = Number(item.accum) || 0;
      const m = Number(item.mdfo) || 0;
      if (!m || isNaN(m) || m === 0) return 0;
      return (a / m) * 100;
    };

    const isExcludedItem = (item: any) => {
      const model = String(item.model || item.zmodel || '').toUpperCase().trim();
      const jobNo = String(item.job_number || item.part_number || '').toUpperCase().trim();
      if (model === 'SP') return true;
      if (jobNo === 'ATDJ3' || jobNo.includes('ATDJ3')) return true;
      return false;
    };

    const highest = (data.top_highest_accumulation || [])
      .filter(item => !isExcludedItem(item))
      .sort((a, b) => calcPctValue(b) - calcPctValue(a))
      .slice(0, 10);

    const lowest = (data.top_lowest_accumulation || [])
      .filter(item => {
        const m = Number(item.mdfo) || 0;
        const s = Number(item.sales_order) || 0;
        if (m < 10 && s === 0) return false;
        if (m === 1 && s === 1) return false;
        return Number(item.accum) < 0 && !isExcludedItem(item);
      })
      .sort((a, b) => calcPctValue(a) - calcPctValue(b))
      .slice(0, 10);

    if (tables2.length >= 2) {
      // Table 1: Top 10 Highest (index 1 if 3 tables, or index 0 if 2 tables)
      const tblH = tables2.length >= 3 ? tables2[1] : tables2[0];
      if (tblH) {
        const rowsH = tblH.getElementsByTagNameNS(aNs, 'tr');
        for (let i = 1; i <= 10; i++) {
          if (i < rowsH.length) {
            const r = rowsH[i];
            const cells = r.getElementsByTagNameNS(aNs, 'tc');
            if (highest[i - 1]) {
              const item = highest[i - 1];
              const accumVal = Number(item.accum) || 0;
              const pctStr = formatPercentage(item.accum, item.mdfo);
              const textColor = accumVal >= 0 ? '0070C0' : 'FF0000';

              updateCellText(cells[0], String(i), doc2, 1000);
              updateCellText(cells[1], item.customer || '-', doc2, 1000);
              updateCellText(cells[2], item.model || '-', doc2, 1000);
              updateCellText(cells[3], item.route || '-', doc2, 1000);
              updateCellText(cells[4], getJobOrPartNumber(item), doc2, 1000);
              updateCellText(cells[5], formatThousand(item.mdfo), doc2, 1000);
              updateCellText(cells[6], formatThousand(item.sales_order), doc2, 1000);
              updateCellText(cells[7], formatThousand(item.accum), doc2, 1000, textColor);
              if (cells.length > 8) {
                updateCellText(cells[8], pctStr, doc2, 1000, textColor);
              }
            } else {
              for (let c = 0; c < cells.length; c++) {
                updateCellText(cells[c], c === 0 ? String(i) : '—', doc2, 1000);
              }
            }
          }
        }
      }

      // Table 2: Top 10 Lowest (index 2 if 3 tables, or index 1 if 2 tables)
      const tblL = tables2.length >= 3 ? tables2[2] : tables2[1];
      if (tblL) {
        const rowsL = tblL.getElementsByTagNameNS(aNs, 'tr');
        for (let i = 1; i <= 10; i++) {
          if (i < rowsL.length) {
            const r = rowsL[i];
            const cells = r.getElementsByTagNameNS(aNs, 'tc');
            if (lowest[i - 1]) {
              const item = lowest[i - 1];
              const accumVal = Number(item.accum) || 0;
              const pctStr = formatPercentage(item.accum, item.mdfo);
              const textColor = accumVal >= 0 ? '0070C0' : 'FF0000';

              updateCellText(cells[0], String(i), doc2, 1000);
              updateCellText(cells[1], item.customer || '-', doc2, 1000);
              updateCellText(cells[2], item.model || '-', doc2, 1000);
              updateCellText(cells[3], item.route || '-', doc2, 1000);
              updateCellText(cells[4], getJobOrPartNumber(item), doc2, 1000);
              updateCellText(cells[5], formatThousand(item.mdfo), doc2, 1000);
              updateCellText(cells[6], formatThousand(item.sales_order), doc2, 1000);
              updateCellText(cells[7], formatThousand(item.accum), doc2, 1000, textColor);
              if (cells.length > 8) {
                updateCellText(cells[8], pctStr, doc2, 1000, textColor);
              }
            } else {
              for (let c = 0; c < cells.length; c++) {
                updateCellText(cells[c], c === 0 ? String(i) : '—', doc2, 1000);
              }
            }
          }
        }
      }
    }

    zip.file('ppt/slides/slide2.xml', serializer.serializeToString(doc2));
  }

  // 4. Proses Slide 3: Accumulation by Customer & Model + Range Tanggal di Atas Kanan Tabel
  const slide3File = zip.file('ppt/slides/slide3.xml');
  if (slide3File) {
    const slide3Xml = await slide3File.async('string');
    const doc3 = parser.parseFromString(slide3Xml, 'application/xml');

    // Update Text 1 (Range Tanggal di Atas Kanan Tabel)
    const spList3 = doc3.getElementsByTagNameNS(pNs, 'sp');
    for (let i = 0; i < spList3.length; i++) {
      const sp = spList3[i];
      const cNvPr = sp.getElementsByTagNameNS(pNs, 'cNvPr')[0];
      const spName = cNvPr ? cNvPr.getAttribute('name') : '';
      if (spName === 'Text 1') {
        const tList = sp.getElementsByTagNameNS(aNs, 't');
        if (tList.length > 0) {
          tList[0].textContent = slide23Date;
          for (let k = 1; k < tList.length; k++) {
            tList[k].textContent = '';
          }
        }
      }
    }

function filterAndGroupSlide3Data(rawCustModel: any[]): any[] {
  const allowedCustomersMap: Record<string, string> = {
    'ADM PLANT 1': 'ADM PLANT 1',
    'ADM PLANT 4': 'ADM PLANT 4',
    'ADM PLANT 5': 'ADM PLANT 5',
    'TMMIN': 'TMMIN',
    'HMMI': 'HMMI',
    'MMKI': 'MMKI',
    'MKM': 'MKM',
    'HPM': 'HPM',
    'ISI': 'ISI'
  };

  const CUSTOMER_ORDER = [
    'ADM PLANT 1',
    'ADM PLANT 4',
    'ADM PLANT 5',
    'TMMIN',
    'HMMI',
    'MMKI',
    'MKM',
    'HPM',
    'ISI'
  ];

  const groupedMap = new Map<string, any>();

  (rawCustModel || []).forEach((item) => {
    const origCust = (item.customer || item.zcust || '').toString().trim();
    const custUpper = origCust.toUpperCase().replace(/\s+/g, ' ');

    let matchedCust = '';
    for (const key of Object.keys(allowedCustomersMap)) {
      if (custUpper === key || custUpper.startsWith(key)) {
        matchedCust = key;
        break;
      }
    }

    if (!matchedCust) return;

    let model = (item.model || '-').toString().trim();
    const modelUpper = model.toUpperCase();

    // 1. ADM PLANT 1: hanya model D40D
    if (matchedCust === 'ADM PLANT 1') {
      if (modelUpper !== 'D40D') return;
    }

    // 2. ADM PLANT 4: model yang bukan SP
    if (matchedCust === 'ADM PLANT 4') {
      if (modelUpper === 'SP' || modelUpper.includes('SP')) return;
    }

    // 5. HMMI: KS DAN KS-FL DIGABUNG, SU2ID DAN SU2ID FL DIGABUNG
    if (matchedCust === 'HMMI') {
      if (
        modelUpper === 'KS' ||
        modelUpper === 'KS-FL' ||
        modelUpper === 'KS FL' ||
        modelUpper === 'KSFL'
      ) {
        model = 'KS';
      } else if (
        modelUpper === 'SU2ID' ||
        modelUpper === 'SU2ID FL' ||
        modelUpper === 'SU2ID-FL' ||
        modelUpper === 'SU2IDFL'
      ) {
        model = 'SU2ID';
      }
    }

    // 7. MKM: model SL, SL23M, SL23MY digabung jadi SL
    if (matchedCust === 'MKM') {
      if (modelUpper === 'SL' || modelUpper === 'SL23M' || modelUpper === 'SL23MY') {
        model = 'SL';
      }
    }

    const groupKey = `${matchedCust}___${model.toUpperCase()}`;
    const mdfo = Number(item.mdfo) || 0;
    const sales_order = Number(item.sales_order) || 0;
    const accum = Number(item.accum) || (sales_order - mdfo);

    if (!groupedMap.has(groupKey)) {
      groupedMap.set(groupKey, {
        zcust: item.zcust || matchedCust,
        customer: matchedCust,
        model: model,
        mdfo: 0,
        sales_order: 0,
        accum: 0
      });
    }

    const target = groupedMap.get(groupKey);
    target.mdfo += mdfo;
    target.sales_order += sales_order;
    target.accum += accum;
  });

  const result = Array.from(groupedMap.values()).map((entry) => ({
    ...entry,
    sales_order_achievement: entry.mdfo > 0 ? (entry.accum / entry.mdfo) * 100 : 0
  }));

  result.sort((a, b) => {
    const idxA = CUSTOMER_ORDER.indexOf(a.customer);
    const idxB = CUSTOMER_ORDER.indexOf(b.customer);
    if (idxA !== idxB) {
      return (idxA === -1 ? 999 : idxA) - (idxB === -1 ? 999 : idxB);
    }
    return (a.model || '').localeCompare(b.model || '');
  });

  return result;
}

    const tables3 = doc3.getElementsByTagNameNS(aNs, 'tbl');
    const rawCustModel = data.accumulation_by_customer_model || [];
    const custModel = filterAndGroupSlide3Data(rawCustModel);

    if (tables3.length >= 1) {
      const tblCM = tables3.length >= 2 ? tables3[1] : tables3[0];
      const rowsCM = tblCM.getElementsByTagNameNS(aNs, 'tr');
      const templateRow = rowsCM[1];

      // Hitung vertical span untuk Model (Merge jika baris berurutan memiliki model yang sama)
      const modelSpans: { isFirst: boolean; isMerged: boolean; rowSpan?: number; text?: string }[] = [];
      let mIdx = 0;
      while (mIdx < custModel.length) {
        const currentModel = custModel[mIdx].model || '-';
        const currentCust = custModel[mIdx].customer || '-';
        let spanLen = 1;
        while (
          mIdx + spanLen < custModel.length &&
          (custModel[mIdx + spanLen].model || '-') === currentModel &&
          (custModel[mIdx + spanLen].customer || '-') === currentCust
        ) {
          spanLen++;
        }
        for (let s = 0; s < spanLen; s++) {
          if (spanLen > 1) {
            if (s === 0) {
              modelSpans.push({ isFirst: true, isMerged: true, rowSpan: spanLen, text: currentModel });
            } else {
              modelSpans.push({ isFirst: false, isMerged: true, text: '' });
            }
          } else {
            modelSpans.push({ isFirst: true, isMerged: false, text: currentModel });
          }
        }
        mIdx += spanLen;
      }

      // Hitung vertical span untuk Customer (Merge jika baris berurutan memiliki customer yang sama)
      const custSpans: { isFirst: boolean; isMerged: boolean; rowSpan?: number; text?: string }[] = [];
      let cIdx = 0;
      while (cIdx < custModel.length) {
        const currentCust = custModel[cIdx].customer || '-';
        let spanLen = 1;
        while (cIdx + spanLen < custModel.length && (custModel[cIdx + spanLen].customer || '-') === currentCust) {
          spanLen++;
        }
        for (let s = 0; s < spanLen; s++) {
          if (spanLen > 1) {
            if (s === 0) {
              custSpans.push({ isFirst: true, isMerged: true, rowSpan: spanLen, text: currentCust });
            } else {
              custSpans.push({ isFirst: false, isMerged: true, text: '' });
            }
          } else {
            custSpans.push({ isFirst: true, isMerged: false, text: currentCust });
          }
        }
        cIdx += spanLen;
      }

      for (let i = 0; i < custModel.length; i++) {
        const item = custModel[i];
        let r: Element;
        if (i + 1 < rowsCM.length) {
          r = rowsCM[i + 1];
        } else {
          r = templateRow.cloneNode(true) as Element;
          tblCM.appendChild(r);
        }
        const cells = r.getElementsByTagNameNS(aNs, 'tc');

        // 1. Column 0: Customer (Merge jika sama)
        const cSpan = custSpans[i];
        if (cSpan.isMerged) {
          if (cSpan.isFirst && cSpan.rowSpan) {
            cells[0].setAttribute('rowSpan', cSpan.rowSpan.toString());
            cells[0].removeAttribute('vMerge');
            updateCellText(cells[0], cSpan.text || '', doc3);
          } else {
            cells[0].removeAttribute('rowSpan');
            cells[0].setAttribute('vMerge', '1');
            updateCellText(cells[0], '', doc3);
          }
        } else {
          cells[0].removeAttribute('rowSpan');
          cells[0].removeAttribute('vMerge');
          updateCellText(cells[0], item.customer || '-', doc3);
        }

        // 2. Column 1: Model (Merge jika baris atas atau bawahnya sama)
        const mSpan = modelSpans[i];
        if (mSpan.isMerged) {
          if (mSpan.isFirst && mSpan.rowSpan) {
            cells[1].setAttribute('rowSpan', mSpan.rowSpan.toString());
            cells[1].removeAttribute('vMerge');
            updateCellText(cells[1], mSpan.text || '', doc3);
          } else {
            cells[1].removeAttribute('rowSpan');
            cells[1].setAttribute('vMerge', '1');
            updateCellText(cells[1], '', doc3);
          }
        } else {
          cells[1].removeAttribute('rowSpan');
          cells[1].removeAttribute('vMerge');
          updateCellText(cells[1], item.model || '-', doc3);
        }

        // 3. Kolom Nilai (MDFO, SO, Accum, Achievement) pastikan tidak terbawa merge
        for (let col = 2; col <= 5; col++) {
          if (cells[col]) {
            cells[col].removeAttribute('rowSpan');
            cells[col].removeAttribute('vMerge');
          }
        }

        const accumVal = Number(item.accum) || 0;
        const pctStr = formatPercentage(item.accum, item.mdfo);
        const textColor = accumVal >= 0 ? '0070C0' : 'FF0000';

        updateCellText(cells[2], formatThousand(item.mdfo), doc3);
        updateCellText(cells[3], formatThousand(item.sales_order), doc3);
        updateCellText(cells[4], formatThousand(item.accum), doc3, undefined, textColor);
        updateCellText(cells[5], pctStr, doc3, undefined, textColor);
      }

      // Total Row at the bottom of Slide 3 table
      const totalMdfo = custModel.reduce((sum, item) => sum + (Number(item.mdfo) || 0), 0);
      const totalSo = custModel.reduce((sum, item) => sum + (Number(item.sales_order) || 0), 0);
      const totalAccum = custModel.reduce((sum, item) => sum + (Number(item.accum) || 0), 0);
      const totalPctStr = formatPercentage(totalAccum, totalMdfo);
      const totalTextColor = totalAccum >= 0 ? '0070C0' : 'FF0000';

      const totalRowIdx = custModel.length + 1;
      let totalRow: Element;
      if (totalRowIdx < rowsCM.length) {
        totalRow = rowsCM[totalRowIdx];
      } else {
        totalRow = templateRow.cloneNode(true) as Element;
        tblCM.appendChild(totalRow);
      }
      const totalCells = totalRow.getElementsByTagNameNS(aNs, 'tc');
      for (let c = 0; c < totalCells.length; c++) {
        totalCells[c].removeAttribute('rowSpan');
        totalCells[c].removeAttribute('vMerge');
      }

      updateCellText(totalCells[0], 'TOTAL', doc3);
      updateCellText(totalCells[1], '-', doc3);
      updateCellText(totalCells[2], formatThousand(totalMdfo), doc3);
      updateCellText(totalCells[3], formatThousand(totalSo), doc3);
      updateCellText(totalCells[4], formatThousand(totalAccum), doc3, undefined, totalTextColor);
      updateCellText(totalCells[5], totalPctStr, doc3, undefined, totalTextColor);

      // Clear extra template rows if any
      const totalRowsNow = tblCM.getElementsByTagNameNS(aNs, 'tr').length;
      for (let j = totalRowIdx + 1; j < totalRowsNow; j++) {
        const r = tblCM.getElementsByTagNameNS(aNs, 'tr')[j];
        if (r) {
          const cells = r.getElementsByTagNameNS(aNs, 'tc');
          for (let c = 0; c < cells.length; c++) {
            cells[c].removeAttribute('rowSpan');
            cells[c].removeAttribute('vMerge');
            updateCellText(cells[c], '', doc3);
          }
        }
      }
    }

    zip.file('ppt/slides/slide3.xml', serializer.serializeToString(doc3));
  }

  // 5. Generate PPTX blob & save file
  const outputBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  });

  const now = new Date();
  const yearStr = now.getFullYear();
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const dateStr = String(now.getDate()).padStart(2, '0');
  const hoursStr = String(now.getHours()).padStart(2, '0');
  const minutesStr = String(now.getMinutes()).padStart(2, '0');

  const downloadTimestamp = `${yearStr}.${monthStr}.${dateStr} ${hoursStr}.${minutesStr}`;
  const fileName = `${downloadTimestamp} MDFO ANALYSIS ${slide23Date}.pptx`;
  saveAs(outputBlob, fileName);
  return true;
}

