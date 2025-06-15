"use strict";

//logBackground("[Azure Portal extension - modded by Ricky] - starting background.js")
console.log('[Azure Portal extension - modded by Ricky] - start script.js');

//Users Azure auth token
var authToken;

chrome.webRequest.onBeforeSendHeaders.addListener(
    function (info) {
        if (info.url.indexOf("portal.azure.com") === -1) {
            for (let header of info.requestHeaders) {
                if (header.name.toLowerCase() === "authorization") {
                    if (authToken == null || authToken !== header.value) {
                        authToken = header.value;
						
						console.log(authToken)
						//chrome.extension.getBackgroundPage().console.log(authToken);
						console.log("[Azure Portal extension - modded by Ricky] - authToken updated")
						
                        //logBackground(authToken);
                        //logBackground("[Azure Portal extension - modded by Ricky] - authToken updated");
                    }
                }
            }
        }
        return {requestHeaders: info.requestHeaders};
    },
    {urls: ["<all_urls>"]},
    ["blocking", "requestHeaders"]
);

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.reason === "webapp_restart") {
        //POST https://management.azure.com/subscriptions/{subscriptionId}/resourceGroups/{resourceGroupName}/providers/Microsoft.Web/sites/{name}/restart?api-version=2022-12-01
        jQuery.ajax({
            type: 'POST',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            url: 'https://management.azure.com/subscriptions/'
                + request.subscription.id
                + '/resourceGroups/'
                + request.resourceGroup.name
                + '/providers/Microsoft.Web/sites/'
                + request.webapp.name
                + '/restart?api-version=2022-12-01'
        });
    }

    if (request.reason === "webapp_stop") {
        console.log(request);
        jQuery.ajax({
            type: 'POST',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            url: 'https://management.azure.com/subscriptions/'
                + request.subscription.id
                + '/resourceGroups/'
                + request.resourceGroup.name
                + '/providers/Microsoft.Web/sites/'
                + request.webapp.name
                + '/stop?api-version=2022-12-01'
        });
    }

    if (request.reason === "webapp_startp") {
        console.log(request);
        jQuery.ajax({
            type: 'POST',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            url: 'https://management.azure.com/subscriptions/'
                + request.subscription.id
                + '/resourceGroups/'
                + request.resourceGroup.name
                + '/providers/Microsoft.Web/sites/'
                + request.webapp.name
                + '/start?api-version=2022-12-01'
        });
    }
});






chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
	
    if (request !== "getSubscriptions") {
		console.log(request);
		console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions bad request');
        return false;
    }

    getSubscriptions().then(sendResponse);
	
	console.log(request);
	console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions good request');

    return true; // return true to indicate you want to send a response asynchronously
});




