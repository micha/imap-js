/*
 * First run jison on plugins/imap/parser.jison to generate ./parser.js.
 * Then run this script like `narwhal test_parser.js`.
 */

var parser = require("./parser").parser;

var cmd = "+ Ready for literal data\r\n";
cmd    += "+ Qf+br/I90==\r\n";
cmd    += "* 128 EXISTS\r\n";
cmd    += "* 128 RECENT\r\n";
cmd    += "* 128 FETCH (FLAGS ())\r\n";
cmd    += "* 128 FETCH (FLAGS (\\Seen \\Answered \\Bullshit))\r\n";
cmd    += "* CAPABILITY IMAP4rev1\r\n";
cmd    += "* FLAGS \\Seen \\Answered\r\n";
cmd    += "* SEARCH\r\n";
cmd    += "* SEARCH 40962\r\n";
cmd    += "* OK [PARSE] Mission complete.\r\n";
cmd    += "* OK [PERMANENTFLAGS (\\Seen \\Answered \\Draft \\*)] Mission complete.\r\n";
cmd    += "* LIST () NIL \"Sent\"\r\n";
cmd    += "* LIST (\\Noselect \\Marked) NIL \"Sent\"\r\n";
cmd    += "* LIST (\\NoInferiors \\Marked) \"/\" \"Sent\"\r\n";
cmd    += "* STATUS \"Inbox\" ()\r\n";
cmd    += "* STATUS \"Drafts\" (MESSAGES 2 RECENT 0 UIDNEXT 78 UIDVALIDITY 1215099938 UNSEEN 0)\r\n";
cmd    += "* 1 FETCH (ENVELOPE (\"Wed, 21 Oct 2009 02:01:19 -0700\" \"[GitHub] We had a problem billing your credit card\" ((\"GitHub\" NIL \"support\" \"github.com\")) ((\"GitHub\" NIL \"support\" \"github.com\")) ((\"GitHub\" NIL \"support\" \"github.com\")) ((NIL NIL \"asdf\" \"ubergibson.com\")) NIL NIL NIL \"<4adecddf8afaa_3433fb16af962fc4460@aux1.rs.github.com.tmail>\"))\r\n";
cmd    += "* 1 FETCH (INTERNALDATE \"21-Oct-2009 05:01:20 -0400\")\r\n";
//cmd    += "100-FOO/ OK [ALERT] Mission complete.\r\n";
cmd    += "0CGD0002 OK [ALERT] Logged in.\r\n";

print("INPUT:")
print(cmd);
print("")
print("OUTPUT:")
print(JSON.stringify(parser.parse(cmd), null, 2));
