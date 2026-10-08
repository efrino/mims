import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import html2canvas from 'html2canvas';

export interface ExportGlcParams {
  simulationHeader: {
    id: number | string;
    area: string;
    periode: string;
    status?: string | number;
    created_by?: string;
    note?: string;
    [key: string]: any;
  };
  summaryList: Array<{
    machine: string;
    dandori?: number | string;
    downtime?: number | string;
    prod_time?: number | string;
    prod_time_adjust?: number | string;
    prod_time_final?: number | string;
    tpt?: number | string;
    uph?: number | string;
    stroke_day?: number | string;
    pcs_day?: number | string;
    wt_1_shift?: number | string;
    wt_2_shift?: number | string;
    wt_2_shift_pjk1s?: number | string;
    wt_2_shift_pjk2s?: number | string;
    working_day?: number | string;
    mp?: number | string;
    item?: number | string;
    tc?: number | string;
    tip_change?: number | string;
    teiryo?: number | string;
    [key: string]: any;
  }>;
  chartElement: HTMLElement | null;
  partsList: Array<{
    line?: string;
    machine?: string;
    machine_use?: string;
    part_number: string;
    job_number?: string;
    model?: string;
    process?: string | number;
    pcs_day?: number | string;
    ckd_part_number?: string | null;
    dandori?: number | string;
    downtime?: number | string;
    prod_time?: number | string;
    tpt?: number | string;
    uph?: number | string;
    urutan?: number | string;
    [key: string]: any;
  }>;
  templateUrl?: string;
}

function escapeXml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function naturalCompare(a: string = '', b: string = ''): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
}

function formatThousand(num: number | string | undefined | null): string {
  if (num === null || num === undefined || num === '') return '0';
  const n = Number(num);
  if (isNaN(n)) return '0';
  return n.toLocaleString('id-ID');
}

function formatPeriodIndo(str: string): string {
  if (!str) return '-';
  const monthNamesIndo = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];

  const parts = str.split(/[-/]/);
  if (parts.length === 2) {
    const [p1, p2] = parts;
    if (p1.length === 4) {
      const mIdx = parseInt(p2, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) return `${monthNamesIndo[mIdx]} ${p1}`;
    } else if (p2.length === 4) {
      const mIdx = parseInt(p1, 10) - 1;
      if (mIdx >= 0 && mIdx < 12) return `${monthNamesIndo[mIdx]} ${p2}`;
    }
  }
  return str;
}

interface TableColumn {
  width: number;
  title: string;
  align?: 'l' | 'ctr' | 'r';
}

interface TextRun {
  text: string;
  color?: string;
  bold?: boolean;
  font?: string;
  fontSize?: string;
}

interface TableCell {
  text?: string;
  runs?: TextRun[];
  bold?: boolean;
  color?: string;
  bg?: string;
  align?: 'l' | 'ctr' | 'r';
  fontSize?: string;
}

function updateSlideTitle(xml: string, newTitleText: string, fontSize: string = '1800'): string {
  return xml.replace(
    /(<p:sp>(?:(?!<p:sp>)[\s\S])*?name="Text 3"(?:(?!<p:sp>)[\s\S])*?<a:t>)[^<]*(<\/a:t>[\s\S]*?<\/p:sp>)/,
    (m, p1, p2) => {
      let updatedP1 = p1.replace(/sz="\d+"/g, `sz="${fontSize}"`).replace(/typeface="[^"]*"/g, 'typeface="Bahnschrift"');
      let updatedP2 = p2.replace(/sz="\d+"/g, `sz="${fontSize}"`).replace(/typeface="[^"]*"/g, 'typeface="Bahnschrift"');
      return `${updatedP1}${escapeXml(newTitleText)}${updatedP2}`;
    }
  );
}

