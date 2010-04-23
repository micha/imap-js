#!coffee -p

input: ""
output: {}

$tok: ((pat) ->
  match: input.match(pat)
  input: input.replace(pat, "")
  return match
)

$clone: ((obj) ->
  if (obj? && obj.constructor == Array)
    for i in obj
      $clone(i)
  else if (obj? && obj.constructor == Object)
    ret: {}
    for i of obj
      ret[i]: $clone(obj[i])
    return ret
  else
    obj
)

$process_arg: ((f) ->
  g: f
  if (f.constructor == RegExp)
    f: ( -> $tok(g)?)
  else if (f.constructor == String)
    g: new RegExp("^"+f)
    f: ( -> $tok(g)?)
  return f
)

$try: ((f) ->
  f: $and.apply(this,arguments)
  _input:  input
  _output: $clone(output)
  ret: f()
  if (!ret)
    input:  _input
    output: _output
  return ret
)

$or: ( -> 
  _.reduce(arguments, ( -> false), ( (memo,f) -> 
    f: $process_arg(f)
    ( -> return memo() || f() )
  ))
)

$and: ( ->
  _.reduce(arguments, ( -> true), ( (memo,f) -> 
    f: $process_arg(f)
    ( -> return memo() && f() )
  ))
)

$multi: ((f,min,max) ->
  f: $process_arg(f)
  return ( ->
    i: 0
    i++ while (f())
    (min: min || 0) <= i <= (max: max || Infinity)
  )
)

$opt: ((f) ->
  return $multi(f,0,1)
)

crlf: ( ->
  print("> crlf <")
  return $try("\r\n")
)

continue_req: ( ->
  print("> continue_req <")
  return false
)

response_data: ( ->
  print("> response_data <")
  return false
)

response_tagged: ( ->
  print("> response_tagged <")
  return false
)

resp_text_code: ( ->
  print("> resp_text_code <")
  return $try("ALERT") || 
    $try("BADCHARSET",$opt(" \\(HI\\)"))
)

text: ( ->
  print("> text <")
  return $try(/^[^\r\n]+/)
)

resp_text: ( ->
  print("> resp_text <")
  return $try($opt($and("\\[",resp_text_code,"\\] ")),text)
)

resp_cond_bye: ( ->
  print("> resp_cond_bye <")
  return $try("BYE ",resp_text)
)

response_fatal: ( ->
  print("> response_fatal <")
  return $try("[*] ",resp_cond_bye,crlf)
)

response_done: ( ->
  print("> response_done <")
  return $try($or(response_tagged,response_fatal))
)

response: ( ->
  print("> response <")
  return $try($and($multi($or(continue_req,response_data)),response_done))
)

test: ( ->
  require("./scripts/underscore-min")
  input: "* BYE [ALERT] Disconnected.\r\n"
  print("response: "+response())
)

test()
