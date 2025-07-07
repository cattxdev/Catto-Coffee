import { ApplyOptions } from '@sapphire/decorators';
import { ScheduledTask, ScheduledTaskOptions } from '@sapphire/plugin-scheduled-tasks';
import { Time } from '@sapphire/time-utilities';
import { TextChannel, EmbedBuilder } from 'discord.js';
import { addDays, formatISO } from 'date-fns';
import { toZonedTime, format } from 'date-fns-tz';
import { LeaderboardImageBuilder } from '../lib/classes/LeaderboardCard';
import { LeaderboardUserData } from '../shared/interfaces/LeaderboardUser';

@ApplyOptions<ScheduledTaskOptions>({ interval: Time.Hour * 3, name: 'monthlyVoiceTop10Task' })
export class MonthlyVoiceLeaderboardTask extends ScheduledTask {
	public constructor(context: ScheduledTask.LoaderContext, options: ScheduledTask.Options) {
		super(context, {
			...options
		});
	}

	public async run(): Promise<void> {
		const monthlyTop = await this.container.prisma.monthly_top.findMany();
		for (const top of monthlyTop) {
			const guildId = top.guildId;
			let nextPublishDate = await this.getNextPublishDate(guildId);
			const now = new Date();

			if (now >= nextPublishDate) {
				const guildTop10 = await this.getTop10VoiceUsers(guildId);
				const channel = await this.getChannelId(guildId);

				if (guildTop10.length && channel) {
					let fetchedChannel;
					try {
						const fetched = await this.container.client.channels.fetch(channel);
						if (!fetched?.isTextBased()) {
							this.container.logger.warn(`Channel ${channel} for guild ${guildId} is not a text-based channel or no longer exists.`);
							continue;
						}
						fetchedChannel = fetched as TextChannel;
					} catch (error) {
						this.container.logger.error(`Failed to fetch channel ${channel} for guild ${guildId}: ${error}`);
						continue;
					}

					const buffer = await this.generateMonthlyVoiceLeaderboard(guildTop10);

					if (top.lastMonthlyMessageId) {
						try {
							const previousMessage = await fetchedChannel.messages.fetch(top.lastMonthlyMessageId);
							await previousMessage.delete();
						} catch (error) {
							this.container.logger.error('Error deleting previous monthly leaderboard message:', error);
						}
					}

					const timeZone = 'America/New_York';
					const zonedDate = toZonedTime(nextPublishDate, timeZone);
					const nextResetTime = format(zonedDate, 'HH:mm zzz', { timeZone });

					const embed = new EmbedBuilder()
						.setAuthor({
							name: 'Monthly Voice Leaderboard',
							iconURL: 'https://res.cloudinary.com/dp5dbsd8w/image/upload/v1717049320/badges/hveiskr7ec2oxpvfrzko.png'
						})
						.setFooter({
							text: `Resets every month at: ${nextResetTime}`,
							iconURL: 'https://res.cloudinary.com/dp5dbsd8w/image/upload/v1717049320/badges/djrnims3eavniivxbqjs.webp'
						})
						.setImage('attachment://leaderboard.png');

					try {
						const newMessage = await fetchedChannel.send({ embeds: [embed], files: [{ attachment: buffer, name: 'leaderboard.png' }] });
						await this.updatemonthlyTopMessageId(guildId, newMessage.id);
						await this.deletemonthlyVoiceExperience(guildId);
					} catch (error) {
						this.container.logger.error('Error sending monthly leaderboard message:', error);
					}
				}

				const newNextDate = addDays(now, 30);
				await this.updateNextPublishDate(guildId, newNextDate);
			}
		}
	}


	private async getTop10VoiceUsers(guildId: string) {
		const top = await this.container.prisma.voice_experience.findMany({
			where: { guildId },
			take: 10,
			orderBy: { monthlyTimeInVoiceChannel: 'desc' }
		});
		return top;
	}

	private async deletemonthlyVoiceExperience(guildId: string) {
		await this.container.prisma.voice_experience.updateMany({
			where: { guildId },
			data: { dailyTimeInVoiceChannel: 0 }
		});
	}

	private async getChannelId(guildId: string) {
		const channel = await this.container.prisma.leaderboard_channels.findUnique({
			where: { guildId }
		});
		return channel?.monthlyVoiceTop10channelId;
	}

	private async getNextPublishDate(guildId: string): Promise<Date> {
		let nextDateString = await this.container.redis.get(`monthly:publish:${guildId}`);
		if (!nextDateString) {
			const monthlyTop = await this.container.prisma.monthly_top.findUnique({
				where: { guildId }
			});

			if (!monthlyTop) {
				throw new Error(`monthlyTop record not found for guildId: ${guildId}`);
			}

			const baseDate = monthlyTop.updatedAt!;
			const nextDate = addDays(baseDate, 30);

			await this.updateNextPublishDate(guildId, nextDate);

			return nextDate;
		}

		return new Date(nextDateString);
	}

	private async updateNextPublishDate(guildId: string, nextDate: Date): Promise<void> {
		await this.container.redis.set(`monthly:publish:${guildId}`, formatISO(nextDate));
	}

	private async updatemonthlyTopMessageId(guildId: string, messageId: string): Promise<void> {
		await this.container.prisma.monthly_top.update({
			where: { guildId },
			data: { lastMonthlyMessageId: messageId }
		});
	}

	private async generateMonthlyVoiceLeaderboard(guildTop10: LeaderboardUserData[]) {
		const bg = '../../../assets/img/Catto_VC_Monthly.png';
		const leaderboard = new LeaderboardImageBuilder().setGuildLeaderboard(guildTop10).setBackground(bg).setShowMonthlyTimeInVoiceChannel(true);
		const lb = await leaderboard.build();
		return lb as Buffer;
	}
}
