/*  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/. */

function  $(aSelector, aNode) (aNode || document).querySelector(aSelector);
function $$(aSelector, aNode) (aNode || document).querySelectorAll(aSelector);
function jsm(aURL) Components.utils.import(aURL, {});

const {LightweightThemeManager} = jsm("resource://gre/modules/LightweightThemeManager.jsm");
var {usedThemes: _themes, currentTheme: _currentTheme} = LightweightThemeManager;

const {Services} = jsm("resource://gre/modules/Services.jsm");

var _chromeWin = Services.wm.getMostRecentWindow("navigator:browser") ||
                 Services.wm.getMostRecentWindow("mail:3pane");

const PREF_ROOT = "extensions.lwthemes-manager@loucypher.";
const prefs = Services.prefs.getBranch(PREF_ROOT);

var _devMode = false;

/**
 *  Set document language and direction based on browser language
 */
$("html").lang = Services.prefs.getCharPref("general.useragent.locale");
switch ($("html").lang) {
  case "ar":    // Arabic
  case "he":    // Hebrew
  case "fa-IR": // Farsi
    $("html").classList.add("rtl");  // Right to left
}


var _skin = {
  light: $("link[title=Light]").sheet,  // Light
  dark: $("link[title=Dark]").sheet,    // Dark

  prefValue: prefs.getBoolPref("darkTheme"),

  get selected() {
    if (this.prefValue)
      return "Dark";
    else
      return "Light";
  },

  set selected(aBoolean) {
    this.prefValue = aBoolean;
  },

  toggleRadio: function toggleRadio() {
    $("#pref-skin-light").checked = !this.prefValue;
    $("#pref-skin-dark").checked = this.prefValue;
  },

  toggle: function toggleSkin() {
    this.dark.disabled = this.light.disabled;
    this.light.disabled = !this.light.disabled;
    this.prefValue = !this.dark.disabled;
    this.toggleRadio();
    prefs.setBoolPref("darkTheme", this.prefValue);
    //console.log(_skin.selected);
  },

  applyFromPref: function applyFromPref() {
    this.dark.disabled = !this.prefValue;
    this.light.disabled = this.prefValue;
    this.toggleRadio();
    //console.log(_skin.selected);
  },

  toString: function toString() {
    return this.selected;
  }
};

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
    if (aNode) {
      aNode.classList.add("hidden");
      aNode.nextSibling.nextSibling.classList.remove("hidden");
    }
  },

  disable: function enablePersonas(aNode) {
    this.addon.userDisabled = true;
    aNode.parentNode.classList.add("hidden");
    aNode.parentNode.previousSibling.previousSibling.classList.remove("hidden");
  },

  edit: function editPersona() {
    var editorURL = "chrome://personas/content/customPersonaEditor.xul";
    var browser, container, openTab;

    if (Application.id === "{3550f703-e582-4d05-9a08-453d09bdfdc6}") {  // Thunderbird
      var tabmail = _chromeWin.document.getElementById("tabmail");
      browser = tabmail.selectedTab.browser;
      container = tabmail.tabContainer;
      openTab = function openTab(aURL) {
        _chromeWin.openContentTab(aURL, "tab", "^(https?|chrome):");
      }
    }
    else {
      browser = _chromeWin.gBrowser;
      container = browser.tabContainer;
      openTab = function openTab(aURL) {
        browser.selectedTab = browser.addTab(aURL);
      }
    }

    //console.log(container.localName);
    container.addEventListener("TabClose", function(aEvent) {
      aEvent.currentTarget.removeEventListener(aEvent.type, arguments.callee, true);
      //console.log(aEvent.currentTarget.localName);
      if (browser.currentURI.spec === editorURL &&
          LightweightThemeManager.currentTheme.id === "1") {
        _personas.custom = LightweightThemeManager.currentTheme;
        _currentTheme = _personas.custom; // Update _currentTheme
        var themeBox = $(".persona");
        if (!themeBox) {
          location.reload();
          return;
        }
        var image = $("img", themeBox);
        themeBox.dataset.browsertheme = JSON.stringify(_currentTheme);
        image.src = _currentTheme.headerURL;
        image.removeAttribute("style");
        image.alt = $(".theme-title", themeBox).textContent = _currentTheme.name;
        image.style.color = _currentTheme.textcolor;
        image.style.backgroundColor = _currentTheme.accentcolor;
        if (!themeBox.classList.contains("current")) {
          $(".current").classList.remove("current");
          themeBox.classList.add("current");
        }
      }
    }, true);
    openTab(editorURL);
  },

  init: function checkForPersonas() {
    if (Application.id === "{92650c4d-4b8e-4d2a-b7eb-24ecf4f6b63a}") {  // SeaMonkey
      this.status = "incompatible";
      return;
    }

    for (var i in _themes)
      if (_themes[i].id === "1")
        this.custom = _themes[i];

    var obj = jsm("resource://gre/modules/AddonManager.jsm", {});
    var {getAddonByID} = obj.AddonManager;

    getAddonByID(this.ID, function(personas) {
      if (personas) {
        _personas.addon = personas;

        if (personas.isActive) {
          _personas.status = "enabled";
          $("html").classList.add("personas");
          $(".no-themes .personas-enabled").classList.remove("hidden");
          $(".menu .personas-enabled").classList.remove("hidden");
        }
        else {
          _personas.status = "disabled";
          $(".no-themes .personas-disabled").classList.remove("hidden");
          $(".menu .personas-disabled").classList.remove("hidden");
        }
        var editLabel = getEntityFromDTD("chrome://personas/locale/personas.dtd",
                                         "contextEdit.label", "Edit");
        //console.log(editLabel);
        //console.log($("#template .edit"));
        $("#template .edit").textContent = editLabel;
      }
      else {
        _personas.status = "not installed";
        $(".no-themes .personas-not-installed").classList.remove("hidden");
        $(".menu .personas-not-installed").classList.remove("hidden");
      }
    })
  }
}

