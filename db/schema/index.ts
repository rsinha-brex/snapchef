import { pgTable, text, timestamp, uuid, boolean, jsonb, integer, uniqueIndex, index } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const pantryItems = pgTable('pantry_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category'),
  source: text('source'),
  photoRef: text('photo_ref'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  uniqueIndex('pantry_user_name_idx').on(table.userId, table.name),
  index('pantry_user_idx').on(table.userId),
]);

export const savedRecipes = pgTable('saved_recipes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: integer('recipe_id').notNull(),
  recipeTitle: text('recipe_title').notNull(),
  recipeImage: text('recipe_image'),
  cooked: boolean('cooked').default(false),
  savedAt: timestamp('saved_at').defaultNow(),
  cookedAt: timestamp('cooked_at'),
}, (table) => [
  uniqueIndex('saved_user_recipe_idx').on(table.userId, table.recipeId),
  index('saved_user_idx').on(table.userId),
]);

export const savedAdaptations = pgTable('saved_adaptations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  recipeId: integer('recipe_id').notNull(),
  recipeTitle: text('recipe_title').notNull(),
  recipeImage: text('recipe_image'),
  adaptedPayload: jsonb('adapted_payload').notNull(),
  pantrySnapshot: jsonb('pantry_snapshot'),
  savedAt: timestamp('saved_at').defaultNow(),
}, (table) => [
  index('adaptations_user_idx').on(table.userId),
]);
