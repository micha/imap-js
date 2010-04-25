/*
 * First run jison on plugins/imap/parser.jison to generate ./parser.js.
 * Then run this script like `narwhal test_parser.js`.
 */

var parser = require("./parser").parser;

var cmd = "+ Ready for literal data\r\n";
cmd    += "+ Qf+br/I90==\r\n";
cmd    += "* 128 EXISTS\r\n";
cmd    += "* 128 RECENT\r\n";
cmd    += "* CAPABILITY IMAP4rev1 SASL-IR SORT THREAD=REFERENCES MULTIAPPEND UNSELECT LITERAL+ IDLE CHILDREN NAMESPACE LOGIN-REFERRALS STARTTLS AUTH=PLAIN AUTH=LOGIN\r\n";
cmd    += "* SEARCH\r\n";
cmd    += "* SEARCH 40962\r\n";
cmd    += "* FLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft $MDNSent $Forwarded $NotJunk $Junk)\r\n";
cmd    += "* OK [PERMANENTFLAGS (\\Answered \\Flagged \\Deleted \\Seen \\Draft $MDNSent $Forwarded $NotJunk $Junk \\*)] Flags permitted.\r\n";
cmd    += "* OK [UIDVALIDITY 1215063253] UIDs valid\r\n";
cmd    += "* OK [UIDNEXT 10961] Predicted next UID\r\n";
cmd    += "* LIST () NIL \"Sent\"\r\n";
cmd    += "* LIST (\\Noselect \\Marked) NIL \"Sent\"\r\n";
cmd    += "* LIST (\\NoInferiors \\Marked) \"/\" \"Sent\"\r\n";
cmd    += "* STATUS \"Inbox\" ()\r\n";
cmd    += "* STATUS \"Drafts\" (MESSAGES 2 RECENT 0 UIDNEXT 78 UIDVALIDITY 1215099938 UNSEEN 0)\r\n";
cmd    += "* 128 FETCH (FLAGS ())\r\n";
cmd    += "* 128 FETCH (FLAGS (\\Seen \\Answered \\Bullshit))\r\n";
cmd    += "* 1 FETCH (BODY (\"text\" \"plain\" (\"charset\" \"utf-8\") NIL NIL \"7bit\" 545 14))\r\n";
cmd    += "* 1 FETCH (BODYSTRUCTURE (\"text\" \"plain\" (\"charset\" \"utf-8\") NIL NIL \"7bit\" 545 14 NIL NIL NIL))\r\n";
cmd    += "* 1 FETCH (ENVELOPE (\"Wed, 21 Oct 2009 02:01:19 -0700\" \"[GitHub] We had a problem billing your credit card\" ((\"GitHub\" NIL \"support\" \"github.com\")) ((\"GitHub\" NIL \"support\" \"github.com\")) ((\"GitHub\" NIL \"support\" \"github.com\")) ((NIL NIL \"asdf\" \"ubergibson.com\")) NIL NIL NIL \"<4adecddf8afaa_3433fb16af962fc4460@aux1.rs.github.com.tmail>\"))\r\n";
cmd    += "* 1 FETCH (INTERNALDATE \"21-Oct-2009 05:01:20 -0400\")\r\n";
cmd    += "* 1 FETCH (BODY[TEXT] {545}\r\nGreetings from GitHub,\r\n\r\n\r\nThis email is to inform you that we've received the following error trying to bill your credit card:\r\n\r\nAUTH DECLINED                    [05-09001]\r\n\r\nWe'll try billing your card again over the next two weeks, so feel free to ignore this if you're able to resolve this issue. Otherwise, if you need to update your account with a different card, please head to http://github.com/account.\r\n\r\nIf you feel there's been an error or have any questions, please email us at support@github.com.\r\n\r\n\r\nThanks,\r\nThe GitHub Team\r\n)\r\n";
//cmd    += "100-FOO/ OK [ALERT] Mission complete.\r\n";
cmd    += "IS7Z0004 OK [READ-WRITE] Select completed.\r\n";

print("                     JavaScript IMAP Client: Parser Test");
print("")
print("--------------------------------------------------------------------------------");
print("INPUT")
print("--------------------------------------------------------------------------------\n");
print(cmd);
print("")
print("--------------------------------------------------------------------------------");
print("OUTPUT")
print("--------------------------------------------------------------------------------\n");
print(JSON.stringify(parser.parse(cmd), null, 2));
