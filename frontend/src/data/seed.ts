export interface Part { id: string; oem: string; name_ar: string; brand: string; category: string; model: string; stock: number; min_stock: number; location: string; cost: number; price: number; wholesale: number; }
export interface Supplier { id: string; name: string; contact: string; phone: string; city: string; rating: number; balance: number; }
export interface Customer { id: string; name: string; phone: string; email: string; address: string; balance: number; total_bought: number; last_visit: string; }
export interface InvoiceItem { part_id: string; name: string; qty: number; price: number; cost: number; }
export interface Invoice { id: string; date: string; customer: string; phone: string; items: InvoiceItem[]; subtotal: number; vat: number; total: number; payment: string; status: string; type?: string; }
export interface PurchaseItem { part_id: string; name: string; qty: number; cost: number; }
export interface Purchase { id: string; date: string; supplier: string; supplier_name: string; items: PurchaseItem[]; subtotal: number; vat: number; total: number; status: string; source?: string; file_name?: string; }
export interface Expense { id: string; date: string; category: string; description: string; amount: number; account: string; account_name?: string; reason?: string; party?: string; }
export interface Account { code: string; name: string; type: string; parent: string | null; system: boolean; balance?: number; }
export interface AppSettings { company_name: string; logo: string; address: string; phone: string; email: string; vat_number: string; cr_number: string; currency: string; vat_enabled: boolean; vat_rate: number; default_template: string; invoice_footer: string; }
export interface PriceHistory { id: string; part_id: string; part_name: string; date: string; old_cost: number; new_cost: number; old_price: number; new_price: number; type: "purchase" | "sale" | "manual"; source: string; }
export interface JournalEntry { id: string; date: string; ref: string; desc: string; debit_account: string; credit_account: string; amount: number; }
export interface WorkshopPart { id: string; part_id: string; part_name: string; date: string; qty: number; cost: number; used_in: string; mechanic: string; status: "متوفر" | "مستخدم"; }

