const Discord = require('discord.js');
module.exports = {
    name: 'ticket',
    aliases: [],
    description: 'Creates a ticket',
    guildOnly: true,
    args: true,
    usage: '<question>',
    /**
     * @param {Discord.Message} message
     * @param {Array<String>} args
     */
    execute(message, args, oAuth2Client, randomClient) {
        // Return if not in #code-help
        if (message.channel.id != '961809942740865124') return;

        // If open ticket
        const openTickets = [];
        message.guild.channels.resolve('961807066194923520').messages.cache.each(m => openTickets.push(m.content.split(';')[1])); // #open-tickets
        if (openTickets.includes(message.author.id)) { return message.author.send('You already have an open ticket, please ask for help there or close the ticket before making a new one.').catch(() => {}); }

        message.author.send('We have received your request and will open a chat with a mentor. This may take some time.').catch(() => {});

        // Send message in #ticket-queue
        message.guild.channels.resolve('961807031789047828').send(`New ticket from ${message.author.toString()}.\n\`\`\`\n${args.join(' ')}\n\`\`\`\nReact with :thumbsup: to claim this ticket.\n${message.author.id}`);

        // Send message in #open-tickets
        message.guild.channels.resolve('961807066194923520').send(`${message.author.toString()};${message.author.id}`);
    },
};