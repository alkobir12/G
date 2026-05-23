import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const fmt = (n: number) => Number(n || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtInt = (n: number) => Number(n || 0).toLocaleString("ar-SA");
export const today = () => new Date().toISOString().slice(0, 10);
export const newId = (p: string) => p + "-" + Date.now().toString().slice(-6);
export const stockStatus = (p: { stock: number; min_stock: number }) =>
  p.stock <= p.min_stock / 2 ? "نفاذ" : p.stock <= p.min_stock ? "منخفض" : "متوفر";

// Parse imported Excel/CSV data into Part objects
export function parseImportedParts(data: any[][]): any[] {
  if (!data || data.length < 2) return [];
  const headers = data[0].map((h: any) => String(h).trim().toLowerCase());
  const parts: any[] = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length < 3) continue;
    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = headers.findIndex(h => h.includes(k));
        if (idx >= 0 && row[idx] !== undefined) return row[idx];
      }
      return "";
    };
    const name = get(["name", "product name", "اسم", "صنف", "item", "description"]);
    const oem = get(["oem", "part number", "رقم", "code", "product code", "part no"]);
    const price = Number(get(["price", "سعر", "unit price", "السعر"])) || 0;
    const cost = Number(get(["cost", "تكلفة", "cost price"])) || 0;
    const qty = Number(get(["qty", "quantity", "stock", "الكمية", "count"])) || 10;
    const category = get(["category", "فئة", "type"]) || "محرك";
    const brand = get(["brand", "ماركة", "make", "manufacturer"]) || "عام";
    const model = get(["model", "موديل", "vehicle", "car"]);
    if (!name && !oem) continue;
    parts.push({
      id: newId("SKU"),
      oem: oem || newId("OEM"),
      name_ar: name || oem,
      brand: brand,
      category: category,
      model: model || "",
      stock: qty,
      min_stock: 2,
      location: "",
      cost: cost || price * 0.6,
      price: price || cost * 1.4,
      wholesale: price * 0.85 || cost * 1.2
    });
  }
  return parts;
}

// Excel export helper
export function exportToExcel(data: any[][], filename: string) {
  import('xlsx').then((XLSX) => {
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, filename);
  });
}

// PDF export helper
export async function exportToPDF(elementId: string, filename: string) {
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).default;
  const element = document.getElementById(elementId);
  if (!element) return;
  const canvas = await html2canvas(element, { scale: 2 });
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
}
