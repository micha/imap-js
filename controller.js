$.golf.defaultRoute = "/connect/";

$(document).bind("imap_state", function(event, imap) {
  console.log("state change: "+imap.state);
  if (imap.state == 0)
    $.golf.location("/connect/");
  if (imap.state == 1)
    $.golf.location("/login/");
});

var Imap = $.require("imap").Imap;
var imap;

$.golf.controller = [

  { route: "/connect/",
    action: function(container, params) {
      container.empty().append("<h3>connecting...</h3>");
      imap = new Imap("/mailproxy/", "ubergibson.com", 143);
      window.imap = imap; // debugging
    }
  },

  { route: "/login/",
    action: function(container, params) {
      if (!imap || imap.state != 0)
        return $.golf.location("/connect/");
      container.empty().append(new Component.IMAP(imap));
    }
  },

  { route: "/.*/",
    action: function(container, params) {
      container.empty().append(new Component.Mailbox(imap));
    }
  }

];

