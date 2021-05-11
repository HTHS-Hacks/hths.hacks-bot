const Discord = require('discord.js');
module.exports = {
    name: 'closeticket',
    aliases: [],
    description: 'Close the current ticket',
    guildOnly: true,
    args: false,
    /**
     * @param {Discord.Message} message
     * @param {Array<String>} args
     */
    execute(message, args, oAuth2Client, randomClient) {
        async function genRandString() {
            do {
                rString = await randomClient.generateStrings({ n: 1, length: 6, characters: 'abcdefghijklmnopqrstuvwzyz0123456789' });
                rString = rString.random.data[0];
            } while (message.guild.channels.cache.some(channel => channel.name == 'archived-' + message.channel.name + '-' + rString))
        }
        let rString;

        // Return if not in Tickets category
        if (message.channel.parent.id != '833393707536351353') return;

        // Return if not from asker
        if (message.author.id != message.channel.name.split('-')[1]) return;

        // Archive channel
        message.guild.channels.resolve('827271159040180268').messages.cache.find(m => m.content.split(';')[1] == message.author.id).delete({ reason: 'Close Ticket' });
        genRandString().then(() => {
            message.channel.setParent('841311998147166218', { lockPermissions: false }).then(c0 => {
                c0.updateOverwrite('796103730772312064', { SEND_MESSAGES: false, ADD_REACTIONS: false }).then(c1 => {
                    c1.setName('archived-' + c1.name + '-' + rString);
                });
            });
        });

        /*
        // Delete message from #open-tickets and delete channel
        message.guild.channels.resolve('827271159040180268').messages.cache.find(m => m.content.split(';')[1] == message.author.id).delete({ reason: 'Close Ticket' });
        message.channel.delete('Close Ticket');
        */
    },
};