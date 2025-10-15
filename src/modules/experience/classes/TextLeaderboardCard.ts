/**
 * @fileoverview Text Experience Leaderboard Card Generator
 * @author Catto Bot Team
 */

import { createCanvas, loadImage, CanvasRenderingContext2D, Image } from 'canvas';
import { ExperienceCalculator } from '../services/ExperienceCalculator';

export interface TextLeaderboardEntry {
    userId: string;
    username: string;
    discriminator: string;
    avatarUrl: string;
    level: number;
    totalXp: number;
    rank: number;
}

export interface TextLeaderboardCardOptions {
    entries: TextLeaderboardEntry[];
    requestingUser?: TextLeaderboardEntry;
    guildName: string;
}

/**
 * Highly Optimized Text Leaderboard Card Generator
 * - Parallel avatar loading with timeout
 * - Minimal shadow/gradient operations
 * - Cached gradient objects
 * - Reduced redundant drawing operations
 * Target: <1 second generation time
 */
export class TextLeaderboardCard {
    // Positions based on dynamic canvas sizing
    private static readonly CANVAS_WIDTH = 1024;
    
    // Top 10 leaderboard rows
    private static readonly FIRST_ROW_Y = 160;
    private static readonly ROW_HEIGHT = 135;
    private static readonly ROW_SPACING = 12;
    
    // Column positions
    private static readonly RANK_X = 100;
    private static readonly AVATAR_X = 165;
    private static readonly AVATAR_SIZE = 75;
    private static readonly USERNAME_X = 260;
    private static readonly XP_X = 720;
    
    // Progress bar
    private static readonly PROGRESS_BAR_X = 260;
    private static readonly PROGRESS_BAR_WIDTH = 500;

    // Cache for placeholder avatar
    private static cachedPlaceholder: Image | null = null;

    /**
     * Load multiple avatars in parallel with timeout and error handling
     */
    private static async loadAvatars(entries: TextLeaderboardEntry[]): Promise<Map<string, Image>> {
        const avatarMap = new Map<string, Image>();
        
        // Pre-create placeholder once for all failed loads
        if (!this.cachedPlaceholder) {
            this.cachedPlaceholder = await this.createPlaceholderAvatar();
        }
        
        const avatarPromises = entries.map(async (entry) => {
            try {
                // Add timeout to prevent hanging
                const timeoutPromise = new Promise<never>((_, reject) => 
                    setTimeout(() => reject(new Error('Avatar load timeout')), 3000)
                );
                
                const avatar = await Promise.race([
                    loadImage(entry.avatarUrl),
                    timeoutPromise
                ]);
                
                avatarMap.set(entry.userId, avatar);
            } catch (error) {
                // Use cached placeholder instead of creating new one
                avatarMap.set(entry.userId, this.cachedPlaceholder!);
            }
        });

        await Promise.all(avatarPromises);
        return avatarMap;
    }

    /**
     * Create a simple placeholder avatar (cached)
     */
    private static async createPlaceholderAvatar(): Promise<Image> {
        const size = 128;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');
        
        ctx.fillStyle = '#5865F2';
        ctx.fillRect(0, 0, size, size);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', size / 2, size / 2);
        
        return await loadImage(canvas.toBuffer('image/png'));
    }

    /**
     * Draw a circular avatar with optimized border (minimal shadow operations)
     */
    private static drawAvatar(
        ctx: CanvasRenderingContext2D,
        avatar: Image,
        x: number,
        y: number,
        size: number,
        rank: number
    ): void {
        // Clip to circle and draw avatar
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, x, y, size, size);
        ctx.restore();
        
        // Draw colored border based on rank
        let borderColor;
        if (rank === 1) {
            borderColor = '#374151'; // Dark Gray
        } else if (rank === 2) {
            borderColor = '#424549'; // Discord Dark Gray
        } else if (rank === 3) {
            borderColor = '#36393e'; // Discord Darker Gray
        } else {
            borderColor = '#282b30'; // Discord Darkest
        }
        
