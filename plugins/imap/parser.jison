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
  : QUOTED { 
      var i, str=$1.replace(/"/g,"\\\"").replace(/\\/g,"\\\\") + '"',
          len=yy.lexer.yytext.length;
      if (len > 0)
        for (i=yytext.length-1; i>=0; i--)
          yy.lexer.unput(yy.lexer.yytext.charAt(i));
      for (i=str.length-1; i>=0; i--)
        yy.lexer.unput(str.charAt(i));
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
