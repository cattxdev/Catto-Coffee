/**
 * @fileoverview Experience Calculation Utilities
 * @author Catto Bot Team
 */

/**
 * Pure calculation utilities for experience and levels
 * No external dependencies, easy to test
 */
export class ExperienceCalculator {
    /**
     * Calculate level from total XP
     * Formula: level = floor(sqrt(totalXp / 100)) + 1
     * 
     * @param totalXp - Total accumulated experience points
     * @returns The calculated level
     * 
     * @example
     * calculateLevel(0) // 1
     * calculateLevel(100) // 2
     * calculateLevel(400) // 3
     * calculateLevel(900) // 4
     */
    static calculateLevel(totalXp: number): number {
        if (totalXp < 0) return 1;
        return Math.floor(Math.sqrt(totalXp / 100)) + 1;
    }

    /**
     * Calculate XP required for a specific level
     * Formula: xp = (level - 1)^2 * 100
     * 
     * @param level - Target level
     * @returns Total XP needed to reach that level
     * 
     * @example
     * getXpRequiredForLevel(1) // 0
     * getXpRequiredForLevel(2) // 100
     * getXpRequiredForLevel(3) // 400
     * getXpRequiredForLevel(4) // 900
     */
    static getXpRequiredForLevel(level: number): number {
        if (level < 1) return 0;
        return Math.pow(level - 1, 2) * 100;
    }

    /**
     * Get XP progress in current level
     * 
     * @param totalXp - Total accumulated experience points
     * @returns XP earned in current level (not total)
     */
    static getXpForCurrentLevel(totalXp: number): number {
        const currentLevel = this.calculateLevel(totalXp);
        const xpForCurrentLevel = this.getXpRequiredForLevel(currentLevel);
        return totalXp - xpForCurrentLevel;
    }

    /**
     * Calculate XP needed for next level
     * 
     * @param totalXp - Total accumulated experience points
     * @returns XP needed to level up
     */
    static getXpForNextLevel(totalXp: number): number {
        const currentLevel = this.calculateLevel(totalXp);
        const xpForNextLevel = this.getXpRequiredForLevel(currentLevel + 1);
        return xpForNextLevel - totalXp;
    }

    /**
     * Calculate level progress percentage
     * 
     * @param totalXp - Total accumulated experience points
     * @returns Progress percentage (0-100)
     */
    static calculateLevelProgress(totalXp: number): number {
        const currentLevel = this.calculateLevel(totalXp);
        const xpForCurrentLevel = this.getXpRequiredForLevel(currentLevel);
        const xpForNextLevel = this.getXpRequiredForLevel(currentLevel + 1);
        
        const xpInCurrentLevel = totalXp - xpForCurrentLevel;
        const xpNeededInLevel = xpForNextLevel - xpForCurrentLevel;
        
        const progress = (xpInCurrentLevel / xpNeededInLevel) * 100;
        return Math.min(100, Math.max(0, progress));
    }

    /**
     * Generate random base XP within range
     * 
     * @param minXp - Minimum XP to award
     * @param maxXp - Maximum XP to award
     * @returns Random XP value between min and max (inclusive)
     */
    static generateBaseXp(minXp: number, maxXp: number): number {
        return Math.floor(Math.random() * (maxXp - minXp + 1)) + minXp;
    }

    /**
     * Apply multipliers to base XP
     * 
     * @param baseXp - Base experience points
     * @param multiplierBps - Array of multiplier values in basis points (10000 = 100%)
     * @returns Final XP after applying all multipliers
     * 
     * @example
     * applyMultipliers(100, [5000, 2500]) // 100 * 1.5 * 1.25 = 187
     */
    static applyMultipliers(baseXp: number, multiplierBps: number[]): number {
        let totalMultiplier = 1.0;
        
        for (const bps of multiplierBps) {
            const decimal = bps / 10000; // Convert basis points to decimal
            totalMultiplier *= (1 + decimal);
        }
        
        return Math.floor(baseXp * totalMultiplier);
    }

    /**
     * Convert basis points to multiplier decimal
     * 
     * @param basisPoints - Multiplier in basis points (10000 = 100%)
     * @returns Multiplier as decimal (e.g., 1.5 for 150%)
     * 
     * @example
     * basisPointsToDecimal(5000) // 1.5 (50% bonus)
     * basisPointsToDecimal(10000) // 2.0 (100% bonus)
     */
    static basisPointsToDecimal(basisPoints: number): number {
        return 1 + (basisPoints / 10000);
    }

    /**
     * Format XP with commas for display
     * 
     * @param xp - Experience points to format
     * @returns Formatted string
     * 
     * @example
     * formatXp(1234567) // "1,234,567"
     */
    static formatXp(xp: number): string {
        return xp.toLocaleString('en-US');
    }

    /**
     * Format level with ordinal suffix
     * 
     * @param level - Level number
     * @returns Formatted string with ordinal
     * 
     * @example
     * formatLevel(1) // "1st"
     * formatLevel(22) // "22nd"
     * formatLevel(103) // "103rd"
     */
    static formatLevel(level: number): string {
        const j = level % 10;
        const k = level % 100;
        
        if (j === 1 && k !== 11) return `${level}st`;
        if (j === 2 && k !== 12) return `${level}nd`;
        if (j === 3 && k !== 13) return `${level}rd`;
        return `${level}th`;
    }
}
