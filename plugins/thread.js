#!coffee -p

Thread: ( ->
  @queue:     { priority: [], preemptible: [] }
  @running:   false
  @qrunner:   null
  @interval:  100

  @add: ((preempt, f) ->
    @queue[(if preempt then "preemptible" else "priority")].push(f)
    return this
  )

  @start: ( ->
    @qrunner: setInterval((qrunner: ( =>
      if (!@running && @queue.priority.length > 0)
        (@queue.priority.shift())()
      else if (!@running && @queue.preemptible.length > 0)
        (@queue.preemptible.shift())()
    )), @interval)

    return this
  )

  @stop: ( ->
    if (@qrunner?) 
      clearInterval(@qrunner)
      @qrunner: null

    return this
  )

  return this
)

exports.Thread: Thread
