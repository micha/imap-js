/*
 * First run jison on plugins/imap/parser.jison to generate ./parser.js.
 * Then run this script like `narwhal test_parser.js`.
 */

var parser = require("./parser").parser;

parser.yy = { 
  out: {},
  trigger: function() { 
    print(JSON.stringify(parser.yy.out)); 
    parser.yy.out = {};
  } 
};

var cmd = "+ Ready for literal data\r\n";
cmd    += "* CAPABILITY IMAP4rev1\r\n";
cmd    += "* FLAGS \\Seen \\Answered\r\n";
cmd    += "* SEARCH\r\n";
cmd    += "* SEARCH 40962\r\n";
cmd    += "* OK [PARSE] Mission complete.\r\n";
cmd    += "100-FOO/ OK [ALERT] Mission complete.\r\n";

print("INPUT:")
print(cmd);
print("")
print("OUTPUT:")
parser.parse(cmd);
