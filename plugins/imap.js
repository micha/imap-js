#!coffee -p

token: ((s, pat) ->
  if ( s != undefined && (match: s.text.match(pat)) )
    s.text: s.text.replace(pat, "")
    s._match: match
    return s
  else
    return undefined
)

parse_status_resp: ((resp) ->
  pat: /^(OK|NO|BAD|PREAUTH|BYE)( \[(ALERT|BADCHARSET|CAPABILITY|PARSE|PERMANENTFLAGS|READ-ONLY|READ-WRITE|TRYCREATE|UIDNEXT|UIDVALIDITY|UNSEEN)\])?( ([^\r\n]+))?\r\n/i
  if ( token(resp, pat) == undefined ) then return undefined

  resp.status: resp._match[1]
  resp.code: resp._match[3]
  resp.args: resp._match[5]
  $(document).trigger("imap_status", [resp])
  return resp
)

parse_list_resp: ((resp) ->
  pat: /^LIST \(([^\)]+)*\) "(.)" "([^\r\n]+)"\r\n/i
  if ( token(resp, pat) == undefined ) then return undefined

  resp.list: true
  resp.attr: resp._match[1].split(" ")
  resp.separator: resp._match[2]
  resp.name: resp._match[3]
  $(document).trigger("imap_list", [resp])
  return resp
)

parse_untagged: ((resp) ->
  if (token(resp, /^\* /) == undefined) then return undefined
  resp.type: "untagged"
  return parse_status_resp(resp) || 
    parse_list_resp(resp)
)

parse_continuation: ((resp) ->
  if (token(resp, /^\+ /) == undefined) then return undefined
  resp.type: "continuation"
  console.log(resp)
  return resp
)

parse_tagged: ((resp) ->
  if (token(resp, /^([A-Z0-9]+) /) == undefined) then return undefined
  resp.id: resp._match[1]
  resp.type: "tagged"
  return parse_status_resp(resp)
)

parse_one: ((resp) ->
  return parse_untagged(resp) ||
    parse_continuation(resp) ||
    parse_tagged(resp) ||
    console.log("OH SHIT: '"+resp.text+"'")
)

parse: ((resp) ->
  while (resp? && resp.text? && resp.text.length > 0)
    resp: parse_one( { text: resp.text } )
)

Imap: ((url, host, port) ->
  @url:   url
  @host:  host
  @port:  port

  # 0 => not connected
  # 1 => connected
  # 2 => authenticated
  # 3 => selected
  @state: 0
  
  @queue: []

  connect: ( ->
    $.ajax({
      url: url,
      data: { rhost:host, rport:port }
    })
  )

  $(document).bind("imap_status", (event, resp) => 
    if (resp.type == "tagged") then return

    if (@state == 0 && resp.status == "OK")
      @setState(1)
      console.log(resp.args)
    else if (@state == 0 && resp.status == "PREAUTH")
      @setState(2)
      console.log(resp.args)
    else if (@state > 0 && resp.status == "BYE")
      @setState(0)
      console.log(resp.args)
  )

  $(document).bind("imap_state", (event, i) ->
    console.log(">>> "+i.state)
  )

  $(document).ajaxComplete(
    (longPoll: ((e, xhr, settings) =>
      set_url: settings.url.replace(/\?.*$/, "")
      if (set_url == url && settings.type == "GET")
        if (xhr.status == 0)
          return $.get(settings.url)
        else if (! (200 <= xhr.status < 300))
          console.log(xhr.responseText)
          @start: 0
          return connect()
        else
          console.log(xhr.responseText)
          parse({ text: xhr.responseText })
        $.get(set_url)
      )
    )
  )

  @setState(0)
  connect()

  setInterval((ping: ( => @noop())), 150000)

  return this
)

Imap.prototype.setState: ((state) ->
  @state: state
  $(document).trigger("imap_state", [this])

  return this
)

Imap.prototype.next: ((id, fmt) ->
  prefix: (for i in [0...fmt.replace(/0/g, "").length]
    (-> this.charAt(Math.random()*this.length))
      .call("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789")
  ).join("")

  fmt: fmt.replace(/X/g, "")

  return ( ->
    id: ++id %  (parseInt(fmt.replace(/0/g, "9")) + 1)
    ret: fmt + id
    prefix + ret.substring(ret.length - fmt.length)
  )
)(0, "XXXX0000")

Imap.prototype.send: ((cmd, success, failure, handlers) ->
  id: @next()

  cmd: id + " " + cmd + "\r\n"
  console.log(cmd)
  $.post(this.url, { command: cmd })

  if (handlers?)
    for hlr of handlers
      $(document).bind(hlr+"."+id, (event, resp) -> handlers[hlr](resp))

  $(document).bind("imap_status."+id, (event, resp) ->
    if (resp.type != "tagged" || resp.id != id) then return

    console.log("send: id="+resp.id+", status="+resp.status)

    if (resp.status == "OK" && success?)
      success(resp)
    else if (failure?)
      failure(resp)

    $(document).unbind("."+id)
  )
   
  return this
)

Imap.prototype.noop: ((success, failure) ->
  @send("NOOP", success, failure)
  return this
)

Imap.prototype.login: ((user, pass, success, failure) ->
  @send("LOGIN \""+user+"\" \""+pass+"\"", ((resp) =>
    @setState(2)
    success(resp)
  ), ((resp) ->
    failure(resp.args)
  ))
  return this
)

Imap.prototype.select: ((mailbox, success, failure) ->
  @send("SELECT \""+mailbox+"\"", success, failure)
  return this
)

Imap.prototype.list: ((success, failure) ->
  boxes: []

  handlers: {
    "imap_list": ((resp) -> boxes.push(resp))
  }

  _success: ( -> success(boxes))

  @send('LIST "" %', _success, failure, handlers)
  return this
)

exports.Imap: Imap
