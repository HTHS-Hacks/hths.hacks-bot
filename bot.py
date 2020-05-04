import os

from discord.ext import commands
from discord.utils import get
from discord.ext import tasks
import discord
from dotenv import load_dotenv

import pickle
import os.path
from googleapiclient.discovery import build
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request

from datetime import datetime
import datetime as dt
import pytz
import traceback

SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
SHEET_ID = '1z2Vh9IiGfSDeHcTtxEU1-6UMjTVTNiejWsqsAdajgLQ'
FIRST_INDEX = 0
LAST_INDEX = 1
EMAIL_INDEX = 2


SCHEDULE_SHEET = '18s4lz7cFUPw3uJn4EZzJN7W052ihOTxrxhut4sl5CjQ'

load_dotenv()
TOKEN = os.getenv("DISCORD_TOKEN")

bot = commands.Bot(command_prefix='!')
bot.remove_command("help")


creds = None
# time.
if os.path.exists('token.pickle'):
    with open('token.pickle', 'rb') as token:
        creds = pickle.load(token)
# If there are no (valid) credentials available, let the user log in.
if not creds or not creds.valid:
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    else:
        flow = InstalledAppFlow.from_client_secrets_file(
            'credentials.json', SCOPES)
        creds = flow.run_local_server(port=0)
    # Save the credentials for the next run
    with open('token.pickle', 'wb') as token:
        pickle.dump(creds, token)

service = build('sheets', 'v4', credentials=creds)

@bot.event
async def on_ready():
    print("Connected")

@bot.event
async def on_message(message):
    delete_all_channels = ['verification', 'ask-a-mentor', 'ticket-queue', 'open-tickets']
    if message.author == bot.user:
        return

    await bot.process_commands(message)

    if message.channel.name not in delete_all_channels:
        return

    await message.delete()

async def add_to_server(role_p, role_u, user, name):
    await user.add_roles(role_p)
    await user.remove_roles(role_u)
    await user.edit(nick=name.title())

@bot.event
async def on_reaction_add(reaction, user):
    if reaction.message.channel.name == 'mod-verification':
        if reaction.message.author == bot.user:
            if reaction.emoji == '👍':
                _,name,_,uid = reaction.message.content.split(';')
                role_p = get(reaction.message.guild.roles, name='Participant')
                role_u = get(reaction.message.guild.roles, name='Unverified')
                user = get_member(uid)
                await add_to_server(role_p, role_u, user, name)
                await reaction.message.delete()
                return
    elif reaction.message.channel.name == 'ticket-queue':
        if reaction.message.author == bot.user:
            if reaction.emoji == '👍':
                uid = int(reaction.message.content.split('(')[-1][:-1])
                user = get_member(uid)
                mentor = await reaction.users().flatten()
                mentor = mentor[0]
                guild = reaction.message.guild
                category = get(guild.categories, name='Tickets')
                overwrites = {
                    user: discord.PermissionOverwrite(read_messages=True, send_messages=True, embed_links=True, attach_files=True),
                    mentor: discord.PermissionOverwrite(read_messages=True, send_messages=True, embed_links=True, attach_files=True),
                    guild.default_role: discord.PermissionOverwrite(read_messages=False)
                }
                channel = await guild.create_text_channel(f"ticket-{user.name}", category=category, overwrites=overwrites)
                await reaction.message.delete()
                await channel.send(f"Welcome {user.mention} and {mentor.mention}! You can chat here privately. Type `!closeticket` when you're ready to close the ticket and delete all this history. Only the participant can close a ticket.")

async def add_open_ticket(user):
    open_tickets_channel = get(bot.guilds[0].channels, name='open-tickets')
    await open_tickets_channel.send(f"{user.mention};{user.id}")

async def delete_open_ticket(user):
    open_tickets_channel = get(bot.guilds[0].channels, name='open-tickets')
    messages = await open_tickets_channel.history(limit=1000).flatten()

    for message in messages:
        if int(message.content.split(';')[1]) == user.id:
            await message.delete()

async def get_open_tickets():
    open_tickets_channel = get(bot.guilds[0].channels, name='open-tickets')

    messages = await open_tickets_channel.history(limit=1000).flatten()

    return [int(message.content.split(';')[1]) for message in messages]

def get_member(uid):
    user = get(bot.get_all_members(), id=int(uid))
    return user

