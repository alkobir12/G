from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json

# قاعدة معرفة للمشاكل الشائعة والحلول
KNOWLEDGE_BASE = {
    "engine_overheating": {
        "keywords": ["حرارة", "محرك", "سخن", "غليان", "ارتفاع حرارة"],
        "problem": "ارتفاع حرارة المحرك",
        "causes": [
            "نقص سائل التبريد",
            "عطل في منظم الحرارة (الثرموستات)",
            "تلف مضخة الماء",
            "انسداد المشع (الردياتير)",
            "عطل في مروحة التبريد",
            "تلف حشية الرأس (جوان الكولاس)"
        ],
        "solutions": [
            "فحص مستوى سائل التبريد وإضافته",
            "فحص واستبدال منظم الحرارة",
            "فحص مضخة الماء والتأكد من عملها",
            "تنظيف أو استبدال المشع",
            "فحص مروحة التبريد الكهربائية",
            "فحص ضغط المحرك للتأكد من سلامة الجوان"
        ],
        "urgency": "high",
        "estimated_cost": "200-1500"
    },
    "brake_issues": {
        "keywords": ["فرامل", "فرملة", "توقف", "صوت فرامل", "طقة"],
        "problem": "مشاكل الفرامل",
        "causes": [
            "تآكل تيل الفرامل",
            "نقص سائل الفرامل",
            "تلف أقراص الفرامل",
            "وجود هواء في دائرة الفرامل",
            "ضعف أو تلف الخراطيم"
        ],
        "solutions": [
            "استبدال تيل الفرامل",
            "إضافة سائل فرامل وفحص التسريب",
            "خرط أو استبدال الأقراص",
            "تنفيس الهواء من دائرة الفرامل",
            "فحص واستبدال الخراطيم التالفة"
        ],
        "urgency": "critical",
        "estimated_cost": "300-2000"
    },
    "battery_dead": {
        "keywords": ["بطارية", "تشغيل", "دينمو", "شحن", "كهرباء", "ضعف"],
        "problem": "مشكلة البطارية أو نظام الشحن",
        "causes": [
            "بطارية قديمة أو تالفة",
            "عطل في المولد (الدينمو)",
            "تآكل أو تلف أطراف البطارية",
            "تسريب كهربائي",
            "عطل في منظم الجهد"
        ],
        "solutions": [
            "فحص جهد البطارية واستبدالها إن لزم",
            "فحص المولد والتأكد من قدرته على الشحن",
            "تنظيف أطراف البطارية من الصدأ",
            "فحص الدائرة الكهربائية للتسريب",
            "فحص منظم الجهد"
        ],
        "urgency": "medium",
        "estimated_cost": "150-800"
    },
    "transmission": {
        "keywords": ["قير", "ناقل", "تعشيق", "غيار", "حركة"],
        "problem": "مشاكل ناقل الحركة",
        "causes": [
            "نقص زيت القير",
            "تلف القابض (الدبرياج)",
            "مشاكل في الفتيس الأوتوماتيك",
            "تآكل التروس"
        ],
        "solutions": [
            "فحص مستوى زيت القير",
            "استبدال القابض",
            "صيانة القير الأوتوماتيك",
            "إصلاح أو استبدال القير"
        ],
        "urgency": "high",
        "estimated_cost": "500-5000"
    },
    "ac_not_cold": {
        "keywords": ["تكييف", "مكيف", "بارد", "تبريد", "فريون"],
        "problem": "التكييف لا يبرد",
        "causes": [
            "نقص غاز الفريون",
            "عطل في الكمبروسر",
            "انسداد الفلتر",
            "عطل في مروحة المكثف"
        ],
        "solutions": [
            "فحص وإضافة غاز التبريد",
            "فحص وإصلاح الكمبروسر",
            "تنظيف أو استبدال الفلتر",
            "فحص المروحة"
        ],
        "urgency": "low",
        "estimated_cost": "200-1500"
    },
    "oil_leak": {
        "keywords": ["تسريب", "زيت", "تنقيط", "بقع"],
        "problem": "تسريب الزيت",
        "causes": [
            "تلف جوانات المحرك",
            "تلف صمام التهوية",
            "تلف حلقات البستم"
        ],
        "solutions": [
            "استبدال الجوانات التالفة",
            "إصلاح نظام التهوية",
            "إصلاح داخلي للمحرك"
        ],
        "urgency": "medium",
        "estimated_cost": "300-2000"
    }
}

