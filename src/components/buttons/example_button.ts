/**
 * @fileoverview Example button component
 * @author Catto Bot Team
 */

import { ButtonComponent } from '../../types';

const component: ButtonComponent = {
    customId: 'example_button',

    async execute(interaction, _client) {
        await interaction.reply({
            content: '✅ Button clicked!',
            ephemeral: true,
        });
    },
};

export default component;
