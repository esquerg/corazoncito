export type Role = "owner" | "manager" | "barista";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  createdAt?: number;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: Role;
  active: boolean;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: Role;
  active?: boolean;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface Supplier {
  id: number;
  name: string;
  contact: string | null;
  notes: string | null;
}

export interface SupplierInput {
  name: string;
  contact?: string | null;
  notes?: string | null;
}

export type ProductCategory = "espresso" | "cold" | "hot" | "special";

export interface Product {
  id: number;
  name: string;
  category: ProductCategory;
  price: number | null;
  active: boolean;
  imageUrl?: string | null;
}

export interface RecipeItem {
  id: number;
  ingredientId: number;
  ingredientName: string;
  unit: IngredientUnit;
  quantity: number;
  avgUnitCost: number | null;
  lineCost: number | null;
}

export interface ProductDetail extends Product {
  items: RecipeItem[];
  theoreticalCost: number | null;
}

export interface ProductInput {
  name: string;
  category: ProductCategory;
  price?: number | null;
  active?: boolean;
}

export interface RecipeInput {
  items: Array<{ ingredientId: number; quantity: number }>;
}

export interface Sale {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  price: number | null;
  soldAt: string;
  notes: string | null;
  createdByName: string;
}

export interface SaleSummaryRow {
  productId: number;
  productName: string;
  units: number;
  revenue: number;
}

export interface LowStockAlert {
  id: number;
  name: string;
  currentStock: number;
  minStock: number;
  unit: IngredientUnit;
}

export interface VarianceRow {
  ingredientId: number;
  name: string;
  unit: IngredientUnit;
  purchased: number;
  consumed: number;
  variance: number;
  currentStock: number;
  minStock: number;
}

export interface InventoryEntry {
  id: number;
  ingredientId: number;
  ingredientName: string;
  ingredientUnit: IngredientUnit;
  supplierId: number | null;
  supplierName: string | null;
  quantity: number;
  unitCost: number | null;
  reference: string | null;
  receivedAt: string;
  createdByName: string;
}

export interface CreateInventoryEntryInput {
  ingredientId: number;
  supplierId?: number | null;
  quantity: number;
  unitCost?: number | null;
  reference?: string | null;
  receivedAt?: string;
}

export type IngredientUnit = "g" | "ml" | "unit";
export type IngredientCategory = "coffee" | "dairy" | "syrup" | "other";
export type StockStatus = "ok" | "low" | "critical";

export interface Ingredient {
  id: number;
  name: string;
  unit: IngredientUnit;
  category: IngredientCategory;
  minStock: number;
  currentStock: number;
  status: StockStatus;
}

export interface CreateIngredientInput {
  name: string;
  unit: IngredientUnit;
  category: IngredientCategory;
  minStock: number;
  currentStock: number;
}

export interface UpdateIngredientInput {
  name?: string;
  unit?: IngredientUnit;
  category?: IngredientCategory;
  minStock?: number;
}
