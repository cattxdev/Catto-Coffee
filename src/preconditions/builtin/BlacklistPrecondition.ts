/**
 * @fileoverview Blacklist Precondition - Checks if user/guild is blacklisted
 * @author Catto Bot Team
 */

import { Precondition, PreconditionResult, PreconditionContext } from '../Precondition';

export class BlacklistPrecondition extends Precondition {
    constructor() {
        super('Blacklist', 1); // Priority 1 (runs first)
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, client } = context;

        // First, get the user from the database
        const dbUser = await client.db.user.findUnique({
            where: { discordId: interaction.user.id },
            include: { blacklistEntry: true }
        });

        // Check global user blacklist
        if (dbUser?.blacklistEntry) {
            const globalBlacklist = dbUser.blacklistEntry;
            
            // Check if blacklist expired
            if (globalBlacklist.expiresAt && globalBlacklist.expiresAt < new Date()) {
                // Remove expired blacklist
                await client.db.userBlacklist.delete({
                    where: { id: globalBlacklist.id }
                });
            } else {
                // Active blacklist
                const reason = globalBlacklist.reason || 'No reason provided';
                const expires = globalBlacklist.expiresAt 
                    ? `\nExpires: <t:${Math.floor(globalBlacklist.expiresAt.getTime() / 1000)}:R>`
                    : '\nExpires: Never (Permanent)';

                return this.error(`You are globally blacklisted from using this bot.\nReason: ${reason}${expires}`);
            }
        }

        // Check guild-specific blacklist (if in a guild)
        if (interaction.guild) {
            // Find the guild in database
            const dbGuild = await client.db.guild.findUnique({
                where: { discordId: interaction.guild.id }
            });

            if (dbGuild) {
                const guildBlacklist = await client.db.guildUserBlacklist.findUnique({
                    where: {
                        guildId_userDiscordId: {
                            guildId: dbGuild.id,
                            userDiscordId: interaction.user.id
                        }
                    }
                });

                if (guildBlacklist) {
                    // Check if blacklist expired
                    if (guildBlacklist.expiresAt && guildBlacklist.expiresAt < new Date()) {
                        // Remove expired blacklist
                        await client.db.guildUserBlacklist.delete({
                            where: {
                                guildId_userDiscordId: {
                                    guildId: dbGuild.id,
                                    userDiscordId: interaction.user.id
                                }
                            }
                        });
                    } else {
                        // Active blacklist
                        const reason = guildBlacklist.reason || 'No reason provided';
                        const expires = guildBlacklist.expiresAt 
                            ? `\nExpires: <t:${Math.floor(guildBlacklist.expiresAt.getTime() / 1000)}:R>`
                            : '\nExpires: Never (Permanent)';

                        return this.error(`You are blacklisted from using this bot in this server.\nReason: ${reason}${expires}`);
                    }
                }
            }
        }

        return this.success();
    }
}
