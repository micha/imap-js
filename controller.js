$.golf.defaultRoute = "/login/";

$(document).bind("imap_state", function(event, imap) {
  if (imap.state == 0) {
    $.golf.location("/connect/");
  }
  else if (imap.state == 1) {
    $.golf.location("/login/");
  }
  else if (imap.state == 2) {
    $.golf.location("/folder/INBOX/");
  }
});

var Imap = $.require("imap").Imap;
var imap = new Imap("/mailproxy/");
window.imap = imap; // debugging

var mbox;

$.golf.controller = [

  { route: "^/connect/$",
    action: function(container, params) {
      container.empty().append("<h3>connecting...</h3>");
      imap.connect("ubergibson.com", 143);
    }
  },

  { route: "^/login/$",
    action: function(container, params) {
      if (!imap || imap.state == 0)
        return $.golf.location("/connect/");
      else if (imap.state == 2)
        return $.golf.location("/inbox/");
      container.empty().append(new Component.IMAP(imap));
    }
  },

  { route: "^/folder/(.*)/$",
    action: function(container, params) {
      if (!params[1])
        return $.golf.location("/folder/INBOX/");

      if (!imap || imap.state < 2)
        return $.golf.location("/login/");

      mbox = new Component.Mailbox(imap);

      container.empty().append(mbox);
      mbox.select(params[1]);
    }
  }

];

