/*
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *  Contributor(s):
 *  - LouCypher (original code)
 */

var lwt = {};
Components.utils.import("resource://gre/modules/LightweightThemeManager.jsm", lwt );
lwt = lwt.LightweightThemeManager;

var { usedThemes: _themes, currentTheme: _currentTheme } = lwt;

function  $(aSelector, aNode) (aNode || document).querySelector(aSelector);
function $$(aSelector, aNode) (aNode || document).querySelectorAll(aSelector);

function jsBeautify(aJS) {
  try {
    Components.utils.import("resource:///modules/devtools/Jsbeautify.jsm");
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
  var themeBox = aNode;
  while (themeBox && !themeBox.classList.contains("theme"))
    themeBox = themeBox.parentNode;

  var theme = lwt.parseTheme(themeBox.dataset.browsertheme);

  switch (aAction) {
    case "wear":
      lwt.setLocalTheme(theme);
      if ($(".current"))
        $(".current").classList.remove("current");
      themeBox.classList.add("current");
      _currentTheme = theme;
      return;

    case "stop":
      lwt.setLocalTheme();
      themeBox.classList.remove("current");
      _currentTheme = null;
      return;

    case "dump":
      lwt.forgetUsedTheme(theme.id);
      if (themeBox.classList.contains("current")) {
        themeBox.classList.remove("current");
        _currentTheme = null;
      }
      return;

    case "preview":
      lwt.previewTheme(theme);
      return;

    default:
      lwt.resetPreview();
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
  else
    $(".theme-title", box).textContent = name;

  if (author)
    $(".theme-author", box).textContent += author;

  if (description)
    $(".theme-description", box).innerHTML = description;

  return box;
}

function load() {
  if (!_themes.length) {                        // If no installed themes
    $("#no-themes").classList.remove("hidden"); // show 'No themes installed"
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
