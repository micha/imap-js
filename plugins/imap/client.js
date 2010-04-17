#!coffee -p

config:   $.require("config")
parse:    $.require("imap/parser").parse
LongPoll: $.require("longpoll").LongPoll
Thread:   $.require("thread").Thread

_send: ((cmd, success, failure, handlers) ->
  @threads.running: true
  id: @next()

  cmd: id + " " + cmd + "\r\n"
  console.log(cmd)

  if (handlers?)
    for hlr of handlers
      $(document).bind(hlr+"."+id, handlers[hlr])

  $(document).bind("imap_tagged_status."+id, (event, resp) =>
    console.log("send: id="+resp.id+", status="+resp.status)

    if (resp.id == id)
      @threads.running: false
      if (resp.status == "OK")
        success(resp) if (success?)
      else
        failure(resp) if (failure?)

    $(document).unbind("."+id)
  )
   
  @longpoll.send(cmd)

  return this
)

Imap: ((url) ->
  @url:   url

  @init: true

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

  # IMAP server capabilities list.
  @capabilities: {}

  # Status notice/error messages
  @flash: { type: null, msg: null }

  # Authenticated user name
  @user:    null

  # List of mailboxes with status info
  @boxes:   []

  # Current selected mailbox
  @mailbox: null
  
  $(document).bind("imap_state", (event, reason) =>
    interval: config.status_poll_interval

    if (@state == 2 && interval > 0)
      setTimeout((unseen: ( => 
        return if @state < 2

        @list((boxes) =>
          for box in boxes
            @status(true, box.name)
          @threads.add(true, ( -> setTimeout(unseen, interval) ))
          @init: false
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
      @flash: { type: "error", msg: resp.comment }
      clearInterval(@ping) if (@ping?)
      @threads.stop()
      clearInterval(@unseen) if (@unseen?)
      @user: null
      @mailbox: null
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
  @capability()
  return this
)

Imap.prototype.setState: ((state) ->
  orig: @state
  @state: state

  if (state < 3) then @mailbox: null
  if (state < 2) then @user: null

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

Imap.prototype.capability: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [success, failure]: arguments

  handlers: {
    "imap_capability": ((event, resp) =>
      @capabilities: resp.capabilities
    )
  }

  @send(preempt, "CAPABILITY", success, failure, handlers)
  return this
)

Imap.prototype.login: ( ->
  arguments.shift() if preempt: (arguments[0] == true)
  [user, pass, success, failure]: arguments

  @send(preempt, "LOGIN \""+user+"\" \""+pass+"\"", ((resp) =>
    @user: user
    @setState(2)
    success(resp.comment) if (success?)
  ), ((resp) =>
    @setState(1)
    failure(resp.comment) if (failure?)
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
      resp.name: mailbox
      console.log(resp.name+": "+resp.exists+" messages!")
      $(document).trigger("imap_select", [resp])
    )
  }

  _success: ((text) =>
    @mailbox: mailbox
    @setState(3)
    success(text) if (success?)
  )

  @threads.clear() if (! @init)
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
