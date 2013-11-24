/*
 *  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 *  Contributor(s):
 *  - LouCypher (original code)
 */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

/**
 * Start setting default preferences 
 * http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-%e2%80%93-default-preferences/
 */
const PREF_BRANCH = "extensions.lwthemes-manager@loucypher.";
const PREFS = {
  name: "chrome://lwthemes/locale/lwthemes.properties",
  description: "chrome://lwthemes/locale/lwthemes.properties",
  firstRun: true,
  devmode: false,   // If true, show `Inspect` and `JSON` buttons
  jsonview: 0,      // 0: view JSON data in `textarea` element, 1: use Scratchpad
  darkTheme: false  // false: use `Light` theme, true: use `Dark` theme
};

let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
let prefs = Services.prefs.getBranch(PREF_BRANCH);
for (let [key, val] in Iterator(PREFS)) {
  switch (typeof val) {
    case "boolean":
      branch.setBoolPref(key, val);
      break;
    case "number":
      branch.setIntPref(key, val);
      break;
    case "string":
      branch.setCharPref(key, val);
      break;
  }
}
/*
 * End setting default preferences 
 **/

let RESOURCE_NAME;

function log(aString) {
  Services.console.logStringMessage("LW Themes:\n" + aString);
}

function resProtocolHandler(aResourceName, aURI) {
  Services.io.getProtocolHandler("resource")
             .QueryInterface(Ci.nsIResProtocolHandler)
             .setSubstitution(aResourceName, aURI, null)
}

function main(aWindow) {
  const {document} = aWindow;

  function  $(aSelector, aNode) (aNode || document).querySelector(aSelector);
  function $$(aSelector, aNode) (aNode || document).querySelectorAll(aSelector);

  function lwThemes() {
    let url = "chrome://lwthemes/content/";
    if ("switchToTabHavingURI" in aWindow)
      // Firefox/SeaMonkey
      aWindow.switchToTabHavingURI(url, true);
    else
      // Thunderbird
      aWindow.openContentTab(url, "tab", "^https?:");
  }

  function addMenuItem() {
    let menuitem = document.createElement("menuitem");
    menuitem.className = "lwthemes menuitem-iconic";
    menuitem.setAttribute("label", "Light Weight Themes");
    menuitem.setAttribute("image", "chrome://lwthemes/skin/icon16.png");
    menuitem.addEventListener("command", lwThemes);
    return menuitem;
  }

  // Firefox app menu
  let menuA = $("#appmenu_preferences");
  if (menuA)
    menuA.parentNode.insertBefore(addMenuItem(), menuA.nextSibling);

  // Firefox/Thunderbird Tools menu
  let menuT = $("#menu_openAddons") || $("#addonsManager");
  if (menuT)
    menuT.parentNode.insertBefore(addMenuItem(), menuT.nextSibling);

  // SeaMonkey View > Apply Theme menu
  let menuV = $("#menu_viewApplyTheme_Popup menuseparator");
  if (menuV)
    menuV.parentNode.insertBefore(addMenuItem(), menuV);

  // Run lwThemes() on installation
  if (prefs.getBoolPref("firstRun")) {
    prefs.setBoolPref("firstRun", false);
    lwThemes();
  }

  unload(function() {
    let items = $$(".lwthemes");
    if (items.length)
      for (let i = 0; i < items.length; i++)
        items[i].parentNode.removeChild(items[i]);
  }, aWindow)
}

/**
 * Handle the add-on being activated on install/enable
 */
function startup(data, reason) {
  // Add resource alias
  RESOURCE_NAME = data.id.toLowerCase().match(/[^\@]+/).toString();
  resProtocolHandler(RESOURCE_NAME, data.resourceURI);

  // Load module
  Cu.import("resource://" + RESOURCE_NAME + "/watchwindows.jsm");

  watchWindows(main);
}

/**
 * Handle the add-on being deactivated on uninstall/disable
 */
function shutdown(data, reason) {
  // Clean up with unloaders when we're deactivating
  if (reason == APP_SHUTDOWN)
    return;

  unload();

  // Unload module
  Cu.unload("resource://" + RESOURCE_NAME + "/watchwindows.jsm");

  // Remove resource alias
  resProtocolHandler(RESOURCE_NAME, null);
}

/**
 * Handle the add-on being installed
 */
function install(data, reason) {
}

/**
 * Handle the add-on being uninstalled
 */
function uninstall(data, reason) {
  if (reason == ADDON_UNINSTALL)
    for (let [key] in Iterator(PREFS))
      branch.clearUserPref(key); // Remove prefs on uninstall
}
