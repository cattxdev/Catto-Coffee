/**
 * @fileoverview Tests for Experience Calculator
 * @author Catto Bot Team
 */

import { describe, it, expect } from '@jest/globals';
import { ExperienceCalculator } from '#/modules/experience/ExperienceCalculator';

describe('ExperienceCalculator', () => {
    describe('calculateLevel', () => {
        it('should return level 1 for 0 XP', () => {
            expect(ExperienceCalculator.calculateLevel(0)).toBe(1);
        });

        it('should return level 2 for 100 XP', () => {
            expect(ExperienceCalculator.calculateLevel(100)).toBe(2);
        });

        it('should return level 3 for 400 XP', () => {
            expect(ExperienceCalculator.calculateLevel(400)).toBe(3);
        });

        it('should return level 4 for 900 XP', () => {
            expect(ExperienceCalculator.calculateLevel(900)).toBe(4);
        });

        it('should return level 11 for 10000 XP', () => {
            expect(ExperienceCalculator.calculateLevel(10000)).toBe(11);
        });

        it('should return level 51 for 250000 XP', () => {
            expect(ExperienceCalculator.calculateLevel(250000)).toBe(51);
        });
    });

    describe('getXpRequiredForLevel', () => {
        it('should return 0 XP for level 1', () => {
            expect(ExperienceCalculator.getXpRequiredForLevel(1)).toBe(0);
        });

        it('should return 100 XP for level 2', () => {
            expect(ExperienceCalculator.getXpRequiredForLevel(2)).toBe(100);
        });

        it('should return 400 XP for level 3', () => {
            expect(ExperienceCalculator.getXpRequiredForLevel(3)).toBe(400);
        });

        it('should return 900 XP for level 4', () => {
            expect(ExperienceCalculator.getXpRequiredForLevel(4)).toBe(900);
        });

        it('should calculate increasing XP requirements', () => {
            const level1 = ExperienceCalculator.getXpRequiredForLevel(1);
            const level2 = ExperienceCalculator.getXpRequiredForLevel(2);
            const level3 = ExperienceCalculator.getXpRequiredForLevel(3);
            
            expect(level2).toBeGreaterThan(level1);
            expect(level3).toBeGreaterThan(level2);
        });
    });

    describe('getXpForCurrentLevel', () => {
        it('should return 0 for level 1 start', () => {
            expect(ExperienceCalculator.getXpForCurrentLevel(0)).toBe(0);
        });

        it('should return 0 for start of level 2 (100 total XP)', () => {
            expect(ExperienceCalculator.getXpForCurrentLevel(100)).toBe(0);
        });

        it('should return 50 for 50 XP into level 2', () => {
            expect(ExperienceCalculator.getXpForCurrentLevel(150)).toBe(50);
        });

        it('should return progress within current level', () => {
            const level3Start = ExperienceCalculator.getXpRequiredForLevel(3); // 400
            const progress = ExperienceCalculator.getXpForCurrentLevel(level3Start + 50);
            expect(progress).toBe(50);
        });
    });

    describe('calculateLevelProgress', () => {
        it('should return 0% at start of level', () => {
            const level2Start = ExperienceCalculator.getXpRequiredForLevel(2); // 100
            expect(ExperienceCalculator.calculateLevelProgress(level2Start)).toBe(0);
        });

        it('should return 0% at start of next level too', () => {
            const level3Start = ExperienceCalculator.getXpRequiredForLevel(3); // 400
            // When you reach exactly 400 XP, you're level 3 with 0% progress to level 4
            expect(ExperienceCalculator.calculateLevelProgress(level3Start)).toBe(0);
        });

        it('should return close to 100% just before leveling up', () => {
            const level3Start = ExperienceCalculator.getXpRequiredForLevel(3); // 400
            // 1 XP before reaching level 3
            const progress = ExperienceCalculator.calculateLevelProgress(level3Start - 1);
            expect(progress).toBeGreaterThan(95);
        });

        it('should return ~50% halfway through level', () => {
            const level2Start = ExperienceCalculator.getXpRequiredForLevel(2); // 100
            const level3Start = ExperienceCalculator.getXpRequiredForLevel(3); // 400
            const xpNeeded = level3Start - level2Start; // 300
            const halfway = level2Start + Math.floor(xpNeeded / 2); // 100 + 150 = 250
            const progress = ExperienceCalculator.calculateLevelProgress(halfway);
            
            expect(progress).toBeGreaterThanOrEqual(45);
            expect(progress).toBeLessThanOrEqual(55);
        });
    });

    describe('generateBaseXp', () => {
        it('should generate XP within range', () => {
            const min = 10;
            const max = 20;
            
            for (let i = 0; i < 100; i++) {
                const xp = ExperienceCalculator.generateBaseXp(min, max);
                expect(xp).toBeGreaterThanOrEqual(min);
                expect(xp).toBeLessThanOrEqual(max);
            }
        });

        it('should return min when min equals max', () => {
            const xp = ExperienceCalculator.generateBaseXp(15, 15);
            expect(xp).toBe(15);
        });

        it('should generate different values (randomness check)', () => {
            const values = new Set<number>();
            const min = 10;
            const max = 30;
            
            for (let i = 0; i < 50; i++) {
                values.add(ExperienceCalculator.generateBaseXp(min, max));
            }
            
            // Should have at least 5 different values in 50 generations
            expect(values.size).toBeGreaterThanOrEqual(5);
        });
    });

    describe('basisPointsToDecimal', () => {
        it('should convert 10000 bps to 2.0 (100% bonus = 200% total)', () => {
            expect(ExperienceCalculator.basisPointsToDecimal(10000)).toBe(2.0);
        });

        it('should convert 5000 bps to 1.5 (50% bonus = 150% total)', () => {
            expect(ExperienceCalculator.basisPointsToDecimal(5000)).toBe(1.5);
        });

        it('should convert 0 bps to 1.0 (no bonus)', () => {
            expect(ExperienceCalculator.basisPointsToDecimal(0)).toBe(1.0);
        });

        it('should convert 2500 bps to 1.25 (25% bonus)', () => {
            expect(ExperienceCalculator.basisPointsToDecimal(2500)).toBe(1.25);
        });

        it('should convert 100 bps to 1.01 (1% bonus)', () => {
            expect(ExperienceCalculator.basisPointsToDecimal(100)).toBe(1.01);
        });
    });

    describe('Bidirectional conversion', () => {
        it('should convert basis points to multiplier decimal', () => {
            const bps = 15000; // 150% bonus = 2.5x multiplier
            const decimal = ExperienceCalculator.basisPointsToDecimal(bps);
            expect(decimal).toBe(2.5);
        });
    });
});
