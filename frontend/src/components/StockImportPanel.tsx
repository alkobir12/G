/**
 * ═══════════════════════════════════════════════════════════════
 *   StockImportPanel — Bulk stock adjustment from PDF / Image / Excel / CSV
 * ═══════════════════════════════════════════════════════════════
 *
 * Usage:
 *   <StockImportPanel parts={parts} onApply={(adjustments) => ...} addToast={...} />
 *
 * Pipeline:
 *   1. User picks a file (.pdf, .png, .jpg, .jpeg, .xlsx, .xls, .csv).
 *   2. The right extractor is dispatched:
 *        - PDF      → pdfjs-dist (per-page text extraction)
 *        - Image    → tesseract.js with ['ara', 'eng'] languages
 *        - Excel    → xlsx (first sheet → row of objects)
 *        - CSV      → simple split (UTF-8, comma / semicolon / tab)
 *   3. Extracted rows are parsed into { oem, name, qty } records.
 *   4. Each record is auto-matched against the local parts catalog
 *      (exact OEM > fuzzy OEM > fuzzy name).
 *   5. User reviews/edits the match table, ticks rows, hits "تطبيق التعديلات".
 *   6. `onApply([{ part_id, old_stock, new_stock, delta, note }])` is called.
 *
 * Lazy-loaded from POSView so the ~3MB of OCR + PDF deps stay out of the
 * initial bundle.
 * ═══════════════════════════════════════════════════════════════
 */

import { useMemo, useRef, useState } from "react";
import {
  Upload, FileText, Image as ImageIcon, FileSpreadsheet,
  Loader2, CheckCircle2, AlertOctagon, RotateCcw, Save,
} from "lucide-react";

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

interface PartLite {
  id: string;
  oem: string;
  name_ar: string;
  stock: number;
}

interface ExtractedLine {
  raw: string;
  oem: string;
  name: string;
  qty: number;
}

export interface StockAdjustment {
  part_id: string;
  old_stock: number;
  new_stock: number;
  delta: number;
  reason: string;
  matched_name: string;
}

interface MatchRow {
  // input
  oem: string;
  name: string;
  qty: number;
  // resolved
  partId: string | null;   // null = unmatched
  selected: boolean;
}

interface Props {
  parts: PartLite[];
  onApply: (adjustments: StockAdjustment[]) => Promise<void> | void;
  addToast: (msg: string, type?: "success" | "error" | "info" | "warning") => void;
}

// ────────────────────────────────────────────────────────────────
// Light, dependency-free fuzzy match
// ────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[\u064B-\u0652]/g, "")   // strip Arabic diacritics
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\u0600-\u06FFa-z0-9]+/g, " ")
    .trim();
}

function findMatch(line: ExtractedLine, parts: PartLite[]): string | null {
  if (!parts.length) return null;
  const oemN = normalize(line.oem);
  const nameN = normalize(line.name);

  // 1) exact OEM
  if (oemN) {
    const exact = parts.find((p) => normalize(p.oem) === oemN);
    if (exact) return exact.id;
    // 2) OEM substring
    const partial = parts.find((p) => normalize(p.oem).includes(oemN) || oemN.includes(normalize(p.oem)));
    if (partial) return partial.id;
  }

  // 3) name substring (longest token first)
  if (nameN) {
    const tokens = nameN.split(" ").filter((t) => t.length >= 3).sort((a, b) => b.length - a.length);
    for (const tok of tokens) {
      const hit = parts.find((p) => normalize(p.name_ar).includes(tok));
      if (hit) return hit.id;
    }
  }
  return null;
}

// ────────────────────────────────────────────────────────────────
// Row-level parser — turns raw text lines into ExtractedLine[]
// Heuristics:
//   - one number per line → qty
//   - OEM = first alphanumeric token ≥ 4 chars containing a digit
//   - name = the rest, trimmed
// ────────────────────────────────────────────────────────────────

const NUM_RE = /(\d+(?:\.\d+)?)/g;
const OEM_RE = /\b([A-Z0-9][A-Z0-9\-\/.]{2,})\b/i;

