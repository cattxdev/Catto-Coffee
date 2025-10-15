/**
 * @fileoverview Rank Card Image Generator
 * @author Catto Bot Team
 */

import { createCanvas, loadImage, CanvasRenderingContext2D } from 'canvas';

export interface RankCardData {
    username: string;
    discriminator: string;
    avatarUrl: string;
    level: number;
    currentLevelXp: number;
    xpNeededForNextLevel: number;
    totalXp: number;
    rank: number;
    totalUsers: number;
}

export interface LeaderboardEntry {
    rank: number;
    username: string;
    discriminator: string;
    avatarUrl: string;
    level: number;
    totalXp: number;
}

export class RankCardGenerator {
    private static readonly CARD_WIDTH = 934;
    private static readonly CARD_HEIGHT = 282;
    private static readonly LEADERBOARD_WIDTH = 800;
    private static readonly LEADERBOARD_ENTRY_HEIGHT = 100;
    private static readonly PADDING = 30;

    /**
     * Generate a rank card image
     */
    static async generateRankCard(data: RankCardData): Promise<Buffer> {
        const canvas = createCanvas(this.CARD_WIDTH, this.CARD_HEIGHT);
        const ctx = canvas.getContext('2d');

        // Background
        this.drawBackground(ctx);

        // Avatar
        await this.drawAvatar(ctx, data.avatarUrl);

        // Username
        this.drawUsername(ctx, data.username, data.discriminator);

        // Rank and Level
        this.drawRankAndLevel(ctx, data.rank, data.level, data.totalUsers);

        // Progress bar
        this.drawProgressBar(ctx, data.currentLevelXp, data.xpNeededForNextLevel);

        // XP text
        this.drawXpText(ctx, data.currentLevelXp, data.xpNeededForNextLevel, data.totalXp);

        return canvas.toBuffer('image/png');
    }

    /**
     * Generate a leaderboard image
     */
    static async generateLeaderboard(
        entries: LeaderboardEntry[],
        guildName: string,
        page: number,
        totalPages: number
    ): Promise<Buffer> {
        const height = this.PADDING * 2 + 80 + entries.length * this.LEADERBOARD_ENTRY_HEIGHT + 40;
        const canvas = createCanvas(this.LEADERBOARD_WIDTH, height);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#2C2F33';
        ctx.fillRect(0, 0, this.LEADERBOARD_WIDTH, height);

        // Header
        ctx.fillStyle = '#7289DA';
        ctx.fillRect(0, 0, this.LEADERBOARD_WIDTH, 80);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${guildName} - Leaderboard`, this.LEADERBOARD_WIDTH / 2, 50);

        // Page info
        ctx.font = '16px Arial';
        ctx.fillText(`Page ${page} of ${totalPages}`, this.LEADERBOARD_WIDTH / 2, 72);

        // Entries
        let y = 80 + this.PADDING;
        for (const entry of entries) {
            await this.drawLeaderboardEntry(ctx, entry, y);
            y += this.LEADERBOARD_ENTRY_HEIGHT;
        }

        return canvas.toBuffer('image/png');
    }

    private static drawBackground(ctx: CanvasRenderingContext2D): void {
        // Main background
        ctx.fillStyle = '#23272A';
        ctx.fillRect(0, 0, this.CARD_WIDTH, this.CARD_HEIGHT);

        // Accent bar
        ctx.fillStyle = '#7289DA';
        ctx.fillRect(0, 0, this.CARD_WIDTH, 10);
    }

    private static async drawAvatar(
        ctx: CanvasRenderingContext2D,
        avatarUrl: string
    ): Promise<void> {
        try {
            const avatar = await loadImage(avatarUrl);
            const size = 180;
            const x = this.PADDING;
            const y = (this.CARD_HEIGHT - size) / 2;

            // Draw circular avatar
            ctx.save();
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();

            ctx.drawImage(avatar, x, y, size, size);
            ctx.restore();

            // Border
            ctx.strokeStyle = '#7289DA';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.stroke();
        } catch (error) {
            console.error('Failed to load avatar:', error);
            // Draw placeholder
            const size = 180;
            const x = this.PADDING;
            const y = (this.CARD_HEIGHT - size) / 2;

            ctx.fillStyle = '#40444B';
            ctx.beginPath();
            ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    private static drawUsername(
        ctx: CanvasRenderingContext2D,
        username: string,
        discriminator: string
    ): void {
        const x = this.PADDING + 200;
        const y = 70;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 36px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(username, x, y);

        // Discriminator
        ctx.fillStyle = '#99AAB5';
        ctx.font = '24px Arial';
        const usernameWidth = ctx.measureText(username).width;
        ctx.fillText(`#${discriminator}`, x + usernameWidth + 10, y);
    }

