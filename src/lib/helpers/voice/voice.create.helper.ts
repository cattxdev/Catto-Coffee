import { Guild, CategoryChannel, VoiceState, ChannelType, PermissionFlagsBits, OverwriteResolvable, VoiceChannel } from 'discord.js';
import { container } from '@sapphire/pieces';
import { ChannelConfig } from '../../../shared/interfaces/ChannelConfig';
import { Time } from '@sapphire/time-utilities';
import { Helper } from '../helper';

export class VoiceCreateHelper extends Helper {
	public async initChannel(newState: VoiceState, oldState: VoiceState): Promise<void> {
		if (!newState.guild) return;
		try {
			const channels = await this.getChannel(newState.guild.id);
			for (const channel of channels) {
				await this.attemptChannelCreation(channel, newState, oldState);
			}
		} catch (error) {
			container.console.error(`Error in initializing channels: ${error}`, { guildId: newState.guild.id });
		}
	}

	private async attemptChannelCreation(channelConfig: ChannelConfig, newState: VoiceState, oldState: VoiceState): Promise<void> {
		const { channel_id, parent_id } = channelConfig;
		const parent = newState.guild.channels.resolve(parent_id) as CategoryChannel;
		if (!parent) return;

		if (this.shouldCreateChannel(oldState, newState, channel_id)) {
			await this.createChannel(newState.guild, parent, newState.member!.id, newState, channel_id);
		}
	}

	private async createChannel(guild: Guild, parent: CategoryChannel, user_id: string, newState: VoiceState, channelId: string): Promise<void> {
		const user_cooldown = await this.getUserCooldown(user_id);
		if (user_cooldown && user_cooldown > Date.now()) return;
		await this.setUserCooldown(user_id);

		const channel_details = await this.setChannelDetails(user_id, parent, newState, guild.id, channelId);
		if (!channel_details) return;

		const permittedRoles = await this.getPermittedRoles(guild.id, channelId);
		const permissions = this.setChannelPermissions(parent, user_id, permittedRoles);

		const channel = await this.buildChannel(guild, channel_details.name, channel_details.userLimit, parent, permissions);

		if (!channel) return;
		const currentChannelId = newState.member?.voice.channelId;

		if (currentChannelId !== channelId) {
			container.console.warn(`User ${user_id} left or moved from the trigger channel before move could happen. Skipping channel move.`, {
				userId: user_id,
				expectedChannelId: channelId,
				currentChannelId
			});
			return;
		}

		try {
			await newState.setChannel(channel);
		} catch (error) {
			container.console.error(`Error while creating the channel for user ${user_id}: ${error}`, { userId: user_id });
			throw new Error(`Failed to create channel: ${error}`);
		}

		await this.storeChannelInDatabase(guild.id, channel.id, parent.id, user_id);
	}

	private async setChannelDetails(
		user_id: string,
		parent: CategoryChannel,
		newState: VoiceState,
		guildId: string,
		channelId: string
	): Promise<{ name: string; userLimit: number; permissions: OverwriteResolvable[] } | null> {
		try {
			const shouldUseUserSettings = await this.shouldUseUserSettings(guildId, channelId);
			let channelInfo;

			if (shouldUseUserSettings) {
				channelInfo = await this.getUserChannelInfo(user_id);
				if (!channelInfo || !channelInfo.channelName) {
					channelInfo = await this.retrieveDefaultChannelSettings(guildId, channelId, newState);
				}
			} else {
				channelInfo = await this.retrieveDefaultChannelSettings(guildId, channelId, newState);
			}

			return {
				name: channelInfo?.channelName || `${newState.member?.displayName || 'User'}'s Channel`,
				userLimit: channelInfo?.channelLimit || 0,
				permissions: this.setChannelPermissions(parent, user_id, [])
			};
		} catch (error) {
			container.console.error(`Error fetching channel info for user ${user_id}: ${error}`, { userId: user_id });
			return null;
		}
	}

	private async shouldUseUserSettings(guildId: string, channelId: string): Promise<boolean> {
		try {
			const defaultSettings = await container.prisma.i_voice_temp_channels.findUnique({
				where: {
					guildId_channelId: {
						channelId: channelId,
						guildId: guildId
					}
				}
			});

			return defaultSettings?.editables ?? false;
		} catch (error) {
			container.console.error(`Error fetching settings for channel ${channelId} in guild ${guildId}: ${error}`);
			return false;
		}
	}

	private async getUserChannelInfo(userId: string): Promise<{ channelName: string; channelLimit: number } | null> {
		try {
			const userSettings = await container.prisma.i_users_temp_voice.findUnique({
				where: { userId }
			});

			return userSettings
				? {
					channelName: userSettings.channelName || '',
					channelLimit: userSettings.channelLimit || 0
				}
				: null;
		} catch (error) {
			container.console.error(`Error fetching user channel info for user ${userId}: ${error}`, { userId });
			return null;
		}
	}

	private async retrieveDefaultChannelSettings(
		guildId: string,
		channelId: string,
		newState: VoiceState
	): Promise<{ channelName: string; channelLimit: number } | null> {
		try {
			const defaultSettings = await container.prisma.i_voice_temp_channels.findUnique({
				where: {
					guildId_channelId: {
						channelId,
						guildId
					}
				}
			});

			const channelName = defaultSettings?.channelName?.replace('{user}', newState.member?.displayName || '') || '';

			return {
				channelName,
				channelLimit: defaultSettings?.channelLimit || 0
			};
		} catch (error) {
			container.console.error(`Error fetching default settings for channel ${channelId}: ${error}`);
			return null;
		}
	}

