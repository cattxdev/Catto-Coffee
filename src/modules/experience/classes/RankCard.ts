/**
 * @fileoverview Rank Card Generator - Individual user rank card
 * @author Catto Bot Team
 */

import { createCanvas, loadImage, CanvasRenderingContext2D, Image } from 'canvas';
import { ExperienceCalculator } from '../services/ExperienceCalculator';

export interface RankCardData {
    userId: string;
    username: string;
    discriminator: string;
    avatarUrl: string;
    level: number;
    totalXp: number;
    rank: number;
}

/**
 * Modern Rank Card Generator
 * Clean, minimal design with gradient progress bar
 */
export class RankCard {
    private static readonly CARD_WIDTH = 934;
    private static readonly CARD_HEIGHT = 282;
    
    // Layout positions
    private static readonly AVATAR_X = 50;
    private static readonly AVATAR_Y = 50;
    private static readonly AVATAR_SIZE = 182;
    
    private static readonly USERNAME_X = 300;
    private static readonly USERNAME_Y = 115;
    
    private static readonly LEVEL_BADGE_X = 300;
    private static readonly LEVEL_BADGE_Y = 150;
    
    private static readonly PROGRESS_BAR_X = 288;
    private static readonly PROGRESS_BAR_Y = 190;
    private static readonly PROGRESS_BAR_WIDTH = 620;
    private static readonly PROGRESS_BAR_HEIGHT = 28;
    
    private static readonly RANK_LABEL_X = 720;
    private static readonly RANK_LABEL_Y = 52;
    
    private static readonly RANK_NUMBER_X = 880;
    private static readonly RANK_NUMBER_Y = 52;
    
    private static readonly XP_TEXT_X = 880;
    private static readonly XP_TEXT_Y = 160;

    /**
     * Load avatar with error handling
     */
    private static async loadAvatar(avatarUrl: string): Promise<Image> {
        try {
            const timeoutPromise = new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Avatar load timeout')), 3000)
            );
            
            return await Promise.race([
                loadImage(avatarUrl),
                timeoutPromise
            ]);
        } catch (error) {
            // Return placeholder avatar
            return await this.createPlaceholderAvatar();
        }
    }

    /**
     * Create a simple placeholder avatar
     */
    private static async createPlaceholderAvatar(): Promise<Image> {
        const size = 256;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#7289da';
        ctx.fillRect(0, 0, size, size);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 96px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', size / 2, size / 2);
        
        return await loadImage(canvas.toBuffer('image/png'));
    }

    /**
     * Draw circular avatar
     */
    private static drawAvatar(
        ctx: CanvasRenderingContext2D,
        avatar: Image,
        x: number,
        y: number,
        size: number
    ): void {
        ctx.save();
        
        // Draw circular clip
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        
        // Draw avatar
        ctx.drawImage(avatar, x, y, size, size);
        
        ctx.restore();
    }

    /**
     * Draw gradient progress bar
     */
    private static drawProgressBar(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        progress: number
    ): void {
        const radius = height / 2;
        
        // Background track
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
        
        // Progress fill with cyan to blue gradient
        if (progress > 0) {
            const progressWidth = Math.max(height, width * Math.min(progress, 1));
            
            const gradient = ctx.createLinearGradient(x, y, x + progressWidth, y);
            gradient.addColorStop(0, '#00CED1'); // Cyan
            gradient.addColorStop(0.5, '#5B9BD5'); // Light Blue
            gradient.addColorStop(1, '#4169E1'); // Royal Blue
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.roundRect(x, y, progressWidth, height, radius);
            ctx.fill();
        }
    }

    /**
     * Generate rank card image
     */
    public static async generate(data: RankCardData): Promise<Buffer> {
        const startTime = Date.now();
        
        // Load avatar
        const avatar = await this.loadAvatar(data.avatarUrl);
        
        // Create canvas
        const canvas = createCanvas(this.CARD_WIDTH, this.CARD_HEIGHT);
        const ctx = canvas.getContext('2d');
        
        // Draw white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);
        
        // Draw avatar
        this.drawAvatar(ctx, avatar, this.AVATAR_X, this.AVATAR_Y, this.AVATAR_SIZE);
        
        // Draw username (same size as level)
        ctx.fillStyle = '#000000';
        ctx.font = '600 26px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        // Truncate username if too long
        let displayName = data.username;
        let nameWidth = ctx.measureText(displayName).width;
        const maxNameWidth = 480;
        
        while (nameWidth > maxNameWidth && displayName.length > 3) {
            displayName = displayName.slice(0, -1);
            nameWidth = ctx.measureText(displayName + '...').width;
        }
        
        if (nameWidth > maxNameWidth) {
            displayName += '...';
        }
        
        ctx.fillText(displayName, this.USERNAME_X, this.USERNAME_Y);
        
        // Draw level badge (same size as username)
        ctx.fillStyle = '#00CED1'; // Cyan color
        ctx.font = '600 26px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`Lv. ${data.level}`, this.LEVEL_BADGE_X, this.LEVEL_BADGE_Y);
        
        // Calculate progress
        const currentLevel = data.level;
        const totalXp = data.totalXp;
        const currentLevelXp = ExperienceCalculator.getXpForCurrentLevel(totalXp);
        const xpForNextLevel = ExperienceCalculator.getXpRequiredForLevel(currentLevel + 1);
        const xpRequiredForNextLevel = xpForNextLevel - ExperienceCalculator.getXpRequiredForLevel(currentLevel);
        const progress = xpRequiredForNextLevel > 0 ? currentLevelXp / xpRequiredForNextLevel : 1;
        
        // Draw XP text above progress bar (right aligned)
        ctx.fillStyle = '#000000';
        ctx.font = '600 20px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(
            `${currentLevelXp} / ${xpRequiredForNextLevel}`,
            this.XP_TEXT_X,
            this.XP_TEXT_Y
        );
        
        // Draw progress bar (after XP text so it's below)
        this.drawProgressBar(
            ctx,
            this.PROGRESS_BAR_X,
            this.PROGRESS_BAR_Y,
            this.PROGRESS_BAR_WIDTH,
            this.PROGRESS_BAR_HEIGHT,
            progress
        );
        
        // Draw RANK label (left side)
        ctx.fillStyle = '#C0C0C0';
        ctx.font = '600 36px Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText('RANK', this.RANK_LABEL_X, this.RANK_LABEL_Y);
        
        // Draw rank number (next to RANK label, same line)
        ctx.fillStyle = '#C0C0C0';
        ctx.font = '600 60px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(data.rank.toString(), this.RANK_NUMBER_X, this.RANK_NUMBER_Y);
        
        const totalTime = Date.now() - startTime;
        console.log(`Rank card generated in ${totalTime}ms`);
        
        return canvas.toBuffer('image/png');
    }
}
