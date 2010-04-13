### Progress so far...

It can log in, list all folders, and get info (like how many unread messages,
etc.).

![Screenshot - progress so far...](http://github.com/micha/imap-js/raw/master/screenshot.png "Screenshot - progress so far...")

### Install

1. Get [golf](http://github.com/golf/golf) source and build it:

      ant install

2. Edit plugins/config.js to reflect your IMAP server and port. (No SSL at 
   the moment--it normally is connecting on a local socket on the server.)

3. Then, clone this git repo and from the repo directory do:

      golf . longpoll.war

4. Done.

You should be able to point your browser at http://example.com:4653/imap-js/
and log into your IMAP server. (Replace example.com with the real hostname,
obviously.)  
