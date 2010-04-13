#!coffee -p

LongPoll: ((url) ->
  @url:            url
  @host:           null
  @onData:         null
  @onError:        null

  $(document).ajaxComplete(
    (longPoll: ((e, xhr, settings) =>
      set_url: settings.url.replace(/\?.*$/, "")
      if (set_url == @url && settings.type == "GET")
        if (xhr.status == 0)
          return $.get(settings.url)
        else if (! (200 <= xhr.status < 300) && @onError?)
          @onError(xhr.responseText)
        else if (@onData?)
          @onData(xhr.responseText)
        $.get(set_url)
      )
    )
  )

  return this
)

LongPoll.prototype.connect: ((host, port) ->
  @host: host

  $.ajax({
    url: @url,
    data: { rhost:host, rport:port }
  })

  return this
)

LongPoll.prototype.send: ((text) ->
  $.post(@url, { command: text })
  return this
)

exports.LongPoll: LongPoll
