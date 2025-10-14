# Catto Discord Bot

A professional, enterprise-grade Discord bot built with Discord.js v14 and TypeScript.

## Features

- ✅ **Full TypeScript support** with strict type checking
- 🎯 **Advanced handler system** for commands, events, and components
- 🔧 **Modular architecture** - Easy to extend and maintain
- 🛡️ **Comprehensive error handling** with detailed logging
- ⚡ **Hot reload** development with tsx
- 🎨 **Interactive components** - Buttons, Select Menus, Modals
- 🔒 **Permission system** with cooldowns
- 📝 **JSDoc annotations** for better IDE support
- 🎭 **Context menu support** for user and message commands
- 🔄 **Autocomplete** functionality for commands

## Project Structure

```
catto.djs/
├── src/
│   ├── commands/          # Slash commands organized by category
│   │   └── utility/       # Example: ping, help, userinfo, serverinfo
│   ├── events/            # Discord event handlers
│   │   ├── ready.ts       # Bot ready event
│   │   ├── interactionCreate.ts  # Interaction handler
│   │   └── guildCreate.ts # Guild join event
│   ├── components/        # Interactive components
│   │   ├── buttons/       # Button handlers
│   │   ├── selectMenus/   # Select menu handlers
│   │   └── modals/        # Modal handlers
│   ├── handlers/          # Core handler systems
│   │   ├── CommandHandler.ts     # Command loading & execution
│   │   ├── EventHandler.ts       # Event management
│   │   ├── ComponentHandler.ts   # Component management
│   │   └── ErrorHandler.ts       # Global error handling
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts       # Shared interfaces and types
│   ├── utils/             # Utility functions
│   │   └── logger.ts      # Custom logger
│   ├── config/            # Configuration files
│   │   └── config.ts      # Bot configuration
│   └── index.ts           # Main entry point
├── .env.example           # Environment variables template
├── tsconfig.json          # TypeScript configuration
├── package.json           # Project dependencies
└── README.md             # Documentation
```

## Setup

### 1. Prerequisites

- Node.js v18.0.0 or higher
- pnpm (recommended) or npm
- A Discord bot token ([Get one here](https://discord.com/developers/applications))

### 2. Installation

```powershell
# Clone or download the repository
cd catto.djs

# Install dependencies
pnpm install
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_bot_token_here
CLIENT_ID=your_application_id_here
DEV_GUILD_ID=your_test_server_id  # Optional: for faster command testing
OWNER_IDS=your_user_id             # Comma-separated for multiple owners
NODE_ENV=development
LOG_LEVEL=info
```

### 4. Running the Bot

```powershell
# Development mode with hot reload
pnpm dev

# Build for production
pnpm build

# Run in production
pnpm start
```

## Creating Commands

Create a new file in `src/commands/<category>/<command>.ts`:

```typescript
import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import { Command } from '../../types';
import { BotClient } from '../../index';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('example')
        .setDescription('An example command'),

    cooldown: 5000, // 5 seconds
    guildOnly: false,
    ownerOnly: false,
    userPermissions: ['SendMessages'],
    botPermissions: ['SendMessages'],

    async execute(interaction: ChatInputCommandInteraction, client: BotClient) {
        await interaction.reply('Hello World!');
    },
};

export default command;
```

## Creating Events

Create a new file in `src/events/<event>.ts`:

```typescript
import { Events } from 'discord.js';
import { Event } from '../types';
import { BotClient } from '../index';

const event: Event = {
    name: Events.MessageCreate,
    once: false,

    async execute(message, client: BotClient) {
        // Your event logic here
    },
};

export default event;
```

## Creating Components

### Button Example (`src/components/buttons/example.ts`):

```typescript
import { ButtonInteraction } from 'discord.js';
import { ButtonComponent } from '../../types';
import { BotClient } from '../../index';

const component: ButtonComponent = {
    customId: 'example_button',

    async execute(interaction: ButtonInteraction, client: BotClient) {
        await interaction.reply('Button clicked!');
    },
};

export default component;
```

### Select Menu Example (`src/components/selectMenus/example.ts`):

```typescript
import { StringSelectMenuInteraction } from 'discord.js';
import { SelectMenuComponent } from '../../types';
import { BotClient } from '../../index';

const component: SelectMenuComponent = {
    customId: 'example_menu',

    async execute(interaction: StringSelectMenuInteraction, client: BotClient) {
        const selected = interaction.values[0];
        await interaction.reply(`You selected: ${selected}`);
    },
};

export default component;
```

## Configuration Options

Edit `src/config/config.ts` to customize:

- Embed colors
- Cooldown durations
- Feature flags (enable/disable buttons, modals, etc.)
- Logging settings
- And more...

## Available Commands

- `/ping` - Check bot latency
- `/help` - View all commands
- `/serverinfo` - Display server information
- `/userinfo` - Display user information

## Contributing

Feel free to submit issues and pull requests!

## License

ISC License - See LICENSE file for details

## Support

For support, join our Discord server or open an issue on GitHub.

---

**Built with ❤️ using Discord.js v14 and TypeScript**
