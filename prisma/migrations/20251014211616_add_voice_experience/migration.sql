-- AlterTable
ALTER TABLE "guilds" ADD COLUMN     "voice_afk_penalty" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
ADD COLUMN     "voice_base_exp_per_minute" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "voice_deafened_penalty" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
ADD COLUMN     "voice_exp_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "voice_min_members" INTEGER NOT NULL DEFAULT 2,
ADD COLUMN     "voice_muted_penalty" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "voice_peak_end_hour" INTEGER,
ADD COLUMN     "voice_peak_multiplier" DOUBLE PRECISION,
ADD COLUMN     "voice_peak_start_hour" INTEGER,
ADD COLUMN     "voice_periodic_interval" INTEGER NOT NULL DEFAULT 300000,
ADD COLUMN     "voice_streaming_bonus" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
ADD COLUMN     "voice_video_bonus" DOUBLE PRECISION NOT NULL DEFAULT 0.15;

-- CreateTable
CREATE TABLE "voice_channel_configs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "exp_multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "min_members" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "voice_channel_configs_guild_id_idx" ON "voice_channel_configs"("guild_id");

-- CreateIndex
CREATE INDEX "voice_channel_configs_channel_id_idx" ON "voice_channel_configs"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "voice_channel_configs_guild_id_channel_id_key" ON "voice_channel_configs"("guild_id", "channel_id");

-- AddForeignKey
ALTER TABLE "voice_channel_configs" ADD CONSTRAINT "voice_channel_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
