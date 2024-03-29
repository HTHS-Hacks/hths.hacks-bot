const Discord = require('discord.js');
const { google } = require('googleapis');
const config = require('../config.json');
module.exports = {
    name: 'verify',
    aliases: [],
    description: 'Verify the user',
    guildOnly: true,
    args: true,
    usage: '<email> <first name> <last name>',
    /**
     * @param {Discord.Message} message
     * @param {Array<String>} args
     */
    execute(message, args, oAuth2Client, randomClient) {
        // Return if not enough args
        if (args.length < 3) { return message.author.send('You did not send enough arguments for verification. Please check #verification for how to use the command.').catch(() => {}); }

        const email = args[0];
        const name = args.slice(1).join('');

        const EMAIL_INDEX = 1;
        const FIRSTNAME_INDEX = 2;
        const LASTNAME_INDEX = 3;
        const GRADE_INDEX = 6;
        const VERIFIED_INDEX = 22;
        const GRADEMAP = new Map();
        GRADEMAP.set('Fr', 25);
        GRADEMAP.set('So', 24);
        GRADEMAP.set('Ju', 23);
        GRADEMAP.set('Se', 22);

        const sheets = google.sheets({ version: 'v4', auth: oAuth2Client});
        sheets.spreadsheets.values.get({ spreadsheetId: config.spreadsheetId, range: 'A:W' }, (err, res) => {
            if (err) {
                message.author.send('There was an error verifying you. Please try again or contact an Admin.').catch(() => {});
                return console.error(err);
            }
            const rows = res.data.values;
            if (!rows.length) {
                message.author.send('There was an error verifying you. Please try again or contact an Admin.').catch(() => {});
                return console.error('There were no rows returned by Google Sheets.');
            }
            else {
                let match = false;
                for (const row of rows) {
                    if (row[VERIFIED_INDEX] == 'x' && row[EMAIL_INDEX].toLowerCase().trim() == email.toLowerCase().trim() && (row[FIRSTNAME_INDEX] + row[LASTNAME_INDEX]).toLowerCase().trim().replaceAll(' ', '') == name.toLowerCase().trim().replaceAll(' ', '')) {
                        message.member.roles.add('956767299933704222').then(m0 => { // Participant role
                            m0.roles.remove('956765911568752670').then(m1 => { // Unverified role
                                m1.setNickname(`${row[FIRSTNAME_INDEX].trim().replaceAll(' ', '')}${row[LASTNAME_INDEX].trim().charAt(0).toUpperCase()}${GRADEMAP.get(row[GRADE_INDEX].trim().substring(0, 2))}`).catch(() => {});
                            });
                        });
                        match = true;
                        break;
                    }
                }
                if (!match) {
                    message.author.send('Your information could not be automatically verfied.\nPlease wait while an organizer manually approves your verification.').catch(() => {});
                    message.guild.channels.resolve('961805471419867136').send(`${message.member.toString()}\n${email}\n${name}\n${message.author.id}`); // #manual-verification
                }
            }
        });
    },
};