// ═══════════════════════════════════════════════════
// MITSUBISHI PARTS (60 items)
// ═══════════════════════════════════════════════════
export const MITSUBISHI_PARTS: Part[] = [
  { id: "SKU-MIT-00001", oem: "MI00000207", name_ar: "BULB CLEARANCE LAMP", brand: "Mitsubishi", category: "كهرباء", model: "L200 / Pajero", stock: 5, min_stock: 2, location: "B02-ممر2", cost: 12, price: 20, wholesale: 17 },
  { id: "SKU-MIT-00002", oem: "MI00000382", name_ar: "BULB FR TURN SIGNAL", brand: "Mitsubishi", category: "كهرباء", model: "L200 / Pajero", stock: 5, min_stock: 2, location: "B02-ممر3", cost: 13.8, price: 23, wholesale: 19.55 },
  { id: "SKU-MIT-00003", oem: "MI01125A1041", name_ar: "BOLT STARTER", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 5, min_stock: 2, location: "B02-ممر4", cost: 5.4, price: 9, wholesale: 7.65 },
  { id: "SKU-MIT-00004", oem: "MI04155032", name_ar: "BEARING STARTER FRT", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 5, min_stock: 2, location: "B02-ممر5", cost: 12.6, price: 21, wholesale: 17.85 },
  { id: "SKU-MIT-00005", oem: "MI1000A161", name_ar: "GSKT KIT ENG OVERHAU", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 8, min_stock: 2, location: "B03-ممر1", cost: 529.8, price: 883, wholesale: 750.55 },
  { id: "SKU-MIT-00006", oem: "MI1000A162", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 8, min_stock: 2, location: "B03-ممر2", cost: 492.6, price: 821, wholesale: 697.85 },
  { id: "SKU-MIT-00007", oem: "MI1000A382", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 18, min_stock: 2, location: "B03-ممر3", cost: 1114.2, price: 1857, wholesale: 1578.45 },
  { id: "SKU-MIT-00008", oem: "MI1000A400", name_ar: "ENGINE ASSY SHORT 4D56", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 173, min_stock: 2, location: "B03-ممر4", cost: 10434.6, price: 17391, wholesale: 14782.35 },
  { id: "SKU-MIT-00009", oem: "MI1000A406", name_ar: "GSKT KIT ENG OVERHAU", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 13, min_stock: 2, location: "B03-ممر5", cost: 799.2, price: 1332, wholesale: 1132.2 },
  { id: "SKU-MIT-00010", oem: "MI1000A407", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 13, min_stock: 2, location: "B04-ممر1", cost: 819.6, price: 1366, wholesale: 1161.1 },
  { id: "SKU-MIT-00011", oem: "MI1000A437", name_ar: "SHORT ENGINE ASSY", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 142, min_stock: 2, location: "B04-ممر2", cost: 8557.8, price: 14263, wholesale: 12123.55 },
  { id: "SKU-MIT-00012", oem: "MI1000A455", name_ar: "ENGINE ASSY SHORT 6G74", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 192, min_stock: 2, location: "B04-ممر3", cost: 11560.8, price: 19268, wholesale: 16377.8 },
  { id: "SKU-MIT-00013", oem: "MI1000A493", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 34, min_stock: 2, location: "B04-ممر4", cost: 2042.4, price: 3404, wholesale: 2893.4 },
  { id: "SKU-MIT-00014", oem: "MI1000A557", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 15, min_stock: 2, location: "B04-ممر5", cost: 913.8, price: 1523, wholesale: 1294.55 },
  { id: "SKU-MIT-00015", oem: "MI1000A571", name_ar: "GSKT KIT ENG OVERHAU", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 12, min_stock: 2, location: "B05-ممر1", cost: 753.6, price: 1256, wholesale: 1067.6 },
  { id: "SKU-MIT-00016", oem: "MI1000A669", name_ar: "GSKT KIT ENG O/H", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 14, min_stock: 2, location: "B05-ممر2", cost: 868.8, price: 1448, wholesale: 1230.8 },
  { id: "SKU-MIT-00017", oem: "MI1000A670", name_ar: "ENG ASSY SHORT", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 197, min_stock: 2, location: "B05-ممر3", cost: 11840.4, price: 19734, wholesale: 16773.9 },
  { id: "SKU-MIT-00018", oem: "MI1000A671", name_ar: "ENG ASSY SHORT", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 168, min_stock: 2, location: "B05-ممر4", cost: 10138.8, price: 16898, wholesale: 14363.3 },
  { id: "SKU-MIT-00019", oem: "MI1000A672", name_ar: "ENG ASSY SHORT", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 181, min_stock: 2, location: "B05-ممر5", cost: 10887.6, price: 18146, wholesale: 15424.1 },
  { id: "SKU-MIT-00020", oem: "MI1000A673", name_ar: "ENGINE ASSY SHORT", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 191, min_stock: 2, location: "B06-ممر1", cost: 11467.8, price: 19113, wholesale: 16246.05 },
  { id: "SKU-MIT-00021", oem: "MI1000A675", name_ar: "ENGINE ASSY SHORT 6B", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 240, min_stock: 2, location: "B06-ممر2", cost: 14425.2, price: 24042, wholesale: 20435.7 },
  { id: "SKU-MIT-00022", oem: "MI1000A677", name_ar: "ENGINE ASSY SHORT 4M", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 435, min_stock: 2, location: "B06-ممر3", cost: 26135.4, price: 43559, wholesale: 37025.15 },
  { id: "SKU-MIT-00023", oem: "MI1000A697", name_ar: "GSKT KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 19, min_stock: 2, location: "B06-ممر4", cost: 1171.8, price: 1953, wholesale: 1660.05 },
  { id: "SKU-MIT-00024", oem: "MI1000A698", name_ar: "GSKT KIT ENG O/H", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 19, min_stock: 2, location: "B06-ممر5", cost: 1171.8, price: 1953, wholesale: 1660.05 },
  { id: "SKU-MIT-00025", oem: "MI1000A861", name_ar: "ENGINE ASSY 4B11-1-01 T/C", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 446, min_stock: 2, location: "B07-ممر1", cost: 26795.4, price: 44659, wholesale: 37960.15 },
  { id: "SKU-MIT-00026", oem: "MI1000A879", name_ar: "ENGINE ASSY 4G63-F-HD P/S", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 206, min_stock: 2, location: "B07-ممر2", cost: 12398.4, price: 20664, wholesale: 17564.4 },
  { id: "SKU-MIT-00027", oem: "MI1000A895", name_ar: "GASKET KIT O/H", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 7, min_stock: 2, location: "B07-ممر3", cost: 464.4, price: 774, wholesale: 657.9 },
  { id: "SKU-MIT-00028", oem: "MI1000A901", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 19, min_stock: 2, location: "B07-ممر4", cost: 1149, price: 1915, wholesale: 1627.75 },
  { id: "SKU-MIT-00029", oem: "MI1000A902", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 14, min_stock: 2, location: "B07-ممر5", cost: 840.6, price: 1401, wholesale: 1190.85 },
  { id: "SKU-MIT-00030", oem: "MI1000A910", name_ar: "GSKT KIT ENG OVERHAUL UPR", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 5, min_stock: 2, location: "B08-ممر1", cost: 340.2, price: 567, wholesale: 481.95 },
  { id: "SKU-MIT-00031", oem: "MI1000A923", name_ar: "LIQUID GASKET ENG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 4, min_stock: 2, location: "B08-ممر2", cost: 293.4, price: 489, wholesale: 415.65 },
  { id: "SKU-MIT-00032", oem: "MI1000A933", name_ar: "ENGINE ASSY 4B11-1-33 T/C", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 388, min_stock: 2, location: "B08-ممر3", cost: 23280, price: 38800, wholesale: 32980 },
  { id: "SKU-MIT-00033", oem: "MI1000A954", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 16, min_stock: 2, location: "B08-ممر4", cost: 978.6, price: 1631, wholesale: 1386.35 },
  { id: "SKU-MIT-00034", oem: "MI1000A992", name_ar: "LIQUID GASKET ENG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 1, min_stock: 1, location: "B08-ممر5", cost: 107.4, price: 179, wholesale: 152.15 },
  { id: "SKU-MIT-00035", oem: "MI1000B075", name_ar: "ENGINE ASSY SHORT 4G", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 316, min_stock: 2, location: "B09-ممر1", cost: 19002.6, price: 31671, wholesale: 26920.35 },
  { id: "SKU-MIT-00036", oem: "MI1000B136", name_ar: "ENGINE ASSY SHORT 6G75", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 192, min_stock: 2, location: "B09-ممر2", cost: 11546.4, price: 19244, wholesale: 16357.4 },
  { id: "SKU-MIT-00037", oem: "MI1000B137", name_ar: "ENGINE ASSY SHORT", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 180, min_stock: 2, location: "B09-ممر3", cost: 10818.6, price: 18031, wholesale: 15326.35 },
  { id: "SKU-MIT-00038", oem: "MI1000B187", name_ar: "ENGINE ASSY SHORT 4M41", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 222, min_stock: 2, location: "B09-ممر4", cost: 13368, price: 22280, wholesale: 18938 },
  { id: "SKU-MIT-00039", oem: "MI1000B334", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 10, min_stock: 2, location: "B09-ممر5", cost: 624.6, price: 1041, wholesale: 884.85 },
  { id: "SKU-MIT-00040", oem: "MI1000B335", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 9, min_stock: 2, location: "B10-ممر1", cost: 588, price: 980, wholesale: 833 },
  { id: "SKU-MIT-00041", oem: "MI1000B338", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 14, min_stock: 2, location: "B10-ممر2", cost: 891.6, price: 1486, wholesale: 1263.1 },
  { id: "SKU-MIT-00042", oem: "MI1000B452", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 11, min_stock: 2, location: "B10-ممر3", cost: 697.8, price: 1163, wholesale: 988.55 },
  { id: "SKU-MIT-00043", oem: "MI1000B593", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 12, min_stock: 2, location: "B10-ممر4", cost: 723.6, price: 1206, wholesale: 1025.1 },
  { id: "SKU-MIT-00044", oem: "MI1000B681", name_ar: "ENGINE ASSY SHORT 4G69", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 166, min_stock: 2, location: "B10-ممر5", cost: 10014.6, price: 16691, wholesale: 14187.35 },
  { id: "SKU-MIT-00045", oem: "MI1000B786", name_ar: "GASKET KIT ENG OVERH", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 27, min_stock: 2, location: "B11-ممر1", cost: 1650, price: 2750, wholesale: 2337.5 },
  { id: "SKU-MIT-00046", oem: "MI1000B789", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 17, min_stock: 2, location: "B11-ممر2", cost: 1078.2, price: 1797, wholesale: 1527.45 },
  { id: "SKU-MIT-00047", oem: "MI1000C012", name_ar: "ENGINE ASSY SHORT 3A92", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 104, min_stock: 2, location: "B11-ممر3", cost: 6271.2, price: 10452, wholesale: 8884.2 },
  { id: "SKU-MIT-00048", oem: "MI1000C528", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 13, min_stock: 2, location: "B11-ممر4", cost: 837, price: 1395, wholesale: 1185.75 },
  { id: "SKU-MIT-00049", oem: "MI1000C538", name_ar: "ENGINE ASSY SHORT 3A92", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 104, min_stock: 2, location: "B11-ممر5", cost: 6271.8, price: 10453, wholesale: 8885.05 },
  { id: "SKU-MIT-00050", oem: "MI1000C663", name_ar: "GASKET KIT ENG OVERHAUL", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 9, min_stock: 2, location: "B12-ممر1", cost: 598.8, price: 998, wholesale: 848.3 },
  { id: "SKU-MIT-00051", oem: "MI1000C697", name_ar: "ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 530, min_stock: 2, location: "B12-ممر2", cost: 31801.2, price: 53002, wholesale: 45051.7 },
  { id: "SKU-MIT-00052", oem: "MI1000C699", name_ar: "ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 750, min_stock: 2, location: "B12-ممر3", cost: 45033, price: 75055, wholesale: 63796.75 },
  { id: "SKU-MIT-00053", oem: "MI1000C749", name_ar: "ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 674, min_stock: 2, location: "B12-ممر4", cost: 40483.2, price: 67472, wholesale: 57351.2 },
  { id: "SKU-MIT-00054", oem: "MI1000C750", name_ar: "ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 708, min_stock: 2, location: "B12-ممر5", cost: 42507, price: 70845, wholesale: 60218.25 },
  { id: "SKU-MIT-00055", oem: "MI1000C761", name_ar: "ENGINE ASSY SHORT 4N15", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 234, min_stock: 2, location: "B13-ممر1", cost: 14096.4, price: 23494, wholesale: 19969.9 },
  { id: "SKU-MIT-00056", oem: "MI1000C774", name_ar: "ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 386, min_stock: 2, location: "B13-ممر2", cost: 23214.6, price: 38691, wholesale: 32887.35 },
  { id: "SKU-MIT-00057", oem: "MI1000C804", name_ar: "ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 351, min_stock: 2, location: "B13-ممر3", cost: 21097.2, price: 35162, wholesale: 29887.7 },
  { id: "SKU-MIT-00058", oem: "MI1000C825", name_ar: "ENGINE ASSY", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 308, min_stock: 2, location: "B13-ممر4", cost: 18506.4, price: 30844, wholesale: 26217.4 },
  { id: "SKU-MIT-00059", oem: "MI1000C851", name_ar: "L/ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 392, min_stock: 2, location: "B13-ممر5", cost: 23524.8, price: 39208, wholesale: 33326.8 },
  { id: "SKU-MIT-00060", oem: "MI1000C855", name_ar: "L/ENGINE ASSY LONG", brand: "Mitsubishi", category: "محرك", model: "L200 / Pajero", stock: 355, min_stock: 2, location: "B14-ممر1", cost: 21330, price: 35550, wholesale: 30217.5 },
];

// ═══════════════════════════════════════════════════
// INVOICE PARTS (40 items from Toyota invoices)
// ═══════════════════════════════════════════════════
export const INVOICE_PARTS: Part[] = [
  { id: "SKU-H-001", oem: "13101-17100-01", name_ar: "بستم ديزل جيب 90-2007", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 6, min_stock: 2, location: "A01-ممر1", cost: 150, price: 250, wholesale: 200 },
  { id: "SKU-H-002", oem: "13011-17030", name_ar: "شمبر مكينة", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A01-ممر2", cost: 450, price: 750, wholesale: 600 },
  { id: "SKU-H-003", oem: "11704-17011", name_ar: "سنبك ثابت جيب", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A01-ممر3", cost: 270, price: 450, wholesale: 360 },
  { id: "SKU-H-004", oem: "13204-17011", name_ar: "جيب 95-90 ديزل", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A01-ممر4", cost: 210, price: 350, wholesale: 280 },
  { id: "SKU-H-005", oem: "11011-17010", name_ar: "هلل كرنك صابون 2007-90 ديزل", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A02-ممر1", cost: 60, price: 100, wholesale: 80 },
  { id: "SKU-H-006", oem: "13711-17010", name_ar: "هالكس 3L 97-96", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 6, min_stock: 2, location: "A02-ممر2", cost: 24, price: 40, wholesale: 32 },
  { id: "SKU-H-007", oem: "13715-54010", name_ar: "VALVE EXHAUST", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 6, min_stock: 2, location: "A02-ممر3", cost: 24, price: 40, wholesale: 32 },
  { id: "SKU-H-008", oem: "13568-19065", name_ar: "جنزير جيب ديزل 92-90", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A02-ممر4", cost: 78, price: 130, wholesale: 104 },
  { id: "SKU-H-009", oem: "13505-17011", name_ar: "شداد جنزير شلون 97-90 ديزل", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A03-ممر1", cost: 198, price: 330, wholesale: 264 },
  { id: "SKU-H-010", oem: "04111-17140", name_ar: "GASKET KIT ENGINE", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A03-ممر2", cost: 330, price: 550, wholesale: 440 },
  { id: "SKU-H-011", oem: "11115-17010-01", name_ar: "وجه راس جيب 97-90 ديزل", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A03-ممر3", cost: 157, price: 261, wholesale: 209 },
  { id: "SKU-H-012", oem: "17801-61030", name_ar: "فلتر هوا جيب 97-85", brand: "Toyota", category: "تبريد", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A03-ممر4", cost: 78, price: 130, wholesale: 104 },
  { id: "SKU-H-013", oem: "12261-17010", name_ar: "HOSE VENTILATION", brand: "Toyota", category: "تبريد", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A04-ممر1", cost: 27, price: 45, wholesale: 36 },
  { id: "SKU-H-014", oem: "23303-64010", name_ar: "فلتر ديزل دينا و هايلكس", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A04-ممر2", cost: 72, price: 120, wholesale: 96 },
  { id: "SKU-H-015", oem: "90916-02452", name_ar: "سير مروحة كوستر90", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A04-ممر3", cost: 72, price: 120, wholesale: 96 },
  { id: "SKU-H-016", oem: "99332-11260-8T", name_ar: "سير مكيف صابون 97-90 ديزل", brand: "Toyota", category: "تبريد", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A04-ممر4", cost: 48, price: 80, wholesale: 64 },
  { id: "SKU-H-017", oem: "16100-19235", name_ar: "طرمبة ماء صابون ديزل 2007/90", brand: "Toyota", category: "تبريد", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A05-ممر1", cost: 186, price: 310, wholesale: 248 },
  { id: "SKU-H-018", oem: "15163-17010", name_ar: "ترس طرمبة زيت جيب دي 98-2005", brand: "Toyota", category: "محرك", model: "Hilux 1990-2007", stock: 1, min_stock: 1, location: "A05-ممر2", cost: 96, price: 160, wholesale: 128 },
  { id: "SKU-H2-001", oem: "13101-75130", name_ar: "بستم مكينة هايس+هايلكس بنزين 2TR", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 4, min_stock: 2, location: "B01-ممر1", cost: 66, price: 110, wholesale: 88 },
  { id: "SKU-H2-002", oem: "13011-75110", name_ar: "شمبر هايس+هايلكس 2006", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B01-ممر2", cost: 180, price: 300, wholesale: 240 },
  { id: "SKU-H2-003", oem: "11310-0C022", name_ar: "صدر مكينة هايلكس 2006 2TR", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B01-ممر3", cost: 660, price: 1100, wholesale: 880 },
  { id: "SKU-H2-004", oem: "16100-09460", name_ar: "طرمبة ماء هايلكس 2006", brand: "Toyota", category: "تبريد", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B01-ممر4", cost: 150, price: 250, wholesale: 200 },
  { id: "SKU-H2-005", oem: "90919-T1004", name_ar: "بواجي هيلكس 2007+2006", brand: "Toyota", category: "كهرباء", model: "Hilux 2TR", stock: 4, min_stock: 2, location: "B02-ممر1", cost: 6, price: 10, wholesale: 8 },
  { id: "SKU-H2-006", oem: "04111-75A32", name_ar: "طقم وجه مكينة 2TR", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B02-ممر2", cost: 246, price: 410, wholesale: 328 },
  { id: "SKU-H2-007", oem: "13041-75070-04", name_ar: "سنبك متحرك هايلكس و انوفا", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 4, min_stock: 2, location: "B02-ممر3", cost: 15, price: 25, wholesale: 20 },
  { id: "SKU-H2-008", oem: "11701-0C011-01", name_ar: "سنبك ثابت هايلكس 2006 2TR", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 5, min_stock: 2, location: "B02-ممر4", cost: 21, price: 35, wholesale: 28 },
  { id: "SKU-H2-009", oem: "90915-YZZD2", name_ar: "فلتر زيت مكينة", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B03-ممر1", cost: 9, price: 15, wholesale: 12 },
  { id: "SKU-H2-010", oem: "31230-71020", name_ar: "فحمة كلتش هايلكس 2006 بنزين", brand: "Toyota", category: "فرامل", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B03-ممر2", cost: 78, price: 130, wholesale: 104 },
  { id: "SKU-H2-011", oem: "31210-0K131", name_ar: "بزل كلتش هايلكس 2006-2008", brand: "Toyota", category: "فرامل", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B03-ممر3", cost: 186, price: 310, wholesale: 248 },
  { id: "SKU-H2-012", oem: "31250-0K261", name_ar: "صحن كلتش", brand: "Toyota", category: "فرامل", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B03-ممر4", cost: 180, price: 300, wholesale: 240 },
  { id: "SKU-H2-013", oem: "90363-T0006", name_ar: "رمان هايلكس 210-206 ديزل+بنزين", brand: "Toyota", category: "عليق", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B04-ممر1", cost: 9, price: 15, wholesale: 12 },
  { id: "SKU-H2-014", oem: "11011-0C010", name_ar: "هلل كرنك هايلكس 2006", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B04-ممر2", cost: 30, price: 50, wholesale: 40 },
  { id: "SKU-H2-015", oem: "16620-0C021", name_ar: "شداد سير هايلكس 2015-06", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B04-ممر3", cost: 120, price: 200, wholesale: 160 },
  { id: "SKU-H2-016", oem: "12371-0C072", name_ar: "كرمي قير هايلكس 2006-2015", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B04-ممر4", cost: 51, price: 85, wholesale: 68 },
  { id: "SKU-H2-017", oem: "12361-0C010", name_ar: "كرمي مكينة هايلكس+انوفا+فورنشر", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 2, min_stock: 1, location: "B05-ممر1", cost: 42, price: 70, wholesale: 56 },
  { id: "SKU-H2-018", oem: "13506-75050", name_ar: "جنزير مكينة هايلكس 2006-2016 2TR", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B05-ممر2", cost: 126, price: 210, wholesale: 168 },
  { id: "SKU-H2-019", oem: "13507-0C010", name_ar: "جنزير هايلكس رقم 2 2006", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B05-ممر3", cost: 93, price: 155, wholesale: 124 },
  { id: "SKU-H2-020", oem: "13561-0C040", name_ar: "شحاط جنزير هايلكس 2014-2006", brand: "Toyota", category: "محرك", model: "Hilux 2TR", stock: 1, min_stock: 1, location: "B05-ممر4", cost: 48, price: 80, wholesale: 64 },
];

// ═══════════════════════════════════════════════════
// WORKSHOP PARTS (parts used in workshop repairs)
// ═══════════════════════════════════════════════════
export const SEED_WORKSHOP_PARTS: WorkshopPart[] = [
  { id: "WP-001", part_id: "SKU-H-001", part_name: "بستم ديزل جيب 90-2007", date: "2026-05-11", qty: 2, cost: 150, used_in: "ترميم محرك هايلكس 2005", mechanic: "عبدالله", status: "مستخدم" },
  { id: "WP-002", part_id: "SKU-H-003", part_name: "سنبك ثابت جيب", date: "2026-05-10", qty: 1, cost: 270, used_in: "صيانة دورية", mechanic: "خالد", status: "مستخدم" },
  { id: "WP-003", part_id: "SKU-H2-005", part_name: "بواجي هيلكس 2007+2006", date: "2026-05-09", qty: 4, cost: 6, used_in: "تبديل بواجي", mechanic: "محمد", status: "مستخدم" },
  { id: "WP-004", part_id: "SKU-MIT-00005", part_name: "GSKT KIT ENG OVERHAU", date: "2026-05-08", qty: 1, cost: 529, used_in: "تجديد محرك لانسر", mechanic: "عبدالله", status: "مستخدم" },
  { id: "WP-005", part_id: "SKU-H2-010", part_name: "فحمة كلتش هايلكس 2006 بنزين", date: "2026-05-07", qty: 1, cost: 78, used_in: "تبديل كلتش", mechanic: "خالد", status: "مستخدم" },
  { id: "WP-006", part_id: "SKU-H-012", part_name: "فلتر هوا جيب 97-85", date: "2026-05-12", qty: 1, cost: 78, used_in: "تبديل فلاتر", mechanic: "محمد", status: "متوفر" },
  { id: "WP-007", part_id: "SKU-H2-001", part_name: "بستم مكينة هايس+هايلكس بنزين 2TR", date: "2026-05-06", qty: 2, cost: 66, used_in: "ترميم محرك", mechanic: "عبدالله", status: "مستخدم" },
  { id: "WP-008", part_id: "SKU-MIT-00014", part_name: "GASKET KIT ENG OVERHAUL", date: "2026-05-05", qty: 1, cost: 913, used_in: "تجديد محرك باجيرو", mechanic: "خالد", status: "مستخدم" },
  { id: "WP-009", part_id: "SKU-H-014", part_name: "فلتر ديزل دينا و هايلكس", date: "2026-05-04", qty: 2, cost: 72, used_in: "صيانة دورية", mechanic: "محمد", status: "مستخدم" },
  { id: "WP-010", part_id: "SKU-H2-008", part_name: "سنبك ثابت هايلكس 2006 2TR", date: "2026-05-03", qty: 2, cost: 21, used_in: "تعديل صمامات", mechanic: "عبدالله", status: "مستخدم" },
];

// ═══════════════════════════════════════════════════
// SUPPLIERS
// ═══════════════════════════════════════════════════
export const SEED_SUPPLIERS: Supplier[] = [
  { id: "SUP-101", name: "مؤسسة المرام لقطع الغيار", contact: "سلام العلي", phone: "0501234567", city: "الرياض", rating: 4.8, balance: 5117 },
  { id: "SUP-102", name: "شركة النخيل للسيارات", contact: "فهد البقمي", phone: "0509876543", city: "جدة", rating: 4.5, balance: 1138 },
  { id: "SUP-103", name: "مستودعات الخليج", contact: "عبدالله الزهراني", phone: "0561122334", city: "الدمام", rating: 4.2, balance: 1725 },
];

// ═══════════════════════════════════════════════════
// CUSTOMERS
// ═══════════════════════════════════════════════════
export const SEED_CUSTOMERS: Customer[] = [
  { id: "CUS-001", name: "أحمد الشمري", phone: "0512345678", email: "ahmed@example.com", address: "الرياض", balance: 575, total_bought: 575, last_visit: "2026-05-11" },
  { id: "CUS-002", name: "خالد المطيري", phone: "0598765432", email: "khaled@example.com", address: "جدة", balance: 253, total_bought: 253, last_visit: "2026-05-10" },
  { id: "CUS-003", name: "محمد العتيبي", phone: "0555555555", email: "mohammed@example.com", address: "الدمام", balance: 0, total_bought: 0, last_visit: "2026-05-08" },
  { id: "CUS-004", name: "فهد السبيعي", phone: "0544444444", email: "fahad@example.com", address: "الرياض", balance: 1200, total_bought: 3200, last_visit: "2026-05-01" },
  { id: "CUS-005", name: "سعد الحربي", phone: "0533333333", email: "saad@example.com", address: "مكة", balance: 850, total_bought: 1850, last_visit: "2026-04-28" },
  { id: "CUS-006", name: "نايف الدوسري", phone: "0522222222", email: "naif@example.com", address: "الرياض", balance: 3400, total_bought: 7800, last_visit: "2026-05-12" },
  { id: "CUS-007", name: "ماجد القحطاني", phone: "0511111111", email: "majed@example.com", address: "جدة", balance: 1890, total_bought: 4500, last_visit: "2026-05-09" },
];

// ═══════════════════════════════════════════════════
// INVOICES (10 items for richer analytics)
// ═══════════════════════════════════════════════════
export const SEED_INVOICES: Invoice[] = [
  { id: "INV-2026-0010", date: "2026-05-01", customer: "فهد السبيعي", phone: "0544444444", items: [{ part_id: "SKU-H-001", name: "بستم ديزل جيب 90-2007", qty: 4, price: 250, cost: 150 }], subtotal: 1000, vat: 150, total: 1150, payment: "مدى", status: "مكتمل" },
  { id: "INV-2026-0009", date: "2026-05-03", customer: "سعد الحربي", phone: "0533333333", items: [{ part_id: "SKU-H-003", name: "سنبك ثابت جيب", qty: 2, price: 450, cost: 270 }], subtotal: 900, vat: 135, total: 1035, payment: "نقدي", status: "مكتمل" },
  { id: "INV-2026-0008", date: "2026-05-05", customer: "نايف الدوسري", phone: "0522222222", items: [{ part_id: "SKU-H2-003", name: "صدر مكينة هايلكس 2006 2TR", qty: 1, price: 1100, cost: 660 }], subtotal: 1100, vat: 165, total: 1265, payment: "تحويل بنكي", status: "مكتمل" },
  { id: "INV-2026-0007", date: "2026-05-06", customer: "ماجد القحطاني", phone: "0511111111", items: [{ part_id: "SKU-H2-011", name: "بزل كلتش هايلكس 2006-2008", qty: 2, price: 310, cost: 186 }], subtotal: 620, vat: 93, total: 713, payment: "Apple Pay", status: "مكتمل" },
  { id: "INV-2026-0006", date: "2026-05-07", customer: "فهد السبيعي", phone: "0544444444", items: [{ part_id: "SKU-H-001", name: "بستم ديزل جيب 90-2007", qty: 2, price: 250, cost: 150 }], subtotal: 500, vat: 75, total: 575, payment: "مدى", status: "مكتمل" },
  { id: "INV-2026-0005", date: "2026-05-08", customer: "نايف الدوسري", phone: "0522222222", items: [{ part_id: "SKU-MIT-00005", name: "GSKT KIT ENG OVERHAU", qty: 3, price: 883, cost: 529 }], subtotal: 2649, vat: 397.35, total: 3046.35, payment: "تحويل بنكي", status: "مكتمل" },
  { id: "INV-2026-0004", date: "2026-05-09", customer: "ماجد القحطاني", phone: "0511111111", items: [{ part_id: "SKU-H2-005", name: "بواجي هيلكس 2007+2006", qty: 8, price: 10, cost: 6 }], subtotal: 80, vat: 12, total: 92, payment: "نقدي", status: "مكتمل" },
  { id: "INV-2026-0003", date: "2026-05-10", customer: "سعد الحربي", phone: "0533333333", items: [{ part_id: "SKU-H-012", name: "فلتر هوا جيب 97-85", qty: 3, price: 130, cost: 78 }], subtotal: 390, vat: 58.5, total: 448.5, payment: "مدى", status: "مكتمل" },
  { id: "INV-2026-0002", date: "2026-05-10", customer: "خالد المطيري", phone: "0598765432", items: [{ part_id: "SKU-H2-001", name: "بستم مكينة هايس+هايلكس بنزين 2TR", qty: 2, price: 110, cost: 66 }], subtotal: 220, vat: 33, total: 253, payment: "Apple Pay", status: "مكتمل" },
  { id: "INV-2026-0001", date: "2026-05-11", customer: "أحمد الشمري", phone: "0512345678", items: [{ part_id: "SKU-H-001", name: "بستم ديزل جيب 90-2007", qty: 2, price: 250, cost: 150 }], subtotal: 500, vat: 75, total: 575, payment: "مدى", status: "مكتمل" },
];

// ═══════════════════════════════════════════════════
// PURCHASES (8 items)
// ═══════════════════════════════════════════════════
export const SEED_PURCHASES: Purchase[] = [
  { id: "PUR-2026-0001", date: "2026-04-01", supplier: "SUP-101", supplier_name: "مؤسسة المرام", items: [{ part_id: "SKU-H-001", name: "بستم ديزل جيب 90-2007", qty: 20, cost: 140 }], subtotal: 2800, vat: 420, total: 3220, status: "مدفوعة" },
  { id: "PUR-2026-0002", date: "2026-04-10", supplier: "SUP-102", supplier_name: "شركة النخيل", items: [{ part_id: "SKU-H2-001", name: "بستم مكينة هايس+هايلكس بنزين 2TR", qty: 15, cost: 55 }], subtotal: 825, vat: 123.75, total: 948.75, status: "مدفوعة" },
  { id: "PUR-2026-0003", date: "2026-04-15", supplier: "SUP-103", supplier_name: "مستودعات الخليج", items: [{ part_id: "SKU-H-003", name: "سنبك ثابت جيب", qty: 8, cost: 240 }], subtotal: 1920, vat: 288, total: 2208, status: "مدفوعة" },
  { id: "PUR-2026-0004", date: "2026-04-20", supplier: "SUP-101", supplier_name: "مؤسسة المرام", items: [{ part_id: "SKU-H-001", name: "بستم ديزل جيب 90-2007", qty: 10, cost: 145 }], subtotal: 1450, vat: 217.5, total: 1667.5, status: "مدفوعة" },
  { id: "PUR-2026-0005", date: "2026-04-25", supplier: "SUP-102", supplier_name: "شركة النخيل", items: [{ part_id: "SKU-H2-001", name: "بستم مكينة هايس+هايلكس بنزين 2TR", qty: 12, cost: 60 }], subtotal: 720, vat: 108, total: 828, status: "مدفوعة" },
  { id: "PUR-2026-0006", date: "2026-05-01", supplier: "SUP-103", supplier_name: "مستودعات الخليج", items: [{ part_id: "SKU-H2-003", name: "صدر مكينة هايلكس 2006 2TR", qty: 5, cost: 600 }], subtotal: 3000, vat: 450, total: 3450, status: "مدفوعة" },
  { id: "PUR-2026-0007", date: "2026-05-03", supplier: "SUP-101", supplier_name: "مؤسسة المرام", items: [{ part_id: "SKU-H-001", name: "بستم ديزل جيب 90-2007", qty: 20, cost: 150 }], subtotal: 3000, vat: 450, total: 3450, status: "مدفوعة" },
  { id: "PUR-2026-0008", date: "2026-05-05", supplier: "SUP-102", supplier_name: "شركة النخيل", items: [{ part_id: "SKU-H2-001", name: "بستم مكينة هايس+هايلكس بنزين 2TR", qty: 10, cost: 66 }], subtotal: 660, vat: 99, total: 759, status: "مدفوعة" },
];

// ═══════════════════════════════════════════════════
// EXPENSES (12 items with reason and party)
// ═══════════════════════════════════════════════════
export const SEED_EXPENSES: Expense[] = [
  { id: "EXP-001", date: "2026-04-01", category: "إيجار", description: "إيجار المستودع أبريل", amount: 5000, account: "5200", account_name: "الإيجار", reason: "إيجار شهري", party: "شركة العقارات الذهبية" },
  { id: "EXP-002", date: "2026-04-03", category: "رواتب", description: "راتب الموظف خالد", amount: 4500, account: "5300", account_name: "الرواتب والأجور", reason: "راتب شهري", party: "خالد العنزي" },
  { id: "EXP-003", date: "2026-04-05", category: "كهرباء", description: "فاتورة كهرباء أبريل", amount: 850, account: "5400", account_name: "الكهرباء والماء", reason: "فاتورة شهرية", party: "الشركة السعودية للكهرباء" },
  { id: "EXP-004", date: "2026-04-08", category: "صيانة", description: "صيانة رافعة شوكية", amount: 1200, account: "5500", account_name: "الصيانة والإصلاحات", reason: "صيانة دورية", party: "ورشة الصقر" },
  { id: "EXP-005", date: "2026-04-10", category: "نقل", description: "شحن طلبية من جدة", amount: 650, account: "5700", account_name: "مصاريف نقل وشحن", reason: "شحن بضاعة", party: "شركة سمسا" },
  { id: "EXP-006", date: "2026-04-15", category: "رواتب", description: "راتب الموظف عبدالله", amount: 4200, account: "5300", account_name: "الرواتب والأجور", reason: "راتب شهري", party: "عبدالله الفهد" },
  { id: "EXP-007", date: "2026-04-18", category: "تسويق", description: "إعلان على تويتر", amount: 900, account: "5600", account_name: "التسويق والإعلان", reason: "حملة تسويقية", party: "Twitter Ads" },
  { id: "EXP-008", date: "2026-04-22", category: "صيانة", description: "إصلاح مكيف المستودع", amount: 750, account: "5500", account_name: "الصيانة والإصلاحات", reason: "صيانة عاجلة", party: "شركة التبريد" },
  { id: "EXP-009", date: "2026-05-01", category: "إيجار", description: "إيجار المستودع مايو", amount: 5000, account: "5200", account_name: "الإيجار", reason: "إيجار شهري", party: "شركة العقارات الذهبية" },
  { id: "EXP-010", date: "2026-05-03", category: "رواتب", description: "راتب الموظف خالد", amount: 4500, account: "5300", account_name: "الرواتب والأجور", reason: "راتب شهري", party: "خالد العنزي" },
  { id: "EXP-011", date: "2026-05-05", category: "كهرباء", description: "فاتورة كهرباء مايو", amount: 920, account: "5400", account_name: "الكهرباء والماء", reason: "فاتورة شهرية", party: "الشركة السعودية للكهرباء" },
  { id: "EXP-012", date: "2026-05-08", category: "نقل", description: "توصيل قطع لعميل", amount: 180, account: "5700", account_name: "مصاريف نقل وشحن", reason: "توصيل طلبية", party: "شركة أرامكس" },
];

// ═══════════════════════════════════════════════════
// ACCOUNTS (Enhanced Chart of Accounts)
// ═══════════════════════════════════════════════════
export const SEED_ACCOUNTS: Account[] = [
  { code: "1000", name: "الأصول", type: "أصول", parent: null, system: true, balance: 0 },
  { code: "1100", name: "النقدية والبنوك", type: "أصول", parent: "1000", system: true, balance: 45600 },
  { code: "1110", name: "الصندوق", type: "أصول", parent: "1100", system: false, balance: 12500 },
  { code: "1120", name: "البنك الأهلي", type: "أصول", parent: "1100", system: false, balance: 23100 },
  { code: "1130", name: "البنك الراجحي", type: "أصول", parent: "1100", system: false, balance: 10000 },
  { code: "1200", name: "المخزون", type: "أصول", parent: "1000", system: true, balance: 87350 },
  { code: "1210", name: "قطع غيار محركات", type: "أصول", parent: "1200", system: false, balance: 65400 },
  { code: "1220", name: "قطع غيار تبريد", type: "أصول", parent: "1200", system: false, balance: 12500 },
  { code: "1230", name: "قطع غيار فرامل", type: "أصول", parent: "1200", system: false, balance: 5500 },
  { code: "1240", name: "قطع غيار كهرباء", type: "أصول", parent: "1200", system: false, balance: 3950 },
  { code: "1300", name: "حسابات العملاء", type: "أصول", parent: "1000", system: true, balance: 2878 },
  { code: "1310", name: "أحمد الشمري", type: "أصول", parent: "1300", system: false, balance: 575 },
  { code: "1320", name: "خالد المطيري", type: "أصول", parent: "1300", system: false, balance: 253 },
  { code: "1330", name: "فهد السبيعي", type: "أصول", parent: "1300", system: false, balance: 1200 },
  { code: "1340", name: "سعد الحربي", type: "أصول", parent: "1300", system: false, balance: 850 },
  { code: "1400", name: "مصروفات مدفوعة مقدما", type: "أصول", parent: "1000", system: true, balance: 0 },
  { code: "2000", name: "الخصوم", type: "خصوم", parent: null, system: true, balance: 0 },
  { code: "2100", name: "حسابات الموردين", type: "خصوم", parent: "2000", system: true, balance: 8011 },
  { code: "2110", name: "مؤسسة المرام لقطع الغيار", type: "خصوم", parent: "2100", system: false, balance: 5117 },
  { code: "2120", name: "شركة النخيل للسيارات", type: "خصوم", parent: "2100", system: false, balance: 1138 },
  { code: "2130", name: "مستودعات الخليج", type: "خصوم", parent: "2100", system: false, balance: 1725 },
  { code: "2200", name: "ضريبة القيمة المضافة", type: "خصوم", parent: "2000", system: true, balance: 0 },
  { code: "2300", name: "قروض", type: "خصوم", parent: "2000", system: true, balance: 0 },
  { code: "3000", name: "حقوق الملكية", type: "حقوق ملكية", parent: null, system: true, balance: 127817 },
  { code: "3100", name: "رأس المال", type: "حقوق ملكية", parent: "3000", system: false, balance: 100000 },
  { code: "3200", name: "الأرباح المحتجزة", type: "حقوق ملكية", parent: "3000", system: true, balance: 27782 },
  { code: "3300", name: "أرباح السنة الحالية", type: "حقوق ملكية", parent: "3000", system: false, balance: 35 },
  { code: "4000", name: "الإيرادات", type: "إيرادات", parent: null, system: true, balance: 828 },
  { code: "4100", name: "مبيعات قطع غيار", type: "إيرادات", parent: "4000", system: true, balance: 828 },
  { code: "4200", name: "إيرادات الجملة", type: "إيرادات", parent: "4000", system: false, balance: 0 },
  { code: "4300", name: "إيرادات خدمات", type: "إيرادات", parent: "4000", system: false, balance: 0 },
  { code: "5000", name: "المصروفات", type: "مصروفات", parent: null, system: true, balance: 793 },
  { code: "5100", name: "تكلفة البضاعة المباعة", type: "مصروفات", parent: "5000", system: true, balance: 0 },
  { code: "5200", name: "الإيجار", type: "مصروفات", parent: "5000", system: false, balance: 5000 },
  { code: "5300", name: "الرواتب والأجور", type: "مصروفات", parent: "5000", system: false, balance: 8700 },
  { code: "5400", name: "الكهرباء والماء", type: "مصروفات", parent: "5000", system: false, balance: 1770 },
  { code: "5500", name: "الصيانة والإصلاحات", type: "مصروفات", parent: "5000", system: false, balance: 1950 },
  { code: "5600", name: "التسويق والإعلان", type: "مصروفات", parent: "5000", system: false, balance: 900 },
  { code: "5700", name: "مصاريف نقل وشحن", type: "مصروفات", parent: "5000", system: false, balance: 830 },
  { code: "5900", name: "مصاريف أخرى", type: "مصروفات", parent: "5000", system: false, balance: 0 },
  { code: "6000", name: "حساب إصلاح المحركات", type: "أصول", parent: "1000", system: false, balance: 12500 },
  { code: "6100", name: "قطع راكان", type: "أصول", parent: "1200", system: false, balance: 42300 },
];

// ═══════════════════════════════════════════════════
// PRICE HISTORY (20 items)
// ═══════════════════════════════════════════════════
export const SEED_PRICE_HISTORY: PriceHistory[] = [
  { id: "PH-001", part_id: "SKU-H-001", part_name: "بستم ديزل جيب 90-2007", date: "2026-03-01", old_cost: 130, new_cost: 135, old_price: 220, new_price: 230, type: "purchase", source: "مؤسسة المرام" },
  { id: "PH-002", part_id: "SKU-H-001", part_name: "بستم ديزل جيب 90-2007", date: "2026-04-01", old_cost: 135, new_cost: 140, old_price: 230, new_price: 240, type: "purchase", source: "مؤسسة المرام" },
  { id: "PH-003", part_id: "SKU-H-001", part_name: "بستم ديزل جيب 90-2007", date: "2026-04-20", old_cost: 140, new_cost: 145, old_price: 240, new_price: 245, type: "purchase", source: "مؤسسة المرام" },
  { id: "PH-004", part_id: "SKU-H-001", part_name: "بستم ديزل جيب 90-2007", date: "2026-05-03", old_cost: 145, new_cost: 150, old_price: 245, new_price: 250, type: "purchase", source: "مؤسسة المرام" },
  { id: "PH-005", part_id: "SKU-H-001", part_name: "بستم ديزل جيب 90-2007", date: "2026-05-11", old_cost: 150, new_cost: 150, old_price: 250, new_price: 250, type: "sale", source: "فاتورة INV-2026-0001" },
  { id: "PH-006", part_id: "SKU-H2-001", part_name: "بستم مكينة هايس+هايلكس بنزين 2TR", date: "2026-03-15", old_cost: 45, new_cost: 50, old_price: 80, new_price: 85, type: "purchase", source: "مستودعات الخليج" },
  { id: "PH-007", part_id: "SKU-H2-001", part_name: "بستم مكينة هايس+هايلكس بنزين 2TR", date: "2026-04-01", old_cost: 50, new_cost: 55, old_price: 85, new_price: 95, type: "purchase", source: "مستودعات الخليج" },
  { id: "PH-008", part_id: "SKU-H2-001", part_name: "بستم مكينة هايس+هايلكس بنزين 2TR", date: "2026-04-10", old_cost: 55, new_cost: 60, old_price: 95, new_price: 100, type: "purchase", source: "مستودعات الخليج" },
  { id: "PH-009", part_id: "SKU-H2-001", part_name: "بستم مكينة هايس+هايلكس بنزين 2TR", date: "2026-05-03", old_cost: 60, new_cost: 66, old_price: 100, new_price: 110, type: "purchase", source: "شركة النخيل" },
  { id: "PH-010", part_id: "SKU-H2-001", part_name: "بستم مكينة هايس+هايلكس بنزين 2TR", date: "2026-05-10", old_cost: 66, new_cost: 66, old_price: 110, new_price: 110, type: "sale", source: "فاتورة INV-2026-0002" },
  { id: "PH-011", part_id: "SKU-H-003", part_name: "سنبك ثابت جيب", date: "2026-03-01", old_cost: 240, new_cost: 250, old_price: 400, new_price: 420, type: "purchase", source: "مؤسسة المرام" },
  { id: "PH-012", part_id: "SKU-H-003", part_name: "سنبك ثابت جيب", date: "2026-03-20", old_cost: 250, new_cost: 260, old_price: 420, new_price: 430, type: "purchase", source: "مؤسسة المرام" },
  { id: "PH-013", part_id: "SKU-H-003", part_name: "سنبك ثابت جيب", date: "2026-04-15", old_cost: 260, new_cost: 270, old_price: 430, new_price: 450, type: "purchase", source: "مؤسسة المرام" },
  { id: "PH-014", part_id: "SKU-H-003", part_name: "سنبك ثابت جيب", date: "2026-05-05", old_cost: 270, new_cost: 270, old_price: 450, new_price: 450, type: "sale", source: "فاتورة INV-2026-0009" },
  { id: "PH-015", part_id: "SKU-H2-008", part_name: "سنبك ثابت هايلكس 2006 2TR", date: "2026-03-10", old_cost: 18, new_cost: 20, old_price: 30, new_price: 32, type: "purchase", source: "شركة النخيل" },
  { id: "PH-016", part_id: "SKU-H2-008", part_name: "سنبك ثابت هايلكس 2006 2TR", date: "2026-04-01", old_cost: 20, new_cost: 21, old_price: 32, new_price: 35, type: "purchase", source: "شركة النخيل" },
  { id: "PH-017", part_id: "SKU-H2-008", part_name: "سنبك ثابت هايلكس 2006 2TR", date: "2026-04-20", old_cost: 21, new_cost: 21, old_price: 35, new_price: 35, type: "sale", source: "فاتورة POS" },
  { id: "PH-018", part_id: "SKU-MIT-00005", part_name: "GSKT KIT ENG OVERHAU", date: "2026-04-01", old_cost: 500, new_cost: 510, old_price: 850, new_price: 860, type: "purchase", source: "مستودعات الخليج" },
  { id: "PH-019", part_id: "SKU-MIT-00005", part_name: "GSKT KIT ENG OVERHAU", date: "2026-04-20", old_cost: 510, new_cost: 529, old_price: 860, new_price: 883, type: "purchase", source: "مستودعات الخليج" },
  { id: "PH-020", part_id: "SKU-MIT-00005", part_name: "GSKT KIT ENG OVERHAU", date: "2026-05-05", old_cost: 529, new_cost: 529, old_price: 883, new_price: 900, type: "manual", source: "تعديل يدوي" },
];

// ═══════════════════════════════════════════════════
// JOURNAL ENTRIES (8 items)
// ═══════════════════════════════════════════════════
export const SEED_JOURNAL: JournalEntry[] = [
  { id: "JV-001", date: "2026-05-01", ref: "EXP-001", desc: "إيجار المستودع", debit_account: "5200", credit_account: "1110", amount: 5000 },
  { id: "JV-002", date: "2026-05-03", ref: "EXP-002", desc: "راتب الموظف خالد", debit_account: "5300", credit_account: "1110", amount: 4500 },
  { id: "JV-003", date: "2026-05-05", ref: "PUR-2026-0001", desc: "شراء بستم ديزل", debit_account: "1200", credit_account: "2100", amount: 3000 },
  { id: "JV-004", date: "2026-05-05", ref: "EXP-004", desc: "صيانة رافعة شوكية", debit_account: "5500", credit_account: "1110", amount: 1200 },
  { id: "JV-005", date: "2026-05-08", ref: "EXP-003", desc: "فاتورة كهرباء", debit_account: "5400", credit_account: "1110", amount: 850 },
  { id: "JV-006", date: "2026-05-08", ref: "INV-2026-0005", desc: "بيع بستم ديزل", debit_account: "1100", credit_account: "4100", amount: 575 },
  { id: "JV-007", date: "2026-05-10", ref: "INV-2026-0002", desc: "بيع بستم 2TR", debit_account: "1100", credit_account: "4100", amount: 253 },
  { id: "JV-008", date: "2026-05-10", ref: "INV-2026-0003", desc: "بيع سنبك ثابت", debit_account: "1100", credit_account: "4100", amount: 1035 },
];

// ═══════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════
export const DEFAULT_SETTINGS: AppSettings = {
  company_name: "مركز خدمة قريبة لقطع الغيار",
  logo: "⚙",
  address: "الرياض - حي الصناعية",
  phone: "0112345678",
  email: "info@khedmaqareeba.sa",
  vat_number: "300123456700003",
  cr_number: "1010123456",
  currency: "ر.س",
  vat_enabled: true,
  vat_rate: 0.15,
  default_template: "standard",
  invoice_footer: "شكراً لتعاملكم معنا · للاستفسار اتصل بنا"
};
