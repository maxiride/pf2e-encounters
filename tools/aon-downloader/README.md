# What's this?

Back in 2021 i made a [website](https://maxiride.github.io/pf2e-encounters) to build and balance encounters for
Pathfinder 2e
([source](https://github.com/maxiride/pf2e-encounters?)), to source the creatures I build a custom webscraper to browse and parse all the archives creatures (monsters and npcs). The approach was very brittle and I had to do a lot of manual work to get the little data needed.

Flash forward to today Archive of Nethys made possible to download a JSON, still a truly programmatic way is not available and from feedback received from the official Discord channel it's out of scope for the moment.

Enter pf2e-aon-export, a simple tool to download the JSON from the official website in the most "politely" way possible to not overload the server.


# How does it work?

Initially I sniffed the network traffic to intercept the elastic json chunks, merge them and filter them. It was way more than one coudl bargain for, these chunks contains almost everything, items, actions, creatures, conditions etc.

So I decided to streamline the process and simulate what a user would do to download the JSON: hit the "Export as JSON" button. KISS. 😀

# Disclaimer

**DO NOT ABUSE THE TOOL**, the Archive of Nethys is not meant to be used like this, it's a public and community driven resource which must be respected for the effort put in.