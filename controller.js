$.golf.controller = [

  { route: ".*",
    action: function(container, params) {
      container.empty().append(new Component.IMAP());
    }
  }

];
