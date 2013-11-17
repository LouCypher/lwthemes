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

function log(aString) {
  Services.console.logStringMessage("LW Themes:\n" + aString);
}

function resProtocolHandler(aResourceName, aURI) {
  Services.io.getProtocolHandler("resource")
             .QueryInterface(Ci.nsIResProtocolHandler)
             .setSubstitution(aResourceName, aURI, null)
}

let RESOURCE_NAME;

function main(aWindow) {
  resProtocolHandler("lwthemes", Services.io.newURI("chrome://lwthemes/content/", null, null));

  const {document} = aWindow;

  function  $(aSelector, aNode) (aNode || document).querySelector(aSelector);
  function $$(aSelector, aNode) (aNode || document).querySelectorAll(aSelector);

  function addMenuItem() {
    let menuitem = document.createElement("menuitem");
    menuitem.className = "lwthemes menuitem-iconic";
    menuitem.setAttribute("label", "Light Weight Themes");
    menuitem.setAttribute("image", "chrome://mozapps/skin/extensions/category-themes.png");
    menuitem.addEventListener("command", function() {
      let url = "resource://lwthemes/";
      if ("switchToTabHavingURI" in aWindow)
        aWindow.switchToTabHavingURI(url, true);
      else
        aWindow.openContentTab(url, "tab", "^https?:");
    })
    return menuitem;
  }

  let menuT = $("#menu_openAddons") || $("#addonsManager");
  if (menuT)
    menuT.parentNode.insertBefore(addMenuItem(), menuT.nextSibling);

  let menuA = $("#appmenu_preferences");
  if (menuA)
    menuA.parentNode.insertBefore(addMenuItem(), menuA.nextSibling);

  let menuV = $("#menu_viewApplyTheme_Popup menuseparator");
  if (menuV)
    menuV.parentNode.insertBefore(addMenuItem(), menuV);

  unload(function() {
    let items = $$(".lwthemes");
    if (items.length)
      for (let i = 0; i < items.length; i++)
        items[i].parentNode.removeChild(items[i]);

    resProtocolHandler("lwthemes", null);
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
function install(data, reason) {}

/**
 * Handle the add-on being uninstalled
 */
function uninstall(data, reason) {}