PARTS_DATABASE = {
    "oil_filter": {"name": "فلتر زيت", "price_range": "30-80", "brands": ["Toyota", "Mann", "Bosch"]},
    "air_filter": {"name": "فلتر هواء", "price_range": "40-100", "brands": ["K&N", "Mann", "OEM"]},
    "brake_pads": {"name": "تيل فرامل", "price_range": "150-400", "brands": ["Brembo", "ATE", "Textar"]},
    "battery": {"name": "بطارية", "price_range": "300-800", "brands": ["Varta", "AC Delco", "Exide"]},
    "spark_plugs": {"name": "بواجي", "price_range": "80-200", "brands": ["NGK", "Denso", "Champion"]},
}

MAINTENANCE_SCHEDULES = {
    "oil_change": {
        "interval_km": 5000,
        "interval_months": 6,
        "description": "تغيير زيت وفلتر"
    },
    "tire_rotation": {
        "interval_km": 10000,
        "interval_months": 6,
        "description": "تبديل مواقع الإطارات"
    },
    "brake_inspection": {
        "interval_km": 20000,
        "interval_months": 12,
        "description": "فحص الفرامل"
    }
}

def search_knowledge_base(query: str) -> List[Dict]:
    """البحث في قاعدة المعرفة"""
    results = []
    query_lower = query.lower()
    
    for problem_id, problem_data in KNOWLEDGE_BASE.items():
        # Check if any keyword matches
        for keyword in problem_data["keywords"]:
            if keyword in query_lower:
                results.append({
                    "id": problem_id,
                    "relevance": "high",
                    **problem_data
                })
                break
    
    return results

def get_part_recommendation(part_type: str, budget: Optional[float] = None) -> Dict:
    """الحصول على توصية قطعة غيار"""
    if part_type in PARTS_DATABASE:
        part = PARTS_DATABASE[part_type]
        return {
            "part": part["name"],
            "estimated_price": part["price_range"],
            "recommended_brands": part["brands"],
            "availability": "متوفر"
        }
    return {"message": "القطعة غير موجودة في قاعدة البيانات"}

def get_maintenance_recommendation(km: int, last_service_date: str) -> List[Dict]:
    """الحصول على توصيات الصيانة"""
    recommendations = []
    
    for service_type, schedule in MAINTENANCE_SCHEDULES.items():
        if km >= schedule["interval_km"]:
            recommendations.append({
                "service": schedule["description"],
                "reason": f"قطعت {km} كم",
                "priority": "high" if km > schedule["interval_km"] * 1.2 else "medium"
            })
    
    return recommendations

def build_enhanced_prompt(user_query: str, context: Dict = None) -> str:
    """بناء prompt محسّن مع المعلومات من قاعدة المعرفة"""
    
    # البحث في قاعدة المعرفة
    kb_results = search_knowledge_base(user_query)
    
    enhanced_prompt = f"""أنت مساعد ذكاء اصطناعي متخصص في صيانة وإصلاح السيارات.

سؤال العميل: {user_query}

"""
    
    # إضافة نتائج البحث من قاعدة المعرفة
    if kb_results:
        enhanced_prompt += "معلومات من قاعدة المعرفة:\n\n"
        for result in kb_results[:2]:  # أول نتيجتين فقط
            enhanced_prompt += f"""المشكلة: {result['problem']}
الأسباب المحتملة: {', '.join(result['causes'][:3])}
الحلول المقترحة: {', '.join(result['solutions'][:3])}
التكلفة المتوقعة: {result['estimated_cost']} ريال
الأولوية: {result['urgency']}

"""
    
    # إضافة معلومات السياق إن وجدت
    if context:
        if 'vehicle_info' in context:
            enhanced_prompt += f"\nمعلومات المركبة: {context['vehicle_info']}\n"
        if 'service_history' in context:
            enhanced_prompt += f"\nسجل الصيانة السابق: {context['service_history']}\n"
    
    enhanced_prompt += """
تعليمات الإجابة:
1. اشرح المشكلة بوضوح
2. حدد الأسباب المحتملة
3. قدم حلول عملية مرتبة حسب الأولوية
4. أذكر التكلفة التقريبية
5. أضف نصائح وقائية
6. استخدم لغة عربية واضحة وبسيطة

الرجاء تقديم إجابة شاملة ومفيدة."""

    return enhanced_prompt

