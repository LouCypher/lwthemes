/*  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function  $(aSelector, aNode) (aNode || document).querySelector(aSelector);
function $$(aSelector, aNode) (aNode || document).querySelectorAll(aSelector);
function style(aName) aName === "Dark" ? document.styleSheets[1] : document.styleSheets[0];
function jsm(aURL) Components.utils.import(aURL, {});

/**
 *  Set document language and direction based on browser language
 */
$("html").lang = navigator.language;
switch (navigator.language) {
  case "ar":    // Arabic
  case "he":    // Hebrew
  case "fa-IR": // Farsi
    $("html").classList.add("rtl");  // Right to left
}

const {LightweightThemeManager} = jsm("resource://gre/modules/LightweightThemeManager.jsm");
var {usedThemes: _themes, currentTheme: _currentTheme} = LightweightThemeManager;

const {Services} = jsm("resource://gre/modules/Services.jsm");

var _chromeWin = Services.wm.getMostRecentWindow("navigator:browser") ||
                 Services.wm.getMostRecentWindow("mail:3pane");

const PREF_ROOT = "extensions.lwthemes-manager@loucypher.";
const prefs = Services.prefs.getBranch(PREF_ROOT);

var _devMode = prefs.getBoolPref("devmode");
var _jsonView = prefs.getIntPref("jsonview");

/**
 *  Apply style
 */
var _style = prefs.getBoolPref("darkTheme") ? "Dark" : "Light";

if (_style === "Dark") {
  style("Dark").disabled = false;
  style("Light").disabled = true;
}
else {
  style("Light").disabled = false;
  style("Dark").disabled = true;
}

function switchStyle(aName) {
  if (aName === "Dark") {
    style("Dark").disabled = false;
    style("Light").disabled = true;
  }
  else {
    style("Light").disabled = false;
    style("Dark").disabled = true;
  }
  _style = aName;
  prefs.setBoolPref("darkTheme", !style("Dark").disabled);
}

