// ═══════════════════════════════════════════════════════════════
//   useResource.ts — Generic React Query hooks for every entity
// ═══════════════════════════════════════════════════════════════
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPut, apiDelete } from "../services/apiClient";

export interface ListFilters {
  search?: string;
  category?: string;
  type?: string;
  status?: string;
  customer?: string;
  supplier?: string;
  date_from?: string;
  date_to?: string;
  low_stock?: boolean;
  vehicle_id?: string;
  liquid_id?: string;
  limit?: number;
  offset?: number;
}

function buildList<T = any>(resource: string, idKey: "id" | "code" = "id") {
  const basePath = `/api/${resource}`;
  return {
    useList: (filters: ListFilters = {}) =>
      useQuery<T[]>({
        queryKey: [resource, filters],
        queryFn: () => apiGet<T[]>(basePath, filters as Record<string, unknown>),
      }),

    useOne: (id?: string) =>
      useQuery<T>({
        queryKey: [resource, "single", id],
        queryFn: () => apiGet<T>(`${basePath}/${id}`),
        enabled: Boolean(id),
      }),

    useCreate: () => {
      const qc = useQueryClient();
      return useMutation<T, Error, any>({
        mutationFn: (body) => apiPost<T>(basePath, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
      });
    },

    useUpdate: () => {
      const qc = useQueryClient();
      return useMutation<T, Error, { id: string; patch: Record<string, unknown> }>({
        mutationFn: ({ id, patch }) => apiPut<T>(`${basePath}/${id}`, patch),
        onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
      });
    },

    useDelete: () => {
      const qc = useQueryClient();
      return useMutation<unknown, Error, string>({
        mutationFn: (id) => apiDelete(`${basePath}/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
      });
    },

    idKey,
  };
}

export const Parts = buildList("parts");
export const Customers = buildList("customers");
export const Suppliers = buildList("suppliers");
export const Invoices = buildList("invoices");
export const Purchases = buildList("purchases");
export const Expenses = buildList("expenses");
export const Vehicles = buildList("vehicles");
export const Liquids = buildList("liquids");
export const LiquidTxns = buildList("liquid-transactions");
export const Accounts = buildList("accounts", "code");
export const Settings = buildList("settings");

export function useAnalyticsSummary() {
  return useQuery({
    queryKey: ["analytics", "summary"],
    queryFn: () => apiGet<any>("/api/analytics/summary"),
  });
}

export function useFinanceCards() {
  return useQuery({
    queryKey: ["finance", "dashboard", "cards"],
    queryFn: () => apiGet<any>("/api/v1/finance/dashboard/summary-cards"),
  });
}
