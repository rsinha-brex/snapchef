CREATE TABLE "pantry_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text,
	"source" text,
	"photo_ref" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_adaptations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe_title" text NOT NULL,
	"recipe_image" text,
	"adapted_payload" jsonb NOT NULL,
	"pantry_snapshot" jsonb,
	"saved_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "saved_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"recipe_id" integer NOT NULL,
	"recipe_title" text NOT NULL,
	"recipe_image" text,
	"cooked" boolean DEFAULT false,
	"saved_at" timestamp DEFAULT now(),
	"cooked_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "pantry_items" ADD CONSTRAINT "pantry_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_adaptations" ADD CONSTRAINT "saved_adaptations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pantry_user_name_idx" ON "pantry_items" USING btree ("user_id","name");--> statement-breakpoint
CREATE INDEX "pantry_user_idx" ON "pantry_items" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "adaptations_user_idx" ON "saved_adaptations" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "saved_user_recipe_idx" ON "saved_recipes" USING btree ("user_id","recipe_id");--> statement-breakpoint
CREATE INDEX "saved_user_idx" ON "saved_recipes" USING btree ("user_id");