# CEO Analysis Functions
def analyze_business_health(metrics: Dict) -> Dict:
    """تحليل صحة العمل وإعطاء توصيات"""
    analysis = {
        "overall_health": "good",
        "alerts": [],
        "recommendations": [],
        "insights": []
    }
    
    # تحليل الربحية
    if metrics.get('profit', 0) < 0:
        analysis['overall_health'] = 'critical'
        analysis['alerts'].append({
            "level": "critical",
            "title": "خسائر مالية",
            "message": "الورشة تحقق خسائر. يجب مراجعة التكاليف فوراً."
        })
        analysis['recommendations'].append("تقليل المصروفات الثابتة بنسبة 20%")
    
    profit_margin = (metrics.get('profit', 0) / metrics.get('revenue', 1)) * 100 if metrics.get('revenue', 0) > 0 else 0
    
    if profit_margin < 15:
        analysis['alerts'].append({
            "level": "warning",
            "title": "هامش ربح منخفض",
            "message": f"هامش الربح {profit_margin:.1f}% أقل من المعدل المطلوب 15%"
        })
        analysis['recommendations'].append("مراجعة أسعار الخدمات وتكلفة القطع")
    
    # تحليل رضا العملاء
    if metrics.get('customerSatisfaction', 5) < 4:
        analysis['alerts'].append({
            "level": "high",
            "title": "انخفاض رضا العملاء",
            "message": "تقييم العملاء منخفض، قد يؤثر على السمعة"
        })
        analysis['recommendations'].append("تحسين جودة الخدمة والتواصل مع العملاء")
    
    # تحليل الإنتاجية
    avg_revenue_per_vehicle = metrics.get('revenue', 0) / metrics.get('vehiclesServiced', 1) if metrics.get('vehiclesServiced', 0) > 0 else 0
    
    if avg_revenue_per_vehicle < 500:
        analysis['insights'].append({
            "title": "متوسط الإيراد لكل مركبة منخفض",
            "value": f"{avg_revenue_per_vehicle:.0f} ريال",
            "suggestion": "تقديم خدمات إضافية وباقات صيانة"
        })
    
    # تحليل السيولة
    if metrics.get('cashFlow', 0) < metrics.get('expenses', 0) * 0.5:
        analysis['alerts'].append({
            "level": "warning",
            "title": "سيولة منخفضة",
            "message": "السيولة النقدية قد لا تكفي لتغطية المصروفات الشهرية"
        })
        analysis['recommendations'].append("تحسين التحصيل من العملاء وتأجيل المصروفات غير الضرورية")
    
    # توصيات للنمو
    if metrics.get('newCustomers', 0) < 10:
        analysis['recommendations'].append("تفعيل حملات تسويقية لجذب عملاء جدد")
    
    return analysis

def generate_ceo_insights(metrics: Dict, period: str = "month") -> List[str]:
    """توليد رؤى ذكية للمدير التنفيذي"""
    insights = []
    
    # مقارنات وتحليلات
    revenue = metrics.get('revenue', 0)
    expenses = metrics.get('expenses', 0)
    vehicles = metrics.get('vehiclesServiced', 0)
    
    insights.append(f"خلال {period}: تم خدمة {vehicles} مركبة بإيرادات {revenue:,.0f} ريال")
    
    if revenue > expenses:
        profit_percentage = ((revenue - expenses) / revenue) * 100
        insights.append(f"الورشة تحقق ربح بنسبة {profit_percentage:.1f}% - أداء ممتاز!")
    
    # تحليل اتجاهات
    avg_per_vehicle = revenue / vehicles if vehicles > 0 else 0
    insights.append(f"متوسط الإيراد لكل مركبة: {avg_per_vehicle:.0f} ريال")
    
    # توقعات
    if vehicles > 0 and period == "month":
        projected_monthly = revenue
        projected_yearly = projected_monthly * 12
        insights.append(f"الإيراد السنوي المتوقع: {projected_yearly:,.0f} ريال")
    
    return insights
