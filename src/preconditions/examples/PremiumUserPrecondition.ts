/**
 * @fileoverview Example Custom Precondition - Premium User Check
 * @author Catto Bot Team
 * 
 * This is an example of how to create your own custom precondition.
 * You can create preconditions for anything:
 * - Premium/VIP status
 * - Level requirements
 * - Specific role checks
 * - Custom rate limits
 * - Beta feature access
 * - Etc.
 */

import { Precondition, PreconditionContext, PreconditionResult } from '../Precondition';

/**
 * Example: Check if user has premium status
 * This is a template - replace with your own logic
 */
export class PremiumUserPrecondition extends Precondition {
    constructor() {
        super('PremiumUser', 12); // Position determines when it runs (lower = earlier)
    }

    async check(context: PreconditionContext): Promise<PreconditionResult> {
        const { interaction, commandName } = context;
        const command = context.client.commands.get(commandName);

        // Only check if command requires premium
        // Add 'premiumOnly?: boolean' to the Command interface in types/index.ts
        if (!command || !(command as any).premiumOnly) {
            return this.success();
        }

        // TODO: Replace this with your actual premium check
        // Examples:
        // - Check database for premium status
        // - Check for specific role
        // - Check external API
        // - Check subscription service
        
        const isPremium = await this.checkIfUserIsPremium(interaction.user.id);

        if (!isPremium) {
            return this.error(
                '💎 This command requires a premium subscription!\n' +
                'Upgrade at: https://your-website.com/premium'
            );
        }

        return this.success();
    }

    /**
     * Example premium check - replace with your own logic
     */
    private async checkIfUserIsPremium(_userId: string): Promise<boolean> {
        // TODO: Implement your premium check here
        // Examples:
        
        // 1. Database check:
        // const user = await database.users.findOne({ id: userId });
        // return user?.premium === true;
        
        // 2. Role check in a specific guild:
        // const guild = await client.guilds.fetch('YOUR_SUPPORT_SERVER_ID');
        // const member = await guild.members.fetch(userId);
        // return member.roles.cache.has('PREMIUM_ROLE_ID');
        
        // 3. External API:
        // const response = await fetch(`https://api.yoursite.com/premium/${userId}`);
        // const data = await response.json();
        // return data.isPremium;
        
        // For now, return false (no one is premium)
        return false;
    }
}

// To use this precondition:
// 1. Import it in src/preconditions/PreconditionManager.ts
// 2. Add it to the builtInPreconditions array
// 3. Or register it manually: client.preconditionManager.registerPrecondition(new PremiumUserPrecondition())
