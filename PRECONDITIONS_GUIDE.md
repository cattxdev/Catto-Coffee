# How to Apply Preconditions to Commands

## Overview
Preconditions are automatically checked before a command executes. You apply them by setting properties on the command object.

---

## 🎯 Available Preconditions

### Built-in Preconditions (Applied via Command Properties):

1. **OwnerOnly** - Restricts command to bot owners
2. **GuildOnly** - Command can only be used in guilds (not DMs)
3. **UserPermissions** - Requires specific user permissions
4. **BotPermissions** - Requires specific bot permissions
5. **NSFW** - Command can only be used in NSFW channels
6. **ChannelType** - Restricts command to specific channel types
7. **Cooldown** - Rate limiting per user

---

## 📝 Examples

### Example 1: Basic Profile Command (Current)
```typescript
export default {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your profile and statistics'),

    category: 'info',

    // No preconditions - anyone can use anywhere
    async execute(interaction, client) {
        // Command logic
    }
} satisfies Command;
```

---

### Example 2: Owner Only Command
```typescript
export default {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('Evaluate JavaScript code')
        .addStringOption(option =>
            option
                .setName('code')
                .setDescription('Code to evaluate')
                .setRequired(true)
        ),

    category: 'owner',

    // ✅ PRECONDITION: Only bot owners can use this
    ownerOnly: true,

    async execute(interaction, client) {
        // Command logic
    }
} satisfies Command;
```

---

### Example 3: Guild Only + Permissions
```typescript
export default {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a user from the server')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to ban')
                .setRequired(true)
        ),

    category: 'moderation',

    // ✅ PRECONDITION: Must be used in a guild (not DMs)
    guildOnly: true,

    // ✅ PRECONDITION: User needs BanMembers permission
    userPermissions: [PermissionFlagsBits.BanMembers],

    // ✅ PRECONDITION: Bot needs BanMembers permission
    botPermissions: [PermissionFlagsBits.BanMembers],

    async execute(interaction, client) {
        // Command logic
    }
} satisfies Command;
```

---

### Example 4: NSFW Command
```typescript
export default {
    data: new SlashCommandBuilder()
        .setName('nsfw-content')
        .setDescription('View NSFW content'),

    category: 'nsfw',

    // ✅ PRECONDITION: Must be in NSFW channel
    nsfw: true,

    async execute(interaction, client) {
        // Command logic
    }
} satisfies Command;
```

---

### Example 5: Channel Type Restriction
```typescript
import { ChannelType } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('thread-info')
        .setDescription('Get information about this thread'),

    category: 'utility',

    // ✅ PRECONDITION: Only works in threads
    channelTypes: [
        ChannelType.PublicThread,
        ChannelType.PrivateThread,
        ChannelType.AnnouncementThread
    ],

    async execute(interaction, client) {
        // Command logic
    }
} satisfies Command;
```

---

### Example 6: Cooldown
```typescript
export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily reward'),

    category: 'economy',

    // ✅ PRECONDITION: 24 hour cooldown (in milliseconds)
    cooldown: 24 * 60 * 60 * 1000, // 24 hours

    async execute(interaction, client) {
        // Command logic
    }
} satisfies Command;
```

---

### Example 7: Combined Preconditions (Full Example)
```typescript
import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import type { Command } from '../../types';

export default {
    data: new SlashCommandBuilder()
        .setName('setup-modlog')
        .setDescription('Setup moderation logging')
        .addChannelOption(option =>
            option
                .setName('channel')
                .setDescription('Channel for mod logs')
                .setRequired(true)
        ),

    category: 'admin',

    // ✅ Must be in a guild
    guildOnly: true,

    // ✅ User needs Administrator permission
    userPermissions: [PermissionFlagsBits.Administrator],

    // ✅ Bot needs ManageWebhooks and ManageChannels
    botPermissions: [
        PermissionFlagsBits.ManageWebhooks,
        PermissionFlagsBits.ManageChannels
    ],

    // ✅ 60 second cooldown to prevent spam
    cooldown: 60000, // 60 seconds

    async execute(interaction, client) {
        if (!interaction.isChatInputCommand()) return;

        const channel = interaction.options.getChannel('channel', true);
        
        // Command logic here
        await interaction.reply({
            content: `✅ Moderation logs will be sent to ${channel}`,
            ephemeral: true
        });
    }
} satisfies Command;
```

---

## 🔍 How Preconditions Work Behind the Scenes

When a command is executed, the system automatically:

1. **Checks Priority Order** (by precondition position number):
   ```
   1. Blacklist (priority 1)
   2. Enabled (priority 2)
   3. GuildOnly (priority 3)
   4. NSFW (priority 4)
   5. ChannelType (priority 5)
   6. OwnerOnly (priority 6)
   7. Cooldown (priority 7)
   8. UserPermissions (priority 8)
   9. BotPermissions (priority 9)
   ```

2. **Stops at First Failure** - If any precondition fails, command doesn't execute

3. **Sends Error Message** - User gets a helpful error message explaining why

---

## 🎨 Error Messages Users See

### Owner Only:
> ❌ This command can only be used by bot owners.

### Guild Only:
> ❌ This command can only be used in a server, not in DMs.

### Missing User Permissions:
> ❌ You don't have permission to use this command.  
> Required permissions: `Ban Members`, `Kick Members`

### Missing Bot Permissions:
> ❌ I don't have the required permissions to execute this command.  
> Required permissions: `Manage Webhooks`, `Manage Channels`

### NSFW:
> ❌ This command can only be used in NSFW channels.

### Wrong Channel Type:
> ❌ This command can only be used in: Public Thread, Private Thread

### Cooldown:
> ⏱️ Please wait 23 hours, 59 minutes before using this command again.

---

## ✨ Best Practices

1. **Always use `guildOnly: true`** for moderation/management commands
2. **Set appropriate cooldowns** for commands that can be spammed
3. **Check both user AND bot permissions** for commands that need them
4. **Use NSFW flag** for any adult content
5. **Combine preconditions** for better security (e.g., admin commands should have `guildOnly` + `userPermissions`)

---

## 📚 Quick Reference

```typescript
{
    ownerOnly: boolean,              // Only bot owners
    guildOnly: boolean,              // No DMs
    userPermissions: PermissionFlagsBits[], // User needs these
    botPermissions: PermissionFlagsBits[],  // Bot needs these
    nsfw: boolean,                   // NSFW channels only
    channelTypes: ChannelType[],     // Specific channel types
    cooldown: number,                // Milliseconds
    enabled: boolean                 // Enable/disable command
}
```

---

## 🔧 Updating the Profile Command

If you want to add preconditions to your profile command:

```typescript
export default {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your profile and statistics')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('The user to view (leave empty for yourself)')
                .setRequired(false)
        ),

    category: 'info',

    // Add preconditions here:
    guildOnly: true,              // Only in servers (optional)
    cooldown: 5000,               // 5 second cooldown (optional)

    async execute(interaction, client) {
        // Your existing code...
    }
} satisfies Command;
```

That's it! Just add the properties and the precondition system handles the rest automatically. ✨
