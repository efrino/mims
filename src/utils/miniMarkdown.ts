// Markdown ringan untuk jawaban AI (bold, italic, `code`, heading, list, paragraf).
// AMAN untuk v-html: seluruh teks di-escape DULU, baru sintaks markdown diubah jadi tag.
// Tidak mendukung link/gambar/HTML mentah — sengaja, jawaban AI tak butuh itu.

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const inline = (s: string) =>
  s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');

export function miniMarkdown(src: string): string {
  const lines = escapeHtml(src.replace(/\r\n/g, '\n')).split('\n');
  const out: string[] = [];
  let list: 'ul' | 'ol' | null = null;
  let para: string[] = [];

  const flushPara = () => { if (para.length) { out.push(`<p>${inline(para.join(' '))}</p>`); para = []; } };
  const closeList = () => { if (list) { out.push(`</${list}>`); list = null; } };

  for (const raw of lines) {
    const line = raw.trim();
    const ul = /^[-*•]\s+(.*)$/.exec(line);
    const ol = /^(\d+)[.)]\s+(.*)$/.exec(line);
    const h  = /^#{1,4}\s+(.*)$/.exec(line);
    if (!line) { flushPara(); closeList(); continue; }
    if (h) { flushPara(); closeList(); out.push(`<h5>${inline(h[1])}</h5>`); continue; }
    if (ul || ol) {
      flushPara();
      const kind = ul ? 'ul' : 'ol';
      // Model sering menyelipkan sub-bullet di antara "1." dan "2." → list pecah;
      // pakai start= supaya nomor lanjut, bukan kembali ke 1.
      if (list !== kind) { closeList(); out.push(ol ? `<ol start="${ol[1]}">` : '<ul>'); list = kind; }
      out.push(`<li>${inline(ul ? ul[1] : ol![2])}</li>`);
      continue;
    }
    closeList();
    para.push(line);
  }
  flushPara();
  closeList();
  return out.join('');
}
