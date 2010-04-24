/* description: Parses IMAP4rev1 responses */

%lex

%%

" "                   { return 'SP'; }
[\r]                  { return 'CR'; }
[\n]                  { return 'LF'; }
[\t]                  { return 'TAB'; }
[\v]                  { return 'VTAB'; }
[\f]                  { return 'FF'; }
[{][0-9]+[}][\r][\n] { 
  var i, ret="", num=parseInt(yytext.substring(1,yytext.length-3)),
      siz=yy.lexer._input.length, putback=yytext.substring(1);
  if (num <= siz)
    for (i=0; i<num; i++)
      ret += yy.lexer.input();
  else
    for (i=putback.length-1; i>=0; i--)
      yy.lexer.unput(putback.charAt(i));
  yytext = (num <= siz ? ret : "\x7b");
  return (num <= siz ? 'LITERAL' : "\x7b");
}
["] {
  var i, c, d, ret = "", tex = yytext;
  while (yy.lexer._input.length > 0 && (c = yy.lexer.input()) !== '"')
    ret += (c === '\\' && ((d = yy.lexer.input()) === '\\' || d === '"') 
      ? d 
      : ((c === '\\') 
        ? (c+d) 
        : c)
    ); 
  if (c !== '"')
    for (i=ret.length-1; i>=0; i--)
      if (ret.charAt(i) !== '"')
        yy.lexer.unput(ret.charAt(i))
  ret = (c !== '"' ? '"' : ret);
  yytext = ret;
  return (ret.length > 1 ? 'QUOTED' : '"');
}
"\\"                  { return 'BSLASH'; }
"+"                   { return 'PLUS'; }
[\x21-\x7e]           { return yytext.toUpperCase(); }
<<EOF>>               { return 'EOF'; }

/lex

%%

imap
  : response EOF
  ;

alpha : 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'I' | 'J' | 'K' | 'L' 
      | 'M' | 'N' | 'O' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'W' | 'X'
      | 'Y' | 'Z' ;

alnum : alpha | digit ;

astring
  : astring_chars
  | string
  ;

astring_char : alnum | punct_other | punct_base64 | punct_resp_specials ;

astring_chars
  : astring_char
  | astring_chars astring_char
    { $$ = "" + $1 + $2; }
  ;

astring_list
  : astring
    { $$ = [ $1 ]; }
  | astring_list SP astring
    { $$ = $1.concat($3); }
  ;

atom
  : atom_char
  | atom atom_char
    { $$ = "" + $1 + $2; }
  ;

atom_char : alnum | punct_other | punct_base64 ;

base64
  : 4base64_chars base64_terminal
    { $$ = "" + $1 + $2; }
  | 4base64_chars
  | base64_terminal
  ;

base64_char
  : alnum
  | punct_base64
  ;

4base64_chars
  : base64_char base64_char base64_char base64_char 
    { $$ = "" + $1 + $2 + $3 + $4; }
  | 4base64_chars base64_char base64_char base64_char base64_char
    { $$ = "" + $1 + $2 + $3 + $4 + $5; }
  ;

base64_terminal
  : base64_char base64_char '=' '='
    { $$ = "" + $1 + $2 + $3 + $4; }
  | base64_char base64_char base64_char '='
    { $$ = "" + $1 + $2 + $3 + $4; }
  ;

capability_list
  : atom
    { $$ = [ $1 ]; }
  | capability_list SP atom
    { $$ = $1.concat($3); }
  ;

capability_data
  : C A P A B I L I T Y
    { yy.out.type = "CAPABILITY"; }
  | C A P A B I L I T Y SP capability_list
    { yy.out.type = "CAPABILITY"; yy.out.args = $12; }
  ;

char_other : SP | TAB | VTAB | FF ;

continue_req
  : PLUS SP resp_text crlf
    { yy.out.type = "CONTINUE"; }
  | PLUS crlf
    { yy.out.type = "CONTINUE"; }
  ;

crlf
  : CR LF
  ;

digit : digit_nz | digit_z ;

digits
  : digit
  | digits digit
    { $$ = "" + $1 + $2 }
  ;

digit_nz : '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' ;

digit_z : '0' ;

digits
  : digit
    { $$ = parseInt($1); }
  | digits digit
    { $$ = 10 * $1 + parseInt($2); }
  ;

flag
  : BSLASH A N S W E R E D
    { $$ = $1+"Answered"; }
  | BSLASH F L A G G E D
    { $$ = $1 + "Flagged"; }
  | BSLASH D E L E T E D
    { $$ = $1 + "Deleted"; }
  | BSLASH S E E N
    { $$ = $1 + "Seen"; }
  | BSLASH D R A F T
    { $$ = $1 + "Draft"; }
  | BSLASH atom
    { $$ = "" + $1 + $2; }
  | atom
  ;

flag_perm
  : BSLASH '*'
    { $$ = "" + $1 + $2; }
  | flag
  ;

flag_list
  : flag
    { $$ = [ $1 ]; }
  | flag_list SP flag
    { $$ = $1.concat($3); }
  ;

flag_perm_list
  : flag_perm
    { $$ = [ $1 ]; }
  | flag_perm_list SP flag_perm
    { $$ = $1.concat($3); }
  ;