async function getSubscriptions() {
    let subscriptions = [];

    console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions() start a');

    try {
        const response = await fetch("https://management.azure.com/subscriptions?api-version=2022-12-01", {
            method: 'GET',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
        });

        if (response.ok) {
            const data = await response.json();
            let subs = [];

            for (let i = 0; i < data.value.length; i++) {
                let sub = data.value[i];

                let subscription = {
                    name: sub.displayName,
                    id: sub.subscriptionId,
                    resourceGroups: []
                }
                subs.push(subscription);

                await sleep(50);
            }

            console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions() end a');
            subscriptions = subs;
        } else {
            console.error('Failed to fetch subscriptions:', response.statusText);
        }
    } catch (error) {
        console.error('An error occurred while fetching subscriptions:', error);
    }

    try {
        console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions() start b');

        subscriptions = await Promise.all(subscriptions.map(async (subscription) => {
            try {
                const response2 = await fetch(`https://management.azure.com/subscriptions/${subscription.id}/resourceGroups?api-version=2022-12-01`, {
                    method: 'GET',
                    headers: {
                        'Authorization': authToken,
                        'Content-Type': 'application/json'
                    },
                });

                if (response2.ok) {
                    const data2 = await response2.json();

                    for (let j = 0; j < data2.value.length; j++) {
                        let rg = data2.value[j];

                        let resourceGroup = {
                            name: rg.name,
                            resources: []
                        }

                        subscription.resourceGroups.push(resourceGroup);
                    }

                    console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions() end b');

                    await sleep(50);
                } else {
                    console.error(`Failed to fetch resource groups for subscription ${subscription.id}:`, response2.statusText);
                }
            } catch (error) {
                console.error(`An error occurred while fetching resource groups for subscription ${subscription.id}:`, error);
            }

            return subscription;
        }));
    } catch (error) {
        console.error('An error occurred while fetching resource groups:', error);
    }

    try {
        console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions() start c');

        subscriptions = await Promise.all(subscriptions.map(async (subscription) => {
            subscription.resourceGroups = await Promise.all(subscription.resourceGroups.map(async (resourceGroup) => {
                try {
                    const response3 = await fetch(`https://management.azure.com/subscriptions/${subscription.id}/resourceGroups/${resourceGroup.name}/resources?api-version=2022-12-01`, {
                        method: 'GET',
                        headers: {
                            'Authorization': authToken,
                            'Content-Type': 'application/json'
                        },
                    });

                    if (response3.ok) {
                        const data3 = await response3.json();

                        for (let k = 0; k < data3.value.length; k++) {
                            let res = data3.value[k];

                            let resource = {
                                name: res.name,
                                type: res.type
                            }

                            resourceGroup.resources.push(resource);
                        }

                        console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions() end c');

                        await sleep(50);
                    } else {
                        console.error(`Failed to fetch resources for resource group ${resourceGroup.name} in subscription ${subscription.id}:`, response3.statusText);
                    }
                } catch (error) {
                    console.error(`An error occurred while fetching resources for resource group ${resourceGroup.name} in subscription ${subscription.id}:`, error);
                }

                return resourceGroup;
            }));

            return subscription;
        }));
    } catch (error) {
        console.error('An error occurred while fetching resources:', error);
    }

    console.log('[Azure Portal extension - modded by Ricky] - background.js - getSubscriptions() end 2');

    return { subscriptions: subscriptions };
}

// Helper function for sleeping
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}





/*
	


async function getSubscriptions() {
    const maxRequestsPerMinute = 5; // Set your desired rate limit here (e.g., 10 requests/minute)
    const delayBetweenRequests = 60000 / maxRequestsPerMinute; // Calculate delay between requests

    console.log('[Azure Portal Extension - modded by Ricky] - background.js - getSubscriptions() start');

    // Step 1: Fetch subscription data
    const subscriptionsResponse = await jQuery.ajax({
        type: 'GET',
        headers: {
            'Authorization': authToken,
            'Content-Type': 'application/json'
        },
        url: 'https://management.azure.com/subscriptions?api-version=2022-12-01',
    });

    const subscriptions = subscriptionsResponse.value.map((sub) => ({
        name: sub.displayName,
        id: sub.subscriptionId,
        resourceGroups: [],
    }));

    // Step 2: Fetch resource groups for each subscription
    const subscriptionPromises = subscriptions.map(async (subscription) => {
        const resourceGroupsResponse = await jQuery.ajax({
            type: 'GET',
            headers: {
                'Authorization': authToken,
                'Content-Type': 'application/json'
            },
            url: `https://management.azure.com/subscriptions/${subscription.id}/resourceGroups?api-version=2022-12-01`,
        });

        subscription.resourceGroups = resourceGroupsResponse.value.map((rg) => ({
            name: rg.name,
            resources: [],
        }));

        return subscription;
    });

    await Promise.all(subscriptionPromises);

    // Step 3: Fetch resources for each resource group
    const resourcePromises = subscriptions.flatMap((subscription) =>
        subscription.resourceGroups.map(async (resourceGroup) => {
            const resourcesResponse = await jQuery.ajax({
                type: 'GET',
                headers: {
                    'Authorization': authToken,
                    'Content-Type': 'application/json'
                },
                url: `https://management.azure.com/subscriptions/${subscription.id}/resourceGroups/${resourceGroup.name}/resources?api-version=2022-12-01`,
            });

            resourceGroup.resources = resourcesResponse.value.map((res) => ({
                name: res.name,
                type: res.type,
            }));

            return resourceGroup;
        })
    );

    await Promise.all(resourcePromises);

    console.log('[Azure Portal Extension - modded by Ricky] - background.js - getSubscriptions() end');


    return {subscriptions: subscriptions};
}
*/



/*
function sleep(milliseconds) {
  const date = Date.now();
  let currentDate = null;
  do {
    currentDate = Date.now();
  } while (currentDate - date < milliseconds);
}
*/



