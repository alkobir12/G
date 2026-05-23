// ═══════════════════════════════════════════════════════════════
//   ErrorBoundary.tsx — catches render errors per page
// ═══════════════════════════════════════════════════════════════
import React from "react";

interface Props { children: React.ReactNode; label?: string; }
interface State { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", this.props.label || "app", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div dir="rtl" className="p-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 text-slate-100 m-4">
        <h2 className="text-lg font-bold mb-2">حدث خطأ في هذه الصفحة</h2>
        <p className="text-sm text-slate-300 mb-3">
          {this.state.error?.message || "خطأ غير متوقع"}
        </p>
        <button
          onClick={() => this.setState({ hasError: false, error: null })}
          className="px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold ml-2"
        >
          إعادة المحاولة
        </button>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-2 rounded-lg bg-rose-500/80 hover:bg-rose-500 text-white text-sm font-bold"
        >
          تحديث الصفحة
        </button>
      </div>
    );
  }
}