function jsBeautify(aJS) {
  try {
    const {js_beautify} = jsm("resource:///modules/devtools/Jsbeautify.jsm");
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

function getEntityFromDTD(aChromeURL, aEntity, aDefVal) {
  const XMLHttpRequest = Components.Constructor("@mozilla.org/xmlextras/xmlhttprequest;1",
                                                "nsIXMLHttpRequest");
  var xhr = new XMLHttpRequest();
  xhr.open("GET", aChromeURL, false);
  xhr.send(null);
  try {
    return xhr.responseText.match("ENTITY.*" + aEntity + "[^\>]+").toString()
                           .match(/\".*/).toString().replace(/\"/g, "");
  } catch (ex) {
    return aDefVal;
  }
}

function applyThemeToNode(aNode) {
  aNode.style.color = _currentTheme.textColor;
  aNode.style.backgroundColor = _currentTheme.accentcolor;
  aNode.style.backgroundImage = "url(" + _currentTheme.headerURL + ")";
}

function showTotalThemes(aNumber) {
  var text = "Total themes: " + aNumber;
  console.log(document.title + "\n" + text);
  Services.console.logStringMessage(document.title + "\n" + text);
  _chromeWin.XULBrowserWindow.setOverLink(text);
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
  var theme = LightweightThemeManager.parseTheme(themeBox.dataset.browsertheme);
  if (!theme)
    theme = JSON.parse(themeBox.dataset.browsertheme);

  switch (aAction) {
    case "preview":
      LightweightThemeManager.previewTheme(theme);
      return;

    case "reset":
      LightweightThemeManager.resetPreview();
      return;

    case "stop":
      LightweightThemeManager.setLocalTheme();
      themeBox.classList.remove("current");
      _currentTheme = null;
      break;

    case "dump":
      LightweightThemeManager.forgetUsedTheme(theme.id);
      if (themeBox.classList.contains("current")) {
        themeBox.classList.remove("current");
        _currentTheme = null;
      }
      showTotalThemes(_themes.length);
      break;

    default:
      LightweightThemeManager.setLocalTheme(theme);
      if ($(".current"))
        $(".current").classList.remove("current");
      themeBox.classList.add("current");
      _currentTheme = theme;
  }
  _themes = LightweightThemeManager.usedThemes;
}

/**
 *  Get theme home page. Use AMO or getpersonas.com URL if no home page.
 */
function getThemeURL(aTheme) {
  const { id: id, homepageURL: homepageURL, updateURL: updateURL } = aTheme;
  const amoURL = "https://addons.mozilla.org/";

  if (homepageURL)
    return homepageURL;

  if (updateURL) {
    if (updateURL.match(/getpersonas.com/))
      return amoURL + "persona/" + id;
    if (updateURL.match(/addons.mozilla.org/))
      return amoURL + "addon/" + id;
  }

  return null;
}

/**
 *  Generate boxes for installed themes
 */
function themeBox(aTheme) {
  const {
    id: id, name: name, author: author, description: description,
    homepageURL: homepageURL, previewURL: previewURL, headerURL: headerURL
  } = aTheme;

  var themeData = JSON.stringify(aTheme);

  var box = $("#template").cloneNode(true); // Clone from template
  box.removeAttribute("id");
  box.dataset.browsertheme = themeData;
  if (_currentTheme && aTheme.id === _currentTheme.id)
    box.classList.add("current");

  if (aTheme.id === "1")
    box.classList.add("persona");

  if (/^solid\-color/.test(aTheme.id)) {
    $(".image", box).classList.add("solid-color");
    $("img", box).src = "preview.png";
  }
  else if (previewURL)
    $("img", box).src = previewURL.replace(/\?\d+/, "");
  else
    $("img", box).src = headerURL.replace(/\?\d+/, "");

  $("img", box).style.backgroundColor = aTheme.accentcolor;
  $("img", box).style.color = aTheme.textcolor;
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
  var theme = LightweightThemeManager.parseTheme(themeBox.dataset.browsertheme);
  if (!theme)
    theme = JSON.parse(themeBox.dataset.browsertheme);

  var addonId = theme.id + "@personas.mozilla.org";
  var view = "addons://detail/" + encodeURIComponent(addonId) + "/preferences";

  if ("toEM" in _chromeWin) {
    _chromeWin.toEM(view);
  } else if ("openAddonsMgr" in _chromeWin) {
    _chromeWin.openAddonsMgr(view);
  } else {
    _chromeWin.BrowserOpenAddonsMgr(view);
  }
}

var _personas = {
  ID: "personas@christopher.beard",
  addon: null,
  status: null,
  custom: null,

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

  edit: function editPersona(aNode) {
    var editorURL = "chrome://personas/content/customPersonaEditor.xul";
    var browser = _chromeWin.gBrowser;
    var container = browser.mTabContainer;
    //console.log(container.localName);
    container.addEventListener("TabClose", function(aEvent) {
      aEvent.currentTarget.removeEventListener(aEvent.type, arguments.callee, true);
      //console.log(aEvent.currentTarget.localName);
      if (browser.currentURI.spec === editorURL &&
          LightweightThemeManager.currentTheme.id === "1") {
        _currentTheme = LightweightThemeManager.currentTheme;  // Update _currentTheme
        var themeBox = getThemeBox(aNode);
        themeBox.dataset.browsertheme = JSON.stringify(_currentTheme);
        $("img", themeBox).src = _currentTheme.headerURL;
        $("img", themeBox).removeAttribute("style");
        $("img", themeBox).alt = $(".theme-title", themeBox).textContent = _currentTheme.name;
        $("img", themeBox).style.color = _currentTheme.textcolor;
        $("img", themeBox).style.backgroundColor = _currentTheme.accentcolor;
        if (!themeBox.classList.contains("current")) {
          $(".current").classList.remove("current");
          themeBox.classList.add("current");
        }
      }
    }, true);
    browser.selectedTab = browser.addTab(editorURL);
  },

  init: function checkForPersonas() {
    var list;
    var obj = jsm("resource://gre/modules/AddonManager.jsm", {});
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
        var editLabel = getEntityFromDTD("chrome://personas/locale/", "contextEdit.label", "Edit");
        //console.log(editLabel);
        $(".persona .edit").textContent = editLabel;
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
  var theme = LightweightThemeManager.parseTheme(themeBox.dataset.browsertheme);
  if (!theme)
    theme = JSON.parse(themeBox.dataset.browsertheme);
  inspectObject(theme);
}

function toggleViewer() {
  $(".viewer").classList.toggle("hidden");
}

function jsonView(aNode) {
  var themeBox = getThemeBox(aNode);
  var json = jsBeautify(themeBox.dataset.browsertheme);
  var viewOption = prefs.getIntPref("jsonview");
  if (viewOption === 1 && "Scratchpad" in _chromeWin) {
    _chromeWin.Scratchpad.ScratchpadManager.openScratchpad({text: json});
    return;
  }

  $(".viewer textarea").value = json;
  toggleViewer();
  $(".viewer textarea").focus();
}

function toggleDevMode() {
  _devMode = !_devMode;
  prefs.setBoolPref("devmode", _devMode);
  if (_devMode)
    $("html").classList.add("devmode");
  else
    $("html").classList.remove("devmode");
}

function toggleMenu() {
  $(".menu").classList.toggle("open");
  window.addEventListener("click", function closeMenu(aEvent) {
    //console.log(aEvent.target);
    var classList = aEvent.target.classList;
    if (!(classList.contains("menu") || classList.contains("menuitem") ||
          classList.contains("menu-button"))) {
      aEvent.currentTarget.removeEventListener(aEvent.type, arguments.callee, true);
      $(".menu").classList.remove("open");
    }
  }, true);
}

function load() {
  donation();
  _personas.init();
  $(".pref-style[value=" + _style + "]").checked = true;

  if (_devMode) {
    $("html").classList.add("devmode");
    $("#pref-devmode").checked = true;
  }

  if (typeof inspectObject === "function")
    $(".inspect").classList.remove("hidden");

  if (!_themes.length) {                        // If no installed themes
    $(".no-themes").classList.remove("hidden"); // show 'No themes installed"
    $("footer").classList.add("pos-bottom");
    return;
  }

  sort(_themes);  // Sort by name

  // Generate boxes for installed themes
  for (var i in _themes)
    $("section").insertBefore(themeBox(_themes[i]), $("#template"));

  // Move current theme to top
  if (_currentTheme)
    $(".current").parentNode.insertBefore($(".current"), $("section").firstChild);

  /*if (_personas.status !== "enabled")
    $(".persona .edit").classList.add("hidden");*/

  _themes = LightweightThemeManager.usedThemes; // Restore sort order

  showTotalThemes(_themes.length);
  window.addEventListener("keypress", function(aEvent) {
    //console.log(aEvent.keyCode);
    if (aEvent.keyCode === 27 && $(".open"))
      $(".open").classList.remove("open");
  });
}

function unload() {}