        ctx.strokeStyle = borderColor;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
        ctx.stroke();
    }

    /**
     * Draw rank badge with optimized gradient (reduced shadow operations)
     */
    private static drawRank(
        ctx: CanvasRenderingContext2D,
        rank: number,
        x: number,
        y: number
    ): void {
        const radius = 26;
        
        // Colored badges based on rank
        let fillColor;
        if (rank === 1) {
            fillColor = '#374151'; // Dark Gray
        } else if (rank === 2) {
            fillColor = '#424549'; // Discord Dark Gray
        } else if (rank === 3) {
            fillColor = '#36393e'; // Discord Darker Gray
        } else {
            fillColor = '#282b30'; // Discord Darkest
        }
        
        // Draw circle
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw rank number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${rank}`, x, y);
    }

    /**
     * Draw elegant progress bar with soft gradients
     */
    private static drawProgressBar(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        progress: number,
        rank: number
    ): void {
        const radius = height / 2;
        
        // Draw background track (simple fill, no gradient)
        ctx.fillStyle = '#E9ECEF';
        ctx.beginPath();
        ctx.roundRect(x, y, width, height, radius);
        ctx.fill();
        
        // Progress fill with colors matching rank
        if (progress > 0) {
            const progressWidth = Math.max(height, width * Math.min(progress, 1));
            
            // Colored progress bars based on rank
            let fillColor;
            if (rank === 1) {
                fillColor = '#374151'; // Dark Gray
            } else if (rank === 2) {
                fillColor = '#424549'; // Discord Dark Gray
            } else if (rank === 3) {
                fillColor = '#36393e'; // Discord Darker Gray
            } else {
                fillColor = '#282b30'; // Discord Darkest
            }
            
            ctx.fillStyle = fillColor;
            ctx.beginPath();
            ctx.roundRect(x, y, progressWidth, height, radius);
            ctx.fill();
        }
    }

    /**
     * Draw a leaderboard entry with elegant card design
     */
    private static drawEntry(
        ctx: CanvasRenderingContext2D,
        entry: TextLeaderboardEntry,
        avatarMap: Map<string, Image>,
        y: number,
        isHighlighted = false
    ): void {
        const cardX = 50;
        const cardWidth = this.CANVAS_WIDTH - 100;
        const cardHeight = this.ROW_HEIGHT;
        
        // White background for all cards with subtle gradient for top 3
        if (isHighlighted) {
            const gradient = ctx.createLinearGradient(cardX, y, cardX + cardWidth, y);
            gradient.addColorStop(0, '#FFFEF9');
            gradient.addColorStop(0.5, '#FFFBEB');
            gradient.addColorStop(1, '#FFFEF9');
            ctx.fillStyle = gradient;
        } else if (entry.rank === 1) {
            // Dark gray gradient for 1st place
            const gradient = ctx.createLinearGradient(cardX, y, cardX + cardWidth, y);
            gradient.addColorStop(0, '#F5F5F6');
            gradient.addColorStop(0.5, '#EEEFF0');
            gradient.addColorStop(1, '#F5F5F6');
            ctx.fillStyle = gradient;
        } else if (entry.rank === 2) {
            // Dark gray gradient for 2nd place
            const gradient = ctx.createLinearGradient(cardX, y, cardX + cardWidth, y);
            gradient.addColorStop(0, '#F5F5F6');
            gradient.addColorStop(0.5, '#EDEDEE');
            gradient.addColorStop(1, '#F5F5F6');
            ctx.fillStyle = gradient;
        } else if (entry.rank === 3) {
            // Darker gray gradient for 3rd place
            const gradient = ctx.createLinearGradient(cardX, y, cardX + cardWidth, y);
            gradient.addColorStop(0, '#F3F3F4');
            gradient.addColorStop(0.5, '#EAEAEC');
            gradient.addColorStop(1, '#F3F3F4');
            ctx.fillStyle = gradient;
        } else {
            ctx.fillStyle = '#FFFFFF'; // Pure white for others
        }
        
        // Rounded rectangle
        ctx.beginPath();
        ctx.roundRect(cardX, y, cardWidth, cardHeight, 16);
        ctx.fill();
        
        // Colored border matching rank
        if (isHighlighted) {
            ctx.strokeStyle = '#374151'; // Dark Gray
            ctx.lineWidth = 2;
        } else if (entry.rank === 1) {
            ctx.strokeStyle = 'rgba(55, 65, 81, 0.4)'; // Dark Gray
            ctx.lineWidth = 1.5;
        } else if (entry.rank === 2) {
            ctx.strokeStyle = 'rgba(66, 69, 73, 0.4)'; // Discord Dark Gray
            ctx.lineWidth = 1.5;
        } else if (entry.rank === 3) {
            ctx.strokeStyle = 'rgba(54, 57, 62, 0.4)'; // Discord Darker Gray
            ctx.lineWidth = 1.5;
        } else {
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)'; // Light gray
            ctx.lineWidth = 1;
        }
        ctx.beginPath();
        ctx.roundRect(cardX, y, cardWidth, cardHeight, 16);
        ctx.stroke();
        
        // Draw rank badge
        this.drawRank(ctx, entry.rank, this.RANK_X, y + cardHeight / 2);
        
        // Draw avatar
        const avatar = avatarMap.get(entry.userId);
        if (avatar) {
            this.drawAvatar(ctx, avatar, this.AVATAR_X, y + (cardHeight - this.AVATAR_SIZE) / 2, this.AVATAR_SIZE, entry.rank);
        }
        
        // Draw username with color palette
        if (entry.rank <= 3) {
            // Distinct colors for top 3
            if (entry.rank === 1) {
                ctx.fillStyle = '#374151'; // Dark Gray
            } else if (entry.rank === 2) {
                ctx.fillStyle = '#424549'; // Discord Dark Gray
            } else {
                ctx.fillStyle = '#36393e'; // Discord Darker Gray
            }
        } else {
            ctx.fillStyle = '#282b30'; // Discord Darkest
        }
        
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        
        const maxUsernameWidth = 300;
        let displayName = entry.username;
        let nameWidth = ctx.measureText(displayName).width;
        
        while (nameWidth > maxUsernameWidth && displayName.length > 3) {
            displayName = displayName.slice(0, -1);
            nameWidth = ctx.measureText(displayName + '...').width;
        }
        
        if (nameWidth > maxUsernameWidth) {
            displayName += '...';
        }
        
        ctx.fillText(displayName, this.USERNAME_X, y + 22);
        
        // Draw elegant level badge with soft gradient
        const levelBadgeX = this.USERNAME_X;
        const levelBadgeY = y + 56;
        
        // Elegant gray gradient background
        const levelGradient = ctx.createLinearGradient(levelBadgeX, levelBadgeY, levelBadgeX + 105, levelBadgeY + 32);
        levelGradient.addColorStop(0, '#E5E7EB');
        levelGradient.addColorStop(1, '#D1D5DB');
        ctx.fillStyle = levelGradient;
        ctx.beginPath();
        ctx.roundRect(levelBadgeX, levelBadgeY, 105, 32, 16);
        ctx.fill();
        
        // Text with dark gray color
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`LEVEL ${entry.level}`, levelBadgeX + 52.5, levelBadgeY + 16);
        
        ctx.restore();
        
        // XP number with dark gray color
        ctx.fillStyle = '#374151';
        ctx.font = 'bold 34px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(`${entry.totalXp.toLocaleString()}`, this.XP_X + 160, y + 24);
        
        // Draw XP label
        ctx.fillStyle = '#9CA3AF';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText('EXPERIENCE', this.XP_X + 160, y + 63);
        
        // Draw progress bar
        const xpForCurrentLevel = ExperienceCalculator.getXpForCurrentLevel(entry.totalXp);
        const currentLevel = ExperienceCalculator.calculateLevel(entry.totalXp);
        const xpRequiredForNextLevel = ExperienceCalculator.getXpRequiredForLevel(currentLevel + 1) - ExperienceCalculator.getXpRequiredForLevel(currentLevel);
        const progress = xpRequiredForNextLevel > 0 ? xpForCurrentLevel / xpRequiredForNextLevel : 1;
        
        const progressBarY = y + 94;
        this.drawProgressBar(
            ctx,
            this.PROGRESS_BAR_X,
            progressBarY,
            this.PROGRESS_BAR_WIDTH,
            12,
            progress,
            entry.rank
        );
        
        // Draw progress percentage with elegant gray
        ctx.fillStyle = '#6B7280';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.floor(progress * 100)}%`, this.PROGRESS_BAR_X + this.PROGRESS_BAR_WIDTH + 12, progressBarY + 6);
    }

    /**
     * Calculate dynamic canvas height based on number of entries
     */
    private static calculateCanvasHeight(entryCount: number, hasRequestingUser: boolean): number {
        // Header height (top section with title)
        const headerHeight = 140;
        
        // Calculate height for entries
        const entriesHeight = entryCount * (this.ROW_HEIGHT + this.ROW_SPACING);
        
        // Bottom padding
        const bottomPadding = 60;
        
        // Requesting user section (if needed)
        const requestingUserHeight = hasRequestingUser ? this.ROW_HEIGHT + 60 : 0;
        
        return headerHeight + entriesHeight + bottomPadding + requestingUserHeight;
    }

    /**
     * Generate the leaderboard card
     */
    static async generate(options: TextLeaderboardCardOptions): Promise<Buffer> {
        const startTime = Date.now();
        
        // Limit to top 10
        const top10 = options.entries.slice(0, 10);
        
        // Check if requesting user is in top 10
        const isRequestingUserInTop10 = options.requestingUser 
            ? top10.some(e => e.userId === options.requestingUser!.userId)
            : false;
        
        // Calculate dynamic canvas height
        const hasRequestingUserSection = !!(options.requestingUser && !isRequestingUserInTop10);
        const canvasHeight = this.calculateCanvasHeight(top10.length, hasRequestingUserSection);
        
        // Load avatars (no need for background image anymore)
        const avatarMap = await this.loadAvatars(
            options.requestingUser 
                ? [...top10, options.requestingUser]
                : top10
        );
        
        const loadTime = Date.now() - startTime;
        console.log(`Assets loaded in ${loadTime}ms`);
        
        // Create canvas with dynamic height
        const canvas = createCanvas(this.CANVAS_WIDTH, canvasHeight);
        const ctx = canvas.getContext('2d');
        
        // Draw elegant light gray background
        const gradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
        gradient.addColorStop(0, '#F9FAFB');
        gradient.addColorStop(0.5, '#F3F4F6');
        gradient.addColorStop(1, '#E5E7EB');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.CANVAS_WIDTH, canvasHeight);
        
        // Add ultra-subtle decorative pattern
        this.drawDecorativePattern(ctx, canvasHeight);
        
        // Draw beautiful header
        this.drawHeader(ctx, options.guildName);
        
        // Draw top entries
        let currentY = this.FIRST_ROW_Y;
        for (const entry of top10) {
            this.drawEntry(ctx, entry, avatarMap, currentY);
            currentY += this.ROW_HEIGHT + this.ROW_SPACING;
        }
        
        // Draw requesting user in bottom section (if not in top 10)
        if (hasRequestingUserSection) {
            // Draw separator line with gradient
            const separatorY = currentY + 20;
            const separatorGradient = ctx.createLinearGradient(40, 0, this.CANVAS_WIDTH - 40, 0);
            separatorGradient.addColorStop(0, 'rgba(108, 117, 125, 0.1)');
            separatorGradient.addColorStop(0.5, 'rgba(108, 117, 125, 0.3)');
            separatorGradient.addColorStop(1, 'rgba(108, 117, 125, 0.1)');
            ctx.strokeStyle = separatorGradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(40, separatorY);
            ctx.lineTo(this.CANVAS_WIDTH - 40, separatorY);
            ctx.stroke();
            
            // Add "Your Rank" label
            ctx.fillStyle = '#6C757D';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('YOUR RANK', this.CANVAS_WIDTH / 2, separatorY - 8);
            
            // Draw requesting user with highlight
            const requestingUserY = separatorY + 30;
            this.drawEntry(ctx, options.requestingUser!, avatarMap, requestingUserY, true);
        }
        
        const totalTime = Date.now() - startTime;
        console.log(`Leaderboard card generated in ${totalTime}ms`);
        
        return canvas.toBuffer('image/png');
    }
    
    /**
     * Draw decorative pattern overlay
     */
    private static drawDecorativePattern(ctx: CanvasRenderingContext2D, height: number): void {
        ctx.save();
        ctx.globalAlpha = 0.03;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        
        // Draw diagonal lines pattern
        for (let i = -height; i < this.CANVAS_WIDTH + height; i += 30) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i + height, height);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    /**
     * Draw the header section
     */
    private static drawHeader(ctx: CanvasRenderingContext2D, _guildName: string): void {
        // Draw elegant dark gray header
        const headerGradient = ctx.createLinearGradient(0, 0, 0, 140);
        headerGradient.addColorStop(0, '#374151');
        headerGradient.addColorStop(1, '#1F2937');
        ctx.fillStyle = headerGradient;
        
        // Simple rounded top
        ctx.beginPath();
        ctx.moveTo(0, 20);
        ctx.arcTo(0, 0, 20, 0, 0);
        ctx.lineTo(this.CANVAS_WIDTH - 20, 0);
        ctx.arcTo(this.CANVAS_WIDTH, 0, this.CANVAS_WIDTH, 20, 0);
        ctx.lineTo(this.CANVAS_WIDTH, 140);
        ctx.lineTo(0, 140);
        ctx.closePath();
        ctx.fill();
        
        // Draw trophy icon with white color
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🏆', this.CANVAS_WIDTH / 2, 48);
        
        // Draw title with white text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 38px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('LEADERBOARD', this.CANVAS_WIDTH / 2, 100);
        
        // Draw subtitle with light gray
        ctx.fillStyle = 'rgba(229, 231, 235, 0.9)';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Text Experience Rankings', this.CANVAS_WIDTH / 2, 123);
    }
}
