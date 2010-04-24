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
  return (c !== '"' ? '"' : 'QUOTED');
}
"\\"                  { return 'BSLASH'; }
"+"                   { return 'PLUS'; }
[\x21-\x7e]           { return yytext.toUpperCase(); }
<<EOF>>               { return 'EOF'; }

/lex

%%

imap : response EOF { return $1; } ;

address
  : '(' nstring SP nstring SP nstring SP nstring ')' {
      $$ = new Object();
      $$.name = $2;
      $$.adl = $4;
      $$.mailbox = $6;
      $$.host = $8;
    }
  ;

address_list
  : address
    { $$ = [ $1 ]; }
  | address_list address
    { $$ = $1.concat([ $2 ]); }
  ;

address_plist : '(' address_list ')' { $$ = $2; } ;

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
    { $$ = $1.concat([ $3 ]); }
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

body
  : '(' body_type_1part ')'
    { $$ = $2; }
  | '(' body_type_mpart ')'
    { $$ = $2; }
  ;

body_extension
  : nstring
  | digits
  | '(' body_extensions ')'
    { $$ = $2; }
  ;

body_extensions
  : body_extension
    { $$ = [ $1 ]; }
  | body_extensions SP body_extension {
      if ($3.constructor === Array)
        $1.push($3);
      else
        $1.concat([ $3 ]);
      $$ = $1;
    }
  ;

capability_list
  : atom
    { $$ = [ $1 ]; }
  | capability_list SP atom
    { $$ = $1.concat([ $3 ]); }
  ;

capability_data
  : C A P A B I L I T Y
    { $$ = new Object(); $$.CAPABILITY = []; }
  | C A P A B I L I T Y SP capability_list
    { $$ = new Object(); $$.CAPABILITY = $12; }
  ;

char_other : SP | TAB | VTAB | FF ;

continue_req
  : PLUS SP resp_text crlf
    { $$ = new Object(); $$.text = $3; }
  | PLUS crlf
    { $$ = true; }
  ;

crlf
  : CR LF
  ;

date : date_text | QUOTED ;

date_day
  : digit
  | digit digit
    { $$ = "" + $1 + $2; }
  ;

date_day_fixed
  : SP digit
    { $$ = "" + $1 + $2; }
  | digit digit
    { $$ = "" + $1 + $2; }
  ;

date-month
  : J A N
    { $$ = "Jan"; }
  | F E B
    { $$ = "Feb"; }
  | M A R
    { $$ = "Mar"; }
  | A P R
    { $$ = "Apr"; }
  | M A Y
    { $$ = "May"; }
  | J U N
    { $$ = "Jun"; }
  | J U L
    { $$ = "Jul"; }
  | A U G
    { $$ = "Aug"; }
  | S E P
    { $$ = "Sep"; }
  | O C T
    { $$ = "Oct"; }
  | N O V
    { $$ = "Nov"; }
  | D E C
    { $$ = "Dec"; }
  ;

date_text
  : date_day '-' date_month '-' date_year
    { $$ = "" + $1 + $2 + $3 + $4 + $5; }
  ;

date_year 
  : digit digit digit digit 
    { $$ = "" + $1 + $2 + $3 + $4; }
  ;

digit : digit_nz | digit_z ;

digits
  : digit
  | digits digit
    { $$ = "" + $1 + $2 }
  ;

digit_nz : '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' ;

digit_z : '0' ;

envelope
  : '(' nstring SP nstring SP naddress_plist SP naddress_plist SP 
        naddress_plist SP naddress_plist SP naddress_plist SP 
        naddress_plist SP nstring SP nstring ')' {
      $$              = new Object();
      $$.date         = $2;
      $$.subject      = $4;
      $$.from         = $6;
      $$.sender       = $8;
      $$.reply_to     = $10;
      $$.to           = $12;
      $$.cc           = $14;
      $$.bcc          = $16;
      $$.in_reply_to  = $18;
      $$.message_id   = $20;
    }
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
  | flag_keyword
  | flag_extension
  ;

flag_extension
  : BSLASH atom
    { $$ = "" + $1 + $2; }
  ;

flag_keyword : atom ;

flag_perm
  : BSLASH '*'
    { $$ = "" + $1 + $2; }
  | flag
  ;

flag_list
  : flag
    { $$ = [ $1 ]; }
  | flag_list SP flag
    { $$ = $1.concat([ $3 ]); }
  ;

