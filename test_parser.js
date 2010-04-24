/*
 * First run jison on plugins/imap/parser.jison to generate ./parser.js.
 * Then run this script like `narwhal test_parser.js`.
 */

var parser = require("./parser").parser;

var cmd = "+ Ready for literal data\r\n";
cmd    += "+ Qf+br/I90==\r\n";
cmd    += "* 128 EXISTS\r\n";
cmd    += "* 128 RECENT\r\n";
cmd    += "* CAPABILITY IMAP4rev1\r\n";
cmd    += "* FLAGS \\Seen \\Answered\r\n";
cmd    += "* SEARCH\r\n";
cmd    += "* SEARCH 40962\r\n";
cmd    += "* OK [PARSE] Mission complete.\r\n";
cmd    += "* OK [PERMANENTFLAGS (\\Seen \\Answered \\Draft \\*)] Mission complete.\r\n";
cmd    += "* LIST ()  \"Sent\"\r\n";
cmd    += "* LIST (\\Noselect \\Marked)  \"Sent\"\r\n";
cmd    += "* LIST (\\NoInferiors \\Marked) \"/\" \"Sent\"\r\n";
cmd    += "* STATUS \"Inbox\" ()\r\n";
cmd    += "* STATUS \"Drafts\" (MESSAGES 2 RECENT 0 UIDNEXT 78 UIDVALIDITY 1215099938 UNSEEN 0)\r\n";
//cmd    += "100-FOO/ OK [ALERT] Mission complete.\r\n";
cmd    += "0CGD0002 OK [ALERT] Logged in.\r\n";

print("INPUT:")
print(cmd);
print("")
print("OUTPUT:")
print(JSON.stringify(parser.parse(cmd)));