function parseTextLines(raw: string): ExtractedLine[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3);

  const out: ExtractedLine[] = [];
  for (const ln of lines) {
    const nums = ln.match(NUM_RE) || [];
    if (nums.length === 0) continue;
    // pick the *last* number on the line as quantity (Arabic convention puts qty at the end of the row)
    const qty = parseFloat(nums[nums.length - 1]);
    if (!isFinite(qty) || qty <= 0) continue;

    const oemMatch = ln.match(OEM_RE);
    const oem = oemMatch && /\d/.test(oemMatch[1]) ? oemMatch[1] : "";

    let name = ln;
    if (oem) name = name.replace(oem, " ");
    name = name.replace(NUM_RE, " ").replace(/[|,;:،]+/g, " ").replace(/\s+/g, " ").trim();

    if (!oem && !name) continue;
    out.push({ raw: ln, oem, name, qty });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────
// Extractors
// ────────────────────────────────────────────────────────────────

async function extractPdfText(file: File, onProgress: (msg: string) => void): Promise<string> {
  onProgress("جارٍ تحميل ملف PDF…");
  // pdfjs ships ESM; worker is bundled as a separate chunk.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — pdfjs-dist has no bundled types for /build/pdf.mjs in some setups
  const pdfjs: any = await import("pdfjs-dist");
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const arrayBuf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: arrayBuf }).promise;
  let full = "";
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress(`جارٍ قراءة الصفحة ${i} من ${doc.numPages}…`);
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    const lineMap = new Map<number, string[]>();
    for (const it of tc.items as any[]) {
      const y = Math.round(it.transform?.[5] ?? 0);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push(String(it.str || "").trim());
    }
    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
    full += sortedYs.map((y) => lineMap.get(y)!.filter(Boolean).join(" ")).join("\n") + "\n";
  }
  return full;
}

async function extractImageText(file: File, onProgress: (msg: string) => void): Promise<string> {
  onProgress("جارٍ تحميل محرك OCR (قد يستغرق ١٠–٣٠ ثانية في أول مرة)…");
  let Tesseract: any;
  try {
    Tesseract = (await import("tesseract.js")).default;
  } catch (e) {
    throw new Error("تعذر تحميل محرك التعرف على النصوص — تأكد من الاتصال بالإنترنت.");
  }
  const worker = await Tesseract.createWorker(["ara", "eng"], 1, {
    logger: (m: any) => {
      if (m?.status === "recognizing text" && typeof m.progress === "number") {
        onProgress(`جارٍ التعرف على النص… ${(m.progress * 100).toFixed(0)}%`);
      } else if (m?.status) {
        onProgress(m.status);
      }
    },
  });
  try {
    const url = URL.createObjectURL(file);
    const { data } = await worker.recognize(url);
    URL.revokeObjectURL(url);
    return data?.text || "";
  } finally {
    await worker.terminate();
  }
}

async function extractExcelText(file: File): Promise<ExtractedLine[]> {
  const XLSX: any = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(ws, { defval: "" });
  const out: ExtractedLine[] = [];
  for (const r of rows) {
    // try common Arabic / English headers
    const oem = String(r["OEM"] ?? r["oem"] ?? r["رقم القطعة"] ?? r["الرقم"] ?? "").trim();
    const name = String(r["الاسم"] ?? r["name"] ?? r["name_ar"] ?? r["Description"] ?? "").trim();
    const rawQty = r["الكمية"] ?? r["qty"] ?? r["quantity"] ?? r["Stock"] ?? r["stock"] ?? "";
    const qty = parseFloat(String(rawQty).replace(/[^\d.]/g, ""));
    if (!isFinite(qty) || qty <= 0) continue;
    if (!oem && !name) continue;
    out.push({ raw: JSON.stringify(r), oem, name, qty });
  }
  return out;
}

function extractCsvText(text: string): ExtractedLine[] {
  // Detect separator (',' ';' or '\t')
  const sep = text.includes("\t") ? "\t" : text.includes(";") ? ";" : ",";
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return parseTextLines(text);
  const header = lines[0].split(sep).map((h) => h.trim().toLowerCase());
  const idx = (keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
  const oemI = idx(["oem", "رقم", "code", "sku"]);
  const nameI = idx(["name", "اسم", "desc", "وصف"]);
  const qtyI = idx(["qty", "كم", "stock", "quantity"]);
  if (oemI < 0 && nameI < 0 && qtyI < 0) return parseTextLines(text);
  const out: ExtractedLine[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep);
    const oem = (cols[oemI] || "").trim();
    const name = (cols[nameI] || "").trim();
    const qty = parseFloat((cols[qtyI] || "").replace(/[^\d.]/g, ""));
    if (!isFinite(qty) || qty <= 0) continue;
    if (!oem && !name) continue;
    out.push({ raw: lines[i], oem, name, qty });
  }
  return out;
}

