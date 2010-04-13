#!coffee -p

token: ((s, pat) ->
  if ( s != undefined && (match: s.text.match(pat)) )
    s.text: s.text.replace(pat, "")
    s._match: match
    return s
  else
    return undefined
)

parse_flags_resp: ((resp) ->
  pat: /^FLAGS \(([^\)]*)\)\r\n/i

  if ( token(resp, pat) == undefined ) then return undefined

  resp.flags: {}

  for i in resp._match[1].split(" ")
    resp.flags[i]: true

  $(document).trigger("imap_flags", [resp])
  return resp
)

parse_exists_resp: ((resp) ->
  pat: /^([0-9]+) EXISTS\r\n/

  if ( token(resp, pat) == undefined ) then return undefined

  resp.exists: resp._match[1]

  $(document).trigger("imap_exists", [resp])
  return resp
)

parse_recent_resp: ((resp) ->
  pat: /^([0-9]+) RECENT\r\n/

  if ( token(resp, pat) == undefined ) then return undefined

  resp.recent: resp._match[1]

  $(document).trigger("imap_recent", [resp])
  return resp
)

parse_status_resp: ((resp) ->
  pat: /^(OK|NO|BAD|PREAUTH|BYE)( \[((ALERT|BADCHARSET|CAPABILITY|PARSE|PERMANENTFLAGS|READ-ONLY|READ-WRITE|TRYCREATE|UIDNEXT|UIDVALIDITY|UNSEEN)( ([^\]]+))?)\])?( ([^\r\n]+))?\r\n/i

  if ( token(resp, pat) == undefined ) then return undefined

  resp.status:  resp._match[1]
  resp.code:    resp._match[4] || ""
  resp.args:    resp._match[6]
  resp.comment: resp._match[8]

  args:         resp.args

  if (resp.code.match(/^(BADCHARSET|PERMANENTFLAGS)$/i))
    resp.args: {}
    if ( (m: args.match(/^\(([^ ].*)\)$/)) )
      for i in m[1].split(" ")
        resp.args[i]: true
  else if (resp.code == "CAPABILITY")
    resp.args: {}
    for i in args.split(" ")
      resp.args[i]: true

  $(document).trigger("imap_"+resp.type+"_status", [resp])
  return resp
)

parse_list_resp: ((resp) ->
  pat: /^LIST \(([^\)]+)*\) "(.)" "([^\r\n]+)"\r\n/i
  if ( token(resp, pat) == undefined ) then return undefined

  resp.list: true
  resp.attr: {}
  
  for i in resp._match[1].split(" ")
    resp.attr[i]: true

  resp.separator: resp._match[2]
  resp.name: resp._match[3]
  
  $(document).trigger("imap_list", [resp])
  return resp
)

parse_mbox_status_resp: ((resp) ->
  pat: /^STATUS "([^"]+)" \(([^\)]*)\)\r\n/
  if ( token(resp, pat) == undefined ) then return undefined

  resp.mailbox: resp._match[1]
  resp.data:    {}

  data: resp._match[2].split(" ")
  i: 0
  while (i++ < data.length)
    resp.data[data[i-1]]: data[i++]

  $(document).trigger("imap_mbox_status", [resp])
  return resp
)

parse_unknown_resp: ((resp) ->
  pat: /^([^\r\n]+)\r\n/
  if ( token(resp, pat) == undefined ) then return undefined

  resp.unknown: resp._match[1]

  $(document).trigger("imap_unknown", [resp])
  return resp
)

parse_untagged_resp: ((resp) ->
  if (token(resp, /^\* /) == undefined) then return undefined

  resp.type: "untagged"

  return parse_status_resp(resp) || 
    parse_list_resp(resp) ||
    parse_flags_resp(resp) ||
    parse_exists_resp(resp) ||
    parse_recent_resp(resp) ||
    parse_mbox_status_resp(resp) ||
    parse_unknown_resp(resp)
)

parse_continuation_resp: ((resp) ->
  if (token(resp, /^\+ /) == undefined) then return undefined
  resp.type: "continuation"
  console.log(resp)
  return resp
)

parse_tagged_resp: ((resp) ->
  if (token(resp, /^([A-Z0-9]+) /) == undefined) then return undefined
  resp.id: resp._match[1]
  resp.type: "tagged"
  return parse_status_resp(resp)
)

parse_one: ((resp) ->
  return parse_untagged_resp(resp) ||
    parse_continuation_resp(resp) ||
    parse_tagged_resp(resp) ||
    console.log("OH SHIT: '"+resp.text+"'")
)

parse: ((resp) ->
  while (resp? && resp.text? && resp.text.length > 0)
    resp: parse_one( { text: resp.text } )
)

exports.parse: parse