mailbox_data
  : F L A G S SP flag_list
    { yy.out.type = "FLAGS"; yy.out.args = $7; }
  | L I S T SP mailbox_list
    { yy.out.type = "LIST"; yy.out.args = $6; }
  | L S U B SP mailbox_list
    { yy.out.type = "LSUB"; yy.out.args = $6; }
  | S E A R C H
    { yy.out.type = "SEARCH"; }
  | S E A R C H SP number_nz
    { yy.out.type = "SEARCH"; yy.out.args = [ parseInt($8) ]; }
  | S T A T U S SP mailbox SP '(' ')'
    { yy.ouy.type = "STATUS"; }
  | S T A T U S SP mailbox SP '(' status_att_list ')'
    { yy.ouy.type = "STATUS"; yy.out.mailbox = $8; yy.out.args = $11; }
  ;

message_data
  :
  ;

number_nz
  : digit_nz digits
    { $$ = "" + $1 + $2; }
  ;

punct_base64 : '/' | PLUS ;

punct_atom_specials : '(' | ')' | '{' ;

punct_list_wildcards : '%' | '*' ;

punct_resp_specials : ']' ;
   
punct_other : '!' | '#' | '$' | '&' | "'" | ',' | '-' | '.' | ':' | ';' | '<'
            | '=' | '>' | '?' | '@' | '[' | '^' | '_' | '`' | '|' | '}'
            | '~' ;

punct_quoted_specials : '"' | '\\' ;

response
  : response_done
  | response_nonterms response_done
  ;

response_data
  : '*' SP resp_cond_state crlf
  | '*' SP mailbox_data crlf
  | '*' SP message_data crlf
  | '*' SP capability_data crlf
  ;

response_done
  : response_tagged
    { yy.trigger(); }
  | response_fatal
    { yy.trigger(); }
  ;

response_fatal
  : '*' SP resp_cond_bye crlf
  ;

response_nonterm
  : continue_req
    { yy.trigger(); }
  | response_data 
    { yy.trigger(); }
  ;

response_nonterms
  : response_nonterm
  | response_nonterms response_nonterm  
  ;

response_tagged
  : tag SP resp_cond_state crlf
    { yy.out.tag = $1; }
  ;

resp_cond_bye
  : B Y E SP resp_text
    { yy.out.type = "BYE"; }
  ;

resp_cond_state
  : O K SP resp_text
    { yy.out.type = "OK"; }
  | N O SP resp_text
    { yy.out.type = "NO"; }
  | B A D SP resp_text
    { yy.out.type = "BAD"; }
  ;

resp_text
  : '[' resp_text_code ']' SP text
    { yy.out.text = $5; }
  | text
    { yy.out.text = $1; }
  ;

resp_text_code
  : A L E R T
    { yy.out.code = "ALERT"; }
  | B A D C H A R S E T
    { yy.out.code = "BADCHARSET"; }
  | B A D C H A R S E T SP '(' astring_list ')'
    { yy.out.code = "BADCHARSET"; yy.out.args = $13; }
  | capability_data
    { yy.out.code = "CAPABILITY"; }
  | P A R S E
    { yy.out.code = "PARSE"; }
  | P E R M A N E N T F L A G S SP '(' ')'
    { yy.out.code = "PERMANENTFLAGS"; }
  | P E R M A N E N T F L A G S SP '(' flag_perm_list ')'
    { yy.out.code = "PERMANENTFLAGS"; yy.out.args = $17; }
  | R E A D '-' O N L Y
    { yy.out.code = "READ-ONLY"; }
  | R E A D '-' W R I T E
    { yy.out.code = "READ-WRITE"; }
  | T R Y C R E A T E
    { yy.out.code = "TRYCREATE"; }
  | U I D N E X T SP number_nz
    { yy.out.code = "UIDNEXT"; yy.out.args = [parseInt($9)]; }
  | U I D V A L I D I T Y SP number_nz
    { yy.out.code = "UIDVALIDITY"; yy.out.args = [parseInt($13)]; }
  | U N S E E N SP number_nz
    { yy.out.code = "UNSEEN"; yy.out.args = [parseInt($8)]; }
  | atom SP text_nobr
    { yy.out.code = $1; yy.out.args = [$3]; }
  ;

string : QUOTED | LITERAL ;

tag : tag_chars ;

tag_char : alnum | punct_other | '/' | punct_resp_specials ;

tag_chars
  : tag_char
  | tag_chars tag_char
    { $$ = "" + $1 + $2; }
  ;

text
  : text_char
  | text text_char
    { $$ = "" + $1 + $2; }
  ;

text_char : text_char_nobr | punct_resp_specials ;

text_char_nobr 
  : QUOTED { 
      var i, putback=$1.replace(/"/g,"\\\"").replace(/\\/g,"\\\\") + '"',
          len=yy.lexer.yytext.length;
      if (len > 0)
        for (i=yytext.length-1; i>=0; i--)
          yy.lexer.unput(yy.lexer.yytext.charAt(i));
      for (i=putback.length-1; i>=0; i--)
        yy.lexer.unput(putback.charAt(i));
      if (len > 0)
        yy.lexer.next();
      $$ = "\"";
    }
  | LITERAL {
      var i, num=$1.length, len=yy.lexer.yytext.length, putback="\r\n"+$1;
      if (len > 0)
        for (i=yytext.length-1; i>=0; i--)
          yy.lexer.unput(yy.lexer.yytext.charAt(i));
      for (i=putback.length-1; i>=0; i--)
        yy.lexer.unput(putback.charAt(i));
      if (len > 0)
        yy.lexer.next();
      $$ = "\x7b" + num + "\x7d";
    }
  | base64_char
  | punct_other
  | punct_list_wildcards
  | punct_atom_specials
  | punct_quoted_specials
  | char_other
  ;

text_nobr
  : text_char_nobr
  | text_nobr text_char_nobr
    { $$ = "" + $1 + $2; }
  ;

