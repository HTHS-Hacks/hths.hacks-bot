// @requires
const fs = require('fs');
const Discord = require('discord.js');
const config = require('./config.json');
const { prefix, token, randomOrgKey } = require('./config.json');
const readline = require('readline');
const { google } = require('googleapis');
const RandomOrg = require('random-org');

// Setup
const clearChannels = ['956707173117886586', '961809942740865124']; // #verification, #code-help
const noClearRoles = ['956766438805352459', '961806736371646465', '956766045144768512', '975533443045801994', '961807423130193951']; // Admin, MLH, Moderator, Bot, Judge
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const TOKEN_PATH = 'token.json';
let oAuth2Client;
let randomClient;

// Create client
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_EMOJIS_AND_STICKERS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Discord.Intents.FLAGS.DIRECT_MESSAGES]});

// Discover commands
client.commands = new Discord.Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.name, command);
}

const cooldowns = new Discord.Collection();

// Once bot start
client.once('ready', () => {
    // Create authorized Google Sheets client
    fs.readFile('credentials.json', (err, content) => {
        if (err) return console.log('Error loading client secret file:', err);
        const credentials = JSON.parse(content);
        const { client_secret, client_id, redirect_uris } = credentials.installed;
        oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
        fs.readFile(TOKEN_PATH, (err2, token) => {
            if (err2) {
                const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });
                console.log('Authorize this app by visiting this url:', authUrl);
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                rl.question('Enter the code from that page here: ', code => {
                    rl.close();
                    oAuth2Client.getToken(code, (err3, token2) => {
                        if (err3) return console.error('Error while trying to retrieve access token', err3);
                        oAuth2Client.setCredentials(token2);
                        fs.writeFile(TOKEN_PATH, JSON.stringify(token2), err4 => {
                            if (err4) return console.error(err4);
                            console.log('Token stored to', TOKEN_PATH);
                        });
                    });
                });
            }
            else { oAuth2Client.setCredentials(JSON.parse(token)); }
        });
    });

    // Create authorized Random.org client
    randomClient = new RandomOrg({ apiKey: randomOrgKey });

    console.log('Ready');
});

// On message
client.on('messageCreate', message => {
    // Return if from bot
    if (message.author.bot) return;

    // If command
    if (message.content.startsWith(prefix)) {
        // Set up command
        const args = message.content.slice(prefix.length).split(/ +/);
        const commandName = args.shift().toLowerCase();
        const command = client.commands.get(commandName) || client.commands.find(cmd => cmd.aliases && cmd.aliases.includes(commandName));
        if (!command) { return delFromClear(message); }

        // Check conditions
        if (command.guildOnly && message.channel.type !== 'GUILD_TEXT') { return message.reply('I can\'t execute that command inside DMs!'); }
        if (command.roleOnly) {
            let flag = false;
            for (const roleId of command.roleOnly) { if (message.member.role.cache.has(roleId)) { flag = true; } }
            if (!flag && !delFromClear(message)) { message.reply('You don\'t have permission to execute that command.'); }
            if (!flag) return;
        }
        if (command.args && !args.length) {
            let reply = `You didn't provide any arguments, ${message.author}!`;
            if (command.usage) { reply += `\nThe proper usage is: \`${prefix}${command.name} ${command.usage}\``; }
            if (!delFromClear(message)) { message.channel.send(reply); }
            return;
        }
        if (!cooldowns.has(command.name)) { cooldowns.set(command.name, new Discord.Collection()); }
        const now = Date.now();
        const timestamps = cooldowns.get(command.name);
        const cooldownAmount = (command.cooldown || config.defaultCooldownTime) * 1000;
        if (timestamps.has(message.author.id)) {
            const expirationTime = timestamps.get(message.author.id) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = (expirationTime - now) / 1000;
                if (!delFromClear(message)) { message.reply(`Please wait ${timeLeft.toFixed(1)} more second(s) before rusing the \`${command.name}\` command.`); }
                return;
            }
        } else {
            timestamps.set(message.author.id, now);
            setTimeout(() => timestamps.delete(message.author.id), cooldownAmount);
        }

        // Execute command
        try { command.execute(message, args, oAuth2Client, randomClient); }
        catch (error) {
            console.error(error);
            if (!delFromClear(message)) message.reply('There was an error trying to execute that command.');
        }
    }

    delFromClear(message);
});

/**
 * @param {Discord.Message} message
 * @returns Boolean
 */
function delFromClear(message) {
    if (clearChannels.includes(message.channel.id) && !noClearRoles.includes(message.member.roles.highest.id)) {
        message.delete().catch(error => console.error(error));
        return true;
    }
    return false;
}

// On reaction
client.on('messageReactionAdd', (reaction, reactor) => {
    if (reaction.message.channel.id == '961807031789047828') { // #ticket-queue
        if (reaction.message.author.id == client.user.id) {
            if (reaction.emoji.name == '👍') {
                const askerID = reaction.message.content.split('\n').pop();
                const asker = reaction.message.guild.member(askerID);
                const options = {
                    parent: '975541341805215794', // Active Tickets category
                    permissionOverwrites: [
                        {
                            id: askerID,
                            allow: Discord.Permissions.FLAGS.VIEW_CHANNEL
                        },
                        {
                            id: reactor.id,
                            allow: Discord.Permissions.FLAGS.VIEW_CHANNEL
                        },
                        {
                            id: '953316537232658463', // everyone
                            deny: Discord.Permissions.FLAGS.VIEW_CHANNEL

                        }
                    ],
                    reason: 'New Ticket'
                }
                reaction.message.guild.channels.create(`ticket-${askerID}`, options).then(channel => {
                    reaction.message.delete({ reason: 'New Ticket' });
                    channel.send(`Welcome ${asker.toString()} and ${reactor.toString()}! You can chat here privately. ${asker.user.username}, type \`!closeticket\` when you're ready to close the ticket. **You will not be able to message in closed tickets, but you can still see them.**`);
                }).catch(error => { reaction.message.channel.send('There was an error creating the ticket: ' + error) });
            }
        }
    }
    else if (reaction.message.channel.id == '961805471419867136') { // #manual-verification
        if (reaction.message.author.id == client.user.id) {
            if (reaction.emoji.name == '👍') {
                const unverifiedID = reaction.message.content.split('\n').pop();
                const unverified = reaction.message.guild.member(unverifiedID);
                unverified.roles.add('956767299933704222').catch(() => {}); // Participant role
                unverified.roles.remove('956765911568752670').catch(() => {}); // Unverified role
                reaction.message.delete();
            }
        }
    }
});

// Login
client.login(token);