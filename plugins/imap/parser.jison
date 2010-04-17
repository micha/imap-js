/* description: Parses IMAP4rev1 responses */

%lex

%%

" "                   { return 'SP'; }
"\r\n"                { return 'CRLF'; }
[0-9]+("."[0-9]+)?\b  { return 'NUMBER'; }
"*"                   { return '*'; }
"/"                   { return '/'; }
"-"                   { return '-'; }
"+"                   { return '+'; }
"^"                   { return '^'; }
"("                   { return '('; }
")"                   { return ')'; }
"PI"                  { return 'PI'; }
"E"                   { return 'E'; }
<<EOF>>               { return 'EOF'; }

/lex

%%

response
  : continue_req response_done
  | response_data response_done
  | response_done
  ;

continue_req
  : '+' SP resp_text CRLF
  | '+' SP base64 CRLF
  ;

/*
expressions
    : e EOF
        {print($1); return $1;}
    ;

e
    : e '+' e
        {$$ = $1+$3;}
    | e '-' e
        {$$ = $1-$3;}
    | e '*' e
        {$$ = $1*$3;}
    | e '/' e
        {$$ = $1/$3;}
    | e '^' e
        {$$ = Math.pow($1, $3);}
    | '(' e ')'
        {$$ = $2;}
    | NUMBER
        {$$ = Number(yytext);}
    | E
        {$$ = Math.E;}
    | PI
        {$$ = Math.PI;}
    ;
*/

