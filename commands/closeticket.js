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

        // Return if not in Active Tickets category
        if (message.channel.parent.id != '975541341805215794') return;

        // Return if not from asker
        if (message.author.id != message.channel.name.split('-')[1]) return;

        // Archive channel
        message.guild.channels.resolve('961807066194923520').messages.cache.find(m => m.content.split(';')[1] == message.author.id).delete({ reason: 'Close Ticket' }); // #open-tickets
        genRandString().then(() => {
            message.channel.setParent('975542480508432384', { lockPermissions: false }).then(c0 => { // Archived Tickets category
                c0.updateOverwrite('953316537232658463', { SEND_MESSAGES: false, ADD_REACTIONS: false }).then(c1 => { // everyone role
                    c1.setName('archived-' + c1.name + '-' + rString);
                });
            });
        });
    },
};