function jsBeautify(aJS) {
  try {
    const {js_beautify} = jsm("resource:///modules/devtools/Jsbeautify.jsm");
    return js_beautify(aJS, {indent_size: 2, indent_char: " "});
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
  try {
    while (aNode && !aNode.hasAttribute("data-browsertheme"))
      aNode = aNode.parentNode;
    return aNode;
  } catch (ex) {
    return null;
  }
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
  aNode.style.backgroundPosition = "right center";
}

function showTotalThemes(aNumber) {
  var text = "Total themes: " + aNumber;
  console.log(document.title + "\n" + text);
  Services.console.logStringMessage(document.title + "\n" + text);
  _chromeWin.XULBrowserWindow && _chromeWin.XULBrowserWindow.setOverLink(text);
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
      $(".search").removeAttribute("style");
      _currentTheme = null;
      break;

    case "dump":
      LightweightThemeManager.forgetUsedTheme(theme.id);
      if (themeBox.classList.contains("current")) {
        themeBox.classList.remove("current");
        $(".search").removeAttribute("style");
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
      applyThemeToNode($(".search"));
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

  if (description) {
    $(".theme-description", box).innerHTML = description;
    /*var span = document.createElement("span");
    span.innerHTML = description;
    $(".theme-description", box).textContent = span.textContent;*/
  }

  return box;
}

function openAddonsManager(aNode) {
  var addonId;
  var themeBox = getThemeBox(aNode);
  if (themeBox) {
    var theme = LightweightThemeManager.parseTheme(themeBox.dataset.browsertheme);
    if (!theme)
      theme = JSON.parse(themeBox.dataset.browsertheme);
    addonId = theme.id + "@personas.mozilla.org";
  }
  else
    addonId = aNode.dataset.addonId;

  var view = "addons://detail/" + encodeURIComponent(addonId) + "/preferences";

  if ("toEM" in _chromeWin) {
    _chromeWin.toEM(view);
  } else if ("openAddonsMgr" in _chromeWin) {
    _chromeWin.openAddonsMgr(view);
  } else {
    _chromeWin.BrowserOpenAddonsMgr(view);
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
  $("#pref-devmode").setAttribute("checked", !_devMode);
  prefs.setBoolPref("devmode", _devMode);
  if (_devMode)
    $("html").classList.add("devmode");
  else
    $("html").classList.remove("devmode");
}

function toggleMenu() {
  $(".menu").classList.toggle("open");
  window.addEventListener("click", function(aEvent) {
    //console.log(aEvent.target);
    var classList = aEvent.target.classList;
    if (!(classList.contains("menu") || classList.contains("menuitem") ||
          classList.contains("menu-button"))) {
      aEvent.currentTarget.removeEventListener(aEvent.type, arguments.callee, true);
      closeMenu();
    }
  }, true);
}

function closeMenu() {
  $(".menu").classList.remove("open");
}

function fixedHeader() {
  $(".header").classList.add("fixed");
}

function unfixedHeader() {
  $(".header").classList.remove("fixed");
}

function focusSearch() {
  $(".search-input").focus();
}

function onFocusSearch() {
  if (pageYOffset >= 80)
    fixedHeader();

  closeMenu();
  focusSearch()
}

function load() {
  donation();
  _personas.init();

  _skin.applyFromPref();

  if (prefs.getBoolPref("devmode")) {
    _devMode = true;
    $("#pref-devmode").checked = true;
    $("html").classList.add("devmode");
  }

  if (typeof inspectObject === "function") {
    $(".inspect").classList.remove("hidden");
    $(".inspect").textContent = getEntityFromDTD("view-source:chrome://inspector/locale/",
                                                 "btnInspect.label", "Inspect");
  }

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
  if (_currentTheme) {
    $(".current").parentNode.insertBefore($(".current"), $("section").firstChild);
    applyThemeToNode($(".search"));
  }

  _themes = LightweightThemeManager.usedThemes; // Restore sort order

  showTotalThemes(_themes.length);

  window.addEventListener("keypress", function(aEvent) {
    //console.log(aEvent.keyCode);
    if (aEvent.keyCode === 27) {  // Esc key
      closeMenu();
      unfixedHeader();
    }
  });
}

function unload() {}