	private async getPermittedRoles(guildId: string, channelId: string): Promise<string[]> {
		try {
			const roles = await container.prisma.permittedVoiceRoles.findMany({
				where: { guildId, channelId },
				select: { roleId: true }
			});
			return roles.map((role) => role.roleId);
		} catch (error) {
			container.console.error(`Error fetching permitted roles for guild ${guildId}: ${error}`, { guildId });
			return [];
		}
	}

	private getParentChannelEveryonePermissions(parent: CategoryChannel): OverwriteResolvable[] {
		const perms = parent.permissionOverwrites.cache.map((overwrites) => ({
			id: overwrites.id,
			allow: overwrites.allow.bitfield,
			deny: overwrites.deny.bitfield
		}));
		return perms;
	}

	private setChannelPermissions(parent: CategoryChannel, user_id: string, permittedRoles: string[]): OverwriteResolvable[] {
		const user_permissions = this.getUserPermissions(user_id);

		const parent_permissions = this.getParentChannelPermissions(parent);

		const everyonePerms = this.getParentChannelEveryonePermissions(parent);

		const role_permissions = permittedRoles.map((roleId) => ({
			id: roleId,
			allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
			deny: 0n
		}));

		let combined_permissions: OverwriteResolvable[] = [
			...parent_permissions,
			...everyonePerms,
			...role_permissions,
			{
				id: parent.guild.roles.everyone.id,
				deny: [PermissionFlagsBits.ViewChannel]
			},
			user_permissions
		];

		combined_permissions = combined_permissions.reduce<OverwriteResolvable[]>((acc, current) => {
			if (!acc.some((perm) => perm.id === current.id)) {
				acc.push(current);
			}
			return acc;
		}, []);

		if (combined_permissions.length > 100) {
			console.warn(`Warning: Permissions list truncated to 100 entries to comply with Discord API limits.`);
			combined_permissions = combined_permissions.slice(0, 100);
		}

		return combined_permissions;
	}

	private async getChannel(guildId: string): Promise<ChannelConfig[]> {
		try {
			const data = await container.prisma.i_voice_temp_channels.findMany({
				where: { guildId }
			});
			return data.map(({ channelId, categoryId }) => ({ channel_id: channelId, parent_id: categoryId }));
		} catch (error) {
			container.console.error(`Failed to retrieve channels for guild ${guildId}: ${error}`, { guildId });
			return [];
		}
	}

	private async getUserCooldown(user_id: string): Promise<number | undefined> {
		try {
			const cooldown = await container.redis.get(`voiceCreate:cooldown:${user_id}`);
			return cooldown ? parseInt(cooldown) : undefined;
		} catch (error) {
			container.console.error(`Error retrieving cooldown for user ${user_id}: ${error}`, { userId: user_id });
			return undefined;
		}
	}

	private async setUserCooldown(user_id: string): Promise<void> {
		const cooldownPeriod = Time.Second * 30;
		try {
			const expirationTime = Date.now() + cooldownPeriod;
			await container.redis.set(`voiceCreate:cooldown:${user_id}`, expirationTime, 'PX', cooldownPeriod);
		} catch (error) {
			container.console.error(`Error setting cooldown for user ${user_id}: ${error}`, { userId: user_id });
		}
	}

	private getUserPermissions(user_id: string): OverwriteResolvable {
		return {
			id: user_id,
			allow: PermissionFlagsBits.Connect | PermissionFlagsBits.ViewChannel,
			deny: BigInt(0)
		};
	}

	private getParentChannelPermissions(parent: CategoryChannel): OverwriteResolvable[] {
		return parent.permissionOverwrites.cache.map((overwrites) => ({
			id: overwrites.id,
			allow: overwrites.allow.bitfield,
			deny: overwrites.deny.bitfield
		}));
	}

	private shouldCreateChannel(oldState: VoiceState, newState: VoiceState, channel_id: string): boolean {
		return (newState.channelId === channel_id && oldState.channelId !== channel_id) || (newState.channelId === channel_id && !oldState.channelId);
	}

	private async buildChannel(
		guild: Guild,
		name: string,
		userLimit: number,
		parent: CategoryChannel,
		permissions: OverwriteResolvable[]
	): Promise<VoiceChannel | null> {
		try {
			return await guild.channels.create({
				name,
				type: ChannelType.GuildVoice,
				userLimit,
				parent,
				permissionOverwrites: permissions
			});
		} catch (error) {
			container.console.error(`Error creating channel: ${error}`);
			return null;
		}
	}

	private async storeChannelInDatabase(guildId: string, channelId: string, categoryId: string, userId: string): Promise<void> {
		try {
			await container.prisma.voice_temp_channels.create({
				data: {
					guildId,
					channelId,
					channelCategoryId: categoryId,
					channelOwnerId: userId
				}
			});
		} catch (error) {
			container.console.error(`Error storing channel in database: ${error}`, { guildId, channelId, userId });
		}
	}
}
