import React, { useState, useEffect, useCallback } from "react";
import {
  LogIn,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowLeft,
  Building2,
} from "lucide-react";
import { isSupabaseConfigured } from "../services/supabase";
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from "../services/auth";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  role: "manager" | "cashier" | "viewer";
}

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  onRegister: (data: RegisterData) => Promise<{ success: boolean; error?: string }>;
  onForgotPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
}

type AuthMode = "login" | "register" | "forgot";

// ═══════════════════════════════════════════════════════════════
// LOCAL LOGIN FALLBACK (when Supabase is not configured)
// ═══════════════════════════════════════════════════════════════

// Default admin credentials — shown to user in local mode

// ═══════════════════════════════════════════════════════════════
// AUTH MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════

export default function AuthModal({ open, onClose, onLogin, onRegister, onForgotPassword }: AuthModalProps) {
  // ── Mode State ──
  const [mode, setMode] = useState<AuthMode>("login");

  // ── Form State ──
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"manager" | "cashier" | "viewer">("cashier");

  // ── UI State ──
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasSupabase, setHasSupabase] = useState(false);

  // ── Load remembered email on mount ──
  useEffect(() => {
    if (open) {
      const remembered = localStorage.getItem("pp_last_email");
      if (remembered) setEmail(remembered);
      setHasSupabase(isSupabaseConfigured());
      // Reset messages when modal opens
      setError("");
      setSuccess("");
    }
  }, [open]);

  // ── Reset form when switching modes ──
  useEffect(() => {
    setError("");
    setSuccess("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (mode === "login") {
      setPassword("");
      const remembered = localStorage.getItem("pp_last_email");
      if (remembered) setEmail(remembered);
    } else if (mode === "register") {
      setPassword("");
      setConfirmPassword("");
    } else if (mode === "forgot") {
      setPassword("");
      const remembered = localStorage.getItem("pp_last_email");
      if (remembered) setEmail(remembered);
    }
  }, [mode]);

  // ── Helpers ──
  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setRole("cashier");
    setError("");
    setSuccess("");
  }, []);

  const saveEmail = useCallback((em: string) => {
    if (em && em.includes("@")) {
      localStorage.setItem("pp_last_email", em);
    }
  }, []);

  // ── Login Handler ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !password) {
      setError("يرجى إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setLoading(true);

    try {
      // Always delegate to parent handler (auth service handles local vs Supabase)
      const result = await onLogin(email, password);
      if (result.success) {
        saveEmail(email);
        setSuccess("تم تسجيل الدخول بنجاح");
        setTimeout(() => {
          setLoading(false);
          resetForm();
          onClose();
        }, 600);
      } else {
        setError(result.error || "فشل تسجيل الدخول، تحقق من بياناتك");
      }
    } catch {
      setError("حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ── Register Handler ──
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validation
    if (!fullName.trim()) {
      setError("يرجى إدخال الاسم الكامل");
      return;
    }
    if (!email || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }
    if (!password || password.length < 6) {
      setError("كلمة المرور يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (password !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setLoading(true);

    try {
      // ── Local fallback: store user in localStorage ──
      if (!hasSupabase) {
        const users = JSON.parse(localStorage.getItem("pp_local_users") || "[]");
        if (users.some((u: any) => u.email === email)) {
          setError("هذا البريد الإلكتروني مستخدم بالفعل");
          setLoading(false);
          return;
        }
        users.push({ fullName, email, password, role, createdAt: new Date().toISOString() });
        localStorage.setItem("pp_local_users", JSON.stringify(users));
        saveEmail(email);
        setSuccess("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول");
        setTimeout(() => {
          setLoading(false);
          setMode("login");
        }, 1200);
        return;
      }

      // ── Supabase register ──
      const result = await onRegister({ fullName, email, password, role });
      if (result.success) {
        saveEmail(email);
        setSuccess("تم إنشاء الحساب بنجاح! يمكنك الآن تسجيل الدخول");
        setTimeout(() => {
          setLoading(false);
          setMode("login");
        }, 1200);
      } else {
        setError(result.error || "فشل إنشاء الحساب، حاول مرة أخرى");
      }
    } catch {
      setError("حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ── Forgot Password Handler ──
  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email || !email.includes("@")) {
      setError("يرجى إدخال بريد إلكتروني صحيح");
      return;
    }

    setLoading(true);

    try {
      // ── Local fallback ──
      if (!hasSupabase) {
        setTimeout(() => {
          setSuccess("في وضع التشغيل المحلي، يرجى التواصل مع المدير لإعادة تعيين كلمة المرور");
          setLoading(false);
        }, 800);
        return;
      }

      // ── Supabase forgot password ──
      const result = await onForgotPassword(email);
      if (result.success) {
        setSuccess("تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني");
      } else {
        setError(result.error || "فشل إرسال الرابط، تحقق من البريد الإلكتروني");
      }
    } catch {
      setError("حدث خطأ غير متوقع، حاول مرة أخرى");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // RENDER: If modal not open, return null
  // ═══════════════════════════════════════════════════════════════

  if (!open) return null;

  // ═══════════════════════════════════════════════════════════════
  // SUB-COMPONENTS (inline for self-containment)
  // ═══════════════════════════════════════════════════════════════

  const modeTitle: Record<AuthMode, string> = {
    login: "تسجيل الدخول",
    register: "إنشاء حساب جديد",
    forgot: "استعادة كلمة المرور",
  };

  const modeIcon = {
    login: LogIn,
    register: UserPlus,
    forgot: KeyRound,
  }[mode];

  const IconComp = modeIcon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" dir="rtl">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-lg" onClick={onClose} />

      {/* Modal */}
      <div className="relative liquid-modal rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
            <IconComp className="w-5 h-5 text-amber-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-100">{modeTitle[mode]}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === "login" && "أهلاً بك مجدداً في Parts Pro"}
              {mode === "register" && "أنشئ حسابك للبدء"}
              {mode === "forgot" && "أدخل بريدك لاستعادة كلمة المرور"}
            </p>
          </div>
          {/* Local mode badge */}
          {!hasSupabase && (
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/20">
              محلي
            </span>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Error Message */}
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-sm text-rose-300 mb-4 animate-fade-in">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-300 mb-4 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* ── LOGIN FORM ── */}
          {mode === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email / Username */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  {!hasSupabase ? "اسم المستخدم" : "البريد الإلكتروني"}
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={!hasSupabase ? DEFAULT_ADMIN_EMAIL : "example@email.com"}
                    className="pr-10 py-2.5 pl-3.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">كلمة المرور</label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="pr-10 py-2.5 pl-10 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full liquid-btn text-white font-bold py-2.5 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                {loading ? "جاري الدخول..." : "دخول"}
              </button>

              {/* Default admin hint — local mode only */}
              {!hasSupabase && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-xs text-amber-400 font-bold mb-1">حساب المدير الافتراضي:</p>
                  <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                    <span>{DEFAULT_ADMIN_EMAIL}</span>
                    <span className="text-slate-500">|</span>
                    <span>{DEFAULT_ADMIN_PASSWORD}</span>
                  </div>
                </div>
              )}

              {/* Switch Links */}
              <div className="flex flex-col items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-amber-400/80 hover:text-amber-400 transition-colors"
                >
                  نسيت كلمة المرور؟
                </button>
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  ليس لديك حساب؟ <span className="text-amber-400 hover:underline">سجل الآن</span>
                </button>
              </div>

              {/* Local mode hint */}
              {!hasSupabase && (
                <div className="flex items-start gap-2 px-3 py-2.5 bg-sky-500/5 border border-sky-500/10 rounded-xl text-xs text-sky-300/80">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-sky-400 mt-0.5" />
                  <span>
                    وضع التشغيل المحلي: استخدم <strong className="text-sky-300">admin</strong> /{" "}
                    <strong className="text-sky-300">password</strong>
                  </span>
                </div>
              )}
            </form>
          )}

          {/* ── REGISTER FORM ── */}
          {mode === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              {/* Full Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  الاسم الكامل <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="مثال: أحمد الشمري"
                    className="pr-10 py-2.5 pl-3.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full"
                    autoFocus
                  />
                </div>
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  البريد الإلكتروني <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="pr-10 py-2.5 pl-3.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  كلمة المرور <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6 أحرف على الأقل"
                    className="pr-10 py-2.5 pl-10 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  تأكيد كلمة المرور <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="أعد إدخال كلمة المرور"
                    className="pr-10 py-2.5 pl-10 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-amber-400 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  الدور <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <ShieldCheck className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as RegisterData["role"])}
                    className="pr-10 py-2.5 pl-3.5 rounded-xl liquid-input text-sm text-slate-100 focus:outline-none transition-all w-full appearance-none cursor-pointer"
                  >
                    <option value="manager" className="bg-slate-800 text-slate-100">مدير</option>
                    <option value="cashier" className="bg-slate-800 text-slate-100">أمين صندوق</option>
                    <option value="viewer" className="bg-slate-800 text-slate-100">مشاهد</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full liquid-btn text-white font-bold py-2.5 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {loading ? "جاري الإنشاء..." : "إنشاء الحساب"}
              </button>

              {/* Switch to Login */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  لديك حساب؟ <span className="text-amber-400 hover:underline">سجل دخول</span>
                </button>
              </div>
            </form>
          )}

          {/* ── FORGOT PASSWORD FORM ── */}
          {mode === "forgot" && (
            <form onSubmit={handleForgot} className="space-y-4">
              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-slate-400">
                  البريد الإلكتروني <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="pr-10 py-2.5 pl-3.5 rounded-xl liquid-input text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none transition-all w-full"
                    autoFocus
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full liquid-btn text-white font-bold py-2.5 rounded-xl inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <KeyRound className="w-4 h-4" />
                )}
                {loading ? "جاري الإرسال..." : "إرسال رابط التعيين"}
              </button>

              {/* Switch to Login */}
              <div className="flex justify-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-xs text-amber-400/80 hover:text-amber-400 transition-colors inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  العودة لتسجيل الدخول
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/5 flex items-center justify-center gap-1.5">
          <Building2 className="w-3 h-3 text-slate-500" />
          <span className="text-[10px] text-slate-500">Parts Pro ERP</span>
          <span className="text-[10px] text-slate-600">|</span>
          <ShieldCheck className="w-3 h-3 text-slate-600" />
          <span className="text-[10px] text-slate-600">نظام آمن</span>
        </div>
      </div>
    </div>
  );
}
