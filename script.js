'use strict';

var is_Highlight_Resources_Tickbox_Checked;

// Get the highlighting setting from storage
chrome.storage.sync.get('isHighlightRG', function(data) {
	is_Highlight_Resources_Tickbox_Checked = data.isHighlightRG;
	console.log('[APE] Highlight Resources tickbox is:', is_Highlight_Resources_Tickbox_Checked ? 'checked' : 'not checked');
});



// This script runs in all frames. First, check if we are the correct one.
// The Resource Group list lives inside an iframe named 'BrowseResourceGroups.ReactView'.
if (window.name === 'BrowseResourceGroups.ReactView') {
    
    // --- This is the correct frame! ---
    // All execution logic should be started from inside this block.
    
    console.log('[Azure Portal extension] - Correct iframe context detected. Initializing script...');

    var subscriptions = [];
    var isUpdateLoopRunning = false;


    // Start the process by fetching subscription data.
    // Wait 3 seconds to give the portal a chance to get its own auth tokens.
    setTimeout(getSubscriptionData, 3000);

} else {
    // --- This is the wrong frame (e.g., the top window or another iframe) ---
    // Do nothing. Log the frame name for debugging purposes and stop.
    // console.log(`[APE] Script loaded in non-target frame: '${window.name || 'top_window'}'. Halting.`);
}


// =================================================================================
// The rest of your functions (getSubscriptionData, updatePortal, etc.) remain below this block.
// They will now only be called by the script in the correct frame.
// =================================================================================

function updatePortal() {
    // We no longer need to check the URL here because the script's entry point
    // already guarantees we are in the correct context.
    updateResourceGroupList();

    if (isUrlShowingResources(window.location.href)) {
        updateResourceList();
    }
    
    // The loop is still useful if the user navigates within the blade, causing re-renders.
    setTimeout(updatePortal, 1000);
}

// Ensure updatePortal is only started ONCE after data is received.
function getSubscriptionData() {	
	console.log("[APE] - running getSubscriptionData() - getSubscriptions - start")
	
    chrome.runtime.sendMessage("getSubscriptions", function(response) {		
        if (response === undefined || !response.subscriptions) {
            console.error("[APE] Response is undefined or invalid. Retrying in 3 seconds.");			
			setTimeout(getSubscriptionData, 3000);
        } else {
			console.log("[APE] - Good response. Subscriptions loaded.");
			subscriptions = response.subscriptions;
            // Start the UI update loop ONLY after we have the data
            // and only if it's not already running.
            if (!isUpdateLoopRunning) {
                updatePortal();
                isUpdateLoopRunning = true;
            }
        }
    });
	
	console.log("[APE] - getSubscriptionData() message sent.");
}

// (The rest of your functions: getSubscriptionFromName, updateResourceGroupList, etc., continue here without changes)

//Wait one second to ensure we have got the azure Auth token in the background
setTimeout(getSubscriptionData, 3000);
updatePortal();

var subscriptions = []

function getSubscriptionFromName(name) {
    return subscriptions.find((sub) => sub.name === name);
}

function getSubscriptionFromId(id) {
    return subscriptions.find((sub) => sub.id === id);
}

function getResourceGroup(name, subscription) {
    return subscription.resourceGroups.find((rg) => rg.name === name);
}

function getAllResourcesFromSubscription(subscription) {
    let resources = [];
    for (let resourceGroup of subscription.resourceGroups) {
        resources.concat(resourceGroup.resources);
    }

    return resources;
}

function getWebAppsFromSubscription(subscription) {
    let webApps = [];
    for (let resourceGroup of subscription.resourceGroups) {
        webApps = webApps.concat(getWebAppsFromResourceGroup(resourceGroup))
    }

    return webApps;
}

function getWebAppsFromResourceGroup(resourceGroup) {
    let webApps = [];
    for (let resource of resourceGroup.resources) {
        if (resource.type === "webapp") {
            webapps.push(resource);
        }
    }

    return webApps;
}

function isUrlShowingResourceGroups(uri) {
    // --- New, corrected logic for running inside the iframe ---

    // The most reliable check is the name of the iframe itself.
    // We discovered this name in the previous steps.
    if (window.name === 'BrowseResourceGroups.ReactView') {
        return true;
    }

    // --- Original logic as a fallback for other pages ---
    const lowerUri = uri.toLowerCase();
    if (lowerUri.endsWith("/resourcegroups") || 
        lowerUri.endsWith("/browseresourcegroups") || 
        lowerUri.endsWith("/browseresourcegroupslegacy")) {
        return true;
    }

    return false;
}

function isUrlShowingResources(uri) {
    if (uri.toLowerCase().endsWith("/resources".toLowerCase())) {
        return true;
    }
    if (uri.toLowerCase().endsWith("/BrowseAll".toLowerCase())) {
        return true;
    }	
    if (uri.toLowerCase().endsWith("/BrowseResource".toLowerCase())) {
        return true;
    }		
    if (uri.toLowerCase().indexOf("/resourceGroups".toLowerCase()) !== -1
        && uri.toLowerCase().indexOf("/overview") !== -1) {
        return true;
    }

    return false;
}

