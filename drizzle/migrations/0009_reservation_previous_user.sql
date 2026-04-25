ALTER TABLE "reservations" ADD COLUMN "previous_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;