function buildTableXml({
  id,
  name,
  x,
  y,
  cx,
  cy,
  columns,
  rows,
  headerBg = '0B1E48',
  fontSize = '900',
  headerFontSize = '900',
  rowHeight = '310000'
}: {
  id: string;
  name: string;
  x: string | number;
  y: string | number;
  cx: string | number;
  cy: string | number;
  columns: TableColumn[];
  rows: TableCell[][];
  headerBg?: string;
  fontSize?: string;
  headerFontSize?: string;
  rowHeight?: string | number;
}): string {
  const gridCols = columns.map(c => `<a:gridCol w="${c.width}"/>`).join('');
  const headerTr = `<a:tr h="340000">
    ${columns
      .map(
        c => `
      <a:tc>
        <a:txBody>
          <a:bodyPr lIns="21600" tIns="14400" rIns="21600" bIns="14400" anchor="ctr"/>
          <a:lstStyle/>
          <a:p>
            <a:pPr marL="0" indent="0" algn="${c.align || 'ctr'}"><a:buNone/></a:pPr>
            <a:r>
              <a:rPr lang="id-ID" sz="${headerFontSize}" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="Bahnschrift"/><a:cs typeface="Bahnschrift"/></a:rPr>
              <a:t>${escapeXml(c.title)}</a:t>
            </a:r>
          </a:p>
        </a:txBody>
        <a:tcPr anchor="ctr">
          <a:lnL w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnL>
          <a:lnR w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnR>
          <a:lnT w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnT>
          <a:lnB w="6350"><a:solidFill><a:srgbClr val="CBD5E1"/></a:solidFill></a:lnB>
          <a:solidFill><a:srgbClr val="${headerBg}"/></a:solidFill>
        </a:tcPr>
      </a:tc>`
      )
      .join('')}
  </a:tr>`;

  const dataTrs = rows
    .map((row, rIdx) => {
      const defaultBg = rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';
      return `<a:tr h="${rowHeight}">
      ${row
        .map((cell, cIdx) => {
          const col = columns[cIdx];
          const cellBg = cell.bg || defaultBg;
          const cellAlign = cell.align || col?.align || 'l';
          const cellBold = cell.bold ? ' b="1"' : '';
          const cellClr = cell.color || '1E293B';
          const sz = cell.fontSize || fontSize;

          let textRuns = '';
          if (cell.runs && cell.runs.length > 0) {
            textRuns = cell.runs
              .map(
                r => `<a:r>
                <a:rPr lang="id-ID" sz="${r.fontSize || sz}"${r.bold ? ' b="1"' : ''}><a:solidFill><a:srgbClr val="${r.color || cellClr}"/></a:solidFill><a:latin typeface="${r.font || 'Bahnschrift'}"/><a:cs typeface="${r.font || 'Bahnschrift'}"/></a:rPr>
                <a:t>${escapeXml(r.text ?? '')}</a:t>
              </a:r>`
              )
              .join('');
          } else {
            textRuns = `<a:r>
              <a:rPr lang="id-ID" sz="${sz}"${cellBold}><a:solidFill><a:srgbClr val="${cellClr}"/></a:solidFill><a:latin typeface="Bahnschrift"/><a:cs typeface="Bahnschrift"/></a:rPr>
              <a:t>${escapeXml(cell.text ?? '')}</a:t>
            </a:r>`;
          }

          return `<a:tc>
          <a:txBody>
            <a:bodyPr lIns="21600" tIns="14400" rIns="21600" bIns="14400" anchor="ctr"/>
            <a:lstStyle/>
            <a:p>
              <a:pPr marL="0" indent="0" algn="${cellAlign}"><a:buNone/></a:pPr>
              ${textRuns}
            </a:p>
          </a:txBody>
          <a:tcPr anchor="ctr">
            <a:lnL w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:lnL>
            <a:lnR w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:lnR>
            <a:lnT w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:lnT>
            <a:lnB w="6350"><a:solidFill><a:srgbClr val="E2E8F0"/></a:solidFill></a:lnB>
            <a:solidFill><a:srgbClr val="${cellBg}"/></a:solidFill>
          </a:tcPr>
        </a:tc>`;
        })
        .join('')}
    </a:tr>`;
    })
    .join('');

  return `<p:graphicFrame>
    <p:nvGraphicFramePr>
      <p:cNvPr id="${id}" name="${name}"/>
      <p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr>
      <p:nvPr/>
    </p:nvGraphicFramePr>
    <p:xfrm>
      <a:off x="${x}" y="${y}"/>
      <a:ext cx="${cx}" cy="${cy}"/>
    </p:xfrm>
    <a:graphic>
      <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table">
        <a:tbl>
          <a:tblPr/>
          <a:tblGrid>${gridCols}</a:tblGrid>
          ${headerTr}
          ${dataTrs}
        </a:tbl>
      </a:graphicData>
    </a:graphic>
  </p:graphicFrame>`;
}

