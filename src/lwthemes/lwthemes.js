/*
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *  Contributor(s):
 *  - LouCypher (original code)
 */

/**
 *  Set document language and direction based on browser language
 */
document.documentElement.lang = navigator.language;
switch (navigator.language) {
  case "ar":    // Arabic
  case "he":    // Hebrew
  case "fa-IR": // Farsi
    document.documentElement.classList.add("rtl");  // Right to left
}

/**
 *  Light weight Theme Manager module
 *  http://dxr.mozilla.org/mozilla-central/source/toolkit/mozapps/extensions/LightweightThemeManager.jsm
 */
var LWT = {};
Components.utils.import("resource://gre/modules/LightweightThemeManager.jsm", LWT );
LWT = LWT.LightweightThemeManager;

var { usedThemes: _themes, currentTheme: _currentTheme } = LWT;

function  $(aSelector, aNode) (aNode || document).querySelector(aSelector);
function $$(aSelector, aNode) (aNode || document).querySelectorAll(aSelector);

function jsBeautify(aJS) {
  try {
    var {js_beautify} = Components.utils.import("resource:///modules/devtools/Jsbeautify.jsm", {});
    return js_beautify(aJS, { indent_size: 2, indent_char: " " });
  } catch (ex) {
    return aJS;
  }
}

function sort(aArray) {
  aArray.sort(function(a, b) {
    a = a.name.toLowerCase();
    b = b.name.toLowerCase();
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
  })
}

function donation() {
  var gifts = ["beer", "coffee", "donut", "drink", "hot dog", "Ferrari"];
  var num = parseInt(Math.random() * gifts.length);
  $(".paypal a").textContent = "Buy me a " + gifts[num];
  $(".paypal a").href = "https://www.paypal.com/cgi-bin/webscr" +
                        "?cmd=_s-xclick&hosted_button_id=WDQL25BGYS3C2" +
                        "&amount=3%2e14&currency_code=USD" +
                        "&item_name=Light%20Weight%20Themes%20Manager";
}

function getThemeBox(aNode) {
  while (aNode && !aNode.hasAttribute("data-browsertheme"))
    aNode = aNode.parentNode;

  return aNode;
}

/**
 *  Set a theme
 *  @param aNode Node that triggers the action
 *  @param aAction "wear"     Wear a theme
 *                 "stop"     Stop wearing a theme
 *                 "dump"     Uninstall a theme
 *                 "preview"  Preview a theme
 *                 "reset"    Reset preview
 */
function setTheme(aNode, aAction) {
  var themeBox = getThemeBox(aNode);
  var theme = LWT.parseTheme(themeBox.dataset.browsertheme);

  switch (aAction) {
    case "wear":
      LWT.setLocalTheme(theme);
      if ($(".current"))
        $(".current").classList.remove("current");
      themeBox.classList.add("current");
      _currentTheme = theme;
      return;

    case "stop":
      LWT.setLocalTheme();
      themeBox.classList.remove("current");
      _currentTheme = null;
      return;

    case "dump":
      LWT.forgetUsedTheme(theme.id);
      if (themeBox.classList.contains("current")) {
        themeBox.classList.remove("current");
        _currentTheme = null;
      }
      return;

    case "preview":
      LWT.previewTheme(theme);
      return;

    default:
      LWT.resetPreview();
  }
}

/**
 *  Get theme home page. Use AMO or getpersonas.com URL if no home page.
 */
function getThemeURL(aTheme) {
  const { id: id, homepageURL: homepageURL, updateURL: updateURL } = aTheme;

  if (homepageURL)
    return homepageURL;

  if (updateURL) {
    if (updateURL.match(/getpersonas.com/))
      return "https://getpersonas.com/persona/" + id;
    if (updateURL.match(/addons.mozilla.org/))
      return "https://addons.mozilla.org/addon/" + id;
  }

  return null;
}

/**
 *  Generate boxes for installed themes
 */