// ────────────────────────────────────────────────────────────────
// Component
// ────────────────────────────────────────────────────────────────

export default function StockImportPanel({ parts, onApply, addToast }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [applying, setApplying] = useState(false);

  const stats = useMemo(() => {
    const matched = rows.filter((r) => r.partId).length;
    const unmatched = rows.length - matched;
    const selected = rows.filter((r) => r.selected && r.partId).length;
    return { total: rows.length, matched, unmatched, selected };
  }, [rows]);

  function hydrateRowsFromExtracted(extracted: ExtractedLine[]) {
    const mapped: MatchRow[] = extracted.map((l) => {
      const partId = findMatch(l, parts);
      return { oem: l.oem, name: l.name, qty: l.qty, partId, selected: !!partId };
    });
    setRows(mapped);
  }

  async function handleFile(file: File) {
    setBusy(true);
    setRows([]);
    setFileName(file.name);
    setProgress("");
    try {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      let extracted: ExtractedLine[] = [];

      if (ext === "pdf") {
        const text = await extractPdfText(file, setProgress);
        extracted = parseTextLines(text);
      } else if (["png", "jpg", "jpeg", "webp", "bmp", "gif", "tiff"].includes(ext)) {
        const text = await extractImageText(file, setProgress);
        extracted = parseTextLines(text);
      } else if (["xlsx", "xls"].includes(ext)) {
        setProgress("جارٍ قراءة ملف Excel…");
        extracted = await extractExcelText(file);
      } else if (ext === "csv" || ext === "txt") {
        setProgress("جارٍ قراءة الملف…");
        const text = await file.text();
        extracted = extractCsvText(text);
      } else {
        addToast(`صيغة غير مدعومة: .${ext}`, "error");
        return;
      }

      if (extracted.length === 0) {
        addToast("لم يتم العثور على أي بيانات قابلة للاستخراج في هذا الملف.", "warning");
      }
      hydrateRowsFromExtracted(extracted);
      addToast(`تم استخراج ${extracted.length} سطر من ${file.name}`, "success");
    } catch (e: any) {
      console.error("[stock-import]", e);
      addToast(e?.message || "فشل قراءة الملف", "error");
    } finally {
      setBusy(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function applyAdjustments() {
    const selectedRows = rows.filter((r) => r.selected && r.partId);
    if (selectedRows.length === 0) {
      addToast("اختر صفاً واحداً على الأقل لتطبيق التعديل", "warning");
      return;
    }
    setApplying(true);
    try {
      const adjustments: StockAdjustment[] = selectedRows.map((r) => {
        const p = parts.find((x) => x.id === r.partId)!;
        return {
          part_id: p.id,
          old_stock: p.stock,
          new_stock: r.qty,
          delta: r.qty - p.stock,
          reason: `استيراد من ${fileName || "ملف"}`,
          matched_name: p.name_ar,
        };
      });
      await onApply(adjustments);
      addToast(`تم تطبيق ${adjustments.length} تعديل على المخزون`, "success");
      setRows([]);
      setFileName("");
    } catch (e: any) {
      addToast(e?.message || "فشل تطبيق التعديلات", "error");
    } finally {
      setApplying(false);
    }
  }

  const setRow = (i: number, patch: Partial<MatchRow>) =>
    setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-4" data-testid="stock-import-panel">
      {/* Drop / pick zone */}
      <div className="glass-liquid rounded-2xl p-6 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 transition-colors">
        <input
          ref={inputRef}
          data-testid="stock-import-file-input"
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          disabled={busy}
        />
        <div className="text-center space-y-3">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <Upload className="w-7 h-7 text-amber-400" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-100">استيراد قائمة جرد</p>
            <p className="text-xs text-slate-400 mt-1">
              ارفع ملف <strong>PDF</strong> أو <strong>صورة</strong> أو <strong>Excel</strong> أو <strong>CSV</strong> — سيتم استخراج رقم القطعة والكمية ومطابقتها بالمخزون.
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
            <FileText className="w-4 h-4" /> <span>PDF</span>
            <span className="text-slate-700">|</span>
            <ImageIcon className="w-4 h-4" /> <span>PNG / JPG</span>
            <span className="text-slate-700">|</span>
            <FileSpreadsheet className="w-4 h-4" /> <span>Excel / CSV</span>
          </div>
          <button
            data-testid="stock-import-pick-button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl liquid-btn text-white font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {busy ? "جارٍ المعالجة…" : "اختر ملفاً"}
          </button>
          {busy && progress && (
            <p className="text-xs text-amber-400 mt-2" data-testid="stock-import-progress">{progress}</p>
          )}
          {fileName && !busy && (
            <p className="text-xs text-slate-500 mt-2">آخر ملف: {fileName}</p>
          )}
        </div>
      </div>

      {/* Match table */}
      {rows.length > 0 && (
        <div className="glass-liquid rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-100">
                مطابقة <span className="text-emerald-400">{stats.matched}</span>
                {" / "}
                <span className="text-slate-400">{stats.total}</span>
              </span>
              {stats.unmatched > 0 && (
                <span className="text-xs text-rose-400 mr-3">
                  <AlertOctagon className="w-3 h-3 inline" /> {stats.unmatched} غير مطابق
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                data-testid="stock-import-clear-button"
                onClick={() => { setRows([]); setFileName(""); }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-300"
              >
                <RotateCcw className="w-3.5 h-3.5" /> إعادة
              </button>
              <button
                data-testid="stock-import-apply-button"
                onClick={applyAdjustments}
                disabled={stats.selected === 0 || applying}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold liquid-btn text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {applying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                تطبيق التعديلات ({stats.selected})
              </button>
            </div>
          </div>
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="bg-white/5 sticky top-0 z-10">
                <tr>
                  <th className="px-2 py-2 text-center w-8">
                    <input
                      type="checkbox"
                      data-testid="stock-import-select-all"
                      checked={rows.length > 0 && rows.every((r) => r.selected)}
                      onChange={(e) => setRows((prev) => prev.map((r) => ({ ...r, selected: e.target.checked && !!r.partId })))}
                    />
                  </th>
                  <th className="px-3 py-2 text-right font-bold text-amber-400">OEM</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-400">الاسم المستخرج</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-400">الكمية</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-400">المطابقة</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-400">المخزون الحالي</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-400">الجديد</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const matchedPart = r.partId ? parts.find((p) => p.id === r.partId) : null;
                  const delta = matchedPart ? r.qty - matchedPart.stock : 0;
                  return (
                    <tr
                      key={i}
                      className={`border-b border-white/5 transition-colors ${!r.partId ? "bg-rose-500/5" : ""} ${r.selected ? "bg-amber-500/5" : ""}`}
                      data-testid={`stock-import-row-${i}`}
                    >
                      <td className="px-2 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={r.selected}
                          disabled={!r.partId}
                          onChange={(e) => setRow(i, { selected: e.target.checked })}
                          data-testid={`stock-import-row-checkbox-${i}`}
                        />
                      </td>
                      <td className="px-3 py-2 font-mono text-slate-400">{r.oem || "—"}</td>
                      <td className="px-3 py-2 text-slate-200 max-w-[200px] truncate" title={r.name}>{r.name || "—"}</td>
                      <td className="px-3 py-2 text-slate-100 font-bold">{r.qty}</td>
                      <td className="px-3 py-2">
                        <select
                          value={r.partId || ""}
                          onChange={(e) => setRow(i, { partId: e.target.value || null, selected: !!e.target.value })}
                          className="px-2 py-1 rounded liquid-input text-xs text-slate-100 max-w-[180px]"
                          data-testid={`stock-import-row-select-${i}`}
                        >
                          <option value="">— لا توجد —</option>
                          {parts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.id} · {p.name_ar.slice(0, 30)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-slate-400">{matchedPart ? matchedPart.stock : "—"}</td>
                      <td className={`px-3 py-2 font-bold ${delta > 0 ? "text-emerald-400" : delta < 0 ? "text-rose-400" : "text-slate-400"}`}>
                        {matchedPart ? `${r.qty} (${delta >= 0 ? "+" : ""}${delta})` : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