flag_perm_list
  : flag_perm
    { $$ = [ $1 ]; }
  | flag_perm_list SP flag_perm
    { $$ = $1.concat([ $3 ]); }
  ;

mailbox
  : astring
    { $$ = ($1.toUpperCase() === "INBOX" ? "INBOX" : $1); }
  ;

mailbox_data
  : F L A G S SP flag_list
    { $$ = new Object(); $$.FLAGS = $7; }
  | L I S T SP mailbox_list
    { $$ = new Object(); $$.LIST = $6; }
  | L S U B SP mailbox_list
    { $$ = new Object(); $$.LSUB = $6; }
  | S E A R C H
    { $$ = new Object(); $$.SEARCH = true; }
  | S E A R C H SP number_nz
    { $$ = new Object(); $$.SEARCH = parseInt($8); }
  | S T A T U S SP mailbox SP '(' ')'
    { $$ = new Object(); $$.STATUS = new Object(); $$.STATUS.mailbox = $8; }
  | S T A T U S SP mailbox SP '(' status_att_list ')'
    { $$ = new Object(); $$.STATUS = $11; $$.STATUS.mailbox = $8; }
  | digits SP E X I S T S
    { $$ = new Object(); $$.EXISTS = parseInt($1); }
  | digits SP R E C E N T
    { $$ = new Object(); $$.RECENT = parseInt($1); }
  ;

mailbox_list
  : '(' ')' SP nquoted SP mailbox
    { $$ = new Object(); $$.separator = $4; $$.mailbox = $6; }
  | '(' mbx_list_flags ')' SP nquoted SP mailbox
    { $$ = new Object(); $$.flags = $2; $$.separator = $5; $$.mailbox = $7; }
  ;

mbx_list_flags
  : mbx_list_flag
    { $$ = [ $1 ]; }
  | mbx_list_flags SP mbx_list_flag
    { $$ = $1.concat([ $3 ]); }
  ;

mbx_list_flag
  : BSLASH N O S E L E C T
    { $$ = $1 + "Noselect"; }
  | BSLASH M A R K E D
    { $$ = $1 + "Marked"; }
  | BSLASH U N M A R K E D
    { $$ = $1 + "Unmarked"; }
  | BSLASH N O I N F E R I O R S 
    { $$ = $1 + "Noinferiors"; }
  | flag_extension
  ;

message_data
  : digits SP E X P U N G E
    { $$ = new Object(); $$.EXPUNGE = parseInt($1); }
  | digits SP F E T C H SP msg_att {
      $$ = new Object();
      $$.FETCH = new Object();
      $$.FETCH.uid = parseInt($1);
      $$.FETCH.att = $9;
    }
  ;

msg_att
  : '(' msg_att_list ')'
    { $$ = $2 }
  ;

msg_att_list
  : msg_att_dynamic
    { $$ = [ $1 ]; }
  | msg_att_static
    { $$ = [ $1 ]; }
  | msg_att_list SP msg_att_dynamic
    { $$ = $1.concat([ $3 ]); }
  | msg_att_list SP msg_att_static
    { $$ = $1.concat([ $3 ]); }
  ;

msg_att_dynamic
  : F L A G S SP '(' ')'
    { $$ = new Object(); $$.FLAGS = []; }
  | F L A G S SP '(' flag_list ')'
    { $$ = new Object(); $$.FLAGS = $8; }
  ;

msg_att_static
  : E N V E L O P E SP envelope
    { $$ = new Object(); $$.ENVELOPE = $10; }
  | I N T E R N A L D A T E SP QUOTED
    { $$ = new Object(); $$.INTERNALDATE = $14; }
  | R F C 8 2 2 SP nstring
    { $$ = new Object(); $$.RFC822 = $8; }
  | R F C 8 2 2 '.' H E A D E R SP nstring
    { $$ = new Object(); $$["RFC822.HEADER"] = $15; }
  | R F C 8 2 2 '.' T E X T SP nstring
    { $$ = new Object(); $$["RFC822.TEXT"] = $13; }
  | R F C 8 2 2 '.' S I Z E SP digits 
    { $$ = new Object(); $$["RFC822.SIZE"] = parseInt($13); }
  | B O D Y SP body
    { $$ = new Object(); $$.BODY = $6; }
  | B O D Y S T R U C T U R E SP body
    { $$ = new Object(); $$.BODYSTRUCTURE = $15; }
  | B O D Y section SP nstring
    { $$ = new Object(); $$["BODY"+$5] = $7; }
  | B O D Y section '<' digits '>' SP nstring
    { $$ = new Object(); $$["BODY"+$5+"<"+$7+">"] = $10; }
  | U I D SP number_nz
    { $$ = new Object(); $$UID = parseInt($5); }
  ;

