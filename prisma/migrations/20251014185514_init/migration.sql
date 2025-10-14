-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "ExperienceType" AS ENUM ('TEXT', 'VOICE');

-- CreateEnum
CREATE TYPE "LeaderboardPeriod" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "CommandRestrictionType" AS ENUM ('ROLE_WHITELIST', 'ROLE_BLACKLIST', 'CHANNEL_WHITELIST', 'CHANNEL_BLACKLIST');

-- CreateEnum
CREATE TYPE "AuditLogAction" AS ENUM ('COMMAND_EXECUTED', 'LEVEL_UP', 'ROLE_REWARDED', 'USER_BLACKLISTED', 'USER_UNBLACKLISTED', 'EXPERIENCE_MODIFIED', 'CONFIG_CHANGED');

-- CreateEnum
CREATE TYPE "BlacklistReason" AS ENUM ('SPAM', 'ABUSE', 'CHEATING', 'VIOLATION', 'OTHER');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "global_experience" INTEGER NOT NULL DEFAULT 0,
    "global_level" INTEGER NOT NULL DEFAULT 1,
    "total_messages_count" INTEGER NOT NULL DEFAULT 0,
    "total_voice_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "bio" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_seen_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rank_card_configs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "background_url" VARCHAR(512),
    "primary_color" VARCHAR(7) NOT NULL DEFAULT '#5865F2',
    "secondary_color" VARCHAR(7) NOT NULL DEFAULT '#3B3F46',
    "accent_color" VARCHAR(7) NOT NULL DEFAULT '#00D9FF',
    "progress_bar_gradient" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rank_card_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_temp_voice_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "default_channel_name" VARCHAR(100),
    "default_user_limit" INTEGER,
    "default_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_temp_voice_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blacklists" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reason" "BlacklistReason" NOT NULL,
    "details" VARCHAR(500),
    "expires_at" TIMESTAMP(3),
    "blacklisted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blacklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guilds" (
    "id" TEXT NOT NULL,
    "discord_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "prefix" VARCHAR(10),
    "locale" VARCHAR(5) NOT NULL DEFAULT 'en',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'UTC',
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "premium_expires_at" TIMESTAMP(3),
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "left_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guilds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_members" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_discord_id" TEXT NOT NULL,
    "text_xp" INTEGER NOT NULL DEFAULT 0,
    "text_level" INTEGER NOT NULL DEFAULT 1,
    "text_total_xp" INTEGER NOT NULL DEFAULT 0,
    "text_message_count" INTEGER NOT NULL DEFAULT 0,
    "voice_xp" INTEGER NOT NULL DEFAULT 0,
    "voice_level" INTEGER NOT NULL DEFAULT 1,
    "voice_total_xp" INTEGER NOT NULL DEFAULT 0,
    "voice_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "daily_text_messages" INTEGER NOT NULL DEFAULT 0,
    "weekly_text_messages" INTEGER NOT NULL DEFAULT 0,
    "monthly_text_messages" INTEGER NOT NULL DEFAULT 0,
    "daily_voice_seconds" INTEGER NOT NULL DEFAULT 0,
    "weekly_voice_seconds" INTEGER NOT NULL DEFAULT 0,
    "monthly_voice_seconds" INTEGER NOT NULL DEFAULT 0,
    "last_message_at" TIMESTAMP(3),
    "last_voice_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_user_blacklists" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_discord_id" TEXT NOT NULL,
    "reason" "BlacklistReason" NOT NULL,
    "details" VARCHAR(500),
    "expires_at" TIMESTAMP(3),
    "blacklisted_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_user_blacklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_webhooks" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "webhook_id" TEXT NOT NULL,
    "webhook_token" TEXT NOT NULL,
    "encryption_iv" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_webhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "image_url" VARCHAR(512) NOT NULL,
    "category" VARCHAR(50),
    "rarity" INTEGER NOT NULL DEFAULT 1,
    "is_global" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "awarded_by" TEXT,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guild_badges" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "enabled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "guild_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_configs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "min_xp" INTEGER NOT NULL DEFAULT 15,
    "max_xp" INTEGER NOT NULL DEFAULT 25,
    "cooldown_seconds" INTEGER NOT NULL DEFAULT 60,
    "announce_level" BOOLEAN NOT NULL DEFAULT true,
    "announce_channel_id" TEXT,
    "announce_message" VARCHAR(500),
    "announce_dm_user" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experience_multipliers" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "multiplier_bps" INTEGER NOT NULL DEFAULT 100,
    "starts_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experience_multipliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_rewards" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "level" INTEGER NOT NULL,
    "role_id" TEXT NOT NULL,
    "remove_other" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_rewards" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "period" "LeaderboardPeriod" NOT NULL,
    "position" INTEGER NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "channel_configs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "xp_disabled" BOOLEAN NOT NULL DEFAULT false,
    "commands_disabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_configs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "daily_text_channel_id" TEXT,
    "weekly_text_channel_id" TEXT,
    "monthly_text_channel_id" TEXT,
    "daily_voice_channel_id" TEXT,
    "weekly_voice_channel_id" TEXT,
    "monthly_voice_channel_id" TEXT,
    "max_entries" INTEGER NOT NULL DEFAULT 10,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaderboard_states" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "type" "ExperienceType" NOT NULL,
    "period" "LeaderboardPeriod" NOT NULL,
    "last_message_id" TEXT,
    "last_updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leaderboard_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temp_voice_configs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "default_channel_name" VARCHAR(100),
    "default_user_limit" INTEGER,
    "channel_name_pattern" VARCHAR(100),
    "auto_number_channels" BOOLEAN NOT NULL DEFAULT true,
    "allow_rename" BOOLEAN NOT NULL DEFAULT true,
    "allow_limit" BOOLEAN NOT NULL DEFAULT true,
    "allow_lock" BOOLEAN NOT NULL DEFAULT true,
    "allow_trust" BOOLEAN NOT NULL DEFAULT true,
    "delete_when_empty" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "temp_voice_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temp_voice_permitted_roles" (
    "id" TEXT NOT NULL,
    "config_id" TEXT NOT NULL,
    "role_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temp_voice_permitted_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temp_voice_channels" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temp_voice_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trusted_voice_users" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "trusted_member_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trusted_voice_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_configs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "command_name" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "command_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "command_restrictions" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "command_name" TEXT NOT NULL,
    "type" "CommandRestrictionType" NOT NULL,
    "target_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "command_restrictions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "guild_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "action" "AuditLogAction" NOT NULL,
    "target_id" TEXT,
    "command_name" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_discord_id_key" ON "users"("discord_id");

-- CreateIndex
CREATE INDEX "users_discord_id_idx" ON "users"("discord_id");

-- CreateIndex
CREATE INDEX "users_global_level_idx" ON "users"("global_level");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_rank_card_configs_user_id_key" ON "user_rank_card_configs"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_temp_voice_preferences_user_id_key" ON "user_temp_voice_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_blacklists_user_id_key" ON "user_blacklists"("user_id");

-- CreateIndex
CREATE INDEX "user_blacklists_expires_at_idx" ON "user_blacklists"("expires_at");

-- CreateIndex
CREATE INDEX "user_blacklists_created_at_idx" ON "user_blacklists"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "guilds_discord_id_key" ON "guilds"("discord_id");

-- CreateIndex
CREATE INDEX "guilds_discord_id_idx" ON "guilds"("discord_id");

-- CreateIndex
CREATE INDEX "guilds_is_premium_idx" ON "guilds"("is_premium");

-- CreateIndex
CREATE INDEX "guilds_joined_at_idx" ON "guilds"("joined_at");

-- CreateIndex
CREATE INDEX "guilds_left_at_idx" ON "guilds"("left_at");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_text_level_idx" ON "guild_members"("guild_id", "text_level");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_voice_level_idx" ON "guild_members"("guild_id", "voice_level");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_text_total_xp_idx" ON "guild_members"("guild_id", "text_total_xp");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_voice_total_xp_idx" ON "guild_members"("guild_id", "voice_total_xp");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_daily_text_messages_idx" ON "guild_members"("guild_id", "daily_text_messages");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_weekly_text_messages_idx" ON "guild_members"("guild_id", "weekly_text_messages");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_monthly_text_messages_idx" ON "guild_members"("guild_id", "monthly_text_messages");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_daily_voice_seconds_idx" ON "guild_members"("guild_id", "daily_voice_seconds");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_weekly_voice_seconds_idx" ON "guild_members"("guild_id", "weekly_voice_seconds");

-- CreateIndex
CREATE INDEX "guild_members_guild_id_monthly_voice_seconds_idx" ON "guild_members"("guild_id", "monthly_voice_seconds");

-- CreateIndex
CREATE INDEX "guild_members_user_id_idx" ON "guild_members"("user_id");

-- CreateIndex
CREATE INDEX "guild_members_user_discord_id_idx" ON "guild_members"("user_discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "guild_members_guild_id_user_discord_id_key" ON "guild_members"("guild_id", "user_discord_id");

-- CreateIndex
CREATE INDEX "guild_user_blacklists_guild_id_idx" ON "guild_user_blacklists"("guild_id");

-- CreateIndex
CREATE INDEX "guild_user_blacklists_user_discord_id_idx" ON "guild_user_blacklists"("user_discord_id");

-- CreateIndex
CREATE INDEX "guild_user_blacklists_expires_at_idx" ON "guild_user_blacklists"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "guild_user_blacklists_guild_id_user_discord_id_key" ON "guild_user_blacklists"("guild_id", "user_discord_id");

-- CreateIndex
CREATE UNIQUE INDEX "guild_webhooks_guild_id_key" ON "guild_webhooks"("guild_id");

-- CreateIndex
CREATE INDEX "guild_webhooks_guild_id_idx" ON "guild_webhooks"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "badges_identifier_key" ON "badges"("identifier");

-- CreateIndex
CREATE INDEX "badges_identifier_idx" ON "badges"("identifier");

-- CreateIndex
CREATE INDEX "badges_is_global_idx" ON "badges"("is_global");

-- CreateIndex
CREATE INDEX "badges_category_idx" ON "badges"("category");

-- CreateIndex
CREATE INDEX "user_badges_user_id_idx" ON "user_badges"("user_id");

-- CreateIndex
CREATE INDEX "user_badges_badge_id_idx" ON "user_badges"("badge_id");

-- CreateIndex
CREATE INDEX "user_badges_awarded_at_idx" ON "user_badges"("awarded_at");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_user_id_badge_id_key" ON "user_badges"("user_id", "badge_id");

-- CreateIndex
CREATE INDEX "guild_badges_guild_id_idx" ON "guild_badges"("guild_id");

-- CreateIndex
CREATE INDEX "guild_badges_badge_id_idx" ON "guild_badges"("badge_id");

-- CreateIndex
CREATE UNIQUE INDEX "guild_badges_guild_id_badge_id_key" ON "guild_badges"("guild_id", "badge_id");

-- CreateIndex
CREATE INDEX "experience_configs_guild_id_idx" ON "experience_configs"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "experience_configs_guild_id_type_key" ON "experience_configs"("guild_id", "type");

-- CreateIndex
CREATE INDEX "experience_multipliers_guild_id_type_idx" ON "experience_multipliers"("guild_id", "type");

-- CreateIndex
CREATE INDEX "experience_multipliers_expires_at_idx" ON "experience_multipliers"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "experience_multipliers_guild_id_type_target_type_target_id_key" ON "experience_multipliers"("guild_id", "type", "target_type", "target_id");

-- CreateIndex
CREATE INDEX "level_rewards_guild_id_type_level_idx" ON "level_rewards"("guild_id", "type", "level");

-- CreateIndex
CREATE UNIQUE INDEX "level_rewards_guild_id_type_level_role_id_key" ON "level_rewards"("guild_id", "type", "level", "role_id");

-- CreateIndex
CREATE INDEX "leaderboard_rewards_guild_id_type_period_idx" ON "leaderboard_rewards"("guild_id", "type", "period");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_rewards_guild_id_type_period_position_key" ON "leaderboard_rewards"("guild_id", "type", "period", "position");

-- CreateIndex
CREATE INDEX "channel_configs_guild_id_idx" ON "channel_configs"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_configs_guild_id_channel_id_key" ON "channel_configs"("guild_id", "channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_configs_guild_id_key" ON "leaderboard_configs"("guild_id");

-- CreateIndex
CREATE INDEX "leaderboard_states_guild_id_idx" ON "leaderboard_states"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "leaderboard_states_guild_id_type_period_key" ON "leaderboard_states"("guild_id", "type", "period");

-- CreateIndex
CREATE INDEX "temp_voice_configs_guild_id_idx" ON "temp_voice_configs"("guild_id");

-- CreateIndex
CREATE INDEX "temp_voice_configs_channel_id_idx" ON "temp_voice_configs"("channel_id");

-- CreateIndex
CREATE UNIQUE INDEX "temp_voice_configs_guild_id_channel_id_key" ON "temp_voice_configs"("guild_id", "channel_id");

-- CreateIndex
CREATE INDEX "temp_voice_permitted_roles_config_id_idx" ON "temp_voice_permitted_roles"("config_id");

-- CreateIndex
CREATE UNIQUE INDEX "temp_voice_permitted_roles_config_id_role_id_key" ON "temp_voice_permitted_roles"("config_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "temp_voice_channels_channel_id_key" ON "temp_voice_channels"("channel_id");

-- CreateIndex
CREATE INDEX "temp_voice_channels_guild_id_idx" ON "temp_voice_channels"("guild_id");

-- CreateIndex
CREATE INDEX "temp_voice_channels_owner_id_idx" ON "temp_voice_channels"("owner_id");

-- CreateIndex
CREATE INDEX "temp_voice_channels_channel_id_idx" ON "temp_voice_channels"("channel_id");

-- CreateIndex
CREATE INDEX "trusted_voice_users_channel_id_idx" ON "trusted_voice_users"("channel_id");

-- CreateIndex
CREATE INDEX "trusted_voice_users_trusted_member_id_idx" ON "trusted_voice_users"("trusted_member_id");

-- CreateIndex
CREATE UNIQUE INDEX "trusted_voice_users_channel_id_trusted_member_id_key" ON "trusted_voice_users"("channel_id", "trusted_member_id");

-- CreateIndex
CREATE INDEX "command_configs_guild_id_idx" ON "command_configs"("guild_id");

-- CreateIndex
CREATE UNIQUE INDEX "command_configs_guild_id_command_name_key" ON "command_configs"("guild_id", "command_name");

-- CreateIndex
CREATE INDEX "command_restrictions_guild_id_command_name_idx" ON "command_restrictions"("guild_id", "command_name");

-- CreateIndex
CREATE UNIQUE INDEX "command_restrictions_guild_id_command_name_type_target_id_key" ON "command_restrictions"("guild_id", "command_name", "type", "target_id");

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_action_idx" ON "audit_logs"("guild_id", "action");

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_user_id_idx" ON "audit_logs"("guild_id", "user_id");

-- CreateIndex
CREATE INDEX "audit_logs_guild_id_created_at_idx" ON "audit_logs"("guild_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- AddForeignKey
ALTER TABLE "user_rank_card_configs" ADD CONSTRAINT "user_rank_card_configs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_temp_voice_preferences" ADD CONSTRAINT "user_temp_voice_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blacklists" ADD CONSTRAINT "user_blacklists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_members" ADD CONSTRAINT "guild_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_user_blacklists" ADD CONSTRAINT "guild_user_blacklists_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_webhooks" ADD CONSTRAINT "guild_webhooks_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_badges" ADD CONSTRAINT "guild_badges_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guild_badges" ADD CONSTRAINT "guild_badges_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_configs" ADD CONSTRAINT "experience_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experience_multipliers" ADD CONSTRAINT "experience_multipliers_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_rewards" ADD CONSTRAINT "level_rewards_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_rewards" ADD CONSTRAINT "leaderboard_rewards_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "channel_configs" ADD CONSTRAINT "channel_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_configs" ADD CONSTRAINT "leaderboard_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaderboard_states" ADD CONSTRAINT "leaderboard_states_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_voice_configs" ADD CONSTRAINT "temp_voice_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_voice_permitted_roles" ADD CONSTRAINT "temp_voice_permitted_roles_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "temp_voice_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_voice_channels" ADD CONSTRAINT "temp_voice_channels_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "guild_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_voice_users" ADD CONSTRAINT "trusted_voice_users_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "temp_voice_channels"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trusted_voice_users" ADD CONSTRAINT "trusted_voice_users_trusted_member_id_fkey" FOREIGN KEY ("trusted_member_id") REFERENCES "guild_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_configs" ADD CONSTRAINT "command_configs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "command_restrictions" ADD CONSTRAINT "command_restrictions_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_guild_id_fkey" FOREIGN KEY ("guild_id") REFERENCES "guilds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
