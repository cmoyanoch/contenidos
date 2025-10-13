-- CreateTable
CREATE TABLE "theme_planning" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "theme_name" TEXT NOT NULL,
    "theme_description" TEXT,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "theme_planning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_theme_planning_user_id" ON "theme_planning"("user_id");

-- CreateIndex
CREATE INDEX "idx_theme_planning_dates" ON "theme_planning"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "idx_theme_planning_theme_name" ON "theme_planning"("theme_name");

-- AddForeignKey
ALTER TABLE "theme_planning" ADD CONSTRAINT "theme_planning_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
