import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

/**
 * Schema completo del MVP de Corazoncito.
 * Booleans se modelan como integer({ mode: "boolean" }) y fechas como
 * integer({ mode: "timestamp" }) (epoch en segundos) por compatibilidad con SQLite.
 */

export const ROLES = ["owner", "manager", "barista"] as const;
export type Role = (typeof ROLES)[number];

export const INGREDIENT_UNITS = ["g", "ml", "unit"] as const;
export const INGREDIENT_CATEGORIES = ["coffee", "dairy", "syrup", "other"] as const;
export const PRODUCT_CATEGORIES = ["espresso", "cold", "hot", "special"] as const;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ROLES }).notNull().default("barista"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  contact: text("contact"),
  notes: text("notes"),
});

export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  unit: text("unit", { enum: INGREDIENT_UNITS }).notNull(),
  category: text("category", { enum: INGREDIENT_CATEGORIES })
    .notNull()
    .default("other"),
  minStock: real("min_stock").notNull().default(0),
  currentStock: real("current_stock").notNull().default(0),
});

export const inventoryEntries = sqliteTable("inventory_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  supplierId: integer("supplier_id").references(() => suppliers.id, {
    onDelete: "set null",
  }),
  quantity: real("quantity").notNull(),
  unitCost: real("unit_cost"),
  reference: text("reference"),
  receivedAt: integer("received_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
});

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category", { enum: PRODUCT_CATEGORIES }).notNull(),
  price: real("price"),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  imageUrl: text("image_url"),
});

export const recipeItems = sqliteTable("recipe_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id")
    .notNull()
    .references(() => ingredients.id, { onDelete: "restrict" }),
  quantity: real("quantity").notNull(),
});

export const sales = sqliteTable("sales", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "restrict" }),
  quantity: integer("quantity").notNull(),
  soldAt: integer("sold_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  notes: text("notes"),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Ingredient = typeof ingredients.$inferSelect;
export type Supplier = typeof suppliers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type RecipeItem = typeof recipeItems.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type InventoryEntry = typeof inventoryEntries.$inferSelect;