function printSubscriptions() {
    console.log(subscriptions);
}

/**
 * Updates the UI list for resources
 */
function updateResourceList() {
    const rows = $('div.fxc-gc-row-content');
    rows.each((index, row) => {
        let linkdiv = $(row).find('a.fxc-gcflink-link');
        let link = $(linkdiv).attr("href");

        const linkRegexp = /resource\/subscriptions\/(?<sub>[^/]*)\/resourceGroups\/(?<rg>.*)\/providers\/(?<type>.*\/.*)\/(?<name>.*)/g;
        let matches = linkRegexp.exec(link);
		
		
		if (is_Highlight_Resources_Tickbox_Checked) {
			console.log('APE - Highlighting Resource is enabled.');
			
			if (matches.groups.name.toLowerCase().includes("sbx")) {
				$(row).css("background-color", "yellow");
			} else if (matches.groups.name.toLowerCase().includes("dev") || matches.groups.name.toLowerCase().includes("uat") || matches.groups.name.toLowerCase().includes("tst") || matches.groups.name.toLowerCase().includes("npr") || matches.groups.name.toLowerCase().includes("nonprod")) {
				$(row).css("background-color", "#FFD700");
			} else if (matches.groups.name.toLowerCase().includes("prd") || matches.groups.name.toLowerCase().includes("prod")) {
				$(row).css("background-color", "lightgreen");
			}
		}



        if (matches == null) {
            return;
        }

        let subscription = getSubscriptionFromId(matches.groups.sub);
        if (subscription == null) {
            return;
        }

        let resourceGroup = getResourceGroup(matches.groups.rg, subscription);
        if (resourceGroup == null) {
            return;
        }

        let resource = resourceGroup.resources.find(res => res.name === matches.groups.name);
        if (resource == null) {
            return;
        }

        //chrome.runtime.sendMessage("getSubscriptions")

        if (resource.type === "Microsoft.Web/sites") {
            $(linkdiv).off();
            $(linkdiv).on("contextmenu", false, function(e) {
                addPopup();
                addPopupLink("Visit Website", resource.url);

                addPopupClick("Start WebApp", resource.name + "_start", function() {
                    chrome.runtime.sendMessage({
                        reason: "webapp_start",
                        subscription: subscription,
                        resourceGroup: resourceGroup,
                        webapp: resource
                    });
                });

                addPopupClick("Stop WebApp", resource.name + "_stop", function() {
                    chrome.runtime.sendMessage({
                        reason: "webapp_stop",
                        subscription: subscription,
                        resourceGroup: resourceGroup,
                        webapp: resource
                    });
                });

                addPopupClick("Restart WebApp", resource.name + "_restart", function() {
                chrome.runtime.sendMessage({
                    reason: "webapp_restart",
                    subscription: subscription,
                    resourceGroup: resourceGroup,
                    webapp: resource
                    });
                });

                $("#ape-popup").show().css("top", e.pageY + "px").css("left", e.pageX + "px");
                e.preventDefault();
            });
        }
    });
}

function addPopup() {
    $('#ape-popup').off();
    $('#ape-popup').remove();
    $(popup).appendTo("#web-container");
    $('#ape-popup').hide();

    $(document).on('click', function(e) {
        $('#ape-popup').remove();
    });
}

function addPopupClick(text, id, func) {
    $("#ape-popup").find('ul.fxs-contextMenu-itemList').append(
        "<a id=\"" + id + "\">" +
        "<li role=\"menuitem\" class=\"fxs-contextMenu-item msportalfx-command-like-button fxs-portal-hover\">" +
        "<div class=\"fxs-contextMenu-text msportalfx-text-ellipsis\">" +
        text +
        "</div>" +
        "<div class=\"fxs-contextMenu-icon\">" +
        "</div>" +
        "</li>" +
        "</a>"
    );

    $('#' + id).on('click', function() {
        func();
    });
}

function addPopupLink(text, link) {
    $("#ape-popup").find('ul.fxs-contextMenu-itemList').append(
        "<a href=\""+ link + "\" target=\"_blank\">" +
        "<li role=\"menuitem\" class=\"fxs-contextMenu-item msportalfx-command-like-button fxs-portal-hover\">" +
        "<div class=\"fxs-contextMenu-text msportalfx-text-ellipsis\">" +
        text +
        "</div>" +
        "<div class=\"fxs-contextMenu-icon\">" +
        "</div>" +
        "</li>" +
        "</a>"
    );
}


/**
 * This function runs the same queries as updateResourceGroupList() but changes rgElem to red and rgSub to green for testing.
 */