    private static drawRankAndLevel(
        ctx: CanvasRenderingContext2D,
        rank: number,
        level: number,
        totalUsers: number
    ): void {
        const rightX = this.CARD_WIDTH - this.PADDING;
        const y = 70;

        // Level box
        ctx.fillStyle = '#7289DA';
        ctx.fillRect(rightX - 150, y - 40, 150, 50);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${level}`, rightX - 75, y - 10);

        // Rank text
        ctx.fillStyle = '#99AAB5';
        ctx.font = '20px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`RANK #${rank} / ${totalUsers}`, rightX, y + 30);
    }

    private static drawProgressBar(
        ctx: CanvasRenderingContext2D,
        currentXp: number,
        neededXp: number
    ): void {
        const x = this.PADDING + 200;
        const y = 160;
        const width = this.CARD_WIDTH - x - this.PADDING;
        const height = 30;

        const progress = neededXp > 0 ? currentXp / neededXp : 1;

        // Background
        ctx.fillStyle = '#40444B';
        ctx.roundRect(x, y, width, height, 15);
        ctx.fill();

        // Progress
        if (progress > 0) {
            const gradient = ctx.createLinearGradient(x, 0, x + width * progress, 0);
            gradient.addColorStop(0, '#7289DA');
            gradient.addColorStop(1, '#5B6EAE');

            ctx.fillStyle = gradient;
            ctx.roundRect(x, y, width * progress, height, 15);
            ctx.fill();
        }

        // Border
        ctx.strokeStyle = '#7289DA';
        ctx.lineWidth = 2;
        ctx.roundRect(x, y, width, height, 15);
        ctx.stroke();
    }

    private static drawXpText(
        ctx: CanvasRenderingContext2D,
        currentXp: number,
        neededXp: number,
        totalXp: number
    ): void {
        const x = this.PADDING + 200;
        const y = 220;

        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(
            `${currentXp.toLocaleString()} / ${neededXp.toLocaleString()} XP`,
            x,
            y
        );

        // Total XP
        ctx.fillStyle = '#99AAB5';
        ctx.font = '16px Arial';
        ctx.fillText(`Total XP: ${totalXp.toLocaleString()}`, x, y + 25);
    }

    private static async drawLeaderboardEntry(
        ctx: CanvasRenderingContext2D,
        entry: LeaderboardEntry,
        y: number
    ): Promise<void> {
        const x = this.PADDING;
        const entryHeight = this.LEADERBOARD_ENTRY_HEIGHT - 10;

        // Background
        ctx.fillStyle = entry.rank <= 3 ? '#40444B' : '#2C2F33';
        ctx.fillRect(x, y, this.LEADERBOARD_WIDTH - this.PADDING * 2, entryHeight);

        // Rank medal for top 3
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 32px Arial';
        ctx.textAlign = 'left';

        if (entry.rank === 1) {
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.fillText('🥇', x + 10, y + entryHeight / 2 + 12);
        } else if (entry.rank === 2) {
            ctx.fillStyle = '#C0C0C0'; // Silver
            ctx.fillText('🥈', x + 10, y + entryHeight / 2 + 12);
        } else if (entry.rank === 3) {
            ctx.fillStyle = '#CD7F32'; // Bronze
            ctx.fillText('🥉', x + 10, y + entryHeight / 2 + 12);
        } else {
            ctx.fillStyle = '#99AAB5';
            ctx.fillText(`#${entry.rank}`, x + 10, y + entryHeight / 2 + 12);
        }

        // Avatar
        try {
            const avatar = await loadImage(entry.avatarUrl);
            const avatarSize = 60;
            const avatarX = x + 80;
            const avatarY = y + (entryHeight - avatarSize) / 2;

            ctx.save();
            ctx.beginPath();
            ctx.arc(
                avatarX + avatarSize / 2,
                avatarY + avatarSize / 2,
                avatarSize / 2,
                0,
                Math.PI * 2
            );
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
            ctx.restore();
        } catch (error) {
            // Draw placeholder
            const avatarSize = 60;
            const avatarX = x + 80;
            const avatarY = y + (entryHeight - avatarSize) / 2;

            ctx.fillStyle = '#40444B';
            ctx.beginPath();
            ctx.arc(
                avatarX + avatarSize / 2,
                avatarY + avatarSize / 2,
                avatarSize / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // Username
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(entry.username, x + 160, y + entryHeight / 2);

        // Level and XP
        ctx.fillStyle = '#99AAB5';
        ctx.font = '18px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(
            `Level ${entry.level} • ${entry.totalXp.toLocaleString()} XP`,
            this.LEADERBOARD_WIDTH - this.PADDING - 20,
            y + entryHeight / 2 + 5
        );
    }
}
