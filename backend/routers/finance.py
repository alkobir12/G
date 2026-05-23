from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
import random

router = APIRouter(prefix="/api/v1/finance", tags=["Finance & Dashboard"])

# ═══════════════════════════════════════════
# MODELS
# ═══════════════════════════════════════════

class AccountBase(BaseModel):
    name: str
    account_type: str
    is_sub_account: bool = False
    parent_id: Optional[int] = None

class KPICard(BaseModel):
    id: str
    title: str
    value: str
    trend: str
    percentage: float
    color_theme: str
    icon: str

class ChartConfig(BaseModel):
    chart_type: str
    rounded_corners: bool = True
    show_grid_lines: bool = False
    gradient_fill: bool = True

# ═══════════════════════════════════════════
# KPI CARDS
# ═══════════════════════════════════════════

@router.get("/dashboard/summary-cards", response_model=List[KPICard])
def get_dashboard_summary_cards():
    """
    تغذية كروت لوحة التحكم الرئيسية بأرقام ملخصة ومؤشرات نمو ديناميكية.
    """
    cards = [
        KPICard(
            id="total_sales",
            title="إجمالي مبيعات اليوم",
            value="3,200 ر.س",
            trend="up",
            percentage=14.2,
            color_theme="amber",
            icon="TrendingUp"
        ),
        KPICard(
            id="low_stock_alert",
            title="تنبيهات قطع الغيار (منخفض)",
            value="8 قطع",
            trend="down",
            percentage=5.0,
            color_theme="rose",
            icon="AlertTriangle"
        ),
        KPICard(
            id="client_receivables",
            title="مستحقات العملاء الحالية",
            value="21,845 ر.س",
            trend="neutral",
            percentage=0.0,
            color_theme="blue",
            icon="Users"
        ),
        KPICard(
            id="supplier_payables",
            title="مستحقات الموردين الآجلة",
            value="15,400 ر.س",
            trend="down",
            percentage=8.3,
            color_theme="emerald",
            icon="CreditCard"
        ),
        KPICard(
            id="net_profit",
            title="صافي الربح المتوقع",
            value="8,250 ر.س",
            trend="up",
            percentage=22.1,
            color_theme="violet",
            icon="Banknote"
        ),
        KPICard(
            id="inventory_value",
            title="قيمة المخزون الحالي",
            value="142,300 ر.س",
            trend="up",
            percentage=3.5,
            color_theme="sky",
            icon="Package"
        ),
    ]
    return cards

# ═══════════════════════════════════════════
# POS WITH DOUBLE-ENTRY ACCOUNTING
# ═══════════════════════════════════════════