function buildPictureXml({
  id,
  name,
  rId,
  x,
  y,
  cx,
  cy
}: {
  id: string;
  name: string;
  rId: string;
  x: string | number;
  y: string | number;
  cx: string | number;
  cy: string | number;
}): string {
  return `<p:pic>
    <p:nvPicPr>
      <p:cNvPr id="${id}" name="${name}"/>
      <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
      <p:nvPr/>
    </p:nvPicPr>
    <p:blipFill>
      <a:blip r:embed="${rId}"/>
      <a:stretch><a:fillRect/></a:stretch>
    </p:blipFill>
    <p:spPr>
      <a:xfrm>
        <a:off x="${x}" y="${y}"/>
        <a:ext cx="${cx}" cy="${cy}"/>
      </a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    </p:spPr>
  </p:pic>`;
}

export async function exportGlcSimulationPptx(params: ExportGlcParams): Promise<boolean> {
  const { simulationHeader, summaryList = [], chartElement, partsList = [], templateUrl = '/file/template_glc.pptx' } = params;

  // 1. Fetch template PowerPoint file
  let res: Response;
  try {
    res = await fetch(templateUrl);
    if (!res.ok) {
      res = await fetch('/file/template_glc.pptx');
    }
  } catch {
    res = await fetch('/file/template_glc.pptx');
  }

  if (!res.ok) {
    throw new Error('Gagal memuat template PowerPoint (/file/template_glc.pptx). Pastikan file tersedia di public/file.');
  }

  const arrayBuffer = await res.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);

  const area = simulationHeader.area || 'WSS ADM';
  const periodeText = formatPeriodIndo(simulationHeader.periode || '');

  // 2. Process Slide 1: Cover Slide
  const s1File = zip.file('ppt/slides/slide1.xml');
  if (s1File) {
    let s1Xml = await s1File.async('string');
    s1Xml = s1Xml.replace(/<a:t>GLC WSS<\/a:t>/g, `<a:t>GLC WELDING - ${escapeXml(area.toUpperCase())}</a:t>`);
    zip.file('ppt/slides/slide1.xml', s1Xml);
  }

  // 3. Process Slide 2: Chart & Summary Table (Divided into 2, compact & elegant)
  // Convert chart to PNG
  let chartPngBytes: Uint8Array | null = null;
  if (chartElement) {
    try {
      const canvas = await html2canvas(chartElement, {
        scale: 2.2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
      const binaryStr = atob(base64Data);
      const len = binaryStr.length;
      chartPngBytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        chartPngBytes[i] = binaryStr.charCodeAt(i);
      }
    } catch (err) {
      console.warn('Could not capture chart as image:', err);
    }
  }

  if (!chartPngBytes) {
    // 1x1 transparent PNG fallback
    const fallbackBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const binaryStr = atob(fallbackBase64);
    chartPngBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      chartPngBytes[i] = binaryStr.charCodeAt(i);
    }
  }

  zip.file('ppt/media/chart_summary.png', chartPngBytes);

  // Add chart relationship in slide2 rels
  const s2RelsFile = zip.file('ppt/slides/_rels/slide2.xml.rels');
  if (s2RelsFile) {
    let s2Rels = await s2RelsFile.async('string');
    if (!s2Rels.includes('chart_summary.png')) {
      s2Rels = s2Rels.replace(
        '</Relationships>',
        '<Relationship Id="rIdChart" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/chart_summary.png"/></Relationships>'
      );
      zip.file('ppt/slides/_rels/slide2.xml.rels', s2Rels);
    }
  }

  // Build Machine Summary Table on Slide 2
  const totalAvailableWidth = 8450000;
  const paramColWidth = 1450000;
  const remWidth = totalAvailableWidth - paramColWidth;
  const machColCount = Math.max(summaryList.length, 1);
  const machColWidth = Math.floor(remWidth / machColCount);

  const sumCols: TableColumn[] = [
    { width: paramColWidth, title: 'Parameter', align: 'l' },
    ...summaryList.map(m => ({ width: machColWidth, title: m.machine || '-', align: 'ctr' as const }))
  ];

  const sumParams = [
    { key: 'downtime', label: 'Downtime (Jam)', squareColor: 'D50000' },
    { key: 'tc', label: 'T/C (Jam)', squareColor: 'FBC02D' },
    { key: 'dandori', label: 'Dandori (Jam)', squareColor: '00A2FF' },
    { key: 'prod_time', label: 'Weld Time (Jam)', squareColor: '005DB9' },
    { key: 'teiryo', label: 'Teiryo (Jam)', squareColor: '800080' },
    { key: 'tpt', label: 'Hour/Day (TPT)', squareColor: '1A237E', bold: true },
    { key: 'uph', label: 'UPH', bold: true },
    { key: 'wt_1_shift', label: 'WT 1 Shift (Jam)' },
    { key: 'wt_2_shift', label: 'WT 2 Shift (Jam)' },
    { key: 'working_day', label: 'Working Day' },
    { key: 'mp', label: '∑ MP' },
    { key: 'item', label: '∑ ITEM' }
  ];

  const sumRows: TableCell[][] = sumParams.map((p, rIdx) => {
    const defaultRowBg = rIdx % 2 === 0 ? 'FFFFFF' : 'F8FAFC';

    let paramCell: TableCell;
    if (p.squareColor) {
      paramCell = {
        runs: [
          { text: '■ ', color: p.squareColor, font: 'Segoe UI Symbol', fontSize: '750' },
          { text: p.label, color: '1E293B', bold: !!p.bold, font: 'Bahnschrift', fontSize: '680' }
        ],
        bg: 'F1F5F9',
        align: 'l'
      };
    } else {
      paramCell = {
        text: p.label,
        bold: !!p.bold,
        color: '1E293B',
        bg: 'F1F5F9',
        align: 'l',
        fontSize: '680'
      };
    }

    const rowCells: TableCell[] = [paramCell];
    summaryList.forEach(m => {
      let val = m[p.key];
      if (val === undefined || val === null || val === '') val = '-';
      else if (
        !isNaN(Number(val)) &&
        (p.key.includes('time') || p.key === 'tpt' || p.key === 'dandori' || p.key === 'downtime' || p.key === 'tc' || p.key === 'teiryo')
      ) {
        val = Number(val).toFixed(1);
      }
      rowCells.push({
        text: String(val),
        bold: !!p.bold,
        color: '1E293B',
        bg: defaultRowBg,
        align: 'ctr',
        fontSize: '650'
      });
    });
    return rowCells;
  });

  const chartPicXml = buildPictureXml({
    id: '201',
    name: 'TPT Machine Chart',
    rId: 'rIdChart',
    x: '350000',
    y: '720000',
    cx: '8450000',
    cy: '2750000'
  });

  const summaryTblXml = buildTableXml({
    id: '202',
    name: 'Table Summary',
    x: '350000',
    y: '3580000',
    cx: '8450000',
    cy: '2950000',
    columns: sumCols,
    rows: sumRows,
    headerBg: '0B1E48',
    headerFontSize: '750',
    fontSize: '650',
    rowHeight: '220000'
  });

  const s2File = zip.file('ppt/slides/slide2.xml');
  if (s2File) {
    let s2Xml = await s2File.async('string');
    s2Xml = updateSlideTitle(s2Xml, `GLC WELDING SUMMARY - ${area.toUpperCase()}`, '1800');
    s2Xml = s2Xml.replace(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g, '');
    s2Xml = s2Xml.replace('</p:spTree>', `${chartPicXml}${summaryTblXml}</p:spTree>`);
    zip.file('ppt/slides/slide2.xml', s2Xml);
  }

  // 4. Sort partsList: Line (L1, L2, ...), Machine (A1, A2, ...), Urutan, Part Number, Process
  const sortedParts = [...partsList].sort((a, b) => {
    const lineA = a.line || 'ZZZ';
    const lineB = b.line || 'ZZZ';
    const cmpLine = naturalCompare(lineA, lineB);
    if (cmpLine !== 0) return cmpLine;

    const machA = a.machine_use || a.machine || 'ZZZ';
    const machB = b.machine_use || b.machine || 'ZZZ';
    const cmpMach = naturalCompare(machA, machB);
    if (cmpMach !== 0) return cmpMach;

    const urutA = Number(a.urutan) || 9999;
    const urutB = Number(b.urutan) || 9999;
    if (urutA !== urutB) return urutA - urutB;

    const cmpPn = naturalCompare(a.part_number || '', b.part_number || '');
    if (cmpPn !== 0) return cmpPn;

    return naturalCompare(String(a.process || ''), String(b.process || ''));
  });

  // 5. Paginate Detail Slides (18 rows per slide for maximum elegance & readability)
  const ITEMS_PER_SLIDE = 18;
  const totalPages = Math.max(Math.ceil(sortedParts.length / ITEMS_PER_SLIDE), 1);

  const detailCols: TableColumn[] = [
    { width: 580000, title: 'MACHINE', align: 'ctr' },
    { width: 1600000, title: 'PART NUMBER', align: 'l' },
    { width: 620000, title: 'JOB NO', align: 'l' },
    { width: 520000, title: 'MODEL', align: 'ctr' },
    { width: 520000, title: 'PROSES', align: 'ctr' },
    { width: 680000, title: 'PCS/DAY', align: 'r' },
    { width: 1354000, title: 'CKD PART NO', align: 'l' },
    { width: 530000, title: 'DANDORI', align: 'r' },
    { width: 530000, title: 'DOWNTIME', align: 'r' },
    { width: 550000, title: 'PROD TIME', align: 'r' },
    { width: 550000, title: 'TPT', align: 'r' },
    { width: 550000, title: 'UPH', align: 'r' }
  ];

  const s3TemplateFile = zip.file('ppt/slides/slide3.xml');
  const s3TemplateRelsFile = zip.file('ppt/slides/_rels/slide3.xml.rels');
  const s3TemplateXml = s3TemplateFile ? await s3TemplateFile.async('string') : '';
  const s3TemplateRels = s3TemplateRelsFile ? await s3TemplateRelsFile.async('string') : '';

  const s5ClosingFile = zip.file('ppt/slides/slide5.xml');
  const s5ClosingRelsFile = zip.file('ppt/slides/_rels/slide5.xml.rels');
  const s5ClosingXml = s5ClosingFile ? await s5ClosingFile.async('string') : '';
  const s5ClosingRels = s5ClosingRelsFile ? await s5ClosingRelsFile.async('string') : '';

  for (let page = 1; page <= totalPages; page++) {
    const slideNum = 2 + page;
    const startIdx = (page - 1) * ITEMS_PER_SLIDE;
    const pageItems = sortedParts.slice(startIdx, startIdx + ITEMS_PER_SLIDE);

    const rows: TableCell[][] = pageItems.map(p => {
      const rawProc = p.process;
      let proc = '-';
      if (rawProc !== undefined && rawProc !== null && rawProc !== '') {
        let procStr = String(rawProc).trim().replace(/^op[\s.]*/i, '').trim();
        if (procStr) {
          if (procStr.includes('/')) {
            proc = procStr;
          } else if (p.total_proses !== undefined && p.total_proses !== null && String(p.total_proses).trim() !== '') {
            const tot = String(p.total_proses).replace(/^op[\s.]*/i, '').trim();
            proc = tot ? `${procStr}/${tot}` : procStr;
          } else {
            proc = procStr;
          }
        }
      }

      const mach = p.machine_use || p.machine || '-';
      const ckd = p.ckd_part_number || '-';

      return [
        { text: mach, align: 'ctr', bold: true, color: '4338CA' },
        { text: p.part_number || '-', align: 'l', bold: true, color: '0F172A' },
        { text: p.job_number || '-', align: 'l' },
        { text: p.model || '-', align: 'ctr' },
        { text: proc, align: 'ctr', bold: true, color: '0D9488' },
        { text: formatThousand(p.pcs_day), align: 'r' },
        { text: ckd, align: 'l' },
        { text: Number(p.dandori || 0).toFixed(1), align: 'r' },
        { text: Number(p.downtime || 0).toFixed(1), align: 'r' },
        { text: Number(p.prod_time || 0).toFixed(1), align: 'r' },
        { text: Number(p.tpt || 0).toFixed(1), align: 'r', bold: true },
        { text: Number(p.uph || 0).toFixed(0), align: 'r' }
      ];
    });

    const detailTblXml = buildTableXml({
      id: String(300 + page),
      name: `Table Detail Page ${page}`,
      x: '280000',
      y: '660000',
      cx: '8584000',
      cy: '5950000',
      columns: detailCols,
      rows: rows,
      headerBg: '0B1E48',
      headerFontSize: '900',
      fontSize: '900',
      rowHeight: '310000'
    });

    let sXml = s3TemplateXml;
    sXml = updateSlideTitle(
      sXml,
      `LIST ITEM DETAIL - ${area.toUpperCase()} (HALAMAN ${page}/${totalPages})`,
      '1800'
    );
    sXml = sXml.replace(/<p:graphicFrame>[\s\S]*?<\/p:graphicFrame>/g, '');
    sXml = sXml.replace('</p:spTree>', `${detailTblXml}</p:spTree>`);

    zip.file(`ppt/slides/slide${slideNum}.xml`, sXml);
    zip.file(`ppt/slides/_rels/slide${slideNum}.xml.rels`, s3TemplateRels);
  }

  // Place closing slide at the end
  const closingSlideNum = 3 + totalPages;
  if (s5ClosingXml) {
    zip.file(`ppt/slides/slide${closingSlideNum}.xml`, s5ClosingXml);
    zip.file(`ppt/slides/_rels/slide${closingSlideNum}.xml.rels`, s5ClosingRels);
  }

  // Remove any obsolete slides from template
  for (let i = closingSlideNum + 1; i <= 60; i++) {
    zip.remove(`ppt/slides/slide${i}.xml`);
    zip.remove(`ppt/slides/_rels/slide${i}.xml.rels`);
  }

  // Update [Content_Types].xml
  const ctFile = zip.file('[Content_Types].xml');
  if (ctFile) {
    let ctXml = await ctFile.async('string');
    ctXml = ctXml.replace(/<Override PartName="\/ppt\/slides\/slide\d+\.xml"[^>]*\/>/g, '');
    let slideOverrides = '';
    for (let s = 1; s <= closingSlideNum; s++) {
      slideOverrides += `<Override PartName="/ppt/slides/slide${s}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`;
    }
    ctXml = ctXml.replace('</Types>', `${slideOverrides}</Types>`);
    zip.file('[Content_Types].xml', ctXml);
  }

  // Update ppt/_rels/presentation.xml.rels
  const presRelsFile = zip.file('ppt/_rels/presentation.xml.rels');
  if (presRelsFile) {
    let presRelsXml = await presRelsFile.async('string');
    presRelsXml = presRelsXml.replace(
      /<Relationship [^>]*Type="http:\/\/schemas\.openxmlformats\.org\/officeDocument\/2006\/relationships\/slide"[^>]*\/>/g,
      ''
    );
    let newRels = '';
    for (let s = 1; s <= closingSlideNum; s++) {
      const rId = `rIdSlide${s}`;
      newRels += `<Relationship Id="${rId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${s}.xml"/>`;
    }
    presRelsXml = presRelsXml.replace('</Relationships>', `${newRels}</Relationships>`);
    zip.file('ppt/_rels/presentation.xml.rels', presRelsXml);
  }

  // Update ppt/presentation.xml <p:sldIdLst>
  const presFile = zip.file('ppt/presentation.xml');
  if (presFile) {
    let presXml = await presFile.async('string');
    let sldIdLst = '<p:sldIdLst>';
    for (let s = 1; s <= closingSlideNum; s++) {
      sldIdLst += `<p:sldId id="${2800 + s}" r:id="rIdSlide${s}"/>`;
    }
    sldIdLst += '</p:sldIdLst>';
    presXml = presXml.replace(/<p:sldIdLst>[\s\S]*?<\/p:sldIdLst>/, sldIdLst);
    zip.file('ppt/presentation.xml', presXml);
  }

  // 6. Generate PPTX blob & save file
  const outputBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  });

  const simId = simulationHeader.id || 'simulasi';
  const cleanArea = area.replace(/\s+/g, '_');
  const cleanPeriode = (simulationHeader.periode || '').replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `GLC_Simulation_${cleanArea}_${cleanPeriode}_ID${simId}.pptx`;
  saveAs(outputBlob, fileName);
  return true;
}
