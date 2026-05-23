/**
 * ═══════════════════════════════════════════════════════════
 *   FileImportPanel — Parts Pro ERP
 *   Supports: .xlsx, .xls, .csv, .txt, .md
 *   Column mapping: Auto-detect + Manual override
 *   UTF-8 BOM safe, Arabic/English headers
 * ═══════════════════════════════════════════════════════════
 */
import { useState, useRef, useCallback, useMemo } from "react";
import {
  Upload, FileUp, RefreshCw, AlertTriangle,
  CheckCircle2,
  Settings2, ChevronDown, ChevronUp, ArrowRightLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────
interface ColumnMap {
  name: string | null;       // اسم القطعة
  oem: string | null;        // رقم OEM
  brand: string | null;      // الماركة
  category: string | null;   // الفئة
  model: string | null;      // الموديل
  stock: string | null;      // الكمية
  min_stock: string | null;  // الحد الأدنى
  cost: string | null;       // سعر التكلفة
  price: string | null;      // سعر البيع
  wholesale: string | null;  // سعر الجملة
  location: string | null;   // الموقع
}

interface ParsedRow {
  [key: string]: string | number;
}

interface ImportResult {
  name_ar: string;
  oem: string;
  brand: string;
  category: string;
  model: string;
  stock: number;
  min_stock: number;
  cost: number;
  price: number;
  wholesale: number;
  location: string;
  _row: number;
  _errors: string[];
}

interface FileImportPanelProps {
  onImport: (parts: any[]) => void;
  onClose: () => void;
}

// ─── Column name aliases (Arabic + English) ──────────────────
const COLUMN_ALIASES: Record<keyof ColumnMap, string[]> = {
  name:       ["name", "name_ar", "part_name", "item_name", "product_name", "description", "desc", "item", "product",
               "الاسم", "اسم", "اسم_القطعة", "اسم_الصنف", "الوصف", "وصف", "وصف_القطعة", "اسم القطعة", "اسم الصنف", "وصف القطعة",
               "بيان", "البيان", "item_name_ar", "piece_name", "part_name_ar"],
  oem:        ["oem", "oem_no", "part_no", "part_number", "part_no_oem", "sku", "code", "ref", "reference",
               "رقم", "الرقم", "رقم_القطعة", "رقم_الصنف", "رقم_oem", "oem_رقم", "الرقم الاصلي", "الرقم الأصلي",
               "رقم القطعة", "رقم OEM", "كود", "الكود", "ref_no", "sku_no"],
  brand:      ["brand", "make", "manufacturer", "factory",
               "الماركة", "ماركة", "الشركة", "شركة", "الصانع", "صانع", "المصنع", "مصنع", "ماركة السيارة"],
  category:   ["category", "cat", "group", "type", "class",
               "الفئة", "فئة", "التصنيف", "تصنيف", "النوع", "نوع", "المجموعة", "مجموعة", "القسم", "قسم"],
  model:      ["model", "vehicle", "car_model", "year", "vehicle_model",
               "الموديل", "موديل", "السيارة", "سيارة", "الماركة_والنوع", "الطراز", "طراز", "الموديل والنوع", "موديل السيارة", "المركبة", "مركبة"],
  stock:      ["stock", "qty", "quantity", "count", "on_hand", "inventory",
               "الكمية", "كمية", "العدد", "عدد", "المخزون", "مخزون", "الرصيد", "رصيد", "المتوفر", "متوفر",
               "quantity_in_stock", "qty_in_stock", "current_stock", "balance"],
  min_stock:  ["min_stock", "minimum_stock", "min_qty", "reorder_point", "safety_stock",
               "الحد_الأدنى", "حد_أدنى", "الحد الأدنى", "حد الأدنى", "الحد_الادنى", "حد الادنى",
               "الحد الأدنى للمخزون", "حد أدنى المخزون", "نقطة_إعادة_الطلب", "min"],
  cost:       ["cost", "purchase_price", "buy_price", "unit_cost", "cost_price", "landing_cost",
               "التكلفة", "تكلفة", "سعر_التكلفة", "سعر التكلفة", "سعر_الشراء", "سعر الشراء", "تكلفة_الوحدة",
               "cost_per_unit", "purchase_cost", "buying_price"],
  price:      ["price", "sale_price", "selling_price", "retail_price", "unit_price", "list_price",
               "السعر", "سعر", "سعر_البيع", "سعر البيع", "سعر_التجزئة", "سعر التجزئة", "سعر_القطعة", "سعر القطعة",
               "price_per_unit", "retail", "sell_price"],
  wholesale:  ["wholesale", "wholesale_price", "bulk_price", "dealer_price", "jobber_price",
               "الجملة", "جملة", "سعر_الجملة", "سعر الجملة", "سعر_البيع_الجملة", "سعر_المورد", "سعر المورد",
               "wholesale_rate", "jobber", "wd_price"],
  location:   ["location", "position", "bin", "shelf", "rack", "warehouse_location", "store_location",
               "الموقع", "موقع", "الموقع_في_المستودع", "موقع المستودع", "الرف", "رف", "الرفف", "رفف",
               "الصندوق", "صندوق", "bin_location", "shelf_no", "position_code"],
};

// ─── Category normalizer ─────────────────────────────────────
const CATEGORY_ALIASES: Record<string, string> = {
  "محرك": "محرك", "engine": "محرك", "engines": "محرك", "motor": "محرك", "motors": "محرك",
  "تبريد": "تبريد", "cooling": "تبريد", "ac": "تبريد", "a/c": "تبريد", "air_cond": "تبريد", "radiator": "تبريد",
  "كهرباء": "كهرباء", "electrical": "كهرباء", "electric": "كهرباء", "electronics": "كهرباء",
  "فرامل": "فرامل", "brake": "فرامل", "brakes": "فرامل", "breaking": "فرامل",
  "عليق": "عليق", "suspension": "عليق", "shock": "عليق", "absorber": "عليق",
  "نقل": "نقل", "transmission": "نقل", "gear": "نقل", "transfer": "نقل",
  "هيكل": "هيكل", "body": "هيكل", "chassis": "هيكل", "frame": "هيكل", "bumper": "هيكل",
  "اكسسوارات": "أخرى", "accessories": "أخرى", "misc": "أخرى", "general": "أخرى",
};

const VALID_CATEGORIES = ["محرك", "تبريد", "كهرباء", "فرامل", "عليق", "نقل", "هيكل", "أخرى"];

// ─── Helper: normalize header text ───────────────────────────
function normalizeHeader(h: string): string {
  return String(h ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

// ─── Helper: auto-detect column mapping ──────────────────────
function autoDetectColumns(headers: string[]): ColumnMap {
  const map: ColumnMap = {
    name: null, oem: null, brand: null, category: null, model: null,
    stock: null, min_stock: null, cost: null, price: null, wholesale: null, location: null,
  };

  for (const h of headers) {
    const nh = normalizeHeader(h);
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if ((map as any)[field] !== null) continue;
      const normalizedAliases = aliases.map((a) => normalizeHeader(a));
      if (normalizedAliases.includes(nh)) {
        (map as any)[field] = h;
        break;
      }
    }
  }

  return map;
}

// ─── Helper: parse CSV with UTF-8 BOM support ────────────────
function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  // Strip BOM
  const clean = text.replace(/^\uFEFF/, "");
  const lines = clean.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length === 0) return { headers: [], rows: [] };

  // Detect delimiter (comma, semicolon, tab, pipe)
  const firstLine = lines[0];
  const delimiters = [",", ";", "\t", "|"];
  let bestDelim = ",";
  let bestCount = 0;
  for (const d of delimiters) {
    const c = firstLine.split(d).length;
    if (c > bestCount) { bestCount = c; bestDelim = d; }
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (ch === bestDelim && !inQuotes) {
        result.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    result.push(cur.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = parseLine(lines[i]);
    if (vals.every((v) => v === "")) continue;
    const row: ParsedRow = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    rows.push(row);
  }

  return { headers, rows };
}

// ─── Helper: convert mapped rows to ImportResult ─────────────
function convertToParts(
  rows: ParsedRow[],
  colMap: ColumnMap,
  startRow: number
): ImportResult[] {
  return rows.map((row, idx) => {
    const errors: string[] = [];

    const get = (field: keyof ColumnMap): string => {
      const header = colMap[field];
      return header != null ? String(row[header] ?? "").trim() : "";
    };
    const getNum = (field: keyof ColumnMap): number => {
      const v = get(field);
      const n = parseFloat(v.replace(/,/g, ""));
      return isNaN(n) ? 0 : n;
    };

    const nameRaw = get("name");
    const name_ar = nameRaw || `قطعة ${idx + 1}`;
    if (!nameRaw) errors.push("لا يوجد اسم للقطعة");

    const oemVal = get("oem");
    const oem = oemVal || `GEN-${String(idx + 1).padStart(4, "0")}`;

    let brand = get("brand");
    if (!brand) brand = "عام";

    let categoryRaw = get("category");
    let category = "أخرى";
    if (categoryRaw) {
      const nc = normalizeHeader(categoryRaw);
      for (const [alias, real] of Object.entries(CATEGORY_ALIASES)) {
        if (nc.includes(alias)) { category = real; break; }
      }
      if (!VALID_CATEGORIES.includes(category)) category = "أخرى";
    }

    const model = get("model");

    const stockVal = getNum("stock");
    const stock = Math.max(0, Math.round(stockVal));

    const minStockVal = getNum("min_stock");
    const min_stock = minStockVal > 0 ? Math.round(minStockVal) : 2;

    const priceVal = getNum("price");
    const price = Math.max(0, priceVal);
    if (price === 0) errors.push("سعر البيع مفقود أو صفر");

    const costVal = getNum("cost");
    const cost = costVal > 0 ? costVal : price > 0 ? price * 0.6 : 0;

    const wholesaleVal = getNum("wholesale");
    const wholesale = wholesaleVal > 0 ? wholesaleVal : price > 0 ? price * 0.85 : 0;

    const location = get("location");

    return {
      name_ar, oem, brand, category, model,
      stock, min_stock, cost, price, wholesale, location,
      _row: startRow + idx + 2, // 1-based, skipping header
      _errors: errors,
    };
  });
}

// ─── Component ───────────────────────────────────────────────
export default function FileImportPanel({ onImport, onClose }: FileImportPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<ParsedRow[]>([]);
  const [colMap, setColMap] = useState<ColumnMap>({
    name: null, oem: null, brand: null, category: null, model: null,
    stock: null, min_stock: null, cost: null, price: null, wholesale: null, location: null,
  });
  const [showMapping, setShowMapping] = useState(false);

  const [results, setResults] = useState<ImportResult[]>([]);
  const [importStats, setImportStats] = useState<{ total: number; ok: number; warn: number } | null>(null);

  // ── Drag & drop ──
  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => setDragOver(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) processFile(e.target.files[0]);
  };

  // ── Core file processor ──
  /** File types we explicitly reject with a clear message */
  const BLOCKED_EXTS = ["pdf", "png", "jpg", "jpeg", "gif", "bmp", "webp", "svg", "img", "zip", "rar", "7z", "exe", "doc", "docx"];

  const processFile = async (file: File) => {
    setFileName(file.name);
    setProcessing(true);
    setProgress(0);
    setError("");
    setResults([]);
    setImportStats(null);
    setShowMapping(false);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

      // Explicitly reject image, PDF, archive, and binary files
      if (BLOCKED_EXTS.includes(ext)) {
        setError(`صيغة الملف .${ext} غير مدعومة للاستيراد.\nالصيغ المدعومة: Excel (.xlsx, .xls) · CSV · TXT · MD\nيرجى تحويل الملف إلى CSV أو Excel أولاً.`);
        setProcessing(false);
        return;
      }

      // ══ Excel ══
      if (ext === "xlsx" || ext === "xls") {
        setProgress(10);
        const XLSX = await import("xlsx");
        setProgress(30);
        const buf = await file.arrayBuffer();
        setProgress(50);
        const wb = XLSX.read(buf, { type: "array", codepage: 65001 });
        setProgress(70);
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as any[][];

        if (json.length < 2) { setError("الملف فارغ أو لا يحتوي على بيانات كافية (يحتاج صف رأس + صف بيانات)"); setProcessing(false); return; }

        const headers = json[0].map((h: any) => String(h).trim());
        const rows: ParsedRow[] = json.slice(1).map((row: any[]) => {
          const obj: ParsedRow = {};
          headers.forEach((h, i) => { obj[h] = row[i] ?? ""; });
          return obj;
        }).filter((r) => Object.values(r).some((v) => String(v).trim() !== ""));

        handleParsed(headers, rows);
        return;
      }

      // ══ CSV / TXT / MD ══
      if (ext === "csv" || ext === "txt" || ext === "md") {
        setProgress(10);
        const text = await file.text();
        setProgress(40);
        const { headers, rows } = parseCSV(text);
        setProgress(70);

        if (headers.length === 0) { setError("لا يوجد رأس في الملف"); setProcessing(false); return; }
        if (rows.length === 0) { setError("الملف لا يحتوي على صفوف بيانات"); setProcessing(false); return; }

        handleParsed(headers, rows);
        return;
      }

      setError(`صيغة الملف غير مدعومة (.${ext})\nالصيغ المدعومة: Excel (.xlsx, .xls) · CSV · TXT · MD`);
    } catch (err: any) {
      setError("خطأ في المعالجة: " + (err.message || "غير معروف"));
    } finally {
      setProcessing(false);
    }
  };

  // ── After parsing headers+rows ──
  const handleParsed = (headers: string[], rows: ParsedRow[]) => {
    setRawHeaders(headers);
    setRawRows(rows);
    const detected = autoDetectColumns(headers);
    setColMap(detected);

    // Immediately preview
    previewResults(rows, detected);

    // Show mapping UI if any critical column missing
    const criticalMissing = !detected.name && !detected.oem && !detected.stock && !detected.price;
    if (criticalMissing) {
      setError("لم يتم التعرف تلقائياً على أعمدة رئيسية — يرجى ربط الأعمدة يدوياً");
      setShowMapping(true);
    }
    setProgress(100);
  };

  // ── Preview results with current mapping ──
  const previewResults = (rows: ParsedRow[], mapping: ColumnMap) => {
    const converted = convertToParts(rows, mapping, 0);
    setResults(converted);
    const ok = converted.filter((r) => r._errors.length === 0).length;
    const warn = converted.filter((r) => r._errors.length > 0).length;
    setImportStats({ total: converted.length, ok, warn });
  };

  // ── Re-preview when mapping changes ──
  const handleMapChange = (field: keyof ColumnMap, header: string) => {
    const updated = { ...colMap, [field]: header === "" ? null : header };
    setColMap(updated);
    previewResults(rawRows, updated);
  };

  // ── Do the import ──
  const handleImport = () => {
    if (results.length === 0) return;

    // Filter out rows that have NO name at all
    const validParts = results
      .filter((r) => r.name_ar && r.name_ar.length > 0)
      .map((r) => ({
        id: `SKU-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        oem: r.oem,
        name_ar: r.name_ar,
        brand: r.brand,
        category: r.category,
        model: r.model,
        stock: r.stock,
        min_stock: r.min_stock,
        location: r.location || "",
        cost: Number(r.cost.toFixed(2)),
        price: Number(r.price.toFixed(2)),
        wholesale: Number(r.wholesale.toFixed(2)),
      }));

    if (validParts.length === 0) {
      setError("لا يوجد قطع صالحة للاستيراد — تأكد من ربط عمود 'الاسم' على الأقل");
      return;
    }

    onImport(validParts);
    onClose();
  };

  // ── Available headers for mapping dropdowns ──
  const headerOptions = useMemo(() => {
    const opts = rawHeaders.map((h) => ({ value: h, label: h }));
    return [{ value: "", label: "— غير مربوط —" }, ...opts];
  }, [rawHeaders]);

  const mapFields: { key: keyof ColumnMap; label: string; required: boolean }[] = [
    { key: "name", label: "اسم القطعة", required: true },
    { key: "oem", label: "رقم OEM / SKU", required: false },
    { key: "brand", label: "الماركة", required: false },
    { key: "category", label: "الفئة", required: false },
    { key: "model", label: "الموديل / المركبة", required: false },
    { key: "stock", label: "الكمية (المخزون)", required: true },
    { key: "min_stock", label: "الحد الأدنى", required: false },
    { key: "cost", label: "سعر التكلفة", required: false },
    { key: "price", label: "سعر البيع", required: true },
    { key: "wholesale", label: "سعر الجملة", required: false },
    { key: "location", label: "الموقع في المستودع", required: false },
  ];

  // ── JSX ──
  return (
    <div className="space-y-4" dir="rtl">
      {/* ── Drop zone ── */}
      <div
        onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 ${
          dragOver ? "border-amber-400 bg-amber-500/10" : error ? "border-rose-400 bg-rose-500/10" : "border-white/20 bg-white/5 hover:border-amber-400 hover:bg-amber-500/10"
        }`}
      >
        <input
          ref={fileInputRef} type="file" className="hidden"
          accept=".xlsx,.xls,.csv,.txt,.md"
          onChange={handleFileInput}
        />
        <Upload className={`w-12 h-12 mx-auto mb-3 ${dragOver ? "text-amber-400" : error ? "text-rose-400" : "text-slate-400"}`} />
        <p className="text-sm font-medium text-slate-200">
          اسحب الملف هنا أو <span className="text-amber-400 underline">اضغط للاختيار</span>
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Excel (.xlsx, .xls) · CSV · TXT · MD
        </p>
      </div>

      {/* ── File name + progress ── */}
      {fileName && (
        <div className="flex items-center gap-2 px-3 py-2 glass-liquid rounded-xl">
          <FileUp className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-slate-200 font-medium flex-1">{fileName}</span>
          {processing && <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />}
        </div>
      )}

      {processing && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>جاري المعالجة...</span><span>{progress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Stats ── */}
      {importStats && (
        <div className="grid grid-cols-3 gap-2">
          <div className="glass-liquid rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-amber-400">{importStats.total}</p>
            <p className="text-xs text-slate-300">إجمالي الصفوف</p>
          </div>
          <div className="glass-liquid rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-emerald-400">{importStats.ok}</p>
            <p className="text-xs text-slate-300">صالحة</p>
          </div>
          <div className="glass-liquid rounded-xl p-3 text-center">
            <p className="text-lg font-bold text-rose-400">{importStats.warn}</p>
            <p className="text-xs text-slate-300">تحذيرات</p>
          </div>
        </div>
      )}

      {/* ── Column Mapping ── */}
      {results.length > 0 && (
        <div className="space-y-3">
          {/* Toggle mapping UI */}
          <button
            onClick={() => setShowMapping(!showMapping)}
            className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Settings2 className="w-4 h-4" />
            ربط الأعمدة {showMapping ? "(إخفاء)" : "(عرض)"}
            {showMapping ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {showMapping && (
            <div className="glass-liquid rounded-xl p-4 space-y-3 border border-amber-500/20">
              <p className="text-xs text-amber-400 font-bold">ربط أعمدة الملف بحقول القطع:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {mapFields.map((f) => (
                  <div key={f.key} className="flex items-center gap-2">
                    <label className={`text-xs w-28 text-left flex-shrink-0 ${f.required ? "text-amber-400 font-bold" : "text-slate-400"}`}>
                      {f.label}{f.required && " *"}
                    </label>
                    <select
                      value={colMap[f.key] ?? ""}
                      onChange={(e) => handleMapChange(f.key, e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg liquid-input text-xs text-slate-100"
                    >
                      {headerOptions.map((o) => (
                        <option key={o.value} value={o.value} className="bg-slate-800">{o.label}</option>
                      ))}
                    </select>
                    {colMap[f.key] && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Preview table ── */}
      {results.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-slate-200">
              معاينة ({Math.min(results.length, 20)} من {results.length})
            </p>
            <span className="text-[10px] text-slate-500">الصفوف ذات الخلفية الحمراء بها تحذيرات</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-white/10 max-h-80">
            <table className="w-full text-xs">
              <thead className="bg-white/5 sticky top-0">
                <tr>
                  <th className="px-2 py-2 text-right font-bold text-amber-400 border-b border-white/10">#</th>
                  <th className="px-2 py-2 text-right font-bold text-amber-400 border-b border-white/10">الاسم</th>
                  <th className="px-2 py-2 text-right font-bold text-amber-400 border-b border-white/10">OEM</th>
                  <th className="px-2 py-2 text-right font-bold text-amber-400 border-b border-white/10">كم</th>
                  <th className="px-2 py-2 text-right font-bold text-amber-400 border-b border-white/10">تكلفة</th>
                  <th className="px-2 py-2 text-right font-bold text-amber-400 border-b border-white/10">سعر</th>
                  <th className="px-2 py-2 text-right font-bold text-amber-400 border-b border-white/10">تحذيرات</th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 20).map((r, i) => (
                  <tr
                    key={i}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${r._errors.length > 0 ? "bg-rose-500/5" : ""}`}
                  >
                    <td className="px-2 py-1.5 text-slate-400 font-mono">{r._row}</td>
                    <td className="px-2 py-1.5 text-slate-200 font-medium min-w-[120px]">{r.name_ar}</td>
                    <td className="px-2 py-1.5 text-slate-400 font-mono">{r.oem}</td>
                    <td className="px-2 py-1.5 text-slate-300">{r.stock}</td>
                    <td className="px-2 py-1.5 text-slate-300">{r.cost.toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-emerald-300 font-bold">{r.price.toFixed(2)}</td>
                    <td className="px-2 py-1.5">
                      {r._errors.length > 0 ? (
                        <span className="text-[10px] text-rose-400" title={r._errors.join(" / ")}>
                          {r._errors.slice(0, 2).join(" / ")}
                        </span>
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors">
          إلغاء
        </button>
        <button
          onClick={handleImport}
          disabled={results.length === 0}
          className="px-4 py-2 rounded-xl text-sm font-bold text-white liquid-btn disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" />
          استيراد {results.filter((r) => r._errors.length === 0).length} قطعة
        </button>
      </div>
    </div>
  );
}
