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

var cmd = "+ 01WAsP+/dc==\r\n";
cmd    += "* BYE [BADCHARSET ({4}\r\n";
cmd    += "poiu asdf \"this is a quoted string\" zxcv)] Disconnected due to inactivity.\r\n";

parser.parse(cmd);
