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
  var ret = "", num = parseInt(yytext.substring(1,yytext.length-3));
  for (i=0; i<num; i++)
    ret += yy.lexer.input();
  yytext = ret;
  return 'LITERAL';
}
["] {
  var c, d, ret = "";
  while ((c = yy.lexer.input()) !== '"')
    ret += (c === '\\' && ((d = yy.lexer.input()) === '\\' || d === '"') 
      ? d 
      : ((c === '\\') 
        ? (c+d) 
        : c)
    ); 
  yytext = ret;
  return 'QUOTED';
}
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

astring_char : alnum | punct_other | punct_base64 ;

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

capability_data
  : 
  ;

char_other : SP | TAB | VTAB | FF ;

continue_req
  : '+' SP resp_text crlf
      { yy.out.text = $3; }
  | '+' SP base64 crlf
      { yy.out.base64 = $3; }
  | '+' crlf
  ;

crlf
  : CR LF
  ;

digit : '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' ;

digits
  : digit
    { $$ = parseInt($1); }
  | digits digit
    { $$ = 10 * $1 + parseInt($2); }
  ;

punct_base64 : '/' | '+' ;

punct_atom_specials : '(' | ')' | '{' ;

punct_list_wildcards : '%' | '*' ;

punct_other : '!' | '#' | '$' | '&' | "'" | ',' | '-' | '.' | ':' | ';' | '<'
            | '=' | '>' | '?' | '@' | '[' | ']' | '^' | '_' | '`' | '|' | '}'
            | '~' ;

punct_quoted_specials : '"' | '\\' ;

response
  : response_done
  | response_nonterms response_done
  ;

response_data
  : '*' SP crlf
  ;

response_done
  : response_tagged
  | response_fatal
    { yy.out.type = "FATAL"; yy.trigger(); }
  ;

response_fatal
  : '*' SP resp_cond_bye crlf
  ;

response_nonterm
  : continue_req { 
      yy.out.type = "CONTINUE";
      yy.trigger(); 
    }
  | response_data
  ;

response_nonterms
  : response_nonterm
  | response_nonterms response_nonterm  
  ;

resp_cond_bye
  : B Y E SP resp_text
  ;

resp_text
  : '[' resp_text_code ']' SP text
    { yy.literal = false; yy.out.text = $5; }
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
  | P A R S E
    { yy.out.code = "PARSE"; }
  | P E R M A N E N T F L A G S SP '(' ')'
  | P E R M A N E N T F L A G S SP '(' flag_perm_list ')'
  ;

string : QUOTED | LITERAL ;

text
  : text_char
  | text text_char
    { $$ = "" + $1 + $2; }
  ;

text_char 
  : QUOTED
    { $$ = $$.replace(/"/g,"\\\"").replace(/\\/g,"\\\\"); $$ = "\""+$1+"\""; }
  | LITERAL {
      var i, num = $1.length;
      $$ = "\x7b" + num + "\x7d\r\n";
      for (i=num-1; i>=0; i--)
        yy.lexer.unput($1.charAt(i));
    }
  | error
    { print("-----------> error <---------------"); }
  | base64_char
  | punct_other
  | punct_list_wildcards
  | punct_atom_specials
  | punct_quoted_specials
  | char_other
  ;
