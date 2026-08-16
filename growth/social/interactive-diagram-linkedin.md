# LinkedIn post draft — Interactive Architecture Diagram

Every architecture doc I've ever written has the same problem: it's a PNG. Someone opens the page,
looks at the boxes and arrows for ten seconds, and then pings me in Slack anyway — "wait, who owns
this service?", "what's the protocol here?", "what breaks if this goes down?". The diagram never
answers those questions, because a diagram can't be clicked.

So I built one that can. Same boxes, same arrows — but now every service and every data-flow line is
a real UI element. Click "Control Worker" and a panel opens inline with owner, API/protocol,
dependencies, and known risks. Click the arrow between two services and you get the same for that
connection. No separate wiki page, no tribal knowledge, no leaving Confluence.

The whole thing is a self-contained HTML/CSS/JS bundle — no backend, no build step. I generated most
of it with an AI prompt, fed it my own architecture description, and uploaded the result straight to
the page.

If your team's architecture docs are still static images that generate more Slack questions than they
answer, this is worth five minutes. Try it with Mini Sites for Confluence, on the Atlassian
Marketplace.

#Confluence #SoftwareArchitecture #DeveloperTools