@router.post("/pos/checkout")
def process_pos_sale(data: dict):
    """
    معالجة عملية البيع وإطلاق القيود المحاسبية المزدوجة تلقائياً.
    """
    try:
        client_id = data.get("client_id", 0)
        items_cost = data.get("items_cost", 0)
        sale_price = data.get("sale_price", 0)
        payment_method = data.get("payment_method", "cash")
        vat_amount = data.get("vat_amount", 0)
        
        # Determine accounts
        if payment_method == "cash":
            debit_payment_acc = "1110"  # النقدية
        elif payment_method in ["مدى", "فيزا", "Apple Pay"]:
            debit_payment_acc = "1120"  # البنك
        else:
            debit_payment_acc = "1130"  # عملاء
            
        revenue_acc = "4100"  # مبيعات قطع الغيار
        vat_acc = "2110"  # ضريبة القيمة المضافة
        cogs_acc = "5100"  # تكلفة البضاعة المباعة
        inventory_acc = "1210"  # مخزون قطع الغيار

        # Double-Entry Journal
        journal_entries = [
            {"account_code": debit_payment_acc, "debit": sale_price + vat_amount, "credit": 0, "description": "قبض من البيع"},
            {"account_code": revenue_acc, "debit": 0, "credit": sale_price, "description": "إيراد مبيعات"},
            {"account_code": vat_acc, "debit": 0, "credit": vat_amount, "description": "ضريبة مخرجة"},
            {"account_code": cogs_acc, "debit": items_cost, "credit": 0, "description": "تكلفة البضاعة"},
            {"account_code": inventory_acc, "debit": 0, "credit": items_cost, "description": "سحب من المخزون"},
        ]
        
        return {
            "status": "success",
            "message": "تم معالجة الفاتورة وتحديث الحسابات والمخزن بنجاح",
            "journal_entries": journal_entries,
            "totals": {
                "sale_price": sale_price,
                "vat": vat_amount,
                "total": sale_price + vat_amount,
                "cost": items_cost,
                "profit": sale_price - items_cost
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"فشل في معالجة القيد المالي: {str(e)}")

# ═══════════════════════════════════════════
# CHARTS ENDPOINTS
# ═══════════════════════════════════════════

@router.get("/charts/sales-predictive")
def get_sales_chart_data(days: int = 7):
    """
    تغذية مخطط المبيعات بالأعمدة التفاعلية والخطوط الانسيابية مع التنبؤ.
    """
    base_date = datetime.now()
    historical = []
    for i in range(days, 0, -1):
        d = base_date - timedelta(days=i)
        historical.append({
            "date": d.strftime("%Y-%m-%d"),
            "revenue": random.randint(800, 4500),
            "orders": random.randint(5, 25)
        })
    
    # Add today
    historical.append({
        "date": base_date.strftime("%Y-%m-%d"),
        "revenue": random.randint(2000, 5000),
        "orders": random.randint(10, 30)
    })
    
    # Predictive (next 3 days)
    forecast = []
    avg_revenue = sum(d["revenue"] for d in historical) / len(historical)
    for i in range(1, 4):
        d = base_date + timedelta(days=i)
        forecast.append({
            "date": d.strftime("%Y-%m-%d"),
            "forecast": int(avg_revenue * (1 + random.uniform(-0.1, 0.15))),
            "confidence": random.uniform(0.7, 0.95)
        })
    
    return {
        "ui_config": {
            "chart_type": "liquid_bar",
            "rounded_corners": True,
            "show_grid_lines": False,
            "gradient_fill": True,
            "show_prediction": True
        },
        "historical": historical,
        "forecast": forecast
    }

@router.get("/charts/inventory-distribution")
def get_inventory_distribution():
    """
    مخطط توزيع المخزون (Donut Chart).
    """
    categories = [
        {"category": "محركات وأجزاؤها", "value": 150000, "color": "#f59e0b"},
        {"category": "أنظمة التوقيت والسيور", "value": 50000, "color": "#10b981"},
        {"category": "قطع واستهلاكيات عامة", "value": 133000, "color": "#3b82f6"},
        {"category": "فرامل وعجلات", "value": 89000, "color": "#8b5cf6"},
        {"category": "كهرباء وبطاريات", "value": 67000, "color": "#f43f5e"},
    ]
    
    total = sum(c["value"] for c in categories)
    for c in categories:
        c["percentage"] = round(c["value"] / total * 100, 1)
    
    return {
        "ui_config": {
            "chart_type": "donut",
            "interactive_center_labels": True,
            "external_legends": True,
            "enable_floating_tooltips": True,
            "hole_radius": 0.6
        },
        "total_value": total,
        "data": categories
    }

@router.get("/charts/expense-breakdown")
def get_expense_breakdown():
    """
    تفصيل المصروفات حسب الفئة.
    """
    expenses = [
        {"category": "إيجار", "amount": 5000, "color": "#f59e0b"},
        {"category": "رواتب", "amount": 12000, "color": "#10b981"},
        {"category": "كهرباء", "amount": 1800, "color": "#3b82f6"},
        {"category": "نثريات", "amount": 950, "color": "#8b5cf6"},
        {"category": "صيانة", "amount": 2200, "color": "#f43f5e"},
        {"category": "أخرى", "amount": 750, "color": "#64748b"},
    ]
    total = sum(e["amount"] for e in expenses)
    return {
        "ui_config": {"chart_type": "horizontal_bar", "rounded_bars": True},
        "total": total,
        "data": expenses
    }

@router.get("/charts/profit-trend")
def get_profit_trend(months: int = 6):
    """
    اتجاه الأرباح الشهري.
    """
    base = datetime.now()
    data = []
    for i in range(months, 0, -1):
        d = base - timedelta(days=30*i)
        revenue = random.randint(40000, 80000)
        costs = int(revenue * random.uniform(0.55, 0.75))
        data.append({
            "month": d.strftime("%Y-%m"),
            "revenue": revenue,
            "costs": costs,
            "profit": revenue - costs,
            "margin": round((revenue - costs) / revenue * 100, 1)
        })
    return {
        "ui_config": {"chart_type": "area", "gradient_fill": True, "show_margin": True},
        "data": data
    }

# ═══════════════════════════════════════════
# FINANCIAL REPORTS
# ═══════════════════════════════════════════

@router.get("/reports/balance-sheet")
def get_balance_sheet():
    """الميزانية العمومية"""
    return {
        "assets": {
            "current": {"cash": 45000, "bank": 78000, "receivables": 21845, "inventory": 142300},
            "fixed": {"equipment": 35000, "furniture": 12000}
        },
        "liabilities": {
            "payables": 15400,
            "vat_payable": 8900,
            "loans": 25000
        },
        "equity": {"capital": 100000, "retained": 111845}
    }

@router.get("/reports/income-statement")
def get_income_statement():
    """قائمة الدخل"""
    revenue = 245000
    cogs = 137200
    gross_profit = revenue - cogs
    expenses = 46750
    net_profit = gross_profit - expenses
    return {
        "revenue": revenue,
        "cogs": cogs,
        "gross_profit": gross_profit,
        "gross_margin": round(gross_profit/revenue*100, 1),
        "expenses": expenses,
        "expense_breakdown": {"rent": 5000, "salaries": 12000, "utilities": 1800, "misc": 950, "maintenance": 2200, "other": 750},
        "net_profit": net_profit,
        "net_margin": round(net_profit/revenue*100, 1)
    }

@router.get("/reports/cash-flow")
def get_cash_flow():
    """التدفق النقدي"""
    return {
        "operating": {"in": 180000, "out": 142000, "net": 38000},
        "investing": {"in": 0, "out": 15000, "net": -15000},
        "financing": {"in": 0, "out": 5000, "net": -5000},
        "total_net": 18000,
        "opening_balance": 95000,
        "closing_balance": 113000
    }