@bot.command(name='help')
async def help(ctx):
    embed = discord.Embed(title='Help', description='How to use the hths.hacks() bot', color=0x3976D5)
    embed.add_field(name='!submit', value='Submit your project to Devpost', inline=True)
    embed.add_field(name='!mc', value='Show the Minecraft server address. **Can only be run in #bots**', inline=True)
    embed.add_field(name='!chess', value='Link to register for the chess tournament. **Can only be run in #bots**', inline=True)
    embed.add_field(name='!ticket <Your message>', value='Create a support ticket. **Can only be run in #ask-a-mentor**', inline=True)
    embed.add_field(name='!closeticket', value='Close your ticket. **Can only be run in your private ticket.**', inline=True)
    await ctx.send(embed=embed)

@bot.command(name='mc')
async def mc(ctx):
    await ctx.send("MC Server: mc.hthshacks.com")

@bot.command(name='chess')
async def chess(ctx):
    await ctx.send("Chess tournament: https://challonge.com/tournaments/signup/zlWqUhyiKQ")

@bot.command(name='submit')
async def submit(ctx):
    await ctx.send("To submit your project, visit the Devpost: https://hthshacks-20.devpost.com/")

@bot.command(name='closeticket')
async def closeticket(ctx):
    if ctx.message.channel.category.name != "Tickets":
        return

    role_names = [role.name for role in ctx.message.author.roles]
    if 'Mentor' not in role_names:
        await delete_open_ticket(ctx.message.author)
        await ctx.message.channel.delete()
        return

@bot.command(name='ticket')
async def ticket(ctx, *message):
    if ctx.message.channel.name != 'ask-a-mentor':
        return

    channel = await ctx.message.author.create_dm()

    open_tickets = await get_open_tickets()

    if ctx.message.author.id in open_tickets:
        await channel.send("You have already open up a ticket. Please only open up one ticket at a time.")
        return

    await channel.send("We have received your request and are pairing you with a mentor. This may take some time. Please be patient.")

    ticket_queue_channel = get(ctx.guild.channels, name='ticket-queue')
    await ticket_queue_channel.send(f"New ticket from {ctx.message.author.mention} about {' '.join(message)}. React with :thumbsup: to accept ({ctx.message.author.id})")

    await add_open_ticket(ctx.message.author)

@bot.command(name='verify')
@commands.has_role('Unverified')
async def verify(ctx, email: str, *name):
    sheet = service.spreadsheets()
    result = sheet.values().get(spreadsheetId=SHEET_ID, range='A:Z').execute()
    values = result.get('values', [])
    for row in values:
        if (row[FIRST_INDEX] + row[LAST_INDEX]).lower().strip().replace(' ', '') == ''.join(name).lower().strip().replace(' ', '') and row[EMAIL_INDEX].lower().strip() == email.lower().strip():
            role_p = get(ctx.guild.roles, name='Participant')
            role_u = get(ctx.guild.roles, name='Unverified')
            await add_to_server(role_p, role_u, ctx.message.author, ' '.join(name))
            return
    channel = await ctx.message.author.create_dm()
    await channel.send("Welcome! Your information could not be automatically verified. Please wait while an organizer manually approves your verification.")
    mod_verify_channel = get(ctx.guild.channels, name='mod-verification')
    await mod_verify_channel.send(f"{ctx.message.author.mention};{' '.join(name)};{email};{ctx.message.author.id}")

@tasks.loop(seconds=10)
async def check_schedule():
    try:
        times = [
            (dt.timedelta(minutes=30), "in 30 minutes"),
            (dt.timedelta(minutes=15), "in 15 minutes"),
            (dt.timedelta(minutes=10), "in 10 minutes"),
            (dt.timedelta(minutes=0), "now")
        ]

        sheet = service.spreadsheets()
        result = sheet.values().get(spreadsheetId=SCHEDULE_SHEET, range='A:Z').execute()
        values = result.get('values', [])

        curr_time = datetime.now()

        for i, row in enumerate(values[1:]):
            row[0] = row[0].replace(chr(160), " ")
            date = datetime.strptime(row[0], '%m/%d/%Y %H:%M')
            message = row[1]
            after_message = row[2]

            for index, stats in enumerate(zip(row[3:], times)):
                status, time = stats
                if status.lower() == 'yes' and curr_time+time[0] > date:
                    channel = get(bot.guilds[0].channels, name="announcements")
                    await channel.send(f"@everyone {message} {time[1]}. {after_message}")
                    values[i+1][index+3] = "No"
                    break
        sheet.values().update(spreadsheetId=SCHEDULE_SHEET, range='A:Z', valueInputOption="USER_ENTERED", body={'values': values}).execute()
    except Exception as e:
        traceback.print_exc()


check_schedule.start()
bot.run(TOKEN)