function testUpdateResourceGroupList(retries = 5, interval = 1000) {
    console.log(`[APE Test] Looking for resource group rows. Attempts left: ${retries}`);
    const rows = $('div[data-automationid="DetailsRow"]');

    if (rows.length > 0) {
        console.log(`[APE Test] SUCCESS: Found ${rows.length} rows. Applying test colors.`);
        rows.each((index, row) => {
            $(row).find('div[data-automation-key^="name"]').find('a').css("background-color", "red").css("color", "white");
            $(row).find('div[data-automation-key^="subscription"]').find('a').css("background-color", "green").css("color", "white");
        });
        return;
    }
    if (retries <= 0) {
        console.error("[APE Test] FAILED: Could not find any rows after 5 attempts.");
        return;
    }
    setTimeout(() => {
        testUpdateResourceGroupList(retries - 1, interval);
    }, interval);
}
//testUpdateResourceGroupList();






/**
 * Updates the UI list for resource groups.
 * This is the final, corrected version for the new Azure Portal UI.
 */
function updateResourceGroupList() {
	
	//console.log(`[APE Test] SUCCESS: Inside updateResourceGroupList.`);
	
    // This selector targets the stable automation ID for each row in the new grid.
    const rows = $('div[data-automationid="DetailsRow"]');

    // If rows aren't found on a given check, the function simply exits.
    // The main updatePortal() loop will call it again in 1 second.
    if (rows.length === 0) {
        return;
    }

    rows.each((index, row) => {
        // Prevent re-processing rows that have already been handled to improve performance.
        if ($(row).data('ape-processed')) {
            return; // 'continue' to the next iteration of the .each() loop
        }

        // Find the elements for RG name and Subscription name using their automation keys.
        let rgElem = $(row).find('div[data-automation-key^="name"] a');
        let rgName = rgElem.text();

        let subElem = $(row).find('div[data-automation-key^="subscription"] a');
        let subName = subElem.text();

        // --- Your original logic starts here ---

        if (is_Highlight_Resources_Tickbox_Checked) {
            if (rgName.toLowerCase().includes("sbx")) {
                $(row).css("background-color", "yellow");
            } else if (rgName.toLowerCase().includes("dev") || rgName.toLowerCase().includes("uat") || rgName.toLowerCase().includes("tst") || rgName.toLowerCase().includes("npr") || rgName.toLowerCase().includes("nonprod")) {
                $(row).css("background-color", "#FFD700");
            } else if (rgName.toLowerCase().includes("prd") || rgName.toLowerCase().includes("prod")) {
                $(row).css("background-color", "lightgreen");
            }
        }

        let sub = getSubscriptionFromName(subName);
        if (sub == null) {
            return; // continue
        }

        let rg = getResourceGroup(rgName, sub);
        if (rg == null) {
            return; // continue
        }

        if (rg.resources === null || rg.resources.length === 0) {
            $(row).css({
                "border-style": "dashed",
                "border-color": "red"
            });
            $(rgElem).append(" --- <span style='color: red;'>Empty Resource Group</span>");
        } else {
            let color;
            if (rg.resources.length < 10) {
                color = 'green';
            } else if (rg.resources.length <= 40) {
                color = 'orange';
            } else { // Greater than 40
                color = 'red';
            }

            $(rgElem).append(` --- <span style='color: ${color}; font-weight: bold; font-size: 1.1em;'>${rg.resources.length} resources</span>`);
        }

        // Mark the row as processed so this logic doesn't run on it again.
        $(row).data('ape-processed', true);
    });
}






var popup = "<div id=\"ape-popup\" class=\"fxs-commands-contextMenu az-noprint fxs-contextMenu fxs-popup fxs-portal-bg-txt-br msportalfx-shadow-level2 msportalfx-unselectable fxs-contextMenu-active\">" +
    "    <ul role=\"menu\" class=\"fxs-contextMenu-itemList\">" +
/*    "        <li role=\"menuitem\" class=\"fxs-contextMenu-item msportalfx-command-like-button fxs-portal-hover\">\n" +
    "            <div class=\"fxs-contextMenu-text msportalfx-text-ellipsis\">\n" +
    "                Pin to dashboard\n" +
    "            </div>\n" +
    "            <div class=\"fxs-contextMenu-icon\">\n" +
    "                <svg height=\"100%\" width=\"100%\" aria-hidden=\"true\" role=\"presentation\" focusable=\"false\">\n" +
    "                    <use href=\"#FxSymbol0-00f\"></use>\n" +
    "                </svg>\n" +
    "            </div>\n" +
    "        </li>\n" +
    "        <li role=\"menuitem\" class=\"fxs-contextMenu-item msportalfx-command-like-button fxs-portal-hover\">\n" +
    "            <div class=\"fxs-contextMenu-text msportalfx-text-ellipsis\">\n" +
    "                Edit tags\n" +
    "            </div>\n" +
    "            <div class=\"fxs-contextMenu-icon\">\n" +
    "                <svg height=\"100%\" width=\"100%\" aria-hidden=\"true\" role=\"presentation\" focusable=\"false\">\n" +
    "                    <use href=\"#FxSymbol0-047\"></use>\n" +
    "                </svg>\n" +
    "            </div>\n" +
    "        </li>\n" +*/
    "    </ul>" +
    "</div>";