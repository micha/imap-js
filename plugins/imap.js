#!coffee -p

config:   $.require("config")
LongPoll: $.require("longpoll").LongPoll
Thread:   $.require("thread").Thread

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

_send: ((cmd, success, failure, handlers) ->
  @threads.running: true
  id: @next()

  cmd: id + " " + cmd + "\r\n"
  console.log(cmd)

  if (handlers?)
    for hlr of handlers
      $(document).bind(hlr+"."+id, handlers[hlr])

  $(document).bind("imap_tagged_status."+id, (event, resp) =>
    if (resp.id != id) then return

    console.log("send: id="+resp.id+", status="+resp.status)

    if (resp.status == "OK" && success?)
      success(resp)
    else if (failure?)
      failure(resp)

    $(document).unbind("."+id)
    @threads.running: false
  )
   
  @longpoll.send(cmd)

  return this
)

Imap: ((url) ->
  @url:   url

  # keepalive setInterval handle
  @ping:  null

  # unseen messages updater setInterval handle
  @unseen: null

  # "Background" process queues.
  @threads: new Thread()

  # 0 => not connected
  # 1 => connected
  # 2 => authenticated
  # 3 => selected
  @state: 0

  @user:    null
  @boxes:   []
  @mailbox: null
  
  $(document).bind("imap_state", (event, imap) =>
    interval: config.status_poll_interval

    if (@state == 2 && interval > 0)
      setTimeout((unseen: ( => 
        return if @state < 2

        @list((boxes) =>
          for box in boxes
            @status(true, box.name)
          @threads.add(true, ( -> setTimeout(unseen, interval) ))
        )
      )), interval)
  )

  $(document).bind("imap_untagged_status", (event, resp) => 
    if (@state == 0 && resp.status == "OK")
      if (0 < config.keepalive_interval < config.status_poll_interval)
        @ping: setInterval((ping: ( => @noop(true))), config.keepalive_interval)
      @threads.start()
      @setState(1)
      console.log(resp.comment)
    else if (@state == 0 && resp.status == "PREAUTH")
      @ping: setInterval((ping: ( => @noop())), 150000)
      @setState(2)
      console.log(resp.comment)
    else if (@state > 0 && resp.status == "BYE")
      clearInterval(@ping) if (@ping?)
      @threads.stop()
      clearInterval(@unseen) if (@unseen?)
      @login: null
      @setState(0)
      console.log(resp.comment)
  )

  $(document).bind("imap_unknown", (event, resp) =>
    console.log("UNKNOWN RESPONSE: "+resp.unknown)
  )

  @longpoll: new LongPoll(url)

  @longpoll.onData: ((responseText) ->
    console.log(responseText)
    parse({ text: responseText })
  )

  @longpoll.onError: ((responseText) =>
    console.log("ERROR: "+responseText)
    @setState(0)
  )

  return this
)

Imap.prototype.connect: ((host, port) ->
  @longpoll.connect(host, port)
  return this
)

Imap.prototype.setState: ((state) ->
  @state: state
  if (state < 3) then @mailbox: null

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

Imap.prototype.send: ( ->
  preempt: arguments.shift()
  args: arguments

  @threads.add(preempt, ( => _send.apply(this, args) ))
  return this
)

Imap.prototype.noop: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [success, failure]: arguments

  @send(preempt, "NOOP", success, failure)
  return this
)

Imap.prototype.login: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [user, pass, success, failure]: arguments

  @send(preempt, "LOGIN \""+user+"\" \""+pass+"\"", ((resp) =>
    @login: user
    @setState(2)
    success(resp.comment)
  ), ((resp) ->
    failure(resp.comment)
  ))
  return this
)

Imap.prototype.select: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [mailbox, success, failure]: arguments

  handlers: {
    "imap_untagged_status": ((event, resp) ->
      if (resp.code == "PERMANENTFLAGS")
        console.log()
    ),
    "imap_exists": ((event, resp) ->
      console.log(resp.exists+" messages!")
    )
  }

  _success: ((text) =>
    @mailbox: mailbox
    @setState(3)
    success(text) if (success?)
  )

  @send(preempt, "SELECT \""+mailbox+"\"", _success, failure, handlers)
  return this
)

Imap.prototype.examine: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [mailbox, success, failure]: arguments

  handlers: {
    "imap_untagged_status": ((event, resp) ->
      if (resp.code == "PERMANENTFLAGS")
        console.log()
    ),
    "imap_exists": ((event, resp) ->
      console.log(resp.exists+" messages!")
    ),
    "imap_recent": ((event, resp) ->
      console.log(resp.recent+" recent!")
    )
  }

  _success: ((text) =>
    success(text) if (success?)
  )

  @send(preempt, "EXAMINE \""+mailbox+"\"", _success, failure, handlers)
  return this
)

Imap.prototype.status: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [mailbox, success, failure]: arguments

  handlers: {
    "imap_mbox_status": ((event, resp) => 
      for box in @boxes
        if (box.name == resp.mailbox)
          flag: false
          for i in ["MESSAGES","RECENT","UIDNEXT","UIDVALIDITY","UNSEEN"]
            if (resp.data[i] != box[i])
              box[i]: resp.data[i]
              flag: true
          $(document).trigger("imap_mbox_changed", [box]) if flag
      success(resp) if (success?)
    )
  }

  @send(preempt, "STATUS \""+mailbox+"\" (MESSAGES RECENT UIDNEXT UIDVALIDITY UNSEEN)", null, failure, handlers)
  return this
)

Imap.prototype.list: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [success, failure]: arguments

  Imap.prototype.list: ((success) ->
    success(@boxes) if (success?)
    return this
  )
  
  @boxes: []

  handlers: {
    "imap_list": ((event, resp) => 
      @boxes.push(resp)
    )
  }

  _success: ( => 
    for box in @boxes
      @status(true, box.name)
    success(@boxes)
  )

  @send(preempt, 'LIST "" %', _success, failure, handlers)
  return this
)

exports.Imap: Imap