function themeBox(aTheme) {
  const { id: id, name: name, author: author, description: description,
          homepageURL: homepageURL, previewURL: previewURL } = aTheme;

  var themeData = JSON.stringify(aTheme);

  var box = $("#template").cloneNode(true); // Clone from template
  box.removeAttribute("id");
  box.dataset.browsertheme = themeData;
  if (_currentTheme && aTheme.id === _currentTheme.id)
    box.classList.add("current");

  if (/^solid\-color/.test(aTheme.id)) {
    $(".image", box).classList.add("solid-color");
    $(".image", box).style.backgroundColor = aTheme.accentcolor;
    $("img", box).src = "preview.png";
  }
  else
    $("img", box).src = previewURL.replace(/\?\d+/, "");

  $("img", box).alt = name;

  var themeURL = getThemeURL(aTheme);
  if (themeURL) {
    $(".theme-title a", box).href = $("header a", box).href = themeURL;
    $(".theme-title a", box).textContent = name;
  }
  else {
    $(".theme-title", box).textContent = name;
    $(".theme .image a", box).removeAttribute("title");
  }

  if (author)
    $(".theme-author", box).textContent += author;

  if (description)
    $(".theme-description", box).innerHTML = description;

  return box;
}

function openAddonsManager(aNode) {
  var themeBox = getThemeBox(aNode);
  var theme = LWT.parseTheme(themeBox.dataset.browsertheme);
  var addonId = theme.id + "@personas.mozilla.org";
  var view = "addons://detail/" + encodeURIComponent(addonId) + "/preferences";

  var {Services} = Components.utils.import("resource://gre/modules/Services.jsm", {});
  var chromeWin = Services.wm.getMostRecentWindow("navigator:browser") ||
                  Services.wm.getMostRecentWindow("mail:3pane");

  if ("toEM" in chromeWin) {
    chromeWin.toEM(view);
  } else if ("openAddonsMgr" in chromeWin) {
    chromeWin.openAddonsMgr(view);
  } else {
    chromeWin.BrowserOpenAddonsMgr(view);
  }
}

var _personas = {
  ID: "personas@christopher.beard",
  addon: null,
  status: null,

  install: function installPersonas() {
    location.assign("https://addons.mozilla.org/firefox/downloads/latest/10900/" +
                    "addon-10900-latest.xpi?src=external-addon-472283");
  },

  enable: function enablePersonas(aNode) {
    this.addon.userDisabled = false;
    aNode.classList.add("hidden");
    aNode.nextSibling.nextSibling.classList.remove("hidden");
  },

  disable: function enablePersonas(aNode) {
    this.addon.userDisabled = true;
    aNode.parentNode.classList.add("hidden");
    aNode.parentNode.previousSibling.previousSibling.classList.remove("hidden");
  },

  init: function checkForPersonas() {
    var list;
    var obj = Components.utils.import("resource://gre/modules/AddonManager.jsm", {});
    var {getAddonByID} = obj.AddonManager;
    getAddonByID(this.ID, function(personas) {
      if (personas) {
        _personas.addon = personas;
        if (personas.isActive) {
          _personas.status = "enabled";
          list = $(".personas-enabled");
        }
        else {
          _personas.status = "disabled";
          list = $(".personas-disabled");
        }
      }
      else {
        _personas.status = "not installed";
        list = $(".personas-not-installed");
      }
      list.classList.remove("hidden");
    })
  }
}

function inspect(aNode) {
  var themeBox = getThemeBox(aNode);
  var theme = LWT.parseTheme(themeBox.dataset.browsertheme);
  inspectObject(theme);
}

function toggleViewer() {
  $(".viewer").classList.toggle("hidden");
}

function jsonView(aNode) {
  var themeBox = getThemeBox(aNode);
  var json = jsBeautify(themeBox.dataset.browsertheme);
  var {Services} = Components.utils.import("resource://gre/modules/Services.jsm", {});
  var chromeWin = Services.wm.getMostRecentWindow("navigator:browser") ||
                  Services.wm.getMostRecentWindow("mail:3pane");

  if ("Scratchpad" in chromeWin) {
    chromeWin.Scratchpad.ScratchpadManager.openScratchpad({text: json});
    return;
  }
  $(".viewer textarea").value = json;
  toggleViewer();
  $(".viewer textarea").focus();
}

function load() {
  donation();
  _personas.init();

  if (typeof inspectObject == "function")
    $(".inspect").classList.remove("hidden");

  if (!_themes.length) {                        // If no installed themes
    $(".no-themes").classList.remove("hidden"); // show 'No themes installed"
    $("footer").classList.add("bottom");
    return;
  }

  sort(_themes);

  // Generate boxes for installed themes
  for (var i in _themes)
    $("section").insertBefore(themeBox(_themes[i]), $("#template"));

  // Move current theme to top
  if (_currentTheme)
    $(".current").parentNode.insertBefore($(".current"), $("section").firstChild);
}

function unload() {}
