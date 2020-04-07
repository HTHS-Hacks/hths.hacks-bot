# hths.hacks-bot

## Deployment

Enable the Sheets API and download credentials.json to the folder from here:
https://developers.google.com/sheets/api/quickstart/python

Make a Discord bot (google it), and make a `.env` file with the following in it:

```
DISCORD_TOKEN=***YOUR KEY***
```

```bash
python3 -m venv env # Create a virtual environment
source env/bin/activate
pip install -r requirements.txt
```

Then, setup with heroku account and deploy as usual (google it).
