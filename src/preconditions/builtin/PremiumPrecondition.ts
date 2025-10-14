/**
 * @fileoverview Premium Precondition - Checks if guild has premium
 * @author Catto Bot Team
 */

import { Precondition, PreconditionResult, PreconditionContext } from '../Precondition';

export class PremiumPrecondition extends Precondition {
    constructor() {
        super('Premium', 8);
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, client } = context;

        // Skip if not in a guild
        if (!interaction.guild) {
            return this.success();
        }

        // Get guild from database
        const dbGuild = await client.db.guild.findUnique({
            where: { discordId: interaction.guild.id }
        });

        // If guild not in database or not premium
        if (!dbGuild || !dbGuild.isPremium) {
            return this.error('This command requires premium! Upgrade your server at https://example.com/premium');
        }

        // Check if premium expired
        if (dbGuild.premiumExpiresAt && dbGuild.premiumExpiresAt < new Date()) {
            // Premium expired, update database
            await client.db.guild.update({
                where: { id: dbGuild.id },
                data: { isPremium: false, premiumExpiresAt: null }
            });

            return this.error('Your premium subscription has expired! Renew at https://example.com/premium');
        }

        return this.success();
    }
}
