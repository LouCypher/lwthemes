/*  This Source Code Form is subject to the terms of the Mozilla Public
 *  License, v. 2.0. If a copy of the MPL was not distributed with this
 *  file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
Cu.import("resource://gre/modules/Services.jsm");

try {
  // Australis
  Cu.import("resource:///modules/CustomizableUI.jsm");
}
catch (ex) {
  // Not Australis
}

const THUNDERBIRD = (Services.appinfo.ID === "{3550f703-e582-4d05-9a08-453d09bdfdc6}");

/**
 * Start setting default preferences
 * http://starkravingfinkle.org/blog/2011/01/restartless-add-ons-%e2%80%93-default-preferences/
 */
const PREF_BRANCH = "extensions.lwthemes-manager@loucypher.";
const PREFS = {
  name: "chrome://lwthemes/locale/lwthemes.properties",
  description: "chrome://lwthemes/locale/lwthemes.properties",
  firstRun: true,
  devmode: false,     // If true, show `Inspect` and `JSON` buttons
  jsonview: 0,        // 0: view JSON data in `textarea` element, 1: use Scratchpad
  darkTheme: false,   // true: use `Dark` theme, false: use `Light` theme
  compactView: false  // true: hide theme title, creator and description
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
  Services.console.logStringMessage("Lightweight Themes Manager:\n" + aString);
}

function resProtocolHandler(aResourceName, aURI) {
  Services.io.getProtocolHandler("resource")
             .QueryInterface(Ci.nsIResProtocolHandler)
             .setSubstitution(aResourceName, aURI, null)
}

function main(aWindow, reason) {
  const {document} = aWindow;
  const LWT_URL = "chrome://lwthemes/content/lwthemes.xul";

  function  $(aSelector, aNode) (aNode || document).querySelector(aSelector);
  function $$(aSelector, aNode) (aNode || document).querySelectorAll(aSelector);

  function openLWT() {
    if (THUNDERBIRD)
      aWindow.openContentTab(LWT_URL, "tab", "^https?:");
    else
      aWindow.switchToTabHavingURI(LWT_URL, true);
  }

  function closeLWT() {
    if (THUNDERBIRD) {
      let tabmail = $("#tabmail");
      let tabs = tabmail.tabInfo;
      for (let i = 0; i < tabs.length; i++) {
        let browser = tabs[i].browser;
        if (browser && browser.currentURI.spec === LWT_URL) {
          tabmail.closeTab(i);
          return;
        }
      }
    }

    else {
      let SessionStore = (Cc["@mozilla.org/browser/sessionstore;1"] ||
                          Cc["@mozilla.org/suite/sessionstore;1"]).getService(Ci.nsISessionStore);
      let {gBrowser} = aWindow;
      let {tabs} = gBrowser;
      for (let i = 0; i < tabs.length; i++) {
        if (tabs[i].linkedBrowser.currentURI.spec === LWT_URL) {
          gBrowser.removeTab(tabs[i]);
          if (SessionStore) {
            SessionStore.forgetClosedTab(aWindow, 0); // Remove from undo close tabs list
            if (!SessionStore.getClosedWindowCount()) {
              let prefService = Services.prefs;
              let prefName = "browser.sessionstore.max_tabs_undo";
              let prefValue = prefService.getIntPref(prefName);
              prefService.setIntPref(prefName, 0);
              prefService.setIntPref(prefName, prefValue);
            }
          }
          return;
        }
      }
    }
  }

  function addMenuItem() {
    let menuitem = document.createElement("menuitem");
    menuitem.className = "lwthemes menuitem-iconic";
    menuitem.setAttribute("label", "Lightweight Themes Manager");
    menuitem.setAttribute("image", "chrome://lwthemes/skin/icon16.png");
    menuitem.addEventListener("command", openLWT);
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

  // Thunderbird Tools menu in appmenu
  let menuAT = $("#appmenu_taskPopup");
  if (menuAT)
    menuAT.insertBefore(addMenuItem(), $("#appmenu_sanitizeHistory"));

  // SeaMonkey View > Apply Theme menu
  let menuV = $("#menu_viewApplyTheme_Popup menuseparator");
  if (menuV)
    menuV.parentNode.insertBefore(addMenuItem(), menuV);

  // Personas Plus menu
  let menuP = $("#personas-selector-menu");
  if (menuP)
    menuP.insertBefore(addMenuItem(), menuP.lastChild);

  const styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"].
                            getService(Ci.nsIStyleSheetService);

  // Apply stylesheet to Add-ons Manager to show theme preview
  let addonCssURI = Services.io.newURI("chrome://lwthemes/skin/addons.css", null, null);
  styleSheetService.loadAndRegisterSheet(addonCssURI, styleSheetService.USER_SHEET);

  /* Start initializing toolbarbutton for Australis */
  //log(typeof CustomizableUI);
  if (typeof CustomizableUI === "object") {
    // Add stylesheet for toolbarbutton
    let toolbarCssURI = Services.io.newURI("chrome://lwthemes/skin/toolbarbutton.css", null, null);
    styleSheetService.loadAndRegisterSheet(toolbarCssURI, styleSheetService.USER_SHEET);

    // Add toolbarbutton
    CustomizableUI.createWidget(
      { id : "lwthemes-manager-widget",
        defaultArea : CustomizableUI.AREA_NAVBAR,
        label : "Lightweight Themes Manager",
        tooltiptext : "Lightweight Themes Manager",
        onCommand : function(aEvent) {
          openLWT();
        }
      });
  }
  /* End initializing toolbarbutton for Australis */


/* For future use
  // Run openLWT() on installation
  if (prefs.getBoolPref("firstRun")) {
    prefs.setBoolPref("firstRun", false);
    openLWT();
  }
*/

  /*if (reason === ADDON_INSTALL)
    closeLWT();*/

  //log(reason);
  if (reason === ADDON_INSTALL)
    openLWT();

  unload(function() {
    closeLWT();

    // Remove all elements added by this extension
    let items = $$(".lwthemes");
    if (items.length) {
      for (let i = 0; i < items.length; i++)
        items[i].parentNode.removeChild(items[i]);
    }

    // Unapply stylesheet for Add-on Manager
    styleSheetService.unregisterSheet(addonCssURI, styleSheetService.USER_SHEET);

    if ($("#lwthemes-manager-widget")) {  // If toolbarbutton was added
      // Remove toolbarbutton
      CustomizableUI.destroyWidget("lwthemes-manager-widget");
      // Unapply stylesheet for toolbarbutton
      styleSheetService.unregisterSheet(toolbarCssURI, styleSheetService.USER_SHEET);
    }
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
  Cu.import("resource://" + RESOURCE_NAME + "/modules/watchwindows.jsm");
  watchWindows(main, reason);
}

/**
 * Handle the add-on being deactivated on uninstall/disable
 */
function shutdown(data, reason) {
  // Clean up with unloaders when we're deactivating
  if (reason === APP_SHUTDOWN)
    return;

  unload();

  // Unload module
  Cu.unload("resource://" + RESOURCE_NAME + "/modules/watchwindows.jsm");

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
  if (reason === ADDON_UNINSTALL)
    for (let [key] in Iterator(PREFS))
      prefs.clearUserPref(key); // Remove prefs on uninstall
    prefs.clearUserPref("lastDir");
}
