import type {
  AuthResponse,
  CreateIngredientInput,
  CreateInventoryEntryInput,
  CreateUserInput,
  Ingredient,
  InventoryEntry,
  LowStockAlert,
  Product,
  ProductDetail,
  ProductInput,
  RecipeInput,
  Sale,
  SaleSummaryRow,
  Supplier,
  SupplierInput,
  UpdateIngredientInput,
  UpdateUserInput,
  User,
  VarianceRow,
} from "./types";

const BASE = "/api/v1";

let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Evita el reintento automático tras refrescar el token. */
  skipAuthRetry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, skipAuthRetry, headers, ...rest } = options;

  const res = await fetch(BASE + path, {
    ...rest,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Intento de refresh transparente ante 401 (excepto en rutas de auth).
  if (
    res.status === 401 &&
    !skipAuthRetry &&
    !path.startsWith("/auth/login") &&
    !path.startsWith("/auth/refresh")
  ) {
    const refreshed = await tryRefresh();
    if (refreshed) {
      return request<T>(path, { ...options, skipAuthRetry: true });
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string }).error ?? "Error de red");
  }
  return data as T;
}

async function tryRefresh(): Promise<boolean> {
  try {
    const res = await fetch(BASE + "/auth/refresh", {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as AuthResponse;
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}

export const api = {
  login(email: string, password: string) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      skipAuthRetry: true,
    });
  },
  refresh() {
    return request<AuthResponse>("/auth/refresh", {
      method: "POST",
      skipAuthRetry: true,
    });
  },
  logout() {
    return request<{ ok: true }>("/auth/logout", { method: "POST" });
  },
  me() {
    return request<{ user: User }>("/auth/me");
  },
  changePassword(currentPassword: string, newPassword: string) {
    return request<{ ok: true }>("/auth/change-password", {
      method: "POST",
      body: { currentPassword, newPassword },
    });
  },

  // --- Módulo 2: Usuarios (solo owner) ---
  listUsers() {
    return request<{ users: User[] }>("/users");
  },
  createUser(input: CreateUserInput) {
    return request<{ user: User }>("/users", { method: "POST", body: input });
  },
  updateUser(id: number, input: UpdateUserInput) {
    return request<{ user: User }>(`/users/${id}`, { method: "PATCH", body: input });
  },
  resetUserPassword(id: number, newPassword: string) {
    return request<{ ok: true }>(`/users/${id}/reset-password`, {
      method: "POST",
      body: { newPassword },
    });
  },
  deleteUser(id: number) {
    return request<{ ok: true }>(`/users/${id}`, { method: "DELETE" });
  },

  // --- Módulo 3: Insumos (owner + manager) ---
  listIngredients() {
    return request<{ ingredients: Ingredient[] }>("/ingredients");
  },
  createIngredient(input: CreateIngredientInput) {
    return request<{ ingredient: Ingredient }>("/ingredients", {
      method: "POST",
      body: input,
    });
  },
  updateIngredient(id: number, input: UpdateIngredientInput) {
    return request<{ ingredient: Ingredient }>(`/ingredients/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  deleteIngredient(id: number) {
    return request<{ ok: true }>(`/ingredients/${id}`, { method: "DELETE" });
  },

  // --- Módulo 4: Proveedores (owner + manager) ---
  listSuppliers() {
    return request<{ suppliers: Supplier[] }>("/suppliers");
  },
  createSupplier(input: SupplierInput) {
    return request<{ supplier: Supplier }>("/suppliers", {
      method: "POST",
      body: input,
    });
  },
  updateSupplier(id: number, input: SupplierInput) {
    return request<{ supplier: Supplier }>(`/suppliers/${id}`, {
      method: "PATCH",
      body: input,
    });
  },
  deleteSupplier(id: number) {
    return request<{ ok: true }>(`/suppliers/${id}`, { method: "DELETE" });
  },

  // --- Módulo 5: Entradas de inventario (owner + manager) ---
  listInventory(ingredientId?: number) {
    const qs = ingredientId ? `?ingredientId=${ingredientId}` : "";
    return request<{ entries: InventoryEntry[] }>(`/inventory${qs}`);
  },
  createInventoryEntry(input: CreateInventoryEntryInput) {
    return request<{ entry: InventoryEntry; newStock: number }>("/inventory", {
      method: "POST",
      body: input,
    });
  },

  // --- Módulo 6/7: Productos y recetas ---
  listProducts() {
    return request<{ products: Product[] }>("/products");
  },
  getProduct(id: number) {
    return request<{ product: ProductDetail }>(`/products/${id}`);
  },
  createProduct(input: ProductInput) {
    return request<{ product: Product }>("/products", { method: "POST", body: input });
  },
  updateProduct(id: number, input: ProductInput) {
    return request<{ product: Product }>(`/products/${id}`, { method: "PATCH", body: input });
  },
  setRecipe(id: number, input: RecipeInput) {
    return request<{ product: ProductDetail }>(`/products/${id}/recipe`, {
      method: "PUT",
      body: input,
    });
  },
  deleteProduct(id: number) {
    return request<{ ok: true }>(`/products/${id}`, { method: "DELETE" });
  },

  // --- Módulo 8: Ventas ---
  listSales(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ sales: Sale[] }>(`/sales${qs ? `?${qs}` : ""}`);
  },
  salesToday() {
    return request<{ summary: SaleSummaryRow[]; totalUnits: number; totalRevenue: number }>(
      "/sales/today",
    );
  },
  createSale(productId: number, quantity: number, notes?: string | null) {
    return request<{ sale: Sale; lowStock: LowStockAlert[] }>("/sales", {
      method: "POST",
      body: { productId, quantity, notes: notes ?? null },
    });
  },

  // --- Módulo 9: Reportes ---
  variance(params?: { from?: string; to?: string }) {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return request<{ from: string | null; to: string | null; rows: VarianceRow[] }>(
      `/reports/variance${qs ? `?${qs}` : ""}`,
    );
  },
};
