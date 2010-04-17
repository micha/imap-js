var config  = $.require("config");
var Imap    = $.require("imap/client").Imap;

$.golf.imap = {};
$.golf.defaultRoute = "/login/";
$.golf.jssTimeout = 10;

$(document).bind("imap_state", function(event) {
  if (imap.state == 0) {
    $.golf.location("/connect/");
  }
  else if (imap.state == 1) {
    $.golf.location("/login/");
  }
  else if (imap.state == 2) {
    $.golf.location("/folder/"+requested_box+"/");
  }
});

var imap = new Imap("/longpoll/");
window.imap = imap; // debugging

var mbox;
var requested_box = "INBOX";

$.golf.controller = [

  { route: "^/connect/$",
    action: function(container, params) {
      container.empty().append("<h3 style='color:red'>connecting...</h3>");
      imap.connect(config.host, config.port);
    }
  },

  { route: "^/login/$",
    action: function(container, params) {
      if (!imap || imap.state == 0)
        return $.golf.location("/connect/");
      else if (imap.state == 2)
        return $.golf.location("/folder/INBOX/");
      else if (imap.state == 3)
        return $.golf.location("/folder/"+imap.mailbox+"/");
      container.empty().append(new Component.IMAP(imap));
    }
  },

  { route: "^/folder/(.*)/$",
    action: function(container, params) {
      if (!params[1])
        return $.golf.location("/folder/INBOX/");

      if (!imap || imap.state < 2) {
        requested_box = params[1];
        return $.golf.location("/login/");
      }

      if (!mbox)
        mbox = new Component.Mailbox(imap);

      if (! container.children().size() ||
          mbox._dom !== container.children().eq(0))
        container.empty().append(mbox);

      imap.select(params[1]);
    }
  }

];