naddress_plist : address_plist | nil ;

nil : N I L { $$ = undefined; } ;

nquoted : QUOTED | nil ;

nstring : string | nil ;

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
    { $$ = [ $1 ]; }
  | response_nonterms response_done
    { $$ = $1.concat([ $2 ]); }
  ;

response_data
  : '*' SP resp_cond_state crlf
    { $$ = $3; }
  | '*' SP mailbox_data crlf
    { $$ = $3; }
  | '*' SP message_data crlf
    { $$ = $3; }
  | '*' SP capability_data crlf
    { $$ = $3; }
  ;

response_done
  : response_tagged
    { $$ = new Object(); $$.TAGGED = $1; }
  | response_fatal
    { $$ = new Object(); $$.FATAL = $1; }
  ;

response_fatal
  : '*' SP resp_cond_bye crlf
    { $$ = $3; }
  ;

response_nonterm
  : continue_req
    { $$ = new Object(); $$.CONTINUE = $1; }
  | response_data 
    { $$ = new Object(); $$.DATA = $1; }
  ;

response_nonterms
  : response_nonterm
    { $$ = [ $1 ]; }
  | response_nonterms response_nonterm  
  { $$ = $1.concat([ $2 ]); }
  ;

response_tagged
  : tag SP resp_cond_state crlf
    { $$ = $3; $$.tag = $1; }
  ;

resp_cond_bye
  : B Y E SP resp_text
    { $$ = new Object(); $$.text = $5; }
  ;

resp_cond_state
  : O K SP resp_text
    { $$ = new Object(); $$.status = "OK"; $$.text = $4; }
  | N O SP resp_text
    { $$ = new Object(); $$.status = "NO"; $$.text = $4; }
  | B A D SP resp_text
    { $$ = new Object(); $$.status = "BAD"; $$.text = $4; }
  ;

resp_text
  : '[' resp_text_code ']' SP text
    { $$ = new Object(); $$.code = $2; $$.text = $5; }
  | text
    { $$ = new Object(); $$.text = $1; }
  ;

resp_text_code
  : A L E R T
    { $$ = new Object(); $$.ALERT = []; }
  | B A D C H A R S E T
    { $$ = new Object(); $$.BADCHARSET = []; }
  | B A D C H A R S E T SP '(' astring_list ')'
    { $$ = new Object(); $$.BADCHARSET = $13; }
  | capability_data
  | P A R S E
    { $$ = new Object(); $$.PARSE = []; }
  | P E R M A N E N T F L A G S SP '(' ')'
    { $$ = new Object(); $$.PERMANENTFLAGS = []; }
  | P E R M A N E N T F L A G S SP '(' flag_perm_list ')'
    { $$ = new Object(); $$.PERMANENTFLAGS = $17; }
  | R E A D '-' O N L Y
    { $$ = new Object(); $$.READ_ONLY = []; }
  | R E A D '-' W R I T E
    { $$ = new Object(); $$.READ_WRITE = []; }
  | T R Y C R E A T E
    { $$ = new Object(); $$.TRYCREATE = []; }
  | U I D N E X T SP number_nz
    { $$ = new Object(); $$.UIDNEXT = parseInt($9); }
  | U I D V A L I D I T Y SP number_nz
    { $$ = new Object(); $$.UIDVALIDITY = parseInt($13); }
  | U N S E E N SP number_nz
    { $$ = new Object(); $$.UNSEEN = parseInt($8); }
  | atom SP text_nobr
    { $$ = new Object(); $$[$1] = $3; }
  ;

status_att
  : M E S S A G E S
    { $$ = "MESSAGES"; }
  | R E C E N T
    { $$ = "RECENT"; }
  | U I D N E X T
    { $$ = "UIDNEXT"; }
  | U I D V A L I D I T Y
    { $$ = "UIDVALIDITY"; }
  | U N S E E N
    { $$ = "UNSEEN"; }
  ;

status_att_list
  : status_att SP digits
    { var i = new Object(); i[$1] = parseInt($3); $$ = i; }
  | status_att_list SP status_att SP digits
    { $1[$3] = parseInt($5); $$ = $1; }
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

