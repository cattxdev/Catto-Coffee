/**
 * @fileoverview Canvas Helper Utilities
 * @author Catto Bot Team
 */

import { CanvasRenderingContext2D } from 'canvas';

/**
 * Helper utilities for canvas operations
 */
export class CanvasHelper {
    /**
     * Draw text with shadow for better readability
     */
    static drawTextWithShadow(
        ctx: CanvasRenderingContext2D,
        text: string,
        x: number,
        y: number,
        shadowColor = 'rgba(0, 0, 0, 0.5)',
        shadowBlur = 4
    ): void {
        ctx.save();
        ctx.shadowColor = shadowColor;
        ctx.shadowBlur = shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    /**
     * Draw rounded rectangle
     */
    static roundRect(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        width: number,
        height: number,
        radius: number
    ): void {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
    }

    /**
     * Truncate text to fit within a max width
     */
    static truncateText(
        ctx: CanvasRenderingContext2D,
        text: string,
        maxWidth: number,
        ellipsis = '...'
    ): string {
        let truncated = text;
        let width = ctx.measureText(truncated).width;

        while (width > maxWidth && truncated.length > 0) {
            truncated = truncated.slice(0, -1);
            width = ctx.measureText(truncated + ellipsis).width;
        }

        return truncated === text ? text : truncated + ellipsis;
    }

    /**
     * Format large numbers with commas
     */
    static formatNumber(num: number): string {
        return num.toLocaleString('en-US');
    }

    /**
     * Calculate percentage with bounds checking
     */
    static calculatePercentage(current: number, total: number): number {
        if (total <= 0) return 0;
        const percentage = current / total;
        return Math.max(0, Math.min(1, percentage));
    }
}
