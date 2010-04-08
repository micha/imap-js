#!coffee -p

token: ((s, pat, hlr) ->
  if (s.match(pat))
    return hlr(s.replace(pat, ""))
  else
    return undefined
)

parse: ((resp) ->
  return token(resp, /^\* /, parse_untagged) ||
    token(resp, /^\+ /, parse_continuation) ||
    token(resp, /^[A-Z]+[0-9]+ /, parse_tagged)
)

Imap: ((url, host, port) ->
  @url:   url
  @host:  host
  @port:  port
  
  @buf:   ""
  @start: 0

  connect: ( ->
    $.ajax({
      url: url,
      data: { rhost:"ubergibson.com", rport:143 }
    })
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
        else if (@start++ == 0)
          console.log(xhr.responseText)
        else
          @buf += xhr.responseText
        $.get(set_url)
      )
    )
  )

  connect()

  setInterval((ping: ( => @noop())), 150000)

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

parseUntagged: ((untagged) ->
  p_status: /^\* (OK|NO|BAD|PREAUTH|BYE)( \[([^\]]+)\])?( (.*))?\r\n/i
)

Imap.prototype.send: ((cmd, success, failure) ->
  id: @next()
  verb: cmd.replace(/ .*$/, "")
  pattern: 
    new RegExp("(^|^(.|\r|\n)*\r\n)("+id+") (OK|NO|BAD)( (\\[[^\\]]+\\]))?( (.*))?\r\n$")

  cmd: id + " " + cmd + "\r\n"
  console.log(cmd)
  $.post(this.url, { command: cmd })

  setTimeout((checkResponse: ( =>
    match:  @buf.match(pattern)
    resp:   {}

    if (match)
      console.log(@buf)
      @buf: ""

      parseUntagged(String(match[1]))

      resp: {
        untagged:   match[1]
        id:         match[3]
        status:     match[4]
        code:       match[6]
        code_args:  match[8]
      }

      if (success)
        (if (resp.status=="OK" || !(failure?)) then success else failure)(resp)
    else
      setTimeout(checkResponse, 100)
  )), 100)
   
  return this
)

Imap.prototype.noop: ((success, failure) ->
  @send("NOOP", success, failure)
  return this
)

Imap.prototype.login: ((user, pass, success, failure) ->
  @send("LOGIN \""+user+"\" \""+pass+"\"", success, failure)
  return this
)

Imap.prototype.select: ((mailbox, success, failure) ->
  @send("SELECT \""+mailbox+"\"", success, failure)
  return this
)

Imap.prototype.list: ((success, failure) ->
  fin: ((resp) ->
    pat: /(^|\r\n)\* LIST( \((.*)\))? "(.*)" "(.*)"(?=$|\r\n)/g
    ret: (while ( (match: pat.exec(resp.untagged)) )
      { 
        flags: match[3].split(" ")
        path_separator: match[4]
        name: match[5]
      }
    )
    if (success)
      (if (resp.status=="OK" || !(failure?)) then success else failure)(ret)
  )
  @send('LIST "" %', fin)
  return this
)

exports.Imap: Imap
