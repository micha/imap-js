### What

Imap-js is a clientside IMAP client. It runs in the browser, communicating
directly with the IMAP server via a long-polling comet proxy. It's written
for the [golf](http://github.com/golf/golf) web framework.

### Why

I need to have some kind of webmail access to my IMAP server. However, I
don't like running a web app frontend for it (like RoundCube, SquirrelMail,
etc.), because I don't like the possibility of security vulnerabilities
common to complex web apps. Email is not something that I can afford to
have hacked.

So, this project will hopefully produce a fully clientside webmail solution.
Then the only worry will be whether the IMAP daemon itself is secure, which
is something I'd need to take care of anyway, with or without webmail.

### Progress so far...

It can log in, list all folders, and get info (like how many unread messages,
etc.).

![Screenshot - progress so far...](http://github.com/micha/imap-js/raw/master/screenshot.png "Screenshot - progress so far...")

### Install

1. Get [golf](http://github.com/golf/golf) source and build it:

    `ant install`

2. Edit plugins/config.js to reflect your IMAP server and port. (No SSL at 
   the moment--it normally is connecting on a local socket on the server.)

3. Then, clone this git repo and from the repo directory do:

    `golf . longpoll.war`

4. Done.

You should be able to point your browser at [http://example.com:4653/imap-js/](http://example.com:4653/imap-js/)
and log into your IMAP server. (Replace example.com with the real hostname,
obviously.